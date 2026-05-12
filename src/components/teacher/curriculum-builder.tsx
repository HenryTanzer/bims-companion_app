'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ChevronRight, ChevronDown, Plus, Trash2, Pencil, BookOpen,
  Eye, EyeOff, GripVertical, Sparkles,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { LessonEditor } from './lesson-editor'
import { TextbookImportWizard } from './textbook-import-wizard'
import type { ExistingImportJob } from './textbook-import-wizard'
import type { LoadedUnit, LoadedTopic, LoadedLesson } from '@/app/teacher/curriculum/page'
import type { YearGroup } from '@/types/database'

type Subject = { id: string; name: string; color: string }

const YEAR_GROUP_COLORS: Record<YearGroup, string> = {
  'Year 12': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Year 13': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Both':    'bg-green-500/10 text-green-600 border-green-500/20',
}

export function CurriculumBuilder({
  initialUnits, subjects, teacherId, existingImportJobs,
}: {
  initialUnits: LoadedUnit[]
  subjects: Subject[]
  teacherId: string
  existingImportJobs: ExistingImportJob[]
}) {
  const supabase = createClient()
  const router = useRouter()
  const [units, setUnits] = useState<LoadedUnit[]>(initialUnits)
  const [importingFor, setImportingFor] = useState<{ subjectId: string; subjectName: string } | null>(null)
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set())
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [editingLesson, setEditingLesson] = useState<{
    lesson: LoadedLesson | null
    topicId: string
    subjectId: string
  } | null>(null)

  // Inline creation forms
  const [newUnitSubject, setNewUnitSubject] = useState(subjects[0]?.id ?? '')
  const [newUnitTitle, setNewUnitTitle] = useState('')
  const [newUnitYear, setNewUnitYear] = useState<YearGroup>('Both')
  const [showNewUnit, setShowNewUnit] = useState(false)
  const [savingUnit, setSavingUnit] = useState(false)

  const [addingTopicToUnit, setAddingTopicToUnit] = useState<string | null>(null)
  const [newTopicTitle, setNewTopicTitle] = useState('')
  const [savingTopic, setSavingTopic] = useState(false)

  const [addingLessonToTopic, setAddingLessonToTopic] = useState<string | null>(null)
  const [newLessonTitle, setNewLessonTitle] = useState('')
  const [savingLesson, setSavingLesson] = useState(false)

  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)
  const [editInlineTitle, setEditInlineTitle] = useState('')
  const [editInlineYear, setEditInlineYear] = useState<YearGroup>('Both')

  function toggleUnit(id: string) {
    setExpandedUnits(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleTopic(id: string) {
    setExpandedTopics(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function subjectForUnit(unit: LoadedUnit) {
    return subjects.find(s => s.id === unit.subject_id)
  }

  function topicParentUnit(topicId: string): LoadedUnit | undefined {
    return units.find(u => u.topics.some(t => t.id === topicId))
  }

  // ── Create unit ────────────────────────────────────────────────────────────
  async function createUnit() {
    if (!newUnitTitle.trim() || !newUnitSubject) { toast.error('Subject and title required'); return }
    setSavingUnit(true)
    const position = units.filter(u => u.subject_id === newUnitSubject).length
    const { data, error } = await (supabase as any).from('curriculum_units').insert({
      subject_id: newUnitSubject,
      title: newUnitTitle.trim(),
      year_group: newUnitYear,
      position,
      created_by: teacherId,
    }).select('*').single()
    if (error) { toast.error('Failed to create unit'); setSavingUnit(false); return }
    setUnits(prev => [...prev, { ...(data as any), topics: [] }])
    setNewUnitTitle('')
    setShowNewUnit(false)
    setExpandedUnits(prev => new Set([...prev, data.id]))
    toast.success('Unit created')
    setSavingUnit(false)
  }

  // ── Create topic ───────────────────────────────────────────────────────────
  async function createTopic(unitId: string) {
    if (!newTopicTitle.trim()) { toast.error('Topic title required'); return }
    setSavingTopic(true)
    const unit = units.find(u => u.id === unitId)
    const position = unit?.topics.length ?? 0
    const { data, error } = await (supabase as any).from('curriculum_topics').insert({
      unit_id: unitId,
      title: newTopicTitle.trim(),
      position,
    }).select('*').single()
    if (error) { toast.error('Failed to create topic'); setSavingTopic(false); return }
    setUnits(prev => prev.map(u => u.id === unitId
      ? { ...u, topics: [...u.topics, { ...(data as any), lessons: [] }] }
      : u
    ))
    setNewTopicTitle('')
    setAddingTopicToUnit(null)
    setExpandedTopics(prev => new Set([...prev, data.id]))
    toast.success('Topic created')
    setSavingTopic(false)
  }

  // ── Create lesson (stub — opens editor immediately) ────────────────────────
  function openNewLesson(topicId: string) {
    const unit = topicParentUnit(topicId)
    if (!unit) return
    setEditingLesson({ lesson: null, topicId, subjectId: unit.subject_id })
    setAddingLessonToTopic(null)
  }

  // ── Delete unit ────────────────────────────────────────────────────────────
  async function deleteUnit(id: string) {
    if (!confirm('Delete this unit and all its topics and lessons? This cannot be undone.')) return
    const { error } = await (supabase as any).from('curriculum_units').delete().eq('id', id)
    if (error) { toast.error('Failed to delete unit'); return }
    setUnits(prev => prev.filter(u => u.id !== id))
    toast.success('Unit deleted')
  }

  // ── Delete topic ───────────────────────────────────────────────────────────
  async function deleteTopic(unitId: string, topicId: string) {
    if (!confirm('Delete this topic and all its lessons?')) return
    const { error } = await (supabase as any).from('curriculum_topics').delete().eq('id', topicId)
    if (error) { toast.error('Failed to delete topic'); return }
    setUnits(prev => prev.map(u => u.id === unitId
      ? { ...u, topics: u.topics.filter(t => t.id !== topicId) }
      : u
    ))
    toast.success('Topic deleted')
  }

  // ── Delete lesson ──────────────────────────────────────────────────────────
  async function deleteLesson(topicId: string, lessonId: string) {
    if (!confirm('Delete this lesson?')) return
    const { error } = await (supabase as any).from('curriculum_lessons').delete().eq('id', lessonId)
    if (error) { toast.error('Failed to delete lesson'); return }
    setUnits(prev => prev.map(u => ({
      ...u,
      topics: u.topics.map(t => t.id === topicId
        ? { ...t, lessons: t.lessons.filter(l => l.id !== lessonId) }
        : t
      ),
    })))
    toast.success('Lesson deleted')
  }

  // ── Inline rename unit ─────────────────────────────────────────────────────
  async function saveUnitEdit(id: string) {
    if (!editInlineTitle.trim()) return
    const { error } = await (supabase as any).from('curriculum_units').update({
      title: editInlineTitle.trim(), year_group: editInlineYear,
    }).eq('id', id)
    if (error) { toast.error('Failed to update unit'); return }
    setUnits(prev => prev.map(u => u.id === id
      ? { ...u, title: editInlineTitle.trim(), year_group: editInlineYear }
      : u
    ))
    setEditingUnitId(null)
    toast.success('Unit updated')
  }

  // ── Inline rename topic ────────────────────────────────────────────────────
  async function saveTopicEdit(unitId: string, topicId: string) {
    if (!editInlineTitle.trim()) return
    const { error } = await (supabase as any).from('curriculum_topics').update({
      title: editInlineTitle.trim(),
    }).eq('id', topicId)
    if (error) { toast.error('Failed to update topic'); return }
    setUnits(prev => prev.map(u => u.id === unitId
      ? { ...u, topics: u.topics.map(t => t.id === topicId ? { ...t, title: editInlineTitle.trim() } : t) }
      : u
    ))
    setEditingTopicId(null)
    toast.success('Topic updated')
  }

  // ── Toggle publish ─────────────────────────────────────────────────────────
  async function togglePublish(topicId: string, lesson: LoadedLesson) {
    const next = !lesson.is_published
    const { error } = await (supabase as any).from('curriculum_lessons').update({ is_published: next }).eq('id', lesson.id)
    if (error) { toast.error('Failed to update lesson'); return }
    setUnits(prev => prev.map(u => ({
      ...u,
      topics: u.topics.map(t => t.id === topicId
        ? { ...t, lessons: t.lessons.map(l => l.id === lesson.id ? { ...l, is_published: next } : l) }
        : t
      ),
    })))
  }

  // ── Lesson saved callback ──────────────────────────────────────────────────
  function onLessonSaved(saved: LoadedLesson) {
    const { topicId } = editingLesson!
    setUnits(prev => prev.map(u => ({
      ...u,
      topics: u.topics.map(t => {
        if (t.id !== topicId) return t
        const exists = t.lessons.some(l => l.id === saved.id)
        return {
          ...t,
          lessons: exists
            ? t.lessons.map(l => l.id === saved.id ? saved : l)
            : [...t.lessons, saved],
        }
      }),
    })))
    setEditingLesson(null)
    toast.success(editingLesson?.lesson ? 'Lesson updated' : 'Lesson created')
  }

  // ── Textbook import wizard ────────────────────────────────────────────────
  if (importingFor) {
    const existingJob = existingImportJobs.find(j => j.subject_id === importingFor.subjectId) ?? null
    return (
      <TextbookImportWizard
        subjectId={importingFor.subjectId}
        subjectName={importingFor.subjectName}
        teacherId={teacherId}
        existingJob={existingJob ? { id: existingJob.id, subject_id: existingJob.subject_id, status: existingJob.status, outline: existingJob.outline, file_url: existingJob.file_url } : null}
        onCancel={() => setImportingFor(null)}
        onComplete={() => { setImportingFor(null); router.refresh() }}
      />
    )
  }

  // ── Lesson editor view ─────────────────────────────────────────────────────
  if (editingLesson) {
    return (
      <LessonEditor
        lesson={editingLesson.lesson}
        topicId={editingLesson.topicId}
        subjectId={editingLesson.subjectId}
        teacherId={teacherId}
        onSave={onLessonSaved}
        onCancel={() => setEditingLesson(null)}
      />
    )
  }

  // ── Group units by subject for display ────────────────────────────────────
  const unitsBySubject = subjects.map(s => ({
    subject: s,
    units: units.filter(u => u.subject_id === s.id),
  })).filter(g => g.units.length > 0 || subjects.length === 1)

  return (
    <div className="space-y-8">
      {subjects.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No subjects assigned. Ask an admin to assign you to a subject first.
        </p>
      )}

      {/* Toolbar: Add Unit + Import Textbook */}
      {subjects.length > 0 && !showNewUnit && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowNewUnit(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Unit
          </Button>
          {subjects.map(s => {
            const job = existingImportJobs.find(j => j.subject_id === s.id)
            const isResume = job && job.status !== 'done'
            return (
              <Button
                key={s.id}
                variant="outline"
                onClick={() => setImportingFor({ subjectId: s.id, subjectName: s.name })}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isResume ? `Resume ${s.name} Import` : subjects.length > 1 ? `Import ${s.name} Textbook` : 'Import Textbook'}
              </Button>
            )
          })}
        </div>
      )}

      {/* New unit form */}
      {showNewUnit && (
        <div className="border border-dashed border-border rounded-xl p-4 space-y-3 bg-card">
          <p className="text-sm font-medium">New Unit</p>
          {subjects.length > 1 && (
            <div className="flex gap-2">
              {subjects.map(s => (
                <button
                  key={s.id}
                  onClick={() => setNewUnitSubject(s.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                    newUnitSubject === s.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  )}
                >{s.name}</button>
              ))}
            </div>
          )}
          <Input
            placeholder="Unit title e.g. Theme 1: Marketing and People"
            value={newUnitTitle}
            onChange={e => setNewUnitTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createUnit()}
            autoFocus
          />
          <div className="flex gap-2">
            {(['Year 12', 'Year 13', 'Both'] as YearGroup[]).map(y => (
              <button
                key={y}
                onClick={() => setNewUnitYear(y)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                  newUnitYear === y
                    ? YEAR_GROUP_COLORS[y] + ' border-current'
                    : 'border-border text-muted-foreground hover:bg-accent'
                )}
              >{y}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={createUnit} disabled={savingUnit}>
              {savingUnit ? 'Creating...' : 'Create Unit'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowNewUnit(false); setNewUnitTitle('') }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Curriculum tree ────────────────────────────────────────────────────── */}
      {unitsBySubject.map(({ subject, units: subjectUnits }) => (
        <div key={subject.id} className="space-y-2">
          {subjects.length > 1 && (
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: subject.color }}
              />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {subject.name}
              </span>
            </div>
          )}

          {subjectUnits.length === 0 && (
            <p className="text-sm text-muted-foreground pl-2">
              No units yet. Click "Add Unit" above to create the first one.
            </p>
          )}

          {subjectUnits.map(unit => {
            const unitExpanded = expandedUnits.has(unit.id)
            const isEditingUnit = editingUnitId === unit.id

            return (
              <div key={unit.id} className="border border-border rounded-xl overflow-hidden">
                {/* Unit row */}
                <div className={cn(
                  'flex items-center gap-2 px-4 py-3 bg-card hover:bg-accent/50 transition-colors',
                  unitExpanded && 'border-b border-border'
                )}>
                  <button onClick={() => toggleUnit(unit.id)} className="shrink-0 text-muted-foreground hover:text-foreground">
                    {unitExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  {isEditingUnit ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editInlineTitle}
                        onChange={e => setEditInlineTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveUnitEdit(unit.id); if (e.key === 'Escape') setEditingUnitId(null) }}
                        className="h-7 text-sm flex-1"
                        autoFocus
                      />
                      {(['Year 12', 'Year 13', 'Both'] as YearGroup[]).map(y => (
                        <button
                          key={y}
                          onClick={() => setEditInlineYear(y)}
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium border transition-colors',
                            editInlineYear === y ? YEAR_GROUP_COLORS[y] : 'border-border text-muted-foreground'
                          )}
                        >{y}</button>
                      ))}
                      <Button size="sm" className="h-7 px-2 text-xs" onClick={() => saveUnitEdit(unit.id)}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingUnitId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <button onClick={() => toggleUnit(unit.id)} className="flex-1 flex items-center gap-3 text-left">
                      <span className="font-semibold text-sm">{unit.title}</span>
                      <Badge variant="outline" className={cn('text-xs', YEAR_GROUP_COLORS[unit.year_group])}>
                        {unit.year_group}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {unit.topics.length} topic{unit.topics.length !== 1 ? 's' : ''}
                      </span>
                    </button>
                  )}

                  {!isEditingUnit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setEditingUnitId(unit.id); setEditInlineTitle(unit.title); setEditInlineYear(unit.year_group) }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
                        title="Rename unit"
                      ><Pencil className="w-3.5 h-3.5" /></button>
                      <button
                        onClick={() => deleteUnit(unit.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete unit"
                      ><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>

                {/* Topics ───────────────────────────────────────────────── */}
                {unitExpanded && (
                  <div className="bg-background">
                    {unit.topics.map(topic => {
                      const topicExpanded = expandedTopics.has(topic.id)
                      const isEditingTopic = editingTopicId === topic.id

                      return (
                        <div key={topic.id} className="border-b border-border last:border-b-0">
                          {/* Topic row */}
                          <div className={cn(
                            'flex items-center gap-2 pl-8 pr-4 py-2.5 hover:bg-accent/30 transition-colors',
                            topicExpanded && 'border-b border-border/50'
                          )}>
                            <button onClick={() => toggleTopic(topic.id)} className="shrink-0 text-muted-foreground hover:text-foreground">
                              {topicExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>

                            {isEditingTopic ? (
                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  value={editInlineTitle}
                                  onChange={e => setEditInlineTitle(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') saveTopicEdit(unit.id, topic.id); if (e.key === 'Escape') setEditingTopicId(null) }}
                                  className="h-7 text-sm flex-1"
                                  autoFocus
                                />
                                <Button size="sm" className="h-7 px-2 text-xs" onClick={() => saveTopicEdit(unit.id, topic.id)}>Save</Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingTopicId(null)}>Cancel</Button>
                              </div>
                            ) : (
                              <button onClick={() => toggleTopic(topic.id)} className="flex-1 flex items-center gap-3 text-left">
                                <span className="text-sm font-medium">{topic.title}</span>
                                <span className="text-xs text-muted-foreground">
                                  {topic.lessons.length} lesson{topic.lessons.length !== 1 ? 's' : ''}
                                </span>
                              </button>
                            )}

                            {!isEditingTopic && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => { setEditingTopicId(topic.id); setEditInlineTitle(topic.title) }}
                                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                                  title="Rename topic"
                                ><Pencil className="w-3 h-3" /></button>
                                <button
                                  onClick={() => deleteTopic(unit.id, topic.id)}
                                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Delete topic"
                                ><Trash2 className="w-3 h-3" /></button>
                              </div>
                            )}
                          </div>

                          {/* Lessons ────────────────────────────────────── */}
                          {topicExpanded && (
                            <div className="pl-14 pr-4 py-2 space-y-1 bg-muted/30">
                              {topic.lessons.length === 0 && (
                                <p className="text-xs text-muted-foreground py-1">
                                  No lessons yet.
                                </p>
                              )}

                              {topic.lessons.map(lesson => (
                                <div
                                  key={lesson.id}
                                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-border/60 hover:border-border transition-colors"
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-sm flex-1 truncate">{lesson.title}</span>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-xs shrink-0',
                                      lesson.is_published
                                        ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                        : 'text-muted-foreground'
                                    )}
                                  >
                                    {lesson.is_published ? 'Published' : 'Draft'}
                                  </Badge>
                                  <button
                                    onClick={() => togglePublish(topic.id, lesson)}
                                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                                    title={lesson.is_published ? 'Unpublish' : 'Publish'}
                                  >
                                    {lesson.is_published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                  <button
                                    onClick={() => setEditingLesson({
                                      lesson,
                                      topicId: topic.id,
                                      subjectId: unit.subject_id,
                                    })}
                                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                                    title="Edit lesson"
                                  ><Pencil className="w-3 h-3" /></button>
                                  <button
                                    onClick={() => deleteLesson(topic.id, lesson.id)}
                                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    title="Delete lesson"
                                  ><Trash2 className="w-3 h-3" /></button>
                                </div>
                              ))}

                              <button
                                onClick={() => openNewLesson(topic.id)}
                                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground py-1.5 px-3 rounded-lg hover:bg-accent transition-colors w-full"
                              >
                                <Plus className="w-3 h-3" /> Add Lesson
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Add topic row */}
                    {addingTopicToUnit === unit.id ? (
                      <div className="flex items-center gap-2 pl-8 pr-4 py-2.5 border-t border-border/50">
                        <Input
                          placeholder="Topic title e.g. 1.1 Meeting Customer Needs"
                          value={newTopicTitle}
                          onChange={e => setNewTopicTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') createTopic(unit.id); if (e.key === 'Escape') { setAddingTopicToUnit(null); setNewTopicTitle('') } }}
                          className="h-7 text-sm flex-1"
                          autoFocus
                        />
                        <Button size="sm" className="h-7 px-2 text-xs" onClick={() => createTopic(unit.id)} disabled={savingTopic}>
                          {savingTopic ? 'Adding...' : 'Add'}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setAddingTopicToUnit(null); setNewTopicTitle('') }}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingTopicToUnit(unit.id); setExpandedUnits(prev => new Set([...prev, unit.id])) }}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground pl-8 pr-4 py-2.5 hover:bg-accent/30 transition-colors w-full border-t border-border/30"
                      >
                        <Plus className="w-3 h-3" /> Add Topic
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
