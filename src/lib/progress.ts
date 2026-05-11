import { createClient } from '@/lib/supabase/client'

/**
 * Updates XP, level, streak, and weekly lesson count for a student.
 * Call this at the end of every quiz or flashcard session.
 */
export async function updateStudentProgress(studentId: string, xpGained: number) {
  const supabase = createClient()

  const { data: prog } = await supabase
    .from('user_progress')
    .select('xp, level, streak, last_active_date, lessons_this_week')
    .eq('student_id', studentId)
    .single()

  if (!prog) return

  const p = prog as any
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const lastActive = p.last_active_date as string | null

  // Streak logic
  let newStreak = p.streak as number
  if (lastActive !== today) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    if (lastActive === yesterdayStr) {
      newStreak += 1       // continued streak
    } else {
      newStreak = 1        // streak broken — reset to 1 for today
    }
  }

  // Weekly lesson count — reset on Monday
  const dayOfWeek = new Date().getDay() // 0=Sun, 1=Mon
  const lastActiveDate = lastActive ? new Date(lastActive) : null
  const lastDayOfWeek = lastActiveDate ? lastActiveDate.getDay() : -1
  const newWeek = dayOfWeek === 1 && lastDayOfWeek !== 1  // it's Monday and we haven't reset yet
  const newLessonsThisWeek = newWeek ? 1 : (p.lessons_this_week as number) + 1

  const newXp = (p.xp as number) + xpGained
  const newLevel = Math.floor(newXp / 100) + 1

  await (supabase as any)
    .from('user_progress')
    .update({
      xp: newXp,
      level: newLevel,
      streak: newStreak,
      last_active_date: today,
      lessons_this_week: newLessonsThisWeek,
      updated_at: new Date().toISOString(),
    })
    .eq('student_id', studentId)
}
