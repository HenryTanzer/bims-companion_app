import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ModuleAttempt } from '@/components/student/module-attempt'

export default async function ModuleAttemptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch module
  const { data: mod } = await (supabase as any)
    .from('modules')
    .select('id, title, description, due_date, subject_id, subjects(name, color)')
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (!mod) notFound()

  // Fetch questions for this module (with full question data)
  const { data: mqRows } = await (supabase as any)
    .from('module_questions')
    .select('order_index, quiz_questions(id, question, options, correct_answer, explanation, difficulty)')
    .eq('module_id', id)
    .order('order_index')

  const questions = (mqRows ?? [])
    .map((row: any) => row.quiz_questions)
    .filter(Boolean)

  if (questions.length === 0) notFound()

  // Fetch existing submission if any
  const { data: submission } = await (supabase as any)
    .from('module_submissions')
    .select('id, answers, score, total_questions, submitted_at')
    .eq('module_id', id)
    .eq('student_id', user.id)
    .maybeSingle()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          {(mod.subjects as any)?.name}
        </p>
        <h1 className="text-2xl font-bold mt-0.5">{mod.title}</h1>
        {mod.description && (
          <p className="text-muted-foreground text-sm mt-1">{mod.description}</p>
        )}
      </div>
      <ModuleAttempt
        moduleId={id}
        moduleDueDate={mod.due_date}
        questions={questions}
        existingSubmission={submission ?? null}
        studentId={user.id}
        subjectName={(mod.subjects as any)?.name ?? ''}
      />
    </div>
  )
}
