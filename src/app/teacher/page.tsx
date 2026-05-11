import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Brain, CreditCard, FileText, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { getTeacherContext } from '@/lib/teacher-subjects'

export default async function TeacherDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const name = (profile as any)?.full_name ?? 'Teacher'
  const firstName = name.split(' ')[0]

  const teacherCtx = await getTeacherContext(supabase, user.id)
  const { subjectIds, isAdmin } = teacherCtx

  // Fetch teacher's own content counts (already scoped by created_by)
  const [questionsRes, flashcardsRes, papersRes] = await Promise.all([
    supabase.from('quiz_questions').select('id', { count: 'exact' }).eq('created_by', user.id),
    supabase.from('flashcards').select('id', { count: 'exact' }).eq('created_by', user.id),
    supabase.from('past_papers').select('id', { count: 'exact' }).eq('created_by', user.id),
  ])

  // Student count and avg score scoped to teacher's subjects (or all for admin)
  let studentCount = 0
  let avgScore = 0

  if (isAdmin) {
    const [studentsRes, attemptsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
      supabase.from('quiz_attempts').select('score, total_questions'),
    ])
    studentCount = studentsRes.count ?? 0
    const attempts = (attemptsRes.data ?? []) as any[]
    if (attempts.length > 0) {
      avgScore = Math.round(attempts.reduce((acc, a) => acc + ((a.score / a.total_questions) * 100), 0) / attempts.length)
    }
  } else if (subjectIds.length > 0) {
    const [enrollmentsRes, attemptsRes] = await Promise.all([
      supabase.from('enrollments').select('student_id').in('subject_id', subjectIds),
      supabase.from('quiz_attempts').select('score, total_questions').in('subject_id', subjectIds),
    ])
    const studentIds = [...new Set((enrollmentsRes.data ?? []).map((e: any) => e.student_id as string))]
    studentCount = studentIds.length
    const attempts = (attemptsRes.data ?? []) as any[]
    if (attempts.length > 0) {
      avgScore = Math.round(attempts.reduce((acc, a) => acc + ((a.score / a.total_questions) * 100), 0) / attempts.length)
    }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const stats = [
    { label: 'Students', value: studentCount, icon: Users, color: 'text-blue-500', href: '/teacher/students' },
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
            <p className="text-sm text-muted-foreground">Average quiz score across your students</p>
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
