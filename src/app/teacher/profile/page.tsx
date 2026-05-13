import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from '@/components/shared/profile-form'

export default async function TeacherProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account details.</p>
      </div>
      <ProfileForm profile={profile as any} />
    </div>
  )
}
