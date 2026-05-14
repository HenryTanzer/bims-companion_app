import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationsView } from '@/components/student/notifications-view'

export default async function StudentNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // RLS already filters to enrolled subjects + all-student announcements
  const { data: announcements } = await (supabase as any)
    .from('announcements')
    .select('id, title, body, created_at, subject_id, teacher_id, subjects(name, color)')
    .order('created_at', { ascending: false })

  // Resolve teacher names
  const teacherIds = [...new Set(((announcements ?? []) as any[]).map((a: any) => a.teacher_id as string))]
  const { data: teachers } = teacherIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', teacherIds)
    : { data: [] }

  const teacherMap: Record<string, string> = {}
  for (const t of (teachers ?? []) as any[]) {
    teacherMap[t.id] = t.full_name
  }

  const enriched = ((announcements ?? []) as any[]).map((a: any) => ({
    ...a,
    teacher_name: teacherMap[a.teacher_id] ?? 'Your teacher',
  }))

  const announcementIds = enriched.map(a => a.id)
  const { data: engagements } = announcementIds.length
    ? await (supabase as any)
        .from('announcement_engagements')
        .select('announcement_id, reaction, seen_at, reacted_at')
        .eq('user_id', user.id)
        .in('announcement_id', announcementIds)
    : { data: [] }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Announcements from your teachers.
        </p>
      </div>
      <NotificationsView
        announcements={enriched}
        engagements={(engagements ?? []) as any[]}
        userId={user.id}
      />
    </div>
  )
}
