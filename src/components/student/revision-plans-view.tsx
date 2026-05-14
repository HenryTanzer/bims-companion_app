'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  AlertCircle, BookOpen, Brain, CheckCircle2, ClipboardList, Loader2,
  Sparkles, Target, Timer, Zap,
} from 'lucide-react'
import type { RevisionPlan, RevisionSubjectSummary, RevisionTask } from '@/lib/revision-analysis'

const taskIcons: Record<RevisionTask['type'], React.ElementType> = {
  lesson: BookOpen,
  quiz: Brain,
  flashcards: Zap,
  notes: ClipboardList,
  'exam-practice': Target,
  'study-session': Timer,
}

function taskLabel(type: RevisionTask['type']) {
  return type
    .split('-')
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

function statusVariant(status: RevisionPlan['status']) {
  if (status === 'completed') return 'default'
  if (status === 'archived') return 'secondary'
  return 'outline'
}

export function RevisionPlansView({
  subjects,
  initialPlans,
  needsSql,
}: {
  subjects: RevisionSubjectSummary[]
  initialPlans: RevisionPlan[]
  needsSql: boolean
}) {
  const supabase = useMemo(() => createClient(), [])
  const [plans, setPlans] = useState<RevisionPlan[]>(initialPlans)
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id ?? '')
  const [generating, setGenerating] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const activePlans = plans.filter(plan => plan.status === 'active')
  const olderPlans = plans.filter(plan => plan.status !== 'active')
  const selectedSubject = subjects.find(subject => subject.id === selectedSubjectId)

  async function generatePlan() {
    if (!selectedSubjectId || generating) return
    setGenerating(true)

    const res = await fetch('/api/revision-plans/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId: selectedSubjectId }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? 'Failed to generate revision plan.')
      setGenerating(false)
      return
    }

    const body = await res.json() as { plan: RevisionPlan }
    setPlans(prev => [body.plan, ...prev])
    toast.success('Revision plan generated.')
    setGenerating(false)
  }

  async function updateStatus(planId: string, status: RevisionPlan['status']) {
    setUpdatingId(planId)
    const { error } = await (supabase as any)
      .from('revision_plans')
      .update({ status })
      .eq('id', planId)

    if (error) {
      toast.error('Failed to update revision plan.')
    } else {
      setPlans(prev => prev.map(plan => plan.id === planId ? { ...plan, status } : plan))
      toast.success(status === 'completed' ? 'Plan marked complete.' : 'Plan updated.')
    }
    setUpdatingId(null)
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
    <div className="space-y-6">
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI-assisted plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">You are not enrolled in any subjects yet.</p>
          ) : (
            <>
              <div className="flex gap-2 flex-wrap">
                {subjects.map(subject => (
                  <button
                    key={subject.id}
                    onClick={() => setSelectedSubjectId(subject.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      selectedSubjectId === subject.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {subject.name}
                  </button>
                ))}
              </div>

              {selectedSubject && (
                <div className="grid md:grid-cols-4 gap-3">
                  <Metric label="Quiz avg" value={selectedSubject.quizAverage !== null ? `${selectedSubject.quizAverage}%` : 'No data'} />
                  <Metric label="Module avg" value={selectedSubject.moduleAverage !== null ? `${selectedSubject.moduleAverage}%` : 'No data'} />
                  <Metric label="Lessons" value={`${selectedSubject.completedLessons}/${selectedSubject.totalLessons}`} />
                  <Metric label="Low cards" value={String(selectedSubject.lowConfidenceCards)} />
                </div>
              )}

              <Button onClick={generatePlan} disabled={generating || !selectedSubjectId} className="gap-2">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? 'Generating...' : 'Generate revision plan'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {subjects.some(subject => subject.weakAreas.length > 0) && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Pinpointed weak points</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {subjects.flatMap(subject => subject.weakAreas.slice(0, 3).map(area => (
              <Card key={`${subject.id}:${area.label}:${area.reason}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{area.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{area.reason}</p>
                    </div>
                    <Badge variant="outline">{subject.name}</Badge>
                  </div>
                  <Progress value={area.score === null ? Math.min(100, area.priority) : Math.max(0, 100 - area.score)} className="h-1.5" />
                </CardContent>
              </Card>
            )))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Active plans</h2>
        {activePlans.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No active revision plans yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activePlans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                updating={updatingId === plan.id}
                onUpdateStatus={updateStatus}
              />
            ))}
          </div>
        )}
      </section>

      {olderPlans.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">History</h2>
          <div className="space-y-3">
            {olderPlans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                updating={updatingId === plan.id}
                onUpdateStatus={updateStatus}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold text-sm mt-0.5">{value}</p>
    </div>
  )
}

function PlanCard({
  plan,
  updating,
  onUpdateStatus,
}: {
  plan: RevisionPlan
  updating: boolean
  onUpdateStatus: (planId: string, status: RevisionPlan['status']) => void
}) {
  const totalMinutes = plan.tasks.reduce((sum, task) => sum + (task.estimated_minutes ?? 0), 0)
  const date = new Date(plan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={plan.source === 'ai' ? 'default' : 'secondary'}>
                {plan.source === 'ai' ? 'AI plan' : 'Teacher plan'}
              </Badge>
              <Badge variant={statusVariant(plan.status)}>{plan.status}</Badge>
              {plan.subjects && <Badge variant="outline">{plan.subjects.name}</Badge>}
              <span className="text-xs text-muted-foreground">{date}</span>
            </div>
            <h3 className="font-semibold mt-2">{plan.title}</h3>
            {plan.description && <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold">{totalMinutes} min</p>
            <p className="text-xs text-muted-foreground">estimated</p>
          </div>
        </div>

        {plan.focus_areas.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {plan.focus_areas.map(area => (
              <Badge key={area} variant="outline" className="text-xs">{area}</Badge>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {plan.tasks.map((task, index) => {
            const Icon = taskIcons[task.type] ?? ClipboardList
            const content = (
              <div className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/40 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{index + 1}. {task.title}</p>
                    <Badge variant="secondary" className="text-[10px]">{taskLabel(task.type)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{task.detail}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{task.estimated_minutes}m</span>
              </div>
            )

            return task.link
              ? <Link key={`${task.title}-${index}`} href={task.link}>{content}</Link>
              : <div key={`${task.title}-${index}`}>{content}</div>
          })}
        </div>

        <div className="flex gap-2 flex-wrap">
          {plan.status !== 'completed' && (
            <Button
              size="sm"
              onClick={() => onUpdateStatus(plan.id, 'completed')}
              disabled={updating}
              className="gap-2"
            >
              {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Mark complete
            </Button>
          )}
          {plan.status !== 'archived' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus(plan.id, 'archived')}
              disabled={updating}
            >
              Archive
            </Button>
          )}
          {plan.status !== 'active' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus(plan.id, 'active')}
              disabled={updating}
            >
              Reopen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
