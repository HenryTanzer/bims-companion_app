import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StudyBuddyChat } from '@/components/student/study-buddy-chat'

type Subject = { id: string; name: string; color: string }
type EnrollmentRow = { subjects: Subject | Subject[] | null }

export default async function StudyBuddyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('subject_id, subjects(id, name, color)')
    .eq('student_id', user.id)

  const enrolledSubjects = ((enrollments ?? []) as EnrollmentRow[])
    .flatMap(row => Array.isArray(row.subjects) ? row.subjects : row.subjects ? [row.subjects] : [])

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Study Buddy</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your AI tutor for A-Level revision. Ask questions, work through problems, or test your understanding.
        </p>
      </div>
      <StudyBuddyChat enrolledSubjects={enrolledSubjects} studentId={user.id} />
    </div>
  )
}
