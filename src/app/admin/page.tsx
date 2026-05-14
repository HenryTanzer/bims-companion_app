import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, GraduationCap, BookOpen, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { resolveAvatarSrc } from '@/lib/career-avatars'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const name = (profile as any)?.full_name ?? 'Admin'
  const firstName = name.split(' ')[0]

  const [studentsRes, teachersRes, subjectsRes, attemptsRes, recentUsersRes, enrollmentsRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
    supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'teacher'),
    supabase.from('subjects').select('id, name, color'),
    supabase.from('quiz_attempts').select('score, total_questions'),
    supabase.from('profiles').select('id, full_name, email, role, created_at, avatar_url').order('created_at', { ascending: false }).limit(8),
    supabase.from('enrollments').select('student_id, subject_id'),
  ])

  const subjects = (subjectsRes.data ?? []) as any[]
  const enrollments = (enrollmentsRes.data ?? []) as any[]
  const attempts = (attemptsRes.data ?? []) as any[]
  const recentUsers = (recentUsersRes.data ?? []) as any[]

  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((acc, a) => acc + (a.score / a.total_questions) * 100, 0) / attempts.length)
    : 0

  // Per-subject student count
  const subjectStudentCount = new Map<string, number>()
  for (const e of enrollments) {
    subjectStudentCount.set(e.subject_id, (subjectStudentCount.get(e.subject_id) ?? 0) + 1)
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const stats = [
    { label: 'Students', value: studentsRes.count ?? 0, icon: Users, color: 'text-blue-500', href: '/admin/users' },
    { label: 'Teachers', value: teachersRes.count ?? 0, icon: GraduationCap, color: 'text-green-500', href: '/admin/teachers' },
    { label: 'Subjects', value: subjects.length, icon: BookOpen, color: 'text-purple-500', href: '/admin/teachers' },
    { label: 'Avg Quiz Score', value: `${avgScore}%`, icon: TrendingUp, color: 'text-orange-500', href: '/admin/users' },
  ]

  const roleBadgeVariant = (role: string) =>
    role === 'admin' ? 'destructive' : role === 'teacher' ? 'default' : 'secondary'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">{greeting}</p>
        <h1 className="text-2xl font-bold">{firstName}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Administrator</p>
      </div>

      {/* Summary stats */}
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Per-subject breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Students per Subject</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No subjects found.</p>
            ) : (
              subjects.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-sm font-medium">{s.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {subjectStudentCount.get(s.id) ?? 0} student{(subjectStudentCount.get(s.id) ?? 0) !== 1 ? 's' : ''}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent sign-ups */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Sign-ups</CardTitle>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No users yet.</p>
            ) : (
              <div className="space-y-2.5">
                {recentUsers.map((u: any) => {
                  const initials = u.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  const avatarSrc = resolveAvatarSrc(u.avatar_url)
                  return (
                  <div key={u.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      {avatarSrc && <AvatarImage src={avatarSrc} alt={u.full_name} />}
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <Badge variant={roleBadgeVariant(u.role)} className="text-xs shrink-0">
                      {u.role}
                    </Badge>
                  </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
