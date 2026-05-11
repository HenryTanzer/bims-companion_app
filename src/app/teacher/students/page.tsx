import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StudentEnroller } from '@/components/teacher/student-enroller'
import { getTeacherContext } from '@/lib/teacher-subjects'

export default async function StudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const teacherCtx = await getTeacherContext(supabase, user.id)
  const { subjectIds, isAdmin } = teacherCtx

  const [studentsRes, progressRes, attemptsRes, enrollmentsRes, subjectsRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email').eq('role', 'student').order('full_name'),
    supabase.from('user_progress').select('student_id, xp, level, streak'),
    supabase.from('quiz_attempts').select('student_id, score, total_questions'),
    supabase.from('enrollments').select('student_id, subject_id'),
    supabase.from('subjects').select('id, name'),
  ])

  const allSubjects = (subjectsRes.data ?? []) as any[]
  const allEnrollments = (enrollmentsRes.data ?? []) as any[]

  // Subjects this teacher can manage (for the enroller panel)
  const managedSubjects = isAdmin
    ? allSubjects
    : allSubjects.filter((s: any) => subjectIds.includes(s.id))

  // Student IDs enrolled in this teacher's subjects
  const studentIdsInUnit = isAdmin
    ? null // null = all students
    : [...new Set(
        allEnrollments
          .filter((e: any) => subjectIds.includes(e.subject_id))
          .map((e: any) => e.student_id as string)
      )]

  let students = (studentsRes.data ?? []) as any[]
  if (studentIdsInUnit !== null) {
    students = students.filter((s: any) => studentIdsInUnit.includes(s.id))
  }

  const progressMap = new Map((progressRes.data ?? []).map((p: any) => [p.student_id, p]))
  const enrollmentMap = new Map<string, string[]>()
  for (const e of allEnrollments) {
    const prev = enrollmentMap.get(e.student_id) ?? []
    enrollmentMap.set(e.student_id, [...prev, e.subject_id])
  }

  const attemptMap = new Map<string, { total: number; score: number; count: number }>()
  for (const a of (attemptsRes.data ?? []) as any[]) {
    const prev = attemptMap.get(a.student_id) ?? { total: 0, score: 0, count: 0 }
    attemptMap.set(a.student_id, {
      total: prev.total + a.total_questions,
      score: prev.score + a.score,
      count: prev.count + 1,
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Students</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {students.length} student{students.length !== 1 ? 's' : ''} in your unit.
          Expand a student to manage their subject enrolments.
        </p>
      </div>

      {students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No students enrolled in your unit yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {students.map((s: any) => {
            const prog = progressMap.get(s.id) as any
            const att = attemptMap.get(s.id)
            const xp = prog?.xp ?? 0
            const level = prog?.level ?? 1
            const streak = prog?.streak ?? 0
            const avgScore = att ? Math.round((att.score / att.total) * 100) : null
            const initials = s.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
            const enrolledIds = enrollmentMap.get(s.id) ?? []

            return (
              <Card key={s.id}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                      {/* Show all enrolled subjects as read-only badges */}
                      {enrolledIds.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap mt-1.5">
                          {allSubjects.filter((sub: any) => enrolledIds.includes(sub.id)).map((sub: any) => (
                            <Badge key={sub.id} variant="secondary" className="text-xs py-0 px-2">
                              {sub.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-center">
                        <p className="text-sm font-bold">Lv.{level}</p>
                        <p className="text-xs text-muted-foreground">{xp} XP</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold">{streak}d</p>
                        <p className="text-xs text-muted-foreground">streak</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold">{att?.count ?? 0}</p>
                        <p className="text-xs text-muted-foreground">quizzes</p>
                      </div>
                      {avgScore !== null && (
                        <Badge variant={avgScore >= 70 ? 'default' : avgScore >= 50 ? 'secondary' : 'destructive'}>
                          {avgScore}% avg
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Progress value={xp % 100} className="h-1 mt-3" />

                  {/* Enrolment manager scoped to teacher's subjects */}
                  <StudentEnroller
                    studentId={s.id}
                    studentName={s.full_name}
                    allSubjects={managedSubjects}
                    initialEnrolledIds={enrolledIds}
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
