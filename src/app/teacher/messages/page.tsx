import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MessagesManager } from '@/components/teacher/messages-manager'

export default async function TeacherMessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, color')
    .order('name')

  const { data: announcements } = await (supabase as any)
    .from('announcements')
    .select('id, title, body, created_at, subject_id, subjects(name, color)')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Broadcast announcements to a subject group or all students.
        </p>
      </div>
      <MessagesManager
        subjects={(subjects ?? []) as any[]}
        initialAnnouncements={(announcements ?? []) as any[]}
        userId={user.id}
      />
    </div>
  )
}
