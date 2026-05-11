import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReviewView } from '@/components/student/review-view'

export default async function ReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get last 40 quiz attempts, most recent first
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('answers')
    .eq('student_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(40)

  if (!attempts?.length) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Review</h1>
          <p className="text-muted-foreground text-sm mt-1">Questions you&apos;ve answered incorrectly.</p>
        </div>
        <p className="text-sm text-muted-foreground">
          You haven&apos;t taken any quizzes yet. Complete a quiz and your weak areas will appear here.
        </p>
      </div>
    )
  }

  // Most recent selected answer per question (iterating newest → oldest)
  const recentAnswer: Record<string, number> = {}
  for (const attempt of (attempts as any[])) {
    const answers = (attempt as any).answers as Record<string, number>
    for (const [qId, selected] of Object.entries(answers)) {
      if (!(qId in recentAnswer)) recentAnswer[qId] = selected
    }
  }

  const questionIds = Object.keys(recentAnswer)
  if (!questionIds.length) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Review</h1>
          <p className="text-muted-foreground text-sm mt-1">Questions you&apos;ve answered incorrectly.</p>
        </div>
        <p className="text-sm text-muted-foreground">No questions found in your attempt history.</p>
      </div>
    )
  }

  // Fetch those questions with full details
  const { data: questions } = await (supabase as any)
    .from('quiz_questions')
    .select('id, question, options, correct_answer, explanation, subject_id, subjects(name, color), topics(name)')
    .in('id', questionIds)

  // Keep only questions the student got wrong in their most recent attempt
  const weak = ((questions ?? []) as any[]).filter(
    (q: any) => recentAnswer[q.id] !== q.correct_answer
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Review</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Questions from your recent quizzes that you got wrong. Practice until you master them.
        </p>
      </div>
      <ReviewView questions={weak} />
    </div>
  )
}
