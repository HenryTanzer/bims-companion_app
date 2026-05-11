'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Plus, Layers, Eye, EyeOff, Trash2, Loader2,
  ChevronDown, ChevronUp, Users, CheckCircle2
} from 'lucide-react'

type Subject = { id: string; name: string; color: string }
type Question = {
  id: string
  question: string
  options: string[]
  correct_answer: number
  subject_id: string
  difficulty: string
  topics: { name: string } | null
}
type Module = {
  id: string
  title: string
  description: string | null
  due_date: string | null
  is_published: boolean
  subject_id: string
  subjects: { name: string } | null
  created_by: string
}

export function ModuleManager({
  subjects,
  initialModules,
  allQuestions,
  questionCountByModule,
  submissionCountByModule,
  userId,
}: {
  subjects: Subject[]
  initialModules: Module[]
  allQuestions: Question[]
  questionCountByModule: Record<string, number>
  submissionCountByModule: Record<string, number>
  userId: string
}) {
  const supabase = createClient()

  const [modules, setModules] = useState<Module[]>(initialModules)
  const [qCounts, setQCounts] = useState<Record<string, number>>(questionCountByModule)
  const [subCounts] = useState<Record<string, number>>(submissionCountByModule)
  const [tab, setTab] = useState<'list' | 'create'>('list')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [gradebookData, setGradebookData] = useState<Record<string, any[]>>({})

  // Create form state
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [selectedQIds, setSelectedQIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredQuestions = allQuestions.filter(q => q.subject_id === subjectId)

  function toggleQuestion(id: string) {
    setSelectedQIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleCreate() {
    if (!title.trim()) { toast.error('Title is required'); return }
    if (selectedQIds.size === 0) { toast.error('Select at least one question'); return }
    setSaving(true)

    const { data: mod, error: modErr } = await (supabase as any)
      .from('modules')
      .insert({
        subject_id: subjectId,
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        is_published: false,
        created_by: userId,
      })
      .select('id, title, description, due_date, is_published, subject_id, subjects(name), created_by')
      .single()

    if (modErr || !mod) {
      toast.error('Failed to create module')
      setSaving(false)
      return
    }

    const mqInserts = Array.from(selectedQIds).map((qid, i) => ({
      module_id: mod.id,
      question_id: qid,
      order_index: i,
    }))

    const { error: mqErr } = await (supabase as any)
      .from('module_questions')
      .insert(mqInserts)

    if (mqErr) {
      toast.error('Module created but questions failed to save')
    } else {
      toast.success('Module created — publish it when ready')
    }

    setModules(prev => [mod, ...prev])
    setQCounts(prev => ({ ...prev, [mod.id]: selectedQIds.size }))
    setTitle('')
    setDescription('')
    setDueDate('')
    setSelectedQIds(new Set())
    setTab('list')
    setSaving(false)
  }

  async function togglePublish(mod: Module) {
    setTogglingId(mod.id)
    const { error } = await (supabase as any)
      .from('modules')
      .update({ is_published: !mod.is_published })
      .eq('id', mod.id)
    if (error) {
      toast.error('Failed to update')
    } else {
      setModules(prev => prev.map(m => m.id === mod.id ? { ...m, is_published: !m.is_published } : m))
      toast.success(mod.is_published ? 'Module unpublished' : 'Module published — students can now see it')
    }
    setTogglingId(null)
  }

  async function deleteModule(mod: Module) {
    setDeletingId(mod.id)
    const { error } = await (supabase as any)
      .from('modules')
      .delete()
      .eq('id', mod.id)
    if (error) {
      toast.error('Failed to delete')
    } else {
      setModules(prev => prev.filter(m => m.id !== mod.id))
      toast.success('Module deleted')
    }
    setDeletingId(null)
  }

  async function loadGradebook(mod: Module) {
    if (gradebookData[mod.id]) {
      setExpandedId(expandedId === mod.id ? null : mod.id)
      return
    }

    // Fetch all students enrolled in this subject
    const { data: enrollments } = await (supabase as any)
      .from('enrollments')
      .select('student_id, profiles(full_name)')
      .eq('subject_id', mod.subject_id)

    // Fetch all submissions for this module
    const { data: submissions } = await (supabase as any)
      .from('module_submissions')
      .select('student_id, score, total_questions, submitted_at')
      .eq('module_id', mod.id)

    const subByStudent: Record<string, any> = {}
    for (const s of (submissions ?? []) as any[]) {
      subByStudent[s.student_id] = s
    }

    const rows = ((enrollments ?? []) as any[]).map((e: any) => ({
      studentId: e.student_id,
      name: (e.profiles as any)?.full_name ?? 'Unknown',
      submission: subByStudent[e.student_id] ?? null,
    }))

    setGradebookData(prev => ({ ...prev, [mod.id]: rows }))
    setExpandedId(mod.id)
  }

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('list')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            tab === 'list'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          All modules ({modules.length})
        </button>
        <button
          onClick={() => setTab('create')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${
            tab === 'create'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          Create module
        </button>
      </div>

      {/* Create form */}
      {tab === 'create' && (
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-sm">New module</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Subject</label>
              <select
                value={subjectId}
                onChange={e => { setSubjectId(e.target.value); setSelectedQIds(new Set()) }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Unit 1 Revision"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Instructions <span className="text-muted-foreground/60">(optional)</span></label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="e.g. Complete these for your unit 1 revision"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Due date <span className="text-muted-foreground/60">(optional)</span></label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Question picker */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Questions — {selectedQIds.size} selected
            </label>
            {filteredQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">
                No questions for this subject yet. Add some in Content → Quiz Questions.
              </p>
            ) : (
              <div className="border border-input rounded-lg divide-y divide-border max-h-72 overflow-y-auto">
                {filteredQuestions.map(q => (
                  <label
                    key={q.id}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-accent transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedQIds.has(q.id)}
                      onChange={() => toggleQuestion(q.id)}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{q.question}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground capitalize">{q.difficulty}</span>
                        {q.topics && <span className="text-xs text-muted-foreground">{(q.topics as any).name}</span>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleCreate} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Create module'}
          </Button>
        </Card>
      )}

      {/* Module list */}
      {tab === 'list' && (
        <div className="space-y-3">
          {modules.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">
              No modules yet. Create one above.
            </Card>
          ) : (
            modules.map(mod => (
              <Card key={mod.id} className="overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4">
                  <Layers className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{mod.title}</p>
                      <Badge variant="secondary" className="text-xs">{(mod.subjects as any)?.name}</Badge>
                      <Badge
                        variant={mod.is_published ? 'default' : 'outline'}
                        className={`text-xs ${mod.is_published ? 'bg-green-600' : 'text-muted-foreground'}`}
                      >
                        {mod.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span>{qCounts[mod.id] ?? 0} questions</span>
                      {mod.due_date && (
                        <span>Due {new Date(mod.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {subCounts[mod.id] ?? 0} submitted
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => loadGradebook(mod)}
                      className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-xs flex items-center gap-1"
                      title="View gradebook"
                    >
                      {expandedId === mod.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => togglePublish(mod)}
                      disabled={togglingId === mod.id}
                      className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      title={mod.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {togglingId === mod.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : mod.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteModule(mod)}
                      disabled={deletingId === mod.id}
                      className="p-2 rounded-md text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete module"
                    >
                      {deletingId === mod.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Gradebook */}
                {expandedId === mod.id && gradebookData[mod.id] && (
                  <div className="border-t border-border bg-muted/30 px-5 py-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Gradebook</p>
                    {gradebookData[mod.id].length === 0 ? (
                      <p className="text-sm text-muted-foreground">No students enrolled in this subject.</p>
                    ) : (
                      <div className="space-y-2">
                        {gradebookData[mod.id].map(row => (
                          <div key={row.studentId} className="flex items-center gap-3">
                            <p className="text-sm flex-1 truncate">{row.name}</p>
                            {row.submission?.submitted_at ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {row.submission.score}/{row.submission.total_questions}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {Math.round((row.submission.score / row.submission.total_questions) * 100)}%
                                </span>
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Not submitted</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
