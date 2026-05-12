'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ArrowLeft, Upload, Sparkles, Check, X, ChevronDown, ChevronRight,
  Loader2, RefreshCw, AlertCircle, BookOpen,
} from 'lucide-react'
import type { YearGroup } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

type ItemStatus = 'pending' | 'done' | 'failed'

type ImportLesson = {
  id: string
  title: string
  db_id?: string
  status: ItemStatus
  stats?: { blocks: number; questions: number; flashcards: number }
}

type ImportTopic = {
  id: string
  title: string
  db_id?: string
  lessons: ImportLesson[]
}

type ImportUnit = {
  id: string
  title: string
  year_group: YearGroup
  db_id?: string
  topics: ImportTopic[]
}

type WizardStep =
  | 'upload'
  | 'uploading_pdf'
  | 'extracting'
  | 'review'
  | 'setup'
  | 'generating'
  | 'done'

export type ExistingImportJob = {
  id: string
  subject_id: string
  status: string
  outline: ImportUnit[] | null
  file_url: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return crypto.randomUUID() }

function countLessons(units: ImportUnit[]) {
  return units.flatMap(u => u.topics.flatMap(t => t.lessons)).length
}

function countDone(units: ImportUnit[]) {
  return units.flatMap(u => u.topics.flatMap(t => t.lessons)).filter(l => l.status === 'done').length
}

function totalStats(units: ImportUnit[]) {
  const lessons = units.flatMap(u => u.topics.flatMap(t => t.lessons))
  return lessons.reduce(
    (acc, l) => ({
      blocks: acc.blocks + (l.stats?.blocks ?? 0),
      questions: acc.questions + (l.stats?.questions ?? 0),
      flashcards: acc.flashcards + (l.stats?.flashcards ?? 0),
    }),
    { blocks: 0, questions: 0, flashcards: 0 }
  )
}

const YEAR_COLORS: Record<YearGroup, string> = {
  'Year 12': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Year 13': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Both':    'bg-green-500/10 text-green-600 border-green-500/20',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TextbookImportWizard({
  subjectId,
  subjectName,
  teacherId,
  existingJob,
  onCancel,
  onComplete,
}: {
  subjectId: string
  subjectName: string
  teacherId: string
  existingJob: ExistingImportJob | null
  onCancel: () => void
  onComplete: () => void
}) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isResume = !!(existingJob?.outline?.length)

  const [step, setStep] = useState<WizardStep>('upload')
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(existingJob?.id ?? null)
  const [outline, setOutline] = useState<ImportUnit[]>(existingJob?.outline ?? [])
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [currentLesson, setCurrentLesson] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // ── PDF Upload ───────────────────────────────────────────────────────────────

  async function handleFileSelect(file: File) {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      toast.error('Please select a PDF file')
      return
    }

    setErrorMsg(null)
    setStep('uploading_pdf')

    const path = `textbook-imports/${Date.now()}-${uid()}.pdf`
    const { data, error } = await supabase.storage.from('lesson-media').upload(path, file)

    if (error) {
      setErrorMsg(
        error.message.includes('Bucket not found')
          ? "Storage bucket 'lesson-media' not found. Create it in Supabase → Storage → New bucket → Name: lesson-media → Public: YES, then try again."
          : `Upload failed: ${error.message}`
      )
      setStep('upload')
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('lesson-media').getPublicUrl(data.path)
    setFileUrl(publicUrl)

    if (isResume) {
      // Skip extraction — go straight to generating with existing outline
      setStep('generating')
      runGenerationLoop(outline, jobId!, publicUrl)
    } else {
      setStep('extracting')
      await extractOutline(publicUrl)
    }
  }

  // ── Phase 1: Extract outline ─────────────────────────────────────────────────

  async function extractOutline(url: string) {
    setErrorMsg(null)
    try {
      const res = await fetch('/api/curriculum/extract-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: url, subjectName, subjectId }),
      })
      const json = await res.json()
      if (!res.ok) { setErrorMsg(json.error ?? 'Failed to extract structure'); setStep('upload'); return }

      // Attach temp IDs to all nodes
      const units: ImportUnit[] = (json.units as any[]).map(u => ({
        id: uid(),
        title: u.title ?? 'Untitled Unit',
        year_group: (['Year 12', 'Year 13', 'Both'].includes(u.year_group) ? u.year_group : 'Both') as YearGroup,
        topics: (u.topics ?? []).map((t: any) => ({
          id: uid(),
          title: t.title ?? 'Untitled Topic',
          lessons: (t.lessons ?? []).map((l: any) => ({
            id: uid(),
            title: l.title ?? 'Untitled Lesson',
            status: 'pending' as ItemStatus,
          })),
        })),
      }))

      setJobId(json.jobId)
      setOutline(units)
      setExpandedUnits(new Set(units.map(u => u.id)))
      setStep('review')
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
      setStep('upload')
    }
  }

  // ── Review: inline edit helpers ──────────────────────────────────────────────

  function startEdit(id: string, current: string) { setEditingId(id); setEditValue(current) }

  function saveEdit(type: 'unit' | 'topic' | 'lesson', id: string) {
    const v = editValue.trim()
    if (!v) { setEditingId(null); return }
    setOutline(prev => prev.map(u => {
      if (type === 'unit' && u.id === id) return { ...u, title: v }
      return {
        ...u,
        topics: u.topics.map(t => {
          if (type === 'topic' && t.id === id) return { ...t, title: v }
          return {
            ...t,
            lessons: t.lessons.map(l => type === 'lesson' && l.id === id ? { ...l, title: v } : l),
          }
        }),
      }
    }))
    setEditingId(null)
  }

  function deleteUnit(id: string) {
    setOutline(prev => prev.filter(u => u.id !== id))
  }

  function deleteTopic(unitId: string, topicId: string) {
    setOutline(prev => prev.map(u =>
      u.id === unitId ? { ...u, topics: u.topics.filter(t => t.id !== topicId) } : u
    ))
  }

  function deleteLesson(topicId: string, lessonId: string) {
    setOutline(prev => prev.map(u => ({
      ...u,
      topics: u.topics.map(t =>
        t.id === topicId ? { ...t, lessons: t.lessons.filter(l => l.id !== lessonId) } : t
      ),
    })))
  }

  function setUnitYearGroup(unitId: string, yg: YearGroup) {
    setOutline(prev => prev.map(u => u.id === unitId ? { ...u, year_group: yg } : u))
  }

  // ── Phase 2: Create DB shells then generate ───────────────────────────────────

  async function confirmAndGenerate() {
    if (outline.length === 0) { toast.error('Add at least one unit before generating'); return }
    setStep('setup')
    setErrorMsg(null)

    const populated = await createDbShells(outline)
    if (!populated) { setStep('review'); return }

    // Save confirmed outline to job
    await (supabase as any)
      .from('curriculum_import_jobs')
      .update({ outline: { units: populated }, status: 'generating', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    setOutline(populated)
    setStep('generating')
    runGenerationLoop(populated, jobId!, fileUrl!)
  }

  async function createDbShells(units: ImportUnit[]): Promise<ImportUnit[] | null> {
    const result: ImportUnit[] = []
    const existingUnitCount = 0

    for (let ui = 0; ui < units.length; ui++) {
      const unit = units[ui]
      const { data: unitRow, error: uErr } = await (supabase as any)
        .from('curriculum_units')
        .insert({
          subject_id: subjectId,
          title: unit.title,
          year_group: unit.year_group,
          position: ui,
          created_by: teacherId,
        })
        .select('id')
        .single()

      if (uErr || !unitRow) {
        setErrorMsg(`Failed to create unit "${unit.title}": ${uErr?.message}`)
        return null
      }

      const populatedTopics: ImportTopic[] = []

      for (let ti = 0; ti < unit.topics.length; ti++) {
        const topic = unit.topics[ti]
        const { data: topicRow, error: tErr } = await (supabase as any)
          .from('curriculum_topics')
          .insert({ unit_id: unitRow.id, title: topic.title, position: ti })
          .select('id')
          .single()

        if (tErr || !topicRow) {
          setErrorMsg(`Failed to create topic "${topic.title}": ${tErr?.message}`)
          return null
        }

        const populatedLessons: ImportLesson[] = []

        for (let li = 0; li < topic.lessons.length; li++) {
          const lesson = topic.lessons[li]
          const { data: lessonRow, error: lErr } = await (supabase as any)
            .from('curriculum_lessons')
            .insert({
              topic_id: topicRow.id,
              title: lesson.title,
              learning_outcomes: [],
              content: [],
              is_published: false,
              position: li,
            })
            .select('id')
            .single()

          if (lErr || !lessonRow) {
            setErrorMsg(`Failed to create lesson "${lesson.title}": ${lErr?.message}`)
            return null
          }

          populatedLessons.push({ ...lesson, db_id: lessonRow.id, status: 'pending' })
        }

        populatedTopics.push({ ...topic, db_id: topicRow.id, lessons: populatedLessons })
      }

      result.push({ ...unit, db_id: unitRow.id, topics: populatedTopics })
    }

    return result
  }

  // ── Generation loop ───────────────────────────────────────────────────────────

  async function runGenerationLoop(units: ImportUnit[], jId: string, url: string) {
    let localUnits = units.map(u => ({ ...u, topics: u.topics.map(t => ({ ...t, lessons: [...t.lessons] })) }))

    for (const unit of localUnits) {
      for (const topic of unit.topics) {
        for (const lesson of topic.lessons) {
          if (lesson.status === 'done') continue

          setCurrentLesson(`${unit.title} → ${lesson.title}`)

          const res = await fetch('/api/curriculum/generate-lesson', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobId: jId,
              lessonDbId: lesson.db_id,
              lessonTitle: lesson.title,
              topicTitle: topic.title,
              unitTitle: unit.title,
              subjectName,
              subjectId,
              fileUrl: url,
            }),
          })

          if (res.ok) {
            const { stats } = await res.json()
            lesson.status = 'done'
            lesson.stats = stats
          } else {
            lesson.status = 'failed'
          }

          setOutline([...localUnits])
        }
      }
    }

    // Mark job done
    await (supabase as any)
      .from('curriculum_import_jobs')
      .update({
        status: 'done',
        outline: { units: localUnits },
        updated_at: new Date().toISOString(),
      })
      .eq('id', jId)

    setCurrentLesson('')
    setStep('done')
  }

  // ── Retry failed lessons ──────────────────────────────────────────────────────

  async function retryFailed() {
    if (!fileUrl || !jobId) return
    const reset = outline.map(u => ({
      ...u,
      topics: u.topics.map(t => ({
        ...t,
        lessons: t.lessons.map(l => l.status === 'failed' ? { ...l, status: 'pending' as ItemStatus } : l),
      })),
    }))
    setOutline(reset)
    setStep('generating')
    runGenerationLoop(reset, jobId, fileUrl)
  }

  // ── Render helpers ────────────────────────────────────────────────────────────

  const total = countLessons(outline)
  const done = countDone(outline)
  const failed = outline.flatMap(u => u.topics.flatMap(t => t.lessons)).filter(l => l.status === 'failed').length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  // ── Step: Upload ──────────────────────────────────────────────────────────────

  if (step === 'upload' || step === 'uploading_pdf') {
    return (
      <div className="max-w-xl mx-auto space-y-6 py-8">
        <button onClick={onCancel} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Curriculum
        </button>

        <div>
          <h2 className="text-xl font-bold">Import from Textbook</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {isResume
              ? `Resume your ${subjectName} import — ${done} of ${total} lessons already generated.`
              : `Upload your ${subjectName} A-Level textbook PDF. The AI will build your entire curriculum structure — units, topics, lessons, quiz questions, and flashcards.`
            }
          </p>
        </div>

        {isResume && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <RefreshCw className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Resuming previous import</p>
              <p className="mt-0.5 text-xs opacity-80">{done} of {total} lessons complete. Re-upload your PDF to continue from where it left off.</p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors"
        >
          {step === 'uploading_pdf'
            ? <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            : <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          }
          <p className="text-sm font-medium mt-2">
            {step === 'uploading_pdf' ? 'Uploading…' : 'Click to select your textbook PDF'}
          </p>
          {step !== 'uploading_pdf' && (
            <p className="text-xs text-muted-foreground mt-1">PDF only · Max ~50 pages per chapter recommended</p>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
        />
      </div>
    )
  }

  // ── Step: Extracting ──────────────────────────────────────────────────────────

  if (step === 'extracting') {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-4">
        <Sparkles className="w-10 h-10 mx-auto text-primary animate-pulse" />
        <p className="text-lg font-semibold">Reading your textbook…</p>
        <p className="text-sm text-muted-foreground">Extracting chapter and section structure. This takes about 15–30 seconds.</p>
      </div>
    )
  }

  // ── Step: Review ──────────────────────────────────────────────────────────────

  if (step === 'review') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Review Structure</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {outline.length} units · {total} lessons — rename or remove anything before generating.
            </p>
          </div>
          <Button onClick={confirmAndGenerate} className="gap-2">
            <Sparkles className="w-4 h-4" />
            Generate Curriculum
          </Button>
        </div>

        <div className="space-y-3">
          {outline.map(unit => {
            const expanded = expandedUnits.has(unit.id)
            return (
              <div key={unit.id} className="border border-border rounded-xl overflow-hidden">
                {/* Unit header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
                  <button onClick={() => setExpandedUnits(prev => {
                    const n = new Set(prev); n.has(unit.id) ? n.delete(unit.id) : n.add(unit.id); return n
                  })}>
                    {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {editingId === unit.id
                    ? <Input
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => saveEdit('unit', unit.id)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit('unit', unit.id); if (e.key === 'Escape') setEditingId(null) }}
                        className="h-7 text-sm flex-1"
                      />
                    : <span
                        className="font-semibold text-sm flex-1 cursor-pointer hover:text-primary"
                        onClick={() => startEdit(unit.id, unit.title)}
                      >{unit.title}</span>
                  }

                  <div className="flex items-center gap-1.5 shrink-0">
                    {(['Year 12', 'Year 13', 'Both'] as YearGroup[]).map(yg => (
                      <button
                        key={yg}
                        onClick={() => setUnitYearGroup(unit.id, yg)}
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium border transition-colors',
                          unit.year_group === yg ? YEAR_COLORS[yg] + ' border-current' : 'border-border text-muted-foreground hover:bg-accent'
                        )}
                      >{yg}</button>
                    ))}
                    <button onClick={() => deleteUnit(unit.id)} className="p-1 text-muted-foreground hover:text-destructive ml-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="px-4 py-3 space-y-3">
                    {unit.topics.map(topic => (
                      <div key={topic.id} className="space-y-1">
                        {/* Topic row */}
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs w-3 shrink-0">◆</span>
                          {editingId === topic.id
                            ? <Input
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={() => saveEdit('topic', topic.id)}
                                onKeyDown={e => { if (e.key === 'Enter') saveEdit('topic', topic.id); if (e.key === 'Escape') setEditingId(null) }}
                                className="h-6 text-xs flex-1"
                              />
                            : <span
                                className="text-sm font-medium flex-1 cursor-pointer hover:text-primary"
                                onClick={() => startEdit(topic.id, topic.title)}
                              >{topic.title}</span>
                          }
                          <span className="text-xs text-muted-foreground">{topic.lessons.length} lessons</span>
                          <button onClick={() => deleteTopic(unit.id, topic.id)} className="p-0.5 text-muted-foreground hover:text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Lesson rows */}
                        <div className="pl-5 space-y-0.5">
                          {topic.lessons.map(lesson => (
                            <div key={lesson.id} className="flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">–</span>
                              {editingId === lesson.id
                                ? <Input
                                    autoFocus
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    onBlur={() => saveEdit('lesson', lesson.id)}
                                    onKeyDown={e => { if (e.key === 'Enter') saveEdit('lesson', lesson.id); if (e.key === 'Escape') setEditingId(null) }}
                                    className="h-6 text-xs flex-1"
                                  />
                                : <span
                                    className="text-xs flex-1 cursor-pointer hover:text-primary text-muted-foreground"
                                    onClick={() => startEdit(lesson.id, lesson.title)}
                                  >{lesson.title}</span>
                              }
                              <button onClick={() => deleteLesson(topic.id, lesson.id)} className="p-0.5 text-muted-foreground hover:text-destructive opacity-0 hover:opacity-100 group-hover:opacity-100">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-xs text-muted-foreground">Click any title to rename it. This will generate {total} lessons with content, quiz questions, and flashcards — estimated {Math.ceil(total * 0.5)}–{Math.ceil(total * 1)}  minutes.</p>
      </div>
    )
  }

  // ── Step: Setup ───────────────────────────────────────────────────────────────

  if (step === 'setup') {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-4">
        <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
        <p className="text-lg font-semibold">Creating lesson structure…</p>
        <p className="text-sm text-muted-foreground">Building {total} lesson shells in your curriculum. This takes just a moment.</p>
        {errorMsg && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive text-left flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}
      </div>
    )
  }

  // ── Step: Generating ──────────────────────────────────────────────────────────

  if (step === 'generating') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">Generating Curriculum</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {done} of {total} lessons complete
            {currentLesson && <span className="text-primary"> · {currentLesson}</span>}
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Unit checklist */}
        <div className="space-y-3">
          {outline.map(unit => {
            const unitLessons = unit.topics.flatMap(t => t.lessons)
            const unitDone = unitLessons.filter(l => l.status === 'done').length
            const unitFailed = unitLessons.filter(l => l.status === 'failed').length
            const unitGenerating = unitLessons.some(l => l.status === 'pending') && unitDone < unitLessons.length

            return (
              <div key={unit.id} className="border border-border rounded-xl overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/30"
                  onClick={() => setExpandedUnits(prev => { const n = new Set(prev); n.has(unit.id) ? n.delete(unit.id) : n.add(unit.id); return n })}
                >
                  <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                    {unitDone === unitLessons.length
                      ? <Check className="w-4 h-4 text-green-500" />
                      : unitGenerating
                        ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        : unitFailed > 0
                          ? <AlertCircle className="w-4 h-4 text-destructive" />
                          : <div className="w-3 h-3 rounded-full border-2 border-muted-foreground" />
                    }
                  </div>
                  <span className="font-medium text-sm flex-1">{unit.title}</span>
                  <span className="text-xs text-muted-foreground">{unitDone}/{unitLessons.length}</span>
                  {expandedUnits.has(unit.id) ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>

                {expandedUnits.has(unit.id) && (
                  <div className="border-t border-border px-4 py-3 space-y-2">
                    {unit.topics.flatMap(t => t.lessons).map(lesson => (
                      <div key={lesson.id} className="flex items-center gap-2 text-sm">
                        <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                          {lesson.status === 'done'
                            ? <Check className="w-3.5 h-3.5 text-green-500" />
                            : lesson.status === 'failed'
                              ? <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                              : currentLesson.endsWith(lesson.title)
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                : <div className="w-2.5 h-2.5 rounded-full border border-muted-foreground/40" />
                          }
                        </div>
                        <span className={cn(
                          'flex-1 text-xs',
                          lesson.status === 'done' ? 'text-foreground' : 'text-muted-foreground'
                        )}>{lesson.title}</span>
                        {lesson.stats && (
                          <span className="text-xs text-muted-foreground">
                            {lesson.stats.blocks}b · {lesson.stats.questions}q · {lesson.stats.flashcards}fc
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Step: Done ────────────────────────────────────────────────────────────────

  const stats = totalStats(outline)

  return (
    <div className="max-w-xl mx-auto py-12 space-y-8 text-center">
      <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
        <Check className="w-8 h-8 text-green-500" />
      </div>

      <div>
        <h2 className="text-2xl font-bold">Curriculum Generated</h2>
        <p className="text-muted-foreground text-sm mt-2">
          Your {subjectName} curriculum is ready. All lessons are saved as drafts — review and publish when ready.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Lessons', value: done, icon: BookOpen },
          { label: 'Questions', value: stats.questions, icon: null },
          { label: 'Flashcards', value: stats.flashcards, icon: null },
        ].map(({ label, value }) => (
          <div key={label} className="border border-border rounded-xl p-4">
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {failed > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400 text-left space-y-2">
          <p className="font-medium">{failed} lesson{failed !== 1 ? 's' : ''} failed to generate</p>
          <p className="text-xs opacity-80">These lessons were saved as empty drafts. You can fill them in manually or retry below.</p>
          <Button size="sm" variant="outline" onClick={retryFailed} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Retry failed lessons
          </Button>
        </div>
      )}

      <Button onClick={onComplete} size="lg" className="w-full">
        View Curriculum
      </Button>
    </div>
  )
}
