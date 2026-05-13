import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTeacherContext } from '@/lib/teacher-subjects'
import { GradebookView } from '@/components/teacher/gradebook-view'

export default async function GradebookPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { subjectIds, isAdmin } = await getTeacherContext(supabase, user.id)

  const [subjectsRes, modulesRes] = await Promise.all([
    isAdmin
      ? supabase.from('subjects').select('id, name, color')
      : subjectIds.length > 0
        ? supabase.from('subjects').select('id, name, color').in('id', subjectIds)
        : Promise.resolve({ data: [] }),
    isAdmin
      ? (supabase as any)
          .from('modules')
          .select('id, title, subject_id, due_date, is_published')
          .order('created_at', { ascending: false })
      : subjectIds.length > 0
        ? (supabase as any)
            .from('modules')
            .select('id, title, subject_id, due_date, is_published')
            .in('subject_id', subjectIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
  ])

  const modules = (modulesRes.data ?? []) as GradebookModule[]
  const moduleIds = modules.map(m => m.id)
  const subjects = (subjectsRes.data ?? []) as GradebookSubject[]
  const targetSubjectIds = subjects.map(s => s.id)

  const [enrollmentsRes, submissionsRes, qCountsRes] = await Promise.all([
    targetSubjectIds.length > 0
      ? (supabase as any)
          .from('enrollments')
          .select('student_id, subject_id, profiles(full_name)')
          .in('subject_id', targetSubjectIds)
      : Promise.resolve({ data: [] }),
    moduleIds.length > 0
      ? (supabase as any)
          .from('module_submissions')
          .select('student_id, module_id, score, total_questions, submitted_at')
          .in('module_id', moduleIds)
          .not('submitted_at', 'is', null)
      : Promise.resolve({ data: [] }),
    moduleIds.length > 0
      ? (supabase as any)
          .from('module_questions')
          .select('module_id')
          .in('module_id', moduleIds)
      : Promise.resolve({ data: [] }),
  ])

  const qCountByModule: Record<string, number> = {}
  for (const row of (qCountsRes.data ?? []) as any[]) {
    qCountByModule[row.module_id] = (qCountByModule[row.module_id] ?? 0) + 1
  }

  return (
    <div className="max-w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gradebook</h1>
        <p className="text-muted-foreground text-sm mt-1">
          All students × all modules. Scroll horizontally to see more columns.
        </p>
      </div>
      <GradebookView
        subjects={subjects}
        modules={modules.map(m => ({ ...m, question_count: qCountByModule[m.id] ?? 0 }))}
        enrollments={(enrollmentsRes.data ?? []) as GradebookEnrollment[]}
        submissions={(submissionsRes.data ?? []) as GradebookSubmission[]}
      />
    </div>
  )
}

// Types shared with client component
export type GradebookSubject = { id: string; name: string; color: string }
export type GradebookModule = {
  id: string
  title: string
  subject_id: string
  due_date: string | null
  is_published: boolean
  question_count?: number
}
export type GradebookEnrollment = {
  student_id: string
  subject_id: string
  profiles: { full_name: string | null } | null
}
export type GradebookSubmission = {
  student_id: string
  module_id: string
  score: number | null
  total_questions: number | null
  submitted_at: string | null
}
