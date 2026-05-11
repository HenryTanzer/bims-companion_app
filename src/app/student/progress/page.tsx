import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Flame, Star, Zap, Target, Brain, CreditCard } from 'lucide-react'

const XP_PER_LEVEL = 100

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [progRes, attemptsRes, reviewsRes, enrollRes] = await Promise.all([
    supabase.from('user_progress').select('*').eq('student_id', user.id).single(),
    supabase.from('quiz_attempts').select('score, total_questions, xp_earned, completed_at, subjects(name)').eq('student_id', user.id).order('completed_at', { ascending: false }).limit(20),
    supabase.from('flashcard_reviews').select('flashcard_id, confidence, last_reviewed_at').eq('student_id', user.id),
    supabase.from('enrollments').select('subjects(name, color)').eq('student_id', user.id),
  ])

  const prog = progRes.data as any
  const xp = prog?.xp ?? 0
  const level = prog?.level ?? 1
  const streak = prog?.streak ?? 0
  const weeklyGoal = prog?.weekly_goal ?? 5
  const lessonsThisWeek = prog?.lessons_this_week ?? 0
  const xpIntoLevel = xp % XP_PER_LEVEL
  const xpPercent = (xpIntoLevel / XP_PER_LEVEL) * 100

  const attempts = (attemptsRes.data ?? []) as any[]
  const reviews = (reviewsRes.data ?? []) as any[]
  const subjects = ((enrollRes.data ?? []) as any[]).map(e => e.subjects).filter(Boolean)

  const totalQuizzes = attempts.length
  const avgScore = totalQuizzes > 0
    ? Math.round(attempts.reduce((acc, a) => acc + (a.score / a.total_questions) * 100, 0) / totalQuizzes)
    : 0
  const totalXpFromQuizzes = attempts.reduce((acc, a) => acc + (a.xp_earned ?? 0), 0)
  const totalCardsReviewed = reviews.length

  // Score by subject
  const subjectScores: Record<string, { total: number; count: number }> = {}
  for (const a of attempts) {
    const name = a.subjects?.name ?? 'Unknown'
    if (!subjectScores[name]) subjectScores[name] = { total: 0, count: 0 }
    subjectScores[name].total += (a.score / a.total_questions) * 100
    subjectScores[name].count += 1
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Progress</h1>
        <p className="text-muted-foreground text-sm mt-1">Your study stats at a glance.</p>
      </div>

      {/* XP & Level */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" /> Level & XP
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-4xl font-bold">Level {level}</p>
              <p className="text-muted-foreground text-sm mt-1">{xp} total XP</p>
            </div>
            <p className="text-sm text-muted-foreground">{xpIntoLevel}/{XP_PER_LEVEL} XP to Level {level + 1}</p>
          </div>
          <Progress value={xpPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <Flame className="w-4 h-4 text-orange-500 mb-2" />
            <p className="text-2xl font-bold">{streak}</p>
            <p className="text-xs text-muted-foreground">Day streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <Target className="w-4 h-4 text-green-500 mb-2" />
            <p className="text-2xl font-bold">{lessonsThisWeek}/{weeklyGoal}</p>
            <p className="text-xs text-muted-foreground">Weekly goal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <Brain className="w-4 h-4 text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{totalQuizzes}</p>
            <p className="text-xs text-muted-foreground">Quizzes taken</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <CreditCard className="w-4 h-4 text-purple-500 mb-2" />
            <p className="text-2xl font-bold">{totalCardsReviewed}</p>
            <p className="text-xs text-muted-foreground">Cards reviewed</p>
          </CardContent>
        </Card>
      </div>

      {/* Average score + subject breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Quiz Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Overall average</p>
            <div className="flex items-center gap-2">
              <Progress value={avgScore} className="w-32 h-2" />
              <span className="text-sm font-bold w-10 text-right">{avgScore}%</span>
            </div>
          </div>
          {Object.entries(subjectScores).map(([name, { total, count }]) => {
            const avg = Math.round(total / count)
            return (
              <div key={name} className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{name}</p>
                <div className="flex items-center gap-2">
                  <Progress value={avg} className="w-32 h-2" />
                  <span className="text-sm font-bold w-10 text-right">{avg}%</span>
                </div>
              </div>
            )
          })}
          {totalQuizzes === 0 && (
            <p className="text-sm text-muted-foreground">No quizzes taken yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Recent quiz history */}
      {attempts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Quizzes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {attempts.slice(0, 8).map((a, i) => {
              const pct = Math.round((a.score / a.total_questions) * 100)
              const date = new Date(a.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              return (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">{a.subjects?.name ?? '—'}</Badge>
                    <span className="text-sm text-muted-foreground">{date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{a.score}/{a.total_questions}</span>
                    <span className={`text-sm font-bold ${pct >= 70 ? 'text-green-500' : pct >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {pct}%
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Zap className="w-3 h-3 text-yellow-500" />
                      +{a.xp_earned}
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
