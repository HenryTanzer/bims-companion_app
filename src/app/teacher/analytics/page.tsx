import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, Users, Brain, Zap } from 'lucide-react'
import { getTeacherContext } from '@/lib/teacher-subjects'

export default async function TeacherAnalytics() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { subjectIds, isAdmin } = await getTeacherContext(supabase, user.id)

  const [attemptsRes, studentsRes, subjectsRes, progressRes, enrollmentsRes] = await Promise.all([
    isAdmin
      ? supabase.from('quiz_attempts').select('student_id, subject_id, score, total_questions, completed_at').order('completed_at', { ascending: false })
      : subjectIds.length > 0
        ? supabase.from('quiz_attempts').select('student_id, subject_id, score, total_questions, completed_at').in('subject_id', subjectIds).order('completed_at', { ascending: false })
        : Promise.resolve({ data: [] }),
    supabase.from('profiles').select('id, full_name').eq('role', 'student'),
    isAdmin
      ? supabase.from('subjects').select('id, name, color')
      : subjectIds.length > 0
        ? supabase.from('subjects').select('id, name, color').in('id', subjectIds)
        : Promise.resolve({ data: [] }),
    supabase.from('user_progress').select('student_id, xp, lessons_this_week'),
    isAdmin
      ? Promise.resolve({ data: [] })
      : subjectIds.length > 0
        ? supabase.from('enrollments').select('student_id').in('subject_id', subjectIds)
        : Promise.resolve({ data: [] }),
  ])

  const allAttempts = (attemptsRes.data ?? []) as any[]
  const allStudents = (studentsRes.data ?? []) as any[]
  const subjects = (subjectsRes.data ?? []) as any[]
  const allProgress = (progressRes.data ?? []) as any[]

  // Scope students to teacher's unit (or all for admin)
  const unitStudentIds = isAdmin
    ? null
    : [...new Set((enrollmentsRes.data ?? []).map((e: any) => e.student_id as string))]

  const students = unitStudentIds === null
    ? allStudents
    : allStudents.filter((s: any) => unitStudentIds.includes(s.id))

  const unitProgress = unitStudentIds === null
    ? allProgress
    : allProgress.filter((p: any) => unitStudentIds.includes(p.student_id))

  const studentMap = new Map(students.map((s: any) => [s.id, s.full_name]))
  const subjectMap = new Map(subjects.map((s: any) => [s.id, s]))

  // Summary stats
  const totalAttempts = allAttempts.length
  const avgScore = totalAttempts > 0
    ? Math.round(allAttempts.reduce((acc, a) => acc + (a.score / a.total_questions) * 100, 0) / totalAttempts)
    : 0
  const totalXP = unitProgress.reduce((acc: number, p: any) => acc + (p.xp ?? 0), 0)
  const activeThisWeek = unitProgress.filter((p: any) => (p.lessons_this_week ?? 0) > 0).length

  // Per-subject breakdown
  const subjectStats = new Map<string, { attempts: number; totalPct: number }>()
  for (const a of allAttempts) {
    const prev = subjectStats.get(a.subject_id) ?? { attempts: 0, totalPct: 0 }
    subjectStats.set(a.subject_id, {
      attempts: prev.attempts + 1,
      totalPct: prev.totalPct + (a.score / a.total_questions) * 100,
    })
  }
  const subjectRows = subjects.map((s: any) => {
    const stat = subjectStats.get(s.id)
    return {
      id: s.id,
      name: s.name,
      color: s.color,
      attempts: stat?.attempts ?? 0,
      avgScore: stat ? Math.round(stat.totalPct / stat.attempts) : 0,
    }
  }).sort((a, b) => b.attempts - a.attempts)

  // Top performers (min 3 attempts, scoped to unit students)
  const studentAttemptMap = new Map<string, { total: number; scoreSum: number; count: number }>()
  for (const a of allAttempts) {
    if (unitStudentIds !== null && !unitStudentIds.includes(a.student_id)) continue
    const prev = studentAttemptMap.get(a.student_id) ?? { total: 0, scoreSum: 0, count: 0 }
    studentAttemptMap.set(a.student_id, {
      total: prev.total + a.total_questions,
      scoreSum: prev.scoreSum + a.score,
      count: prev.count + 1,
    })
  }
  const topPerformers = [...studentAttemptMap.entries()]
    .filter(([, v]) => v.count >= 3)
    .map(([id, v]) => ({
      id,
      name: studentMap.get(id) ?? 'Unknown',
      avgScore: Math.round((v.scoreSum / v.total) * 100),
      count: v.count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 5)

  // Recent activity (last 15)
  const recentActivity = allAttempts.slice(0, 15).map((a: any) => ({
    studentName: studentMap.get(a.student_id) ?? 'Unknown',
    subject: (subjectMap.get(a.subject_id) as any)?.name ?? '—',
    score: a.score,
    total: a.total_questions,
    pct: Math.round((a.score / a.total_questions) * 100),
    date: new Date(a.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  }))

  const summaryStats = [
    { label: 'Total Quiz Attempts', value: totalAttempts, icon: Brain, color: 'text-purple-500' },
    { label: 'Average Score', value: `${avgScore}%`, icon: TrendingUp, color: 'text-green-500' },
    { label: 'Active This Week', value: activeThisWeek, icon: Users, color: 'text-blue-500' },
    { label: 'Total XP Earned', value: totalXP.toLocaleString(), icon: Zap, color: 'text-yellow-500' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Quiz performance and student activity in your unit.</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryStats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <Icon className={`w-5 h-5 ${color} mb-2`} />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-subject breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Performance by Subject</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {subjectRows.every(s => s.attempts === 0) ? (
            <p className="text-muted-foreground text-sm text-center py-4">No quiz attempts yet.</p>
          ) : (
            subjectRows.map((s) => (
              <div key={s.id}>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                    <span className="font-medium text-sm">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.attempts} attempt{s.attempts !== 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-sm font-semibold">{s.attempts > 0 ? `${s.avgScore}%` : '—'}</span>
                </div>
                <Progress value={s.avgScore} className="h-2" />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top performers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            {topPerformers.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No students with 3+ attempts yet.</p>
            ) : (
              <div className="space-y-3">
                {topPerformers.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.count} quizzes</p>
                    </div>
                    <Badge variant={p.avgScore >= 70 ? 'default' : p.avgScore >= 50 ? 'secondary' : 'destructive'}>
                      {p.avgScore}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Quiz Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No quiz attempts yet.</p>
            ) : (
              <div className="space-y-2.5">
                {recentActivity.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{a.studentName}</p>
                      <p className="text-xs text-muted-foreground">{a.subject} · {a.date}</p>
                    </div>
                    <Badge variant={a.pct >= 70 ? 'default' : a.pct >= 50 ? 'secondary' : 'destructive'}>
                      {a.score}/{a.total}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
