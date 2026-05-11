'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Zap, CheckCircle2, XCircle, Trophy } from 'lucide-react'
import { toast } from 'sonner'

type Question = {
  id: string
  question: string
  options: string[]
  subjects: { name: string } | null
}

type CompletedQuestion = Question & {
  correct_answer: number
  explanation: string | null
}

type Result = {
  correct: boolean
  correctAnswer: number
  xpEarned: number
}

function formatDate() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function DailyChallengeView(
  props:
    | { mode: 'pending'; question: Question }
    | { mode: 'completed'; question: CompletedQuestion; result: Result }
) {
  const [selected, setSelected] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Result | null>(
    props.mode === 'completed' ? props.result : null
  )

  const question = props.question
  const subjectName = question.subjects?.name ?? 'General'
  const done = props.mode === 'completed' || result !== null
  const correctAnswer = props.mode === 'completed' ? props.question.correct_answer : result?.correctAnswer ?? null
  const explanation = props.mode === 'completed' ? props.question.explanation : null

  async function handleSubmit() {
    if (selected === null || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/daily-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.id, selectedIndex: selected }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Something went wrong.')
      } else {
        setResult(json)
      }
    } catch {
      toast.error('Could not submit. Check your connection.')
    }
    setSubmitting(false)
  }

  function optionStyle(i: number) {
    if (!done && selected !== i) return 'border-border bg-background hover:bg-accent hover:border-primary/40 cursor-pointer'
    if (!done && selected === i) return 'border-primary bg-primary/10 cursor-pointer'
    // Completed state
    if (i === correctAnswer) return 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
    if (i === selected && i !== correctAnswer) return 'border-red-400 bg-red-500/10 text-red-600 dark:text-red-400'
    return 'border-border bg-background opacity-50'
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h1 className="text-2xl font-bold">Daily Challenge</h1>
          </div>
          <p className="text-sm text-muted-foreground">{formatDate()}</p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1 gap-1">
          <Zap className="w-3.5 h-3.5 text-yellow-500" />
          +35 XP
        </Badge>
      </div>

      {/* Subject badge */}
      <div>
        <Badge variant="outline">{subjectName}</Badge>
      </div>

      {/* Result banner */}
      {result && (
        <Card className={result.correct ? 'border-green-500/50 bg-green-500/5' : 'border-red-400/50 bg-red-500/5'}>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            {result.correct
              ? <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
              : <XCircle className="w-6 h-6 text-red-500 shrink-0" />}
            <div>
              <p className="font-semibold">
                {result.correct ? 'Correct!' : 'Incorrect'}
              </p>
              <p className="text-sm text-muted-foreground">
                +{result.xpEarned} XP earned · come back tomorrow for the next challenge
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1 text-yellow-500 font-bold">
              <Trophy className="w-4 h-4" />
              +{result.xpEarned}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Already completed banner (no interaction needed) */}
      {props.mode === 'completed' && !result && (
        <Card className={props.result.correct ? 'border-green-500/50 bg-green-500/5' : 'border-red-400/50 bg-red-500/5'}>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            {props.result.correct
              ? <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
              : <XCircle className="w-6 h-6 text-red-500 shrink-0" />}
            <div>
              <p className="font-semibold">
                {props.result.correct ? 'You got it right!' : 'You got this one wrong'}
              </p>
              <p className="text-sm text-muted-foreground">
                +{props.result.xpEarned} XP · come back tomorrow for a new challenge
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question card */}
      <Card>
        <CardContent className="pt-5 pb-5 space-y-4">
          <p className="font-medium leading-relaxed">{question.question}</p>

          <div className="space-y-2">
            {question.options.map((opt, i) => (
              <button
                key={i}
                disabled={done || submitting}
                onClick={() => !done && setSelected(i)}
                className={`w-full text-left flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${optionStyle(i)}`}
              >
                <span className="font-semibold shrink-0 w-5">{['A', 'B', 'C', 'D'][i]}.</span>
                <span className="flex-1">{opt}</span>
                {done && i === correctAnswer && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                {done && i === selected && i !== correctAnswer && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
              </button>
            ))}
          </div>

          {/* Explanation */}
          {done && (explanation || (props.mode === 'completed' && (props.question as CompletedQuestion).explanation)) && (
            <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Explanation: </span>
              {explanation ?? (props.question as CompletedQuestion).explanation}
            </div>
          )}

          {/* Submit button */}
          {!done && (
            <Button
              onClick={handleSubmit}
              disabled={selected === null || submitting}
              className="w-full"
            >
              {submitting ? 'Submitting…' : 'Submit Answer'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
