import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { QuizLauncher } from '@/components/student/quiz-launcher'

export default async function QuizPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [subjectsRes, topicsRes] = await Promise.all([
    supabase.from('subjects').select('id, name, color'),
    supabase.from('topics').select('id, subject_id, name'),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Practice Quiz</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Each correct answer earns +10 XP. A perfect score earns a bonus +25 XP.
        </p>
      </div>
      <QuizLauncher
        subjects={subjectsRes.data ?? []}
        topics={topicsRes.data ?? []}
        studentId={user.id}
      />
    </div>
  )
}
