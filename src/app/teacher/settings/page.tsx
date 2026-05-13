import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsView } from '@/components/shared/settings-view'

export default async function TeacherSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <SettingsView role="teacher" basePath="/teacher" />
}
