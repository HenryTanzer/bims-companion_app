import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Brain, CreditCard, FileText, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default async function TeacherDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const name = (profile as any)?.full_name ?? 'Teacher'
  const firstName = name.split(' ')[0]

  const [studentsRes, questionsRes, flashcardsRes, papersRes, attemptsRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
    supabase.from('quiz_questions').select('id', { count: 'exact' }).eq('created_by', user.id),
    supabase.from('flashcards').select('id', { count: 'exact' }).eq('created_by', user.id),
    supabase.from('past_papers').select('id', { count: 'exact' }).eq('created_by', user.id),
    supabase.from('quiz_attempts').select('score, total_questions'),
  ])

  const avgScore = attemptsRes.data && attemptsRes.data.length > 0
    ? Math.round((attemptsRes.data as any[]).reduce((acc, a) => acc + ((a.score / a.total_questions) * 100), 0) / attemptsRes.data.length)
    : 0

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const stats = [
    { label: 'Students', value: studentsRes.count ?? 0, icon: Users, color: 'text-blue-500', href: '/teacher/students' },
    { label: 'Quiz Questions', value: questionsRes.count ?? 0, icon: Brain, color: 'text-purple-500', href: '/teacher/content' },
    { label: 'Flashcards', value: flashcardsRes.count ?? 0, icon: CreditCard, color: 'text-orange-500', href: '/teacher/content' },
    { label: 'Past Papers', value: papersRes.count ?? 0, icon: FileText, color: 'text-green-500', href: '/teacher/exam-center' },
  ]

  const quickActions = [
    { href: '/teacher/content?tab=questions', label: 'Add Quiz Question', icon: Brain, description: 'Create a new MCQ question' },
    { href: '/teacher/content?tab=flashcards', label: 'Add Flashcard', icon: CreditCard, description: 'Create a new flashcard' },
    { href: '/teacher/content?tab=topics', label: 'Add Topic', icon: FileText, description: 'Create a new subject topic' },
    { href: '/teacher/students', label: 'View Students', icon: Users, description: 'See student progress' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">{greeting}</p>
        <h1 className="text-2xl font-bold">{firstName}</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-4 pb-4">
                <Icon className={`w-5 h-5 ${color} mb-2`} />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Avg score */}
      <Card>
        <CardContent className="pt-4 pb-4 flex items-center gap-4">
          <TrendingUp className="w-8 h-8 text-primary" />
          <div>
            <p className="text-2xl font-bold">{avgScore}%</p>
            <p className="text-sm text-muted-foreground">Average quiz score across all students</p>
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map(({ href, label, icon: Icon, description }) => (
            <Link key={href} href={href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group h-full">
                <CardContent className="pt-5 pb-5">
                  <Icon className="w-5 h-5 text-primary mb-3" />
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
