import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ModuleManager } from '@/components/teacher/module-manager'

export default async function TeacherModulesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [subjectsRes, modulesRes, questionsRes] = await Promise.all([
    supabase.from('subjects').select('id, name, color'),
    (supabase as any)
      .from('modules')
      .select('id, title, description, due_date, is_published, subject_id, subjects(name), created_by')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('quiz_questions')
      .select('id, question, options, correct_answer, subject_id, difficulty, topics(name)')
      .order('created_at', { ascending: false }),
  ])

  // Get question counts per module
  const moduleIds = ((modulesRes.data ?? []) as any[]).map((m: any) => m.id)
  const { data: mqRows } = moduleIds.length
    ? await (supabase as any)
        .from('module_questions')
        .select('module_id, question_id')
        .in('module_id', moduleIds)
    : { data: [] }

  const qCountByModule: Record<string, number> = {}
  for (const row of (mqRows ?? []) as any[]) {
    qCountByModule[row.module_id] = (qCountByModule[row.module_id] ?? 0) + 1
  }

  // Get submission counts per module (for gradebook badge)
  const { data: subCounts } = moduleIds.length
    ? await (supabase as any)
        .from('module_submissions')
        .select('module_id')
        .in('module_id', moduleIds)
        .not('submitted_at', 'is', null)
    : { data: [] }

  const subCountByModule: Record<string, number> = {}
  for (const row of (subCounts ?? []) as any[]) {
    subCountByModule[row.module_id] = (subCountByModule[row.module_id] ?? 0) + 1
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Modules</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create assignments for your students. Students see published modules under their enrolled subject.
        </p>
      </div>
      <ModuleManager
        subjects={(subjectsRes.data ?? []) as any[]}
        initialModules={(modulesRes.data ?? []) as any[]}
        allQuestions={(questionsRes.data ?? []) as any[]}
        questionCountByModule={qCountByModule}
        submissionCountByModule={subCountByModule}
        userId={user.id}
      />
    </div>
  )
}
