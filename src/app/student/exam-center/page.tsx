import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExamCenterView } from '@/components/student/exam-center-view'

export default async function ExamCenterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('subject_id, subjects(id, name, color)')
    .eq('student_id', user.id)

  const enrolledSubjects = (enrollments ?? [])
    .map((e: any) => e.subjects)
    .filter(Boolean) as { id: string; name: string; color: string }[]

  const enrolledIds = enrolledSubjects.map(s => s.id)

  const { data: papers } = enrolledIds.length
    ? await supabase
        .from('past_papers')
        .select('id, subject_id, title, year, paper_number, file_url')
        .in('subject_id', enrolledIds)
        .order('year', { ascending: false })
        .order('paper_number', { ascending: true })
    : { data: [] }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exam Centre</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Past papers for your enrolled subjects. Click a paper to open it.
        </p>
      </div>
      <ExamCenterView
        subjects={enrolledSubjects}
        papers={(papers ?? []) as any[]}
      />
    </div>
  )
}
