import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Brain, CreditCard, FileText, BarChart2,
  Trophy, MessageSquare, Flame, Star, Target, Zap,
  GraduationCap, Layers, BookOpen, Bell
} from 'lucide-react'

const XP_PER_LEVEL = 100

const quickLinks = [
  { href: '/student/quiz',            label: 'Quiz',            description: 'Test yourself',       icon: Brain,         bg: 'bg-blue-500/15',   text: 'text-blue-400',   border: 'border-blue-500/20' },
  { href: '/student/flashcards',      label: 'Flashcards',      description: 'Review key terms',    icon: CreditCard,    bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/20' },
  { href: '/student/exam-center',     label: 'Exam Centre',     description: 'Past papers',         icon: FileText,      bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/20' },
  { href: '/student/progress',        label: 'Progress',        description: 'Your analytics',      icon: BarChart2,     bg: 'bg-green-500/15',  text: 'text-green-400',  border: 'border-green-500/20' },
  { href: '/student/leaderboard',     label: 'Leaderboard',     description: 'Class rankings',      icon: Trophy,        bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  { href: '/student/study-buddy',     label: 'Study Buddy',     description: 'AI assistant',        icon: MessageSquare, bg: 'bg-pink-500/15',   text: 'text-pink-400',   border: 'border-pink-500/20' },
  { href: '/student/daily-challenge', label: 'Daily Challenge', description: '+35 XP · resets daily', icon: Zap,         bg: 'bg-amber-500/15',  text: 'text-amber-400',  border: 'border-amber-500/20' },
  { href: '/student/modules',         label: 'Modules',         description: 'Assignments',         icon: Layers,        bg: 'bg-teal-500/15',   text: 'text-teal-400',   border: 'border-teal-500/20' },
  { href: '/student/review',          label: 'Review',          description: 'Weak areas',          icon: BookOpen,      bg: 'bg-rose-500/15',   text: 'text-rose-400',   border: 'border-rose-500/20' },
  { href: '/student/notifications',   label: 'Notifications',   description: 'Announcements',       icon: Bell,          bg: 'bg-sky-500/15',    text: 'text-sky-400',    border: 'border-sky-500/20' },
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
  const enrolledSubjects = allSubjects.filter(s => enrolledIds.includes(s.id))

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent border border-primary/20 p-6">
        <GraduationCap className="absolute -right-6 -top-6 w-48 h-48 text-primary/8 pointer-events-none" />
        <p className="text-sm text-primary/70 font-medium">{greeting},</p>
        <h1 className="text-3xl font-bold mt-0.5">{firstName}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="flex items-center gap-1.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full px-3 py-1 text-xs font-semibold">
            <Star className="w-3 h-3" /> Level {level}
          </span>
          <span className="flex items-center gap-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full px-3 py-1 text-xs font-semibold">
            <Zap className="w-3 h-3" /> {xp} XP
          </span>
          {streak > 0 && (
            <span className="flex items-center gap-1.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full px-3 py-1 text-xs font-semibold">
              <Flame className="w-3 h-3" /> {streak}d streak
            </span>
          )}
          {enrolledSubjects.map(s => (
            <span
              key={s.id}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border"
              style={{ backgroundColor: s.color + '20', color: s.color, borderColor: s.color + '40' }}
            >
              {s.name}
            </span>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Level */}
        <Card className="overflow-hidden border-yellow-500/20">
          <CardContent className="pt-4 pb-4 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/15 to-yellow-500/5 pointer-events-none" />
            <div className="relative">
              <Star className="w-5 h-5 text-yellow-400 mb-2" />
              <p className="text-2xl font-bold">{level}</p>
              <Progress value={xpPercent} className="h-1.5 mt-2" />
              <p className="text-xs text-muted-foreground mt-1">{xpIntoLevel}/{XP_PER_LEVEL} XP</p>
            </div>
          </CardContent>
        </Card>

        {/* Streak */}
        <Card className="overflow-hidden border-orange-500/20">
          <CardContent className="pt-4 pb-4 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/15 to-orange-500/5 pointer-events-none" />
            <div className="relative">
              <Flame className="w-5 h-5 text-orange-400 mb-2" />
              <p className="text-2xl font-bold">{streak}</p>
              <p className="text-xs text-muted-foreground mt-1">day{streak !== 1 ? 's' : ''} in a row</p>
            </div>
          </CardContent>
        </Card>

        {/* Total XP */}
        <Card className="overflow-hidden border-blue-500/20">
          <CardContent className="pt-4 pb-4 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 to-blue-500/5 pointer-events-none" />
            <div className="relative">
              <Zap className="w-5 h-5 text-blue-400 mb-2" />
              <p className="text-2xl font-bold">{xp}</p>
              <p className="text-xs text-muted-foreground mt-1">total XP earned</p>
            </div>
          </CardContent>
        </Card>

        {/* Weekly goal */}
        <Card className="overflow-hidden border-green-500/20">
          <CardContent className="pt-4 pb-4 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/15 to-green-500/5 pointer-events-none" />
            <div className="relative">
              <Target className="w-5 h-5 text-green-400 mb-2" />
              <p className="text-2xl font-bold">{lessonsThisWeek}/{weeklyGoal}</p>
              <Progress value={(lessonsThisWeek / weeklyGoal) * 100} className="h-1.5 mt-2" />
              <p className="text-xs text-muted-foreground mt-1">weekly goal</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Study Tools</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {quickLinks.map(({ href, label, description, icon: Icon, bg, text, border }) => (
            <Link key={href} href={href}>
              <Card className={`hover:shadow-lg transition-all cursor-pointer group h-full border ${border} hover:-translate-y-0.5`}>
                <CardContent className="pt-4 pb-4">
                  <div className={`inline-flex items-center justify-center w-11 h-11 rounded-2xl mb-3 ${bg} ${text}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className={`font-semibold text-sm group-hover:${text} transition-colors`}>{label}</p>
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
