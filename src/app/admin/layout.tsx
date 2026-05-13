import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { UserMenu } from '@/components/shared/user-menu'
import { ThemeToggle } from '@/components/shared/theme-toggle'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, avatar_url')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.role !== 'admin') redirect('/')

  const name = (profile as any)?.full_name ?? 'Admin'
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const avatarUrl = (profile as any)?.avatar_url ?? null

  return (
    <div className="flex items-start min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center justify-between pl-14 pr-4 md:px-6 py-3 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
          <div />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu
              name={name}
              email={user.email ?? ''}
              initials={initials}
              role="admin"
              avatarUrl={avatarUrl}
              settingsHref="/admin/settings"
              profileHref="/teacher/profile"
            />
          </div>
        </header>
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
