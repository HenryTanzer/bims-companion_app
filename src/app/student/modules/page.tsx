import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ModuleList } from '@/components/student/module-list'

export default async function StudentModulesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get enrolled subject IDs
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('subject_id')
    .eq('student_id', user.id)

  const enrolledIds = (enrollments ?? []).map((e: any) => e.subject_id as string)

  // Get published modules for enrolled subjects
  const { data: modules } = enrolledIds.length
    ? await (supabase as any)
        .from('modules')
        .select('id, title, description, due_date, subject_id, subjects(name, color)')
        .in('subject_id', enrolledIds)
        .eq('is_published', true)
        .order('due_date', { ascending: true, nullsFirst: false })
    : { data: [] }

  // Get this student's submissions for those modules
  const moduleIds = (modules ?? []).map((m: any) => m.id as string)
  const { data: submissions } = moduleIds.length
    ? await (supabase as any)
        .from('module_submissions')
        .select('module_id, score, total_questions, submitted_at')
        .eq('student_id', user.id)
        .in('module_id', moduleIds)
    : { data: [] }

  // Get question counts per module
  const { data: questionCounts } = moduleIds.length
    ? await (supabase as any)
        .from('module_questions')
        .select('module_id')
        .in('module_id', moduleIds)
    : { data: [] }

  const countByModule: Record<string, number> = {}
  for (const row of (questionCounts ?? []) as any[]) {
    countByModule[row.module_id] = (countByModule[row.module_id] ?? 0) + 1
  }

  const submissionByModule: Record<string, any> = {}
  for (const sub of (submissions ?? []) as any[]) {
    submissionByModule[sub.module_id] = sub
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Modules</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Assignments set by your teacher. Complete them before the due date.
        </p>
      </div>
      <ModuleList
        modules={(modules ?? []) as any[]}
        submissionByModule={submissionByModule}
        questionCountByModule={countByModule}
      />
    </div>
  )
}
