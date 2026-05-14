import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MessagesManager } from '@/components/teacher/messages-manager'
import { getTeacherContext } from '@/lib/teacher-subjects'

export default async function TeacherMessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { subjectIds, isAdmin } = await getTeacherContext(supabase, user.id)

  const [subjectsRes, announcementsRes, studentsRes, enrollmentsRes] = await Promise.all([
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
    supabase.from('profiles').select('id').eq('role', 'student'),
    supabase.from('enrollments').select('student_id, subject_id'),
  ])

  const announcements = (announcementsRes.data ?? []) as any[]
  const announcementIds = announcements.map(a => a.id as string)
  const { data: engagements } = announcementIds.length
    ? await (supabase as any)
        .from('announcement_engagements')
        .select('announcement_id, user_id, seen_at, reaction, reacted_at, profiles(full_name, email, role)')
        .in('announcement_id', announcementIds)
        .order('seen_at', { ascending: false })
    : { data: [] }

  const allStudentIds = ((studentsRes.data ?? []) as any[]).map(s => s.id as string)
  const enrollments = (enrollmentsRes.data ?? []) as any[]
  const audienceCounts: Record<string, number> = { all: allStudentIds.length }
  for (const subject of (subjectsRes.data ?? []) as any[]) {
    audienceCounts[subject.id] = new Set(
      enrollments.filter(e => e.subject_id === subject.id).map(e => e.student_id)
    ).size
  }
  const recipientCounts: Record<string, number> = {}
  for (const announcement of announcements) {
    recipientCounts[announcement.id] = announcement.subject_id
      ? new Set(enrollments.filter(e => e.subject_id === announcement.subject_id).map(e => e.student_id)).size
      : allStudentIds.length
  }

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
        initialAnnouncements={announcements}
        initialEngagements={(engagements ?? []) as any[]}
        initialRecipientCounts={recipientCounts}
        audienceCounts={audienceCounts}
        userId={user.id}
      />
    </div>
  )
}
