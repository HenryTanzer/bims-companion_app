import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { analyseStudentRevision, type RevisionPlan } from '@/lib/revision-analysis'
import { RevisionPlansView } from '@/components/student/revision-plans-view'

export default async function RevisionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [subjects, plansRes] = await Promise.all([
    analyseStudentRevision(supabase, user.id),
    (supabase as any)
      .from('revision_plans')
      .select('id, student_id, subject_id, title, description, focus_areas, tasks, source, status, due_date, created_by, created_at, subjects(name, color)')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const plans = plansRes.error ? [] : ((plansRes.data ?? []) as RevisionPlan[])
  const needsSql = plansRes.error?.code === '42P01' || plansRes.error?.message?.includes('revision_plans')

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Revision Plans</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Plans built from your quiz scores, lesson completion, flashcard confidence, and teacher guidance.
        </p>
      </div>
      <RevisionPlansView subjects={subjects} initialPlans={plans} needsSql={needsSql} />
    </div>
  )
}
