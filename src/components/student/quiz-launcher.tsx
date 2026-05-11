'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, Trophy, Zap, RotateCcw, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { updateStudentProgress } from '@/lib/progress'

type Subject = { id: string; name: string; color: string }
type Topic = { id: string; subject_id: string; name: string }
type Question = {
  id: string
  question: string
  options: string[]
  correct_answer: number
  explanation: string | null
  difficulty: string
}

type Phase = 'setup' | 'quiz' | 'results'

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-500/10 text-green-600',
  medium: 'bg-yellow-500/10 text-yellow-600',
  hard: 'bg-red-500/10 text-red-600',
}

export function QuizLauncher({
  subjects, topics, studentId,
}: {
  subjects: Subject[]
  topics: Topic[]
  studentId: string
}) {
  const supabase = createClient()

  const [phase, setPhase] = useState<Phase>('setup')
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('all')
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(false)

  const filteredTopics = topics.filter(t => t.subject_id === subjectId)
  const selectedSubject = subjects.find(s => s.id === subjectId)

  async function startQuiz() {
    if (!subjectId) { toast.error('Please select a subject'); return }
    setLoading(true)

    let query = supabase
      .from('quiz_questions')
      .select('id, question, options, correct_answer, explanation, difficulty')
      .eq('subject_id', subjectId)

    if (topicId !== 'all') query = query.eq('topic_id', topicId)

    const { data, error } = await query.limit(10)

    if (error || !data || data.length === 0) {
      toast.error('No questions found for this selection. Ask your teacher to add some!')
      setLoading(false)
      return
    }

    // Shuffle questions
    const shuffled = [...data].sort(() => Math.random() - 0.5)
    setQuestions(shuffled)
    setCurrent(0)
    setSelected(null)
    setRevealed(false)
    setAnswers({})
    setScore(0)
    setPhase('quiz')
    setLoading(false)
  }

  function handleSelect(idx: number) {
    if (revealed) return
    setSelected(idx)
    setRevealed(true)

    const q = questions[current]
    const correct = idx === q.correct_answer
    if (correct) setScore(s => s + 1)
    setAnswers(prev => ({ ...prev, [q.id]: idx }))
  }

  function handleNext() {
    if (current + 1 >= questions.length) {
      finishQuiz()
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setRevealed(false)
    }
  }

  async function finishQuiz() {
    const total = questions.length
    const perfect = score === total
    const xpEarned = score * 10 + (perfect ? 25 : 0)

    // Save attempt
    await supabase.from('quiz_attempts').insert({
      student_id: studentId,
      subject_id: subjectId,
      topic_id: topicId !== 'all' ? topicId : null,
      score,
      total_questions: total,
      answers,
      xp_earned: xpEarned,
    } as any)

    await updateStudentProgress(studentId, xpEarned)
    setPhase('results')
  }

  // ── Setup screen ────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Choose your quiz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject</label>
            <Select value={subjectId} onValueChange={(v: string | null) => { if (v) { setSubjectId(v); setTopicId('all') } }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a subject">{subjects.find(s => s.id === subjectId)?.name ?? 'Select a subject'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {subjectId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Topic <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Select value={topicId} onValueChange={(v: string | null) => { if (v) setTopicId(v) }}>
                <SelectTrigger>
                  <SelectValue placeholder="All topics">{topicId === 'all' ? 'All topics' : (filteredTopics.find(t => t.id === topicId)?.name ?? 'All topics')}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All topics</SelectItem>
                  {filteredTopics.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="pt-2 space-y-3">
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>Up to 10 questions</span>
              <span>·</span>
              <span>+10 XP per correct answer</span>
              <span>·</span>
              <span>+25 XP bonus for perfect score</span>
            </div>
            <Button onClick={startQuiz} disabled={!subjectId || loading} className="w-full">
              {loading ? 'Loading...' : 'Start Quiz'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Quiz screen ─────────────────────────────────────────────
  if (phase === 'quiz') {
    const q = questions[current]
    const progress = ((current + (revealed ? 1 : 0)) / questions.length) * 100

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedSubject?.name}</Badge>
            <Badge className={cn('capitalize', DIFFICULTY_COLORS[q.difficulty])}>
              {q.difficulty}
            </Badge>
          </div>
          <span className="text-sm text-muted-foreground font-medium">
            {current + 1} / {questions.length}
          </span>
        </div>

        <Progress value={progress} className="h-1.5" />

        {/* Question */}
        <Card>
          <CardContent className="pt-6 pb-6">
            <p className="text-lg font-medium leading-relaxed mb-6">{q.question}</p>

            <div className="space-y-3">
              {q.options.map((opt, idx) => {
                let variant = 'outline'
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

            {/* Explanation */}
            {revealed && q.explanation && (
              <div className="mt-4 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Explanation: </span>
                {q.explanation}
              </div>
            )}

            {revealed && (
              <Button onClick={handleNext} className="w-full mt-4" size="lg">
                {current + 1 >= questions.length ? 'See Results' : 'Next Question'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Score tracker */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span>{score} correct so far</span>
        </div>
      </div>
    )
  }

  // ── Results screen ──────────────────────────────────────────
  if (phase === 'results') {
    const total = questions.length
    const perfect = score === total
    const xpEarned = score * 10 + (perfect ? 25 : 0)
    const pct = Math.round((score / total) * 100)

    return (
      <Card>
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div>
            {perfect
              ? <Trophy className="w-14 h-14 mx-auto text-yellow-500 mb-3" />
              : <CheckCircle2 className="w-14 h-14 mx-auto text-primary mb-3" />
            }
            <h2 className="text-2xl font-bold">{perfect ? 'Perfect Score!' : 'Quiz Complete'}</h2>
            <p className="text-muted-foreground text-sm mt-1">{selectedSubject?.name}</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-3xl font-bold">{score}/{total}</p>
              <p className="text-xs text-muted-foreground">Correct</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold">{pct}%</p>
              <p className="text-xs text-muted-foreground">Score</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Zap className="w-5 h-5 text-yellow-500" />
                <p className="text-3xl font-bold">+{xpEarned}</p>
              </div>
              <p className="text-xs text-muted-foreground">XP Earned</p>
            </div>
          </div>

          {perfect && (
            <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              🏆 Perfect score bonus: +25 XP
            </Badge>
          )}

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setPhase('setup')}>
              <RotateCcw className="w-4 h-4 mr-2" />
              New Quiz
            </Button>
            <Button onClick={startQuiz}>
              Retry Same Quiz
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
