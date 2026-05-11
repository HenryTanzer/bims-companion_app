'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, PartyPopper } from 'lucide-react'

type WeakQuestion = {
  id: string
  question: string
  options: string[]
  correct_answer: number
  explanation: string | null
  subject_id: string
  subjects: { name: string; color: string } | null
  topics: { name: string } | null
}

type QuestionState = {
  selected: number | null
  checked: boolean
}

export function ReviewView({ questions }: { questions: WeakQuestion[] }) {
  const [states, setStates] = useState<Record<string, QuestionState>>(
    Object.fromEntries(questions.map(q => [q.id, { selected: null, checked: false }]))
  )

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <PartyPopper className="w-10 h-10 text-yellow-500" />
        <p className="font-semibold text-lg">All caught up!</p>
        <p className="text-sm text-muted-foreground">
          Your most recent quiz attempts show no incorrect answers. Keep it up!
        </p>
      </div>
    )
  }

  // Group by subject
  const bySubject: Record<string, WeakQuestion[]> = {}
  for (const q of questions) {
    const key = q.subjects?.name ?? 'Unknown'
    if (!bySubject[key]) bySubject[key] = []
    bySubject[key].push(q)
  }

  const masteredCount = Object.values(states).filter(
    (s, i) => s.checked && s.selected === questions[i]?.correct_answer
  ).length

  function select(qId: string, i: number) {
    setStates(prev => {
      if (prev[qId].checked) return prev
      return { ...prev, [qId]: { ...prev[qId], selected: i } }
    })
  }

  function check(qId: string) {
    setStates(prev => ({ ...prev, [qId]: { ...prev[qId], checked: true } }))
  }

  function optionStyle(q: WeakQuestion, i: number) {
    const s = states[q.id]
    if (!s.checked) {
      return s.selected === i
        ? 'border-primary bg-primary/10 cursor-pointer'
        : 'border-border bg-background hover:bg-accent hover:border-primary/40 cursor-pointer'
    }
    if (i === q.correct_answer) return 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
    if (i === s.selected && i !== q.correct_answer) return 'border-red-400 bg-red-500/10 text-red-600 dark:text-red-400'
    return 'border-border bg-background opacity-50'
  }

  return (
    <div className="space-y-8">
      {/* Progress summary */}
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{questions.length}</span> question{questions.length !== 1 ? 's' : ''} to review
        {masteredCount > 0 && (
          <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
            · {masteredCount} mastered this session
          </span>
        )}
      </p>

      {Object.entries(bySubject).map(([subjectName, qs]) => {
        const subjectColor = qs[0].subjects?.color ?? '#6366f1'
        return (
          <div key={subjectName} className="space-y-3">
            {/* Subject header */}
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: subjectColor }} />
              <h2 className="font-semibold text-sm">{subjectName}</h2>
              <span className="text-xs text-muted-foreground">({qs.length})</span>
            </div>

            {qs.map((q, idx) => {
              const s = states[q.id]
              const mastered = s.checked && s.selected === q.correct_answer
              return (
                <Card key={q.id} className={mastered ? 'border-green-500/40' : ''}>
                  <CardContent className="pt-4 pb-4 space-y-3">
                    {/* Question header */}
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-sm leading-relaxed flex-1">{q.question}</p>
                      {mastered && (
                        <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 shrink-0 gap-1" variant="outline">
                          <CheckCircle2 className="w-3 h-3" />
                          Mastered
                        </Badge>
                      )}
                    </div>

                    {/* Topic badge */}
                    {q.topics?.name && (
                      <p className="text-xs text-muted-foreground">{q.topics.name}</p>
                    )}

                    {/* Options */}
                    <div className="space-y-2">
                      {q.options.map((opt, i) => (
                        <button
                          key={i}
                          disabled={s.checked}
                          onClick={() => select(q.id, i)}
                          className={`w-full text-left flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${optionStyle(q, i)}`}
                        >
                          <span className="font-semibold w-5 shrink-0">{['A', 'B', 'C', 'D'][i]}.</span>
                          <span className="flex-1">{opt}</span>
                          {s.checked && i === q.correct_answer && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                          {s.checked && i === s.selected && i !== q.correct_answer && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                        </button>
                      ))}
                    </div>

                    {/* Explanation */}
                    {s.checked && q.explanation && (
                      <div className="rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Explanation: </span>
                        {q.explanation}
                      </div>
                    )}

                    {/* Check button */}
                    {!s.checked && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={s.selected === null}
                        onClick={() => check(q.id)}
                      >
                        Check Answer
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
