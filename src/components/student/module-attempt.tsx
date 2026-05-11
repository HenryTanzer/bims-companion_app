'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, Trophy, Zap, ArrowRight, ArrowLeft, Clock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { updateStudentProgress } from '@/lib/progress'

type Question = {
  id: string
  question: string
  options: string[]
  correct_answer: number
  explanation: string | null
  difficulty: string
}

type Submission = {
  id: string
  answers: Record<string, number>
  score: number
  total_questions: number
  submitted_at: string
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-500/10 text-green-600',
  medium: 'bg-yellow-500/10 text-yellow-600',
  hard: 'bg-red-500/10 text-red-600',
}

export function ModuleAttempt({
  moduleId,
  moduleDueDate,
  questions,
  existingSubmission,
  studentId,
  subjectName,
}: {
  moduleId: string
  moduleDueDate: string | null
  questions: Question[]
  existingSubmission: Submission | null
  studentId: string
  subjectName: string
}) {
  const supabase = createClient()

  const isOverdue = moduleDueDate ? new Date(moduleDueDate) < new Date() : false

  // If already submitted, show results directly
  const [phase, setPhase] = useState<'attempt' | 'results'>(
    existingSubmission ? 'results' : 'attempt'
  )
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [answers, setAnswers] = useState<Record<string, number>>(
    existingSubmission?.answers ?? {}
  )
  const [score, setScore] = useState(existingSubmission?.score ?? 0)
  const [submitting, setSubmitting] = useState(false)

  const q = questions[current]
  const progress = ((current + (revealed ? 1 : 0)) / questions.length) * 100

  function handleSelect(idx: number) {
    if (revealed) return
    setSelected(idx)
    setRevealed(true)
    const correct = idx === q.correct_answer
    if (correct) setScore(s => s + 1)
    setAnswers(prev => ({ ...prev, [q.id]: idx }))
  }

  function handleNext() {
    if (current + 1 >= questions.length) {
      submitModule()
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setRevealed(false)
    }
  }

  function handlePrev() {
    if (current > 0) {
      setCurrent(c => c - 1)
      const prevQ = questions[current - 1]
      const prevAnswer = answers[prevQ.id]
      setSelected(prevAnswer ?? null)
      setRevealed(prevAnswer !== undefined)
    }
  }

  async function submitModule() {
    setSubmitting(true)
    const finalScore = Object.entries(answers).filter(([qid, ans]) => {
      const found = questions.find(q => q.id === qid)
      return found && found.correct_answer === ans
    }).length
    const xpEarned = finalScore * 10

    if (!navigator.onLine) {
      const { enqueueWrite } = await import('@/lib/offline-db')
      await enqueueWrite({
        type: 'module_submission',
        payload: {
          module_id: moduleId,
          student_id: studentId,
          answers,
          score: finalScore,
          total_questions: questions.length,
          xp_earned: xpEarned,
        },
      })
      toast.info('You\'re offline — your submission has been saved and will sync when you reconnect.')
      setScore(finalScore)
      setPhase('results')
      setSubmitting(false)
      return
    }

    const { error } = await (supabase as any)
      .from('module_submissions')
      .upsert({
        module_id: moduleId,
        student_id: studentId,
        answers,
        score: finalScore,
        total_questions: questions.length,
        submitted_at: new Date().toISOString(),
      })

    if (error) {
      toast.error('Failed to submit. Please try again.')
      setSubmitting(false)
      return
    }

    await updateStudentProgress(studentId, xpEarned)
    setScore(finalScore)
    setPhase('results')
    setSubmitting(false)
  }

  // ── Results view ────────────────────────────────────────────
  if (phase === 'results') {
    const total = existingSubmission?.total_questions ?? questions.length
    const finalScore = existingSubmission?.score ?? score
    const pct = total > 0 ? Math.round((finalScore / total) * 100) : 0
    const xpEarned = finalScore * 10
    const submittedAt = existingSubmission?.submitted_at
      ? new Date(existingSubmission.submitted_at).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric',
        })
      : 'Just now'

    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            {pct >= 70
              ? <Trophy className="w-14 h-14 mx-auto text-yellow-500 mb-3" />
              : <CheckCircle2 className="w-14 h-14 mx-auto text-primary mb-3" />}
            <div>
              <h2 className="text-2xl font-bold">
                {existingSubmission && !submitting ? 'Previous results' : 'Submitted!'}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">Submitted {submittedAt}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-3xl font-bold">{finalScore}/{total}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{pct}%</p>
                <p className="text-xs text-muted-foreground">Score</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <p className="text-3xl font-bold">+{xpEarned}</p>
                </div>
                <p className="text-xs text-muted-foreground">XP Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Per-question review */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Question review</p>
          {questions.map((q, i) => {
            const studentAnswer = (existingSubmission?.answers ?? answers)[q.id]
            const isCorrect = studentAnswer === q.correct_answer
            return (
              <Card key={q.id} className={cn('px-4 py-3', isCorrect ? 'border-green-500/30' : 'border-red-500/30')}>
                <div className="flex items-start gap-3">
                  {isCorrect
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    : <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                    {studentAnswer !== undefined && studentAnswer !== q.correct_answer && (
                      <p className="text-xs text-red-500 mt-1">Your answer: {q.options[studentAnswer]}</p>
                    )}
                    <p className="text-xs text-green-600 mt-0.5">Correct: {q.options[q.correct_answer]}</p>
                    {q.explanation && (
                      <p className="text-xs text-muted-foreground mt-1">{q.explanation}</p>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Attempt view ────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {isOverdue && (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          This module is past its due date. You can still submit a late attempt.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{subjectName}</Badge>
          <Badge className={cn('capitalize', DIFFICULTY_COLORS[q.difficulty])}>
            {q.difficulty}
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground font-medium">
          {current + 1} / {questions.length}
        </span>
      </div>

      <Progress value={progress} className="h-1.5" />

      {moduleDueDate && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          Due {new Date(moduleDueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      )}

      <Card>
        <CardContent className="pt-6 pb-6">
          <p className="text-lg font-medium leading-relaxed mb-6">{q.question}</p>

          <div className="space-y-3">
            {q.options.map((opt, idx) => {
              let extraClass = 'border-border hover:border-primary/50 hover:bg-accent'
              if (revealed) {
                if (idx === q.correct_answer) {
                  extraClass = 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
                } else if (idx === selected && idx !== q.correct_answer) {
                  extraClass = 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                } else {
                  extraClass = 'border-border opacity-50'
                }
              }
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={revealed}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all flex items-center gap-3',
                    extraClass
                  )}
                >
                  <span className="shrink-0 w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {revealed && idx === q.correct_answer && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                  {revealed && idx === selected && idx !== q.correct_answer && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                </button>
              )
            })}
          </div>

          {revealed && q.explanation && (
            <div className="mt-4 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Explanation: </span>
              {q.explanation}
            </div>
          )}

          {revealed && (
            <div className="flex gap-3 mt-4">
              {current > 0 && (
                <Button variant="outline" onClick={handlePrev} className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
              )}
              <Button onClick={handleNext} className="flex-1 gap-2" disabled={submitting}>
                {submitting
                  ? 'Submitting…'
                  : current + 1 >= questions.length
                    ? 'Submit module'
                    : 'Next question'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="w-4 h-4 text-green-500" />
        <span>{Object.keys(answers).length} of {questions.length} answered</span>
      </div>
    </div>
  )
}
