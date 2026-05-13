import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from '@/components/shared/profile-form'

export default async function StudentProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, enrollmentsRes] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name, role, created_at, avatar_url').eq('id', user.id).single(),
    supabase.from('enrollments').select('subject_id, subjects(id, name, color)').eq('student_id', user.id),
  ])

  const profile = profileRes.data as any
  const enrolledSubjects = (enrollmentsRes.data ?? [])
    .map((e: any) => e.subjects)
    .filter(Boolean) as { id: string; name: string; color: string }[]

  if (!profile) redirect('/login')

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account details.</p>
      </div>
      <ProfileForm profile={profile} enrolledSubjects={enrolledSubjects} />
    </div>
  )
}
