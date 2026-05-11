import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Brain, CreditCard, FileText, BarChart2,
  Trophy, MessageSquare, Flame, Star, Target, Zap
} from 'lucide-react'

const XP_PER_LEVEL = 100

const quickLinks = [
  { href: '/student/quiz', label: 'Quiz', description: 'Test yourself', icon: Brain, color: 'bg-blue-500/10 text-blue-500' },
  { href: '/student/flashcards', label: 'Flashcards', description: 'Review key terms', icon: CreditCard, color: 'bg-purple-500/10 text-purple-500' },
  { href: '/student/exam-center', label: 'Exam Centre', description: 'Past papers', icon: FileText, color: 'bg-orange-500/10 text-orange-500' },
  { href: '/student/progress', label: 'Progress', description: 'Your analytics', icon: BarChart2, color: 'bg-green-500/10 text-green-500' },
  { href: '/student/leaderboard', label: 'Leaderboard', description: 'Class rankings', icon: Trophy, color: 'bg-yellow-500/10 text-yellow-500' },
  { href: '/student/study-buddy', label: 'Study Buddy', description: 'AI assistant', icon: MessageSquare, color: 'bg-pink-500/10 text-pink-500' },
  { href: '/student/daily-challenge', label: 'Daily Challenge', description: '+35 XP · resets daily', icon: Zap, color: 'bg-yellow-500/10 text-yellow-500' },
]

export default async function StudentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, progressRes, attemptsRes, enrollmentsRes, allSubjectsRes] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('user_progress').select('*').eq('student_id', user.id).single(),
    supabase.from('quiz_attempts').select('id').eq('student_id', user.id),
    supabase.from('enrollments').select('subject_id, subjects(name, color)').eq('student_id', user.id),
    supabase.from('subjects').select('id, name, color'),
  ])

  const name = (profileRes.data as any)?.full_name ?? 'Student'
  const firstName = name.split(' ')[0]
  const progress = progressRes.data as any
  const xp = progress?.xp ?? 0
  const level = progress?.level ?? 1
  const streak = progress?.streak ?? 0
  const weeklyGoal = progress?.weekly_goal ?? 5
  const lessonsThisWeek = progress?.lessons_this_week ?? 0
  const xpIntoLevel = xp % XP_PER_LEVEL
  const xpPercent = (xpIntoLevel / XP_PER_LEVEL) * 100
  const quizCount = attemptsRes.data?.length ?? 0
  const enrollments = (enrollmentsRes.data ?? []) as any[]
  const enrolledIds = enrollments.map(e => e.subject_id)
  const allSubjects = (allSubjectsRes.data ?? []) as any[]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="text-muted-foreground text-sm">{greeting}</p>
        <h1 className="text-2xl font-bold">{firstName}</h1>
      </div>

      {/* XP + Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground font-medium">Level</span>
            </div>
            <p className="text-2xl font-bold">{level}</p>
            <Progress value={xpPercent} className="h-1.5 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{xpIntoLevel}/{XP_PER_LEVEL} XP</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-muted-foreground font-medium">Streak</span>
            </div>
            <p className="text-2xl font-bold">{streak}</p>
            <p className="text-xs text-muted-foreground mt-1">day{streak !== 1 ? 's' : ''} in a row</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground font-medium">Total XP</span>
            </div>
            <p className="text-2xl font-bold">{xp}</p>
            <p className="text-xs text-muted-foreground mt-1">points earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground font-medium">Weekly Goal</span>
            </div>
            <p className="text-2xl font-bold">{lessonsThisWeek}/{weeklyGoal}</p>
            <Progress value={(lessonsThisWeek / weeklyGoal) * 100} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Enrolled subjects — read-only */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">My Subjects</CardTitle>
        </CardHeader>
        <CardContent>
          {enrolledIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You are not enrolled in any subjects yet. Contact your teacher to be added.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allSubjects.filter(s => enrolledIds.includes(s.id)).map(s => (
                <Badge key={s.id} variant="secondary" className="text-sm py-1 px-3">
                  {s.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Study Tools</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {quickLinks.map(({ href, label, description, icon: Icon, color }) => (
            <Link key={href} href={href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="pt-5 pb-5">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Your Progress</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-bold">{quizCount}</p>
            <p className="text-xs text-muted-foreground">Quizzes taken</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{enrolledIds.length}</p>
            <p className="text-xs text-muted-foreground">Subjects enrolled</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{streak}d</p>
            <p className="text-xs text-muted-foreground">Current streak</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
