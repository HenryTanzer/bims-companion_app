'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ChevronRight, ChevronDown, CheckCircle2, Circle,
  ArrowLeft, Brain, CreditCard, Target, NotebookPen, Save,
} from 'lucide-react'
import Link from 'next/link'
import type { StudentSubject, StudentLesson } from '@/app/student/curriculum/page'
import type { ContentBlock } from '@/types/database'

const YEAR_GROUP_COLORS: Record<string, string> = {
  'Year 12': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Year 13': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Both':    'bg-green-500/10 text-green-600 border-green-500/20',
}

const CALLOUT_STYLES: Record<string, string> = {
  'tip':      'bg-green-500/10 border-green-500/30 text-green-800 dark:text-green-300',
  'info':     'bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-300',
  'warning':  'bg-yellow-500/10 border-yellow-500/30 text-yellow-800 dark:text-yellow-300',
  'key-term': 'bg-purple-500/10 border-purple-500/30 text-purple-800 dark:text-purple-300',
}

const CALLOUT_LABELS: Record<string, string> = {
  'tip': 'Tip', 'info': 'Note', 'warning': 'Warning', 'key-term': 'Key Term',
}

type DbError = { message?: string } | null
type LessonNoteRow = { content: string; updated_at: string | null }
type LessonNoteUpsert = { student_id: string; lesson_id: string; content: string; updated_at: string }
type LessonProgressUpsert = {
  student_id: string
  lesson_id: string
  is_completed: boolean
  completed_at: string
  manually_completed: boolean
}
type EqBuilder<T> = {
  eq: (column: string, value: string) => EqBuilder<T>
  maybeSingle: () => Promise<{ data: T | null; error: DbError }>
}
type LessonNotesTable = {
  select: (columns: string) => EqBuilder<LessonNoteRow>
  upsert: (values: LessonNoteUpsert, options: { onConflict: string }) => Promise<{ error: DbError }>
}
type LessonProgressTable = {
  upsert: (values: LessonProgressUpsert, options: { onConflict: string }) => Promise<{ error: DbError }>
}
type StudentCurriculumDb = {
  from: (table: 'lesson_notes') => LessonNotesTable
} & {
  from: (table: 'lesson_progress') => LessonProgressTable
}

function getVideoEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return null
}

function BlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'text':
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {block.content.split('\n').map((line, i) => (
            <p key={i} className={cn('leading-relaxed', !line && 'h-4')}>{line}</p>
          ))}
        </div>
      )

    case 'heading':
      return block.level === 2
        ? <h2 className="text-xl font-bold mt-6 mb-2">{block.content}</h2>
        : <h3 className="text-base font-semibold mt-4 mb-1">{block.content}</h3>

    case 'image':
      return (
        <figure className="my-4">
          <img
            src={block.url}
            alt={block.caption ?? ''}
            className="rounded-xl border border-border max-w-full mx-auto"
          />
          {block.caption && (
            <figcaption className="text-center text-sm text-muted-foreground mt-2">
              {block.caption}
            </figcaption>
          )}
        </figure>
      )

    case 'video': {
      const embedUrl = getVideoEmbedUrl(block.url)
      if (!embedUrl) return null
      return (
        <figure className="my-4">
          <div className="aspect-video rounded-xl overflow-hidden border border-border">
            <iframe src={embedUrl} className="w-full h-full" allowFullScreen title={block.caption ?? 'Video'} />
          </div>
          {block.caption && (
            <figcaption className="text-center text-sm text-muted-foreground mt-2">{block.caption}</figcaption>
          )}
        </figure>
      )
    }

    case 'table':
      return (
        <div className="my-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i} className="border border-border px-3 py-2 bg-muted font-semibold text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-muted/40'}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-border px-3 py-2">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'list':
      return block.style === 'bullet'
        ? <ul className="my-3 space-y-1.5 list-disc list-inside">{block.items.map((item, i) => <li key={i} className="text-sm">{item}</li>)}</ul>
        : <ol className="my-3 space-y-1.5 list-decimal list-inside">{block.items.map((item, i) => <li key={i} className="text-sm">{item}</li>)}</ol>

    case 'callout':
      return (
        <div className={cn('my-4 rounded-xl border p-4', CALLOUT_STYLES[block.variant] ?? CALLOUT_STYLES.info)}>
          <p className="text-xs font-bold uppercase tracking-wide mb-1">
            {CALLOUT_LABELS[block.variant] ?? block.variant}
            {block.title && ` — ${block.title}`}
          </p>
          <p className="text-sm leading-relaxed">{block.content}</p>
        </div>
      )

    case 'divider':
      return <hr className="my-6 border-border" />

    case 'file':
      return (
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 my-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-sm"
        >
          <span className="text-2xl">📎</span>
          <span className="font-medium">{block.name || 'Download attachment'}</span>
          <span className="ml-auto text-muted-foreground text-xs">Download</span>
        </a>
      )

    default:
      return null
  }
}

export function CurriculumView({
  subjects, studentId, initialLessonId,
}: {
  subjects: StudentSubject[]
  studentId: string
  initialLessonId?: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const db = useMemo(() => supabase as unknown as StudentCurriculumDb, [supabase])
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set())
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [selectedLesson, setSelectedLesson] = useState<StudentLesson | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    new Set(subjects.flatMap(s => s.units.flatMap(u => u.topics.flatMap(t => t.lessons.filter(l => l.completed).map(l => l.id)))))
  )
  const [markingComplete, setMarkingComplete] = useState(false)
  const [activeSubjectId, setActiveSubjectId] = useState(subjects[0]?.id ?? '')
  const [lessonNotes, setLessonNotes] = useState<Record<string, string>>({})
  const [lessonNoteSavedAt, setLessonNoteSavedAt] = useState<Record<string, string | null>>({})
  const [noteStatus, setNoteStatus] = useState<'idle' | 'loading' | 'saving' | 'saved'>('idle')
  const [noteSavedAt, setNoteSavedAt] = useState<string | null>(null)

  const activeSubject = subjects.find(s => s.id === activeSubjectId)
  const selectedLessonId = selectedLesson?.id

  useEffect(() => {
    if (!initialLessonId || selectedLesson) return

    let cancelled = false
    for (const subject of subjects) {
      for (const unit of subject.units) {
        for (const topic of unit.topics) {
          const lesson = topic.lessons.find(l => l.id === initialLessonId)
          if (lesson) {
            window.setTimeout(() => {
              if (cancelled) return
              setActiveSubjectId(subject.id)
              setExpandedUnits(prev => new Set([...prev, unit.id]))
              setExpandedTopics(prev => new Set([...prev, topic.id]))
              setSelectedLesson(lesson)
              setNoteStatus(lessonNotes[lesson.id] === undefined ? 'loading' : 'idle')
              setNoteSavedAt(lessonNoteSavedAt[lesson.id] ?? null)
            }, 0)
            return
          }
        }
      }
    }
    return () => { cancelled = true }
  }, [initialLessonId, lessonNoteSavedAt, lessonNotes, selectedLesson, subjects])

  useEffect(() => {
    if (!selectedLessonId) return
    if (lessonNotes[selectedLessonId] !== undefined) return

    let cancelled = false
    const lessonId = selectedLessonId

    async function loadNote() {
      const { data, error } = await db
        .from('lesson_notes')
        .select('content, updated_at')
        .eq('student_id', studentId)
        .eq('lesson_id', lessonId)
        .maybeSingle()

      if (cancelled) return
      if (error) {
        toast.error('Failed to load your notes')
        setLessonNotes(prev => ({ ...prev, [lessonId]: '' }))
        setLessonNoteSavedAt(prev => ({ ...prev, [lessonId]: null }))
        setNoteStatus('idle')
        return
      }

      const updatedAt = data?.updated_at ?? null
      setLessonNotes(prev => ({ ...prev, [lessonId]: data?.content ?? '' }))
      setLessonNoteSavedAt(prev => ({ ...prev, [lessonId]: updatedAt }))
      setNoteSavedAt(updatedAt)
      setNoteStatus('idle')
    }

    loadNote()
    return () => { cancelled = true }
  }, [db, lessonNotes, selectedLessonId, studentId])

  function toggleUnit(id: string) {
    setExpandedUnits(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleTopic(id: string) {
    setExpandedTopics(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function openLesson(lesson: StudentLesson) {
    setSelectedLesson(lesson)
    setNoteStatus(lessonNotes[lesson.id] === undefined ? 'loading' : 'idle')
    setNoteSavedAt(lessonNoteSavedAt[lesson.id] ?? null)
  }

  async function markComplete(lesson: StudentLesson, manually: boolean) {
    setMarkingComplete(true)
    const { error } = await db.from('lesson_progress').upsert({
      student_id: studentId,
      lesson_id: lesson.id,
      is_completed: true,
      completed_at: new Date().toISOString(),
      manually_completed: manually,
    }, { onConflict: 'student_id,lesson_id' })
    if (error) { toast.error('Failed to save progress'); setMarkingComplete(false); return }
    setCompletedIds(prev => new Set([...prev, lesson.id]))
    toast.success('Lesson marked complete!')
    setMarkingComplete(false)
  }

  async function saveNote(lesson: StudentLesson) {
    setNoteStatus('saving')
    const content = lessonNotes[lesson.id] ?? ''
    const now = new Date().toISOString()
    const { error } = await db.from('lesson_notes').upsert({
      student_id: studentId,
      lesson_id: lesson.id,
      content,
      updated_at: now,
    }, { onConflict: 'student_id,lesson_id' })

    if (error) {
      toast.error('Failed to save notes')
      setNoteStatus('idle')
      return
    }

    setNoteSavedAt(now)
    setLessonNoteSavedAt(prev => ({ ...prev, [lesson.id]: now }))
    setNoteStatus('saved')
    toast.success('Notes saved')
    window.setTimeout(() => setNoteStatus('idle'), 1600)
  }

  // ── Lesson reader ────────────────────────────────────────────────────────
  if (selectedLesson) {
    const isComplete = completedIds.has(selectedLesson.id)
    // Count linked resources (rough — we loaded counts per subject, but here we show at lesson level)
    return (
      <div className="max-w-3xl mx-auto space-y-0">
        {/* Back button */}
        <button
          onClick={() => setSelectedLesson(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Curriculum
        </button>

        {/* Lesson header */}
        <div className="border border-border rounded-2xl p-6 mb-6 bg-card">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold leading-tight">{selectedLesson.title}</h1>
            {isComplete && (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 shrink-0">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
              </Badge>
            )}
          </div>

          {selectedLesson.learning_outcomes.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Target className="w-4 h-4" /> Learning Outcomes
              </p>
              <ul className="space-y-1.5">
                {selectedLesson.learning_outcomes.map((outcome, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Content blocks */}
        <div className="space-y-1">
          {selectedLesson.content.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">
              No content has been added to this lesson yet.
            </p>
          )}
          {selectedLesson.content.map((block, i) => (
            <BlockRenderer key={i} block={block} />
          ))}
        </div>

        {/* Personal notes */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <NotebookPen className="w-4 h-4 text-primary" />
                My Lesson Notes
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Private notes for revision. Only you can see these.
              </p>
            </div>
            {noteSavedAt && (
              <span className="text-xs text-muted-foreground shrink-0">
                Saved {new Date(noteSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <Textarea
            value={lessonNotes[selectedLesson.id] ?? ''}
            onChange={(event) => {
              const value = event.target.value
              setLessonNotes(prev => ({ ...prev, [selectedLesson.id]: value }))
              if (noteStatus === 'saved') setNoteStatus('idle')
            }}
            placeholder={noteStatus === 'loading' ? 'Loading your notes...' : 'Write key definitions, worked examples, questions, or revision prompts...'}
            disabled={noteStatus === 'loading'}
            className="min-h-36 resize-y"
          />
          <div className="flex items-center justify-between gap-3 mt-3">
            <span className="text-xs text-muted-foreground">
              {(lessonNotes[selectedLesson.id] ?? '').length.toLocaleString()} characters
            </span>
            <Button
              size="sm"
              onClick={() => saveNote(selectedLesson)}
              disabled={noteStatus === 'loading' || noteStatus === 'saving'}
            >
              <Save className="w-4 h-4 mr-2" />
              {noteStatus === 'saving' ? 'Saving...' : noteStatus === 'saved' ? 'Saved' : 'Save Notes'}
            </Button>
          </div>
        </div>

        {/* Practice & Complete footer */}
        <div className="mt-10 pt-6 border-t border-border space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href={`/student/quiz`}>
              <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors cursor-pointer">
                <Brain className="w-8 h-8 text-primary shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Practice Quiz</p>
                  <p className="text-xs text-muted-foreground">Test your knowledge on this subject</p>
                </div>
              </div>
            </Link>
            <Link href={`/student/flashcards`}>
              <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors cursor-pointer">
                <CreditCard className="w-8 h-8 text-primary shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Flashcards</p>
                  <p className="text-xs text-muted-foreground">Review key terms and definitions</p>
                </div>
              </div>
            </Link>
          </div>

          {!isComplete && (
            <Button
              className="w-full"
              onClick={() => markComplete(selectedLesson, true)}
              disabled={markingComplete}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {markingComplete ? 'Saving…' : 'Mark Lesson Complete'}
            </Button>
          )}

          {isComplete && (
            <div className="flex items-center gap-2 justify-center text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              You completed this lesson
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Curriculum tree ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Subject tabs */}
      {subjects.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSubjectId(s.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                activeSubjectId === s.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:bg-accent'
              )}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: s.color }}
              />
              {s.name}
            </button>
          ))}
        </div>
      )}

      {activeSubject && (
        <div className="space-y-3">
          {/* Subject summary */}
          {(() => {
            const allLessons = activeSubject.units.flatMap(u => u.topics.flatMap(t => t.lessons))
            const completed = allLessons.filter(l => completedIds.has(l.id)).length
            const total = allLessons.length
            return total > 0 ? (
              <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">Course Progress</span>
                    <span className="text-sm text-muted-foreground">{completed}/{total} lessons</span>
                  </div>
                  <Progress value={total > 0 ? (completed / total) * 100 : 0} className="h-2" />
                </div>
              </div>
            ) : null
          })()}

          {activeSubject.units.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Your teacher hasn&apos;t published any curriculum content yet. Check back soon.
            </p>
          )}

          {activeSubject.units.map(unit => {
            const unitExpanded = expandedUnits.has(unit.id)
            const unitLessons = unit.topics.flatMap(t => t.lessons)
            const unitCompleted = unitLessons.filter(l => completedIds.has(l.id)).length

            return (
              <div key={unit.id} className="border border-border rounded-xl overflow-hidden">
                {/* Unit row */}
                <button
                  onClick={() => toggleUnit(unit.id)}
                  className={cn(
                    'flex items-center gap-3 w-full px-4 py-3.5 text-left bg-card hover:bg-accent/50 transition-colors',
                    unitExpanded && 'border-b border-border'
                  )}
                >
                  {unitExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{unit.title}</span>
                      <Badge variant="outline" className={cn('text-xs', YEAR_GROUP_COLORS[unit.year_group])}>
                        {unit.year_group}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {unitCompleted}/{unitLessons.length} lessons complete
                    </p>
                  </div>
                  {unitLessons.length > 0 && (
                    <div className="shrink-0 w-20">
                      <Progress value={(unitCompleted / unitLessons.length) * 100} className="h-1.5" />
                    </div>
                  )}
                </button>

                {/* Topics */}
                {unitExpanded && (
                  <div className="bg-background divide-y divide-border/50">
                    {unit.topics.map(topic => {
                      const topicExpanded = expandedTopics.has(topic.id)
                      const topicCompleted = topic.lessons.filter(l => completedIds.has(l.id)).length

                      return (
                        <div key={topic.id}>
                          <button
                            onClick={() => toggleTopic(topic.id)}
                            className={cn(
                              'flex items-center gap-3 w-full pl-8 pr-4 py-3 text-left hover:bg-accent/30 transition-colors',
                              topicExpanded && 'border-b border-border/40'
                            )}
                          >
                            {topicExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                            <span className="text-sm font-medium flex-1 text-left">{topic.title}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {topicCompleted}/{topic.lessons.length}
                            </span>
                          </button>

                          {/* Lessons */}
                          {topicExpanded && (
                            <div className="pl-14 pr-4 py-2 space-y-1.5 bg-muted/20">
                              {topic.lessons.length === 0 && (
                                <p className="text-xs text-muted-foreground py-2">No published lessons yet.</p>
                              )}
                              {topic.lessons.map(lesson => {
                                const done = completedIds.has(lesson.id)
                                return (
                                  <button
                                    key={lesson.id}
                                    onClick={() => openLesson(lesson)}
                                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg bg-card border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                                  >
                                    {done
                                      ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                      : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                                    }
                                    <span className={cn('text-sm flex-1', done && 'text-muted-foreground')}>{lesson.title}</span>
                                    <span className="text-xs text-muted-foreground shrink-0">
                                      {lesson.learning_outcomes.length > 0 && `${lesson.learning_outcomes.length} outcomes`}
                                    </span>
                                    <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
