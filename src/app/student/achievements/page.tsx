import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AchievementsView, achievementIcons, type Achievement } from '@/components/student/achievements-view'

export default async function AchievementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    progressRes,
    quizRes,
    flashcardRes,
    lessonProgressRes,
    moduleRes,
    studyRes,
    dailyRes,
  ] = await Promise.all([
    supabase.from('user_progress').select('xp, level, streak, lessons_this_week').eq('student_id', user.id).single(),
    supabase.from('quiz_attempts').select('score, total_questions').eq('student_id', user.id),
    supabase.from('flashcard_reviews').select('flashcard_id, review_count').eq('student_id', user.id),
    (supabase as any).from('lesson_progress').select('lesson_id, is_completed').eq('student_id', user.id),
    (supabase as any).from('module_submissions').select('id, score, total_questions').eq('student_id', user.id),
    (supabase as any).from('study_sessions').select('duration_minutes, completed').eq('student_id', user.id).eq('completed', true),
    (supabase as any).from('daily_challenge_attempts').select('id, correct').eq('student_id', user.id),
  ])

  const progress = progressRes.data as { xp?: number; level?: number; streak?: number; lessons_this_week?: number } | null
  const quizAttempts = (quizRes.data ?? []) as { score: number; total_questions: number }[]
  const flashReviews = (flashcardRes.data ?? []) as { flashcard_id: string; review_count: number }[]
  const lessonProgress = (lessonProgressRes.data ?? []) as { lesson_id: string; is_completed: boolean }[]
  const moduleSubmissions = (moduleRes.data ?? []) as { score: number | null; total_questions: number | null }[]
  const studySessions = (studyRes.data ?? []) as { duration_minutes: number; completed: boolean }[]
  const dailyAttempts = (dailyRes.data ?? []) as { correct: boolean }[]

  const xp = progress?.xp ?? 0
  const streak = progress?.streak ?? 0
  const completedLessons = lessonProgress.filter(row => row.is_completed).length
  const quizzesTaken = quizAttempts.length
  const perfectQuizzes = quizAttempts.filter(row => row.score === row.total_questions && row.total_questions > 0).length
  const flashcardsReviewed = flashReviews.length
  const flashcardReviewTotal = flashReviews.reduce((sum, row) => sum + (row.review_count ?? 1), 0)
  const modulesSubmitted = moduleSubmissions.length
  const perfectModules = moduleSubmissions.filter(row => row.total_questions && row.score === row.total_questions).length
  const focusMinutes = studySessions.reduce((sum, row) => sum + row.duration_minutes, 0)
  const dailyChallenges = dailyAttempts.length
  const dailyCorrect = dailyAttempts.filter(row => row.correct).length

  function make(
    id: string,
    title: string,
    description: string,
    category: Achievement['category'],
    icon: Achievement['icon'],
    current: number,
    target: number
  ): Achievement {
    return { id, title, description, category, icon, current, target, unlocked: current >= target }
  }

  const achievements: Achievement[] = [
    make('xp-100', 'First 100 XP', 'Earn your first 100 XP.', 'XP', achievementIcons.Star, xp, 100),
    make('xp-500', 'Momentum Builder', 'Earn 500 total XP.', 'XP', achievementIcons.Zap, xp, 500),
    make('xp-1000', 'Thousand Club', 'Earn 1,000 total XP.', 'XP', achievementIcons.Trophy, xp, 1000),
    make('streak-3', 'Three-Day Spark', 'Keep a 3 day study streak.', 'Streak', achievementIcons.Flame, streak, 3),
    make('streak-7', 'Week Warrior', 'Keep a 7 day study streak.', 'Streak', achievementIcons.Flame, streak, 7),
    make('quiz-1', 'First Quiz', 'Complete your first quiz.', 'Quiz', achievementIcons.Brain, quizzesTaken, 1),
    make('quiz-10', 'Quiz Regular', 'Complete 10 quizzes.', 'Quiz', achievementIcons.Brain, quizzesTaken, 10),
    make('quiz-perfect-1', 'Perfect Score', 'Score 100% on a quiz.', 'Quiz', achievementIcons.Medal, perfectQuizzes, 1),
    make('quiz-perfect-5', 'Sharp Shooter', 'Score 100% on 5 quizzes.', 'Quiz', achievementIcons.Target, perfectQuizzes, 5),
    make('lessons-5', 'Lesson Explorer', 'Complete 5 curriculum lessons.', 'Lessons', achievementIcons.BookOpen, completedLessons, 5),
    make('lessons-20', 'Course Climber', 'Complete 20 curriculum lessons.', 'Lessons', achievementIcons.GraduationCap, completedLessons, 20),
    make('flashcards-10', 'Card Starter', 'Review 10 flashcards.', 'Flashcards', achievementIcons.CreditCard, flashcardsReviewed, 10),
    make('flashcards-50', 'Memory Builder', 'Complete 50 flashcard reviews.', 'Flashcards', achievementIcons.CreditCard, flashcardReviewTotal, 50),
    make('focus-60', 'Focused Hour', 'Complete 60 minutes of study timer sessions.', 'Focus', achievementIcons.Timer, focusMinutes, 60),
    make('focus-300', 'Deep Work', 'Complete 300 minutes of study timer sessions.', 'Focus', achievementIcons.Timer, focusMinutes, 300),
    make('module-1', 'Module Submitted', 'Submit your first assigned module.', 'Modules', achievementIcons.Award, modulesSubmitted, 1),
    make('module-perfect-1', 'Module Mastery', 'Score 100% on a module.', 'Modules', achievementIcons.Medal, perfectModules, 1),
    make('daily-3', 'Daily Challenger', 'Attempt 3 daily challenges.', 'Daily', achievementIcons.Target, dailyChallenges, 3),
    make('daily-correct-3', 'Daily Accuracy', 'Answer 3 daily challenges correctly.', 'Daily', achievementIcons.CheckCircle2, dailyCorrect, 3),
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Achievements</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track milestones across quizzes, lessons, flashcards, focus time, and streaks.
        </p>
      </div>
      <AchievementsView achievements={achievements} />
    </div>
  )
}
