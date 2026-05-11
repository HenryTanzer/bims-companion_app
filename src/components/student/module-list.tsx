'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Layers, Clock, CheckCircle2, AlertTriangle, ArrowRight, Inbox } from 'lucide-react'

type Module = {
  id: string
  title: string
  description: string | null
  due_date: string | null
  subject_id: string
  subjects: { name: string; color: string } | null
}

type Submission = {
  module_id: string
  score: number | null
  total_questions: number | null
  submitted_at: string | null
}

function getStatus(mod: Module, sub: Submission | undefined) {
  if (sub?.submitted_at) return 'submitted'
  if (mod.due_date && new Date(mod.due_date) < new Date()) return 'overdue'
  return 'not_started'
}

function formatDue(due: string) {
  const d = new Date(due)
  const now = new Date()
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  return `Due in ${diff}d`
}

export function ModuleList({
  modules,
  submissionByModule,
  questionCountByModule,
}: {
  modules: Module[]
  submissionByModule: Record<string, Submission>
  questionCountByModule: Record<string, number>
}) {
  if (modules.length === 0) {
    return (
      <Card className="p-8 flex flex-col items-center gap-3 text-center text-muted-foreground">
        <Inbox className="w-10 h-10 opacity-40" />
        <p className="text-sm">No modules assigned yet. Your teacher will post them here.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {modules.map(mod => {
        const sub = submissionByModule[mod.id]
        const status = getStatus(mod, sub)
        const qCount = questionCountByModule[mod.id] ?? 0

        return (
          <Card key={mod.id} className="flex items-center gap-4 px-5 py-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              status === 'submitted' ? 'bg-green-500/10 text-green-600' :
              status === 'overdue'   ? 'bg-red-500/10 text-red-500' :
                                       'bg-primary/10 text-primary'
            }`}>
              {status === 'submitted' ? <CheckCircle2 className="w-5 h-5" /> :
               status === 'overdue'   ? <AlertTriangle className="w-5 h-5" /> :
                                        <Layers className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm truncate">{mod.title}</p>
                {mod.subjects && (
                  <Badge variant="secondary" className="text-xs shrink-0">{mod.subjects.name}</Badge>
                )}
              </div>
              {mod.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{mod.description}</p>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{qCount} question{qCount !== 1 ? 's' : ''}</span>
                {mod.due_date && (
                  <span className={`flex items-center gap-1 ${status === 'overdue' ? 'text-red-500 font-medium' : ''}`}>
                    <Clock className="w-3 h-3" />
                    {formatDue(mod.due_date)}
                  </span>
                )}
                {status === 'submitted' && sub?.score !== null && (
                  <span className="text-green-600 font-medium">
                    {sub.score}/{sub.total_questions} correct
                  </span>
                )}
              </div>
            </div>

            <Link href={`/student/modules/${mod.id}`} className="shrink-0">
              <Button size="sm" variant={status === 'submitted' ? 'outline' : 'default'} className="gap-1.5">
                {status === 'submitted' ? 'View results' : status === 'overdue' ? 'Submit late' : 'Start'}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </Card>
        )
      })}
    </div>
  )
}
