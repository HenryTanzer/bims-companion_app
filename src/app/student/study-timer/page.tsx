import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StudyTimerView } from '@/components/student/study-timer-view'

export default async function StudyTimerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: enrollmentsData } = await supabase
    .from('enrollments')
    .select('subject_id, subjects(id, name, color)')
    .eq('student_id', user.id)

  const subjects = (enrollmentsData ?? [])
    .map((e: any) => e.subjects)
    .filter(Boolean) as { id: string; name: string; color: string }[]

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Study Timer</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Focus for a full session to earn XP. Pausing is fine — abandoning forfeits the reward.
        </p>
      </div>
      <StudyTimerView subjects={subjects} studentId={user.id} />
    </div>
  )
}
