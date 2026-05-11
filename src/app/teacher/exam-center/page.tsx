import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExamCenterManager } from '@/components/teacher/exam-center-manager'
import { getTeacherContext } from '@/lib/teacher-subjects'

export default async function TeacherExamCenter() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { subjectIds, isAdmin } = await getTeacherContext(supabase, user.id)

  const [subjectsRes, papersRes, topicsRes] = await Promise.all([
    isAdmin
      ? supabase.from('subjects').select('id, name, color')
      : subjectIds.length > 0
        ? supabase.from('subjects').select('id, name, color').in('id', subjectIds)
        : Promise.resolve({ data: [] }),
    isAdmin
      ? supabase.from('past_papers').select('id, subject_id, title, year, paper_number, file_url, created_by, subjects(name)').order('year', { ascending: false }).order('paper_number', { ascending: true })
      : subjectIds.length > 0
        ? supabase.from('past_papers').select('id, subject_id, title, year, paper_number, file_url, created_by, subjects(name)').in('subject_id', subjectIds).order('year', { ascending: false }).order('paper_number', { ascending: true })
        : Promise.resolve({ data: [] }),
    isAdmin
      ? supabase.from('topics').select('id, name, subject_id').order('name')
      : subjectIds.length > 0
        ? supabase.from('topics').select('id, name, subject_id').in('subject_id', subjectIds).order('name')
        : Promise.resolve({ data: [] }),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exam Centre</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload past papers for students to access. Requires a <code className="text-xs bg-muted px-1 py-0.5 rounded">past-papers</code> public storage bucket in Supabase.
        </p>
      </div>
      <ExamCenterManager
        subjects={(subjectsRes.data ?? []) as any[]}
        initialPapers={(papersRes.data ?? []) as any[]}
        topics={(topicsRes.data ?? []) as any[]}
        userId={user.id}
      />
    </div>
  )
}
