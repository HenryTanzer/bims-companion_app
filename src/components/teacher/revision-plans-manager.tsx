'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { AlertCircle, ClipboardList, Loader2, Plus, Target, Trash2 } from 'lucide-react'
import type { RevisionPlan, RevisionTask } from '@/lib/revision-analysis'
import type { TeacherRevisionStudent } from '@/app/teacher/revision/page'

type Subject = { id: string; name: string; color: string }

function parseLines(text: string): RevisionTask[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      title: line.length > 80 ? line.slice(0, 77) + '...' : line,
      detail: line,
      type: index === 0 ? 'lesson' : index === 1 ? 'quiz' : 'notes',
      estimated_minutes: 20,
    }))
}

export function TeacherRevisionPlans({
  subjects,
  students,
  initialPlans,
  teacherId,
  needsSql,
}: {
  subjects: Subject[]
  students: TeacherRevisionStudent[]
  initialPlans: RevisionPlan[]
  teacherId: string
  needsSql: boolean
}) {
  const supabase = useMemo(() => createClient(), [])
  const [plans, setPlans] = useState(initialPlans)
  const [studentId, setStudentId] = useState(students[0]?.id ?? '')
  const [subjectId, setSubjectId] = useState(students[0]?.subject_ids[0] ?? subjects[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [focusAreas, setFocusAreas] = useState('')
  const [tasksText, setTasksText] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const selectedStudent = students.find(student => student.id === studentId)
  const availableSubjects = subjects.filter(subject => selectedStudent?.subject_ids.includes(subject.id))
  const selectedSummary = selectedStudent?.summaries.find(summary => summary.id === subjectId)

  function handleStudentChange(nextStudentId: string) {
    const nextStudent = students.find(student => student.id === nextStudentId)
    setStudentId(nextStudentId)
    setSubjectId(nextStudent?.subject_ids[0] ?? '')
  }

  async function createPlan() {
    const tasks = parseLines(tasksText)
    if (!studentId || !subjectId || !title.trim() || tasks.length === 0) {
      toast.error('Choose a student, subject, title, and at least one task.')
      return
    }

    setSaving(true)
    const payload = {
      student_id: studentId,
      subject_id: subjectId,
      title: title.trim(),
      description: description.trim() || null,
      focus_areas: focusAreas.split(',').map(area => area.trim()).filter(Boolean),
      tasks,
      source: 'teacher',
      status: 'active',
      due_date: dueDate || null,
      created_by: teacherId,
    }

    const { data, error } = await (supabase as any)
      .from('revision_plans')
      .insert(payload)
      .select('id, student_id, subject_id, title, description, focus_areas, tasks, source, status, due_date, created_by, created_at, subjects(name, color), student:profiles!revision_plans_student_id_fkey(full_name, email)')
      .single()

    if (error) {
      toast.error('Failed to create revision plan.')
    } else {
      setPlans(prev => [data, ...prev])
      setTitle('')
      setDescription('')
      setFocusAreas('')
      setTasksText('')
      setDueDate('')
      toast.success('Revision plan assigned.')
    }
    setSaving(false)
  }

  async function archivePlan(planId: string) {
    const { error } = await (supabase as any)
      .from('revision_plans')
      .update({ status: 'archived' })
      .eq('id', planId)

    if (error) {
      toast.error('Failed to archive plan.')
    } else {
      setPlans(prev => prev.map(plan => plan.id === planId ? { ...plan, status: 'archived' } : plan))
      toast.success('Plan archived.')
    }
  }

  async function deletePlan(planId: string) {
    setDeletingId(planId)
    const { error } = await (supabase as any)
      .from('revision_plans')
      .delete()
      .eq('id', planId)

    if (error) {
      toast.error('Failed to delete plan.')
    } else {
      setPlans(prev => prev.filter(plan => plan.id !== planId))
      toast.success('Plan deleted.')
    }
    setDeletingId(null)
  }

  if (needsSql) {
    return (
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="py-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Revision plans need the database migration</p>
            <p className="text-sm text-muted-foreground mt-1">
              Run <span className="font-mono">supabase-revision-plans.sql</span> in Supabase, then refresh this page.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-6">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Assign custom plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Student</label>
              <select
                value={studentId}
                onChange={event => handleStudentChange(event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {students.map(student => (
                  <option key={student.id} value={student.id}>{student.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Subject</label>
              <select
                value={subjectId}
                onChange={event => setSubjectId(event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {availableSubjects.map(subject => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <input
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="e.g. Two-week data structures revision"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Focus areas</label>
              <input
                value={focusAreas}
                onChange={event => setFocusAreas(event.target.value)}
                placeholder="Comma separated"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <textarea
                value={description}
                onChange={event => setDescription(event.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Tasks</label>
              <textarea
                value={tasksText}
                onChange={event => setTasksText(event.target.value)}
                rows={5}
                placeholder={'One task per line\nReview lesson notes\nComplete a quiz\nAttempt a past-paper question'}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={event => setDueDate(event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <Button onClick={createPlan} disabled={saving || students.length === 0} className="w-full gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Assign plan
            </Button>
          </CardContent>
        </Card>

        {selectedSummary && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4" />
                Weak-point snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Metric label="Quiz avg" value={selectedSummary.quizAverage !== null ? `${selectedSummary.quizAverage}%` : 'No data'} />
                <Metric label="Lessons" value={`${selectedSummary.completedLessons}/${selectedSummary.totalLessons}`} />
              </div>
              {selectedSummary.weakAreas.length === 0 ? (
                <p className="text-sm text-muted-foreground">No clear weak points yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedSummary.weakAreas.slice(0, 4).map(area => (
                    <div key={`${area.label}:${area.reason}`} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{area.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">{area.reason}</p>
                        </div>
                        {area.score !== null && <Badge variant="outline">{area.score}%</Badge>}
                      </div>
                      <Progress value={area.score === null ? Math.min(100, area.priority) : Math.max(0, 100 - area.score)} className="h-1.5 mt-3" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Assigned and generated plans</h2>
        {plans.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No revision plans yet.
            </CardContent>
          </Card>
        ) : (
          plans.map(plan => (
            <Card key={plan.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex gap-2 flex-wrap mb-2">
                      <Badge variant={plan.source === 'ai' ? 'default' : 'secondary'}>
                        {plan.source === 'ai' ? 'AI' : 'Teacher'}
                      </Badge>
                      <Badge variant="outline">{plan.status}</Badge>
                      {plan.subjects && <Badge variant="outline">{plan.subjects.name}</Badge>}
                      {plan.student && <Badge variant="secondary">{plan.student.full_name}</Badge>}
                    </div>
                    <p className="font-semibold">{plan.title}</p>
                    {plan.description && <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => archivePlan(plan.id)} disabled={plan.status === 'archived'}>
                      <ClipboardList className="w-4 h-4" />
                    </Button>
                    {plan.source === 'teacher' && (
                      <Button size="icon" variant="ghost" className="hover:text-destructive" onClick={() => deletePlan(plan.id)} disabled={deletingId === plan.id}>
                        {deletingId === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                </div>

                {plan.focus_areas.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {plan.focus_areas.map(area => <Badge key={area} variant="outline" className="text-xs">{area}</Badge>)}
                  </div>
                )}

                <div className="space-y-1.5">
                  {plan.tasks.slice(0, 4).map((task, index) => (
                    <div key={`${task.title}-${index}`} className="text-sm rounded-lg bg-muted/40 px-3 py-2">
                      <span className="font-medium">{index + 1}. {task.title}</span>
                      <span className="text-muted-foreground"> · {task.estimated_minutes}m</span>
                    </div>
                  ))}
                  {plan.tasks.length > 4 && (
                    <p className="text-xs text-muted-foreground">+{plan.tasks.length - 4} more task{plan.tasks.length - 4 !== 1 ? 's' : ''}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold text-sm mt-0.5">{value}</p>
    </div>
  )
}
