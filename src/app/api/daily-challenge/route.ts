import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const { questionId, selectedIndex } = await request.json() as {
    questionId: string
    selectedIndex: number
  }
  if (!questionId || selectedIndex == null) {
    return Response.json({ error: 'Missing fields' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]

  // Guard: one attempt per day
  const { data: existing } = await (supabase as any)
    .from('daily_challenge_attempts')
    .select('id')
    .eq('student_id', user.id)
    .eq('challenge_date', today)
    .maybeSingle()

  if (existing) return Response.json({ error: 'Already attempted today' }, { status: 409 })

  // Fetch the question server-side to check the answer
  const { data: question } = await (supabase as any)
    .from('quiz_questions')
    .select('correct_answer, explanation')
    .eq('id', questionId)
    .single()

  if (!question) return Response.json({ error: 'Question not found' }, { status: 404 })

  const correct = selectedIndex === question.correct_answer
  const xpEarned = correct ? 35 : 5

  // Record attempt
  await (supabase as any).from('daily_challenge_attempts').insert({
    student_id: user.id,
    question_id: questionId,
    challenge_date: today,
    correct,
    xp_earned: xpEarned,
  })

  // Update XP, level, streak, weekly lessons (server-side equivalent of progress.ts)
  const { data: prog } = await (supabase as any)
    .from('user_progress')
    .select('xp, level, streak, last_active_date, lessons_this_week')
    .eq('student_id', user.id)
    .single()

  if (prog) {
    const lastActive = prog.last_active_date as string | null
    let newStreak = prog.streak as number
    if (lastActive !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yStr = yesterday.toISOString().split('T')[0]
      newStreak = lastActive === yStr ? newStreak + 1 : 1
    }
    const dow = new Date().getDay()
    const lastDow = lastActive ? new Date(lastActive).getDay() : -1
    const newLessons = dow === 1 && lastDow !== 1 ? 1 : (prog.lessons_this_week as number) + 1
    const newXp = (prog.xp as number) + xpEarned
    await (supabase as any).from('user_progress').update({
      xp: newXp,
      level: Math.floor(newXp / 100) + 1,
      streak: newStreak,
      last_active_date: today,
      lessons_this_week: newLessons,
      updated_at: new Date().toISOString(),
    }).eq('student_id', user.id)
  }

  return Response.json({
    correct,
    correctAnswer: question.correct_answer as number,
    explanation: question.explanation as string | null,
    xpEarned,
  })
}
