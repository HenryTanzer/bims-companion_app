import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MessagesManager } from '@/components/teacher/messages-manager'
import { getTeacherContext } from '@/lib/teacher-subjects'

export default async function TeacherMessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { subjectIds, isAdmin } = await getTeacherContext(supabase, user.id)

  const [subjectsRes, announcementsRes] = await Promise.all([
    isAdmin
      ? supabase.from('subjects').select('id, name, color').order('name')
      : subjectIds.length > 0
        ? supabase.from('subjects').select('id, name, color').in('id', subjectIds).order('name')
        : Promise.resolve({ data: [] }),
    (supabase as any)
      .from('announcements')
      .select('id, title, body, created_at, subject_id, subjects(name, color)')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Broadcast announcements to your unit or all students.
        </p>
      </div>
      <MessagesManager
        subjects={(subjectsRes.data ?? []) as any[]}
        initialAnnouncements={(announcementsRes.data ?? []) as any[]}
        userId={user.id}
      />
    </div>
  )
}
