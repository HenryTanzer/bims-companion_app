'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Upload, FileText, Trash2, Loader2, Sparkles, X, CheckCircle2 } from 'lucide-react'

type Subject = { id: string; name: string; color: string }
type Topic = { id: string; name: string; subject_id: string }
type Paper = {
  id: string
  subject_id: string
  title: string
  year: number
  paper_number: number | null
  file_url: string | null
  created_by: string
  subjects: { name: string } | null
}
type ExtractedQuestion = {
  question: string
  options: string[]
  correct_answer: number
  difficulty: 'easy' | 'medium' | 'hard'
}

const DIFFICULTY_COLOURS: Record<string, string> = {
  easy: 'bg-green-500/10 text-green-600',
  medium: 'bg-yellow-500/10 text-yellow-600',
  hard: 'bg-red-500/10 text-red-600',
}

export function ExamCenterManager({
  subjects,
  initialPapers,
  topics,
  userId,
}: {
  subjects: Subject[]
  initialPapers: Paper[]
  topics: Topic[]
  userId: string
}) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  // Upload form state
  const [papers, setPapers] = useState<Paper[]>(initialPapers)
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [paperNumber, setPaperNumber] = useState('1')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Extraction state
  const [extractingId, setExtractingId] = useState<string | null>(null)
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([])
  const [extractedForPaper, setExtractedForPaper] = useState<Paper | null>(null)
  const [selectedTopicId, setSelectedTopicId] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleUpload() {
    if (!title.trim() || !year || !subjectId) {
      toast.error('Please fill in all fields')
      return
    }
    const yearNum = parseInt(year)
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      toast.error('Enter a valid year')
      return
    }

    setUploading(true)
    let fileUrl: string | null = null

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${subjectId}/${yearNum}-paper${paperNumber}-${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('past-papers')
        .upload(path, file, { contentType: file.type, upsert: false })

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`)
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('past-papers')
        .getPublicUrl(uploadData.path)
      fileUrl = urlData.publicUrl
    }

    const { data: inserted, error: insertError } = await supabase
      .from('past_papers')
      .insert({
        subject_id: subjectId,
        title: title.trim(),
        year: yearNum,
        paper_number: paperNumber ? parseInt(paperNumber) : null,
        file_url: fileUrl,
        created_by: userId,
      } as any)
      .select('id, subject_id, title, year, paper_number, file_url, created_by, subjects(name)')
      .single()

    if (insertError) {
      toast.error('Failed to save paper record')
    } else {
      setPapers(prev => [inserted as any, ...prev])
      setTitle('')
      setYear(String(new Date().getFullYear()))
      setPaperNumber('1')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      toast.success('Past paper saved')
    }
    setUploading(false)
  }

  async function handleDelete(paper: Paper) {
    setDeletingId(paper.id)

    if (paper.file_url) {
      const marker = '/past-papers/'
      const idx = paper.file_url.indexOf(marker)
      if (idx !== -1) {
        const storagePath = paper.file_url.slice(idx + marker.length)
        await supabase.storage.from('past-papers').remove([storagePath])
      }
    }

    const { error } = await supabase.from('past_papers').delete().eq('id', paper.id)
    if (error) {
      toast.error('Failed to delete paper')
    } else {
      setPapers(prev => prev.filter(p => p.id !== paper.id))
      if (extractedForPaper?.id === paper.id) dismissExtraction()
      toast.success('Paper deleted')
    }
    setDeletingId(null)
  }

  async function handleExtract(paper: Paper) {
    if (!paper.file_url) return
    setExtractingId(paper.id)
    setExtractedQuestions([])
    setExtractedForPaper(null)

    try {
      const res = await fetch('/api/extract-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: paper.file_url }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Extraction failed')
      } else if (json.questions.length === 0) {
        toast.info('No multiple-choice questions found in this paper.')
      } else {
        setExtractedForPaper(paper)
        setExtractedQuestions(json.questions)
        // Pre-select first topic for this paper's subject
        const firstTopic = topics.find(t => t.subject_id === paper.subject_id)
        setSelectedTopicId(firstTopic?.id ?? '')
        toast.success(`${json.questions.length} questions extracted — review below.`)
      }
    } catch {
      toast.error('Extraction failed. Check your connection and try again.')
    }

    setExtractingId(null)
  }

  async function handleSaveExtracted() {
    if (!extractedForPaper || !selectedTopicId || extractedQuestions.length === 0) return
    setSaving(true)

    const rows = extractedQuestions.map(q => ({
      topic_id: selectedTopicId,
      subject_id: extractedForPaper.subject_id,
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      difficulty: q.difficulty,
      created_by: userId,
    }))

    const { error } = await (supabase as any).from('quiz_questions').insert(rows)
    if (error) {
      toast.error('Failed to save questions.')
    } else {
      toast.success(`${rows.length} questions saved to Content Library.`)
      dismissExtraction()
    }
    setSaving(false)
  }

  function dismissExtraction() {
    setExtractedQuestions([])
    setExtractedForPaper(null)
    setSelectedTopicId('')
  }

  const topicsForPaper = extractedForPaper
    ? topics.filter(t => t.subject_id === extractedForPaper.subject_id)
    : []

  return (
    <div className="space-y-6">
      {/* Upload form */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-sm">Upload Past Paper</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Subject</label>
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. IT A-Level Paper 1 2023"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Year</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(e.target.value)}
              min={2000}
              max={2100}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Paper number</label>
            <select
              value={paperNumber}
              onChange={e => setPaperNumber(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="1">Paper 1</option>
              <option value="2">Paper 2</option>
              <option value="3">Paper 3</option>
              <option value="">None</option>
            </select>
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              PDF file <span className="text-muted-foreground/60">(optional — you can add a file later)</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium"
            />
          </div>
        </div>

        <Button onClick={handleUpload} disabled={uploading} className="gap-2">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading…' : 'Save paper'}
        </Button>
      </Card>

      {/* Paper list */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">All papers ({papers.length})</h2>
        {papers.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground text-sm">
            No past papers yet. Upload one above.
          </Card>
        ) : (
          papers.map(paper => (
            <Card key={paper.id} className="flex items-center gap-4 px-4 py-3">
              <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{paper.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{(paper.subjects as any)?.name}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{paper.year}</span>
                  {paper.paper_number && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">Paper {paper.paper_number}</Badge>
                  )}
                  {!paper.file_url && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">No file</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {paper.file_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs h-8"
                    onClick={() => handleExtract(paper)}
                    disabled={extractingId === paper.id}
                    title="Extract MCQ questions from this PDF using AI"
                  >
                    {extractingId === paper.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Sparkles className="w-3.5 h-3.5" />}
                    {extractingId === paper.id ? 'Extracting…' : 'Extract Qs'}
                  </Button>
                )}
                <button
                  onClick={() => handleDelete(paper)}
                  disabled={deletingId === paper.id}
                  className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40 p-1"
                  title="Delete paper"
                >
                  {deletingId === paper.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Extracted questions review panel */}
      {extractedForPaper && extractedQuestions.length > 0 && (
        <Card className="p-5 space-y-4 border-primary/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {extractedQuestions.length} questions extracted
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                From: {extractedForPaper.title}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Verify correct answers before saving — the mark scheme may not be included in the question paper.
              </p>
            </div>
            <button onClick={dismissExtraction} className="text-muted-foreground hover:text-foreground p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Topic picker */}
          <div>
            <label className="text-sm font-medium mb-1 block">Save questions under topic</label>
            {topicsForPaper.length === 0 ? (
              <p className="text-sm text-destructive">
                No topics found for this subject. Create topics first in the Content Manager.
              </p>
            ) : (
              <select
                value={selectedTopicId}
                onChange={e => setSelectedTopicId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a topic…</option>
                {topicsForPaper.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Question list */}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {extractedQuestions.map((q, i) => (
              <div key={i} className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-muted-foreground mt-0.5 shrink-0">Q{i + 1}</span>
                  <p className="text-sm font-medium">{q.question}</p>
                </div>
                <div className="grid grid-cols-1 gap-1.5 pl-5">
                  {q.options.map((opt, j) => (
                    <div
                      key={j}
                      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
                        j === q.correct_answer
                          ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/30'
                          : 'bg-background border border-border'
                      }`}
                    >
                      {j === q.correct_answer && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                      <span className="font-medium text-xs mr-1">{['A','B','C','D'][j]}.</span>
                      {opt}
                    </div>
                  ))}
                </div>
                <div className="pl-5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLOURS[q.difficulty] ?? ''}`}>
                    {q.difficulty}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Save button */}
          <div className="flex gap-3 pt-1">
            <Button
              onClick={handleSaveExtracted}
              disabled={saving || !selectedTopicId || topicsForPaper.length === 0}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save {extractedQuestions.length} questions to Content Library
            </Button>
            <Button variant="ghost" onClick={dismissExtraction}>Dismiss</Button>
          </div>
        </Card>
      )}
    </div>
  )
}
