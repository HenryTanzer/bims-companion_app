'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Upload, FileText, Trash2, Loader2 } from 'lucide-react'

type Subject = { id: string; name: string; color: string }
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

export function ExamCenterManager({
  subjects,
  initialPapers,
  userId,
}: {
  subjects: Subject[]
  initialPapers: Paper[]
  userId: string
}) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [papers, setPapers] = useState<Paper[]>(initialPapers)
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [paperNumber, setPaperNumber] = useState('1')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
      toast.success('Paper deleted')
    }
    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      {/* Upload form */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-sm">Upload Past Paper</h2>

        <div className="grid grid-cols-2 gap-3">
          {/* Subject */}
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

          {/* Title */}
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

          {/* Year */}
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

          {/* Paper number */}
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

          {/* File */}
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
              <button
                onClick={() => handleDelete(paper)}
                disabled={deletingId === paper.id}
                className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                title="Delete paper"
              >
                {deletingId === paper.id
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Trash2 className="w-4 h-4" />
                }
              </button>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
