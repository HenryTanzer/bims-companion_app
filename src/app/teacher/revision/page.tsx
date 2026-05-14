import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTeacherContext } from '@/lib/teacher-subjects'
import { analyseStudentRevision, type RevisionPlan, type RevisionSubjectSummary } from '@/lib/revision-analysis'
import { TeacherRevisionPlans } from '@/components/teacher/revision-plans-manager'

export type TeacherRevisionStudent = {
  id: string
  full_name: string
  email: string
  subject_ids: string[]
  summaries: RevisionSubjectSummary[]
}

export default async function TeacherRevisionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { subjectIds, isAdmin } = await getTeacherContext(supabase, user.id)

  const [subjectsRes, enrollmentsRes, plansRes] = await Promise.all([
    isAdmin
      ? supabase.from('subjects').select('id, name, color').order('name')
      : subjectIds.length > 0
        ? supabase.from('subjects').select('id, name, color').in('id', subjectIds).order('name')
        : Promise.resolve({ data: [] }),
    isAdmin
      ? (supabase as any)
          .from('enrollments')
          .select('student_id, subject_id, profiles(id, full_name, email)')
      : subjectIds.length > 0
        ? (supabase as any)
            .from('enrollments')
            .select('student_id, subject_id, profiles(id, full_name, email)')
            .in('subject_id', subjectIds)
        : Promise.resolve({ data: [] }),
    isAdmin
      ? (supabase as any)
          .from('revision_plans')
          .select('id, student_id, subject_id, title, description, focus_areas, tasks, source, status, due_date, created_by, created_at, subjects(name, color), student:profiles!revision_plans_student_id_fkey(full_name, email)')
          .order('created_at', { ascending: false })
      : subjectIds.length > 0
        ? (supabase as any)
            .from('revision_plans')
            .select('id, student_id, subject_id, title, description, focus_areas, tasks, source, status, due_date, created_by, created_at, subjects(name, color), student:profiles!revision_plans_student_id_fkey(full_name, email)')
            .in('subject_id', subjectIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
  ])

  const studentMap = new Map<string, TeacherRevisionStudent>()
  for (const row of (enrollmentsRes.data ?? []) as any[]) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    if (!profile) continue
    const existing: TeacherRevisionStudent = studentMap.get(row.student_id) ?? {
      id: row.student_id,
      full_name: profile.full_name ?? 'Unknown student',
      email: profile.email ?? '',
      subject_ids: [],
      summaries: [],
    }
    if (!existing.subject_ids.includes(row.subject_id)) existing.subject_ids.push(row.subject_id)
    studentMap.set(row.student_id, existing)
  }

  const students = await Promise.all(
    [...studentMap.values()].map(async student => ({
      ...student,
      summaries: await analyseStudentRevision(supabase, student.id, isAdmin ? undefined : subjectIds),
    }))
  )

  const plans = plansRes.error ? [] : ((plansRes.data ?? []) as RevisionPlan[])
  const needsSql = plansRes.error?.code === '42P01' || plansRes.error?.message?.includes('revision_plans')

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Revision Plans</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create custom student plans and review AI-generated weak-point analysis.
        </p>
      </div>
      <TeacherRevisionPlans
        subjects={(subjectsRes.data ?? []) as { id: string; name: string; color: string }[]}
        students={students}
        initialPlans={plans}
        teacherId={user.id}
        needsSql={needsSql}
      />
    </div>
  )
}
