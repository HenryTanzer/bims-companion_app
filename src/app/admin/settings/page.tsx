import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsView } from '@/components/shared/settings-view'

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.role !== 'admin') redirect('/')

  return <SettingsView role="admin" basePath="/teacher" />
}
