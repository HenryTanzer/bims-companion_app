import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TeacherSidebar } from '@/components/layout/teacher-sidebar'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { TutorialController } from '@/components/shared/tutorial-controller'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  const role = (profile as any)?.role
  if (role === 'student') redirect('/student')

  const name = (profile as any)?.full_name ?? 'Teacher'
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="flex min-h-screen bg-background">
      <TeacherSidebar isAdmin={role === 'admin'} />
      <TutorialController portal="teacher" />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
          <div />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Bell className="h-4 w-4" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
