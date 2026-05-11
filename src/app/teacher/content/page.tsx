import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ContentManager } from '@/components/teacher/content-manager'
import { getTeacherContext } from '@/lib/teacher-subjects'

export default async function ContentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { subjectIds, isAdmin } = await getTeacherContext(supabase, user.id)

  const [subjectsRes, topicsRes] = await Promise.all([
    isAdmin
      ? supabase.from('subjects').select('id, name')
      : subjectIds.length > 0
        ? supabase.from('subjects').select('id, name').in('id', subjectIds)
        : Promise.resolve({ data: [] }),
    isAdmin
      ? supabase.from('topics').select('id, subject_id, name').order('order_index')
      : subjectIds.length > 0
        ? supabase.from('topics').select('id, subject_id, name').in('subject_id', subjectIds).order('order_index')
        : Promise.resolve({ data: [] }),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Manager</h1>
        <p className="text-muted-foreground text-sm mt-1">Add quiz questions, flashcards, and topics for your students.</p>
      </div>
      <ContentManager
        subjects={(subjectsRes.data ?? []) as any[]}
        topics={(topicsRes.data ?? []) as any[]}
        teacherId={user.id}
      />
    </div>
  )
}
