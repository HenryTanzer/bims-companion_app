import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DailyChallengeView } from '@/components/student/daily-challenge-view'

function pickByDate(questions: any[], dateStr: string): any {
  let hash = 0
  for (const c of dateStr) hash = (hash * 31 + c.charCodeAt(0)) >>> 0
  return questions[hash % questions.length]
}

export default async function DailyChallengePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  // Check if already attempted today
  const { data: attempt } = await (supabase as any)
    .from('daily_challenge_attempts')
    .select('correct, xp_earned, question_id')
    .eq('student_id', user.id)
    .eq('challenge_date', today)
    .maybeSingle()

  if (attempt) {
    // Fetch question with answer revealed
    const { data: question } = await (supabase as any)
      .from('quiz_questions')
      .select('question, options, correct_answer, explanation, subjects(name)')
      .eq('id', attempt.question_id)
      .single()

    return (
      <DailyChallengeView
        mode="completed"
        question={question}
        result={{ correct: attempt.correct, xpEarned: attempt.xp_earned, correctAnswer: question?.correct_answer ?? 0 }}
      />
    )
  }

  // Get enrolled subjects
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('subject_id')
    .eq('student_id', user.id)

  const enrolledIds = (enrollments ?? []).map((e: any) => e.subject_id as string)

  if (!enrolledIds.length) {
    return (
      <div className="max-w-xl mx-auto pt-12 text-center space-y-2">
        <p className="text-lg font-semibold">No subjects enrolled</p>
        <p className="text-sm text-muted-foreground">Contact your teacher to be added to a subject.</p>
      </div>
    )
  }

  // Get all questions for enrolled subjects
  const { data: questions } = await (supabase as any)
    .from('quiz_questions')
    .select('id, question, options, subject_id, subjects(name)')
    .in('subject_id', enrolledIds)
    .order('id')

  if (!questions?.length) {
    return (
      <div className="max-w-xl mx-auto pt-12 text-center space-y-2">
        <p className="text-lg font-semibold">No questions available yet</p>
        <p className="text-sm text-muted-foreground">Your teacher hasn&apos;t added any questions. Check back soon.</p>
      </div>
    )
  }

  // Pick today's question deterministically — same question for everyone each day
  const question = pickByDate(questions, today)
  // Strip correct_answer so client can't read it before answering
  const { correct_answer: _hidden, ...safeQuestion } = question

  return (
    <DailyChallengeView
      mode="pending"
      question={safeQuestion}
    />
  )
}
