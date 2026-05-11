'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, PenSquare, Users, FileText, BarChart2, MessageSquare, LogOut, UserCircle, Layers } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/teacher', label: 'Dashboard', icon: Home, exact: true },
  { href: '/teacher/content', label: 'Content', icon: PenSquare },
  { href: '/teacher/modules', label: 'Modules', icon: Layers },
  { href: '/teacher/students', label: 'Students', icon: Users },
  { href: '/teacher/exam-center', label: 'Exam Centre', icon: FileText },
  { href: '/teacher/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/teacher/messages', label: 'Messages', icon: MessageSquare },
]

export function TeacherSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-card border-r border-border shrink-0">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white p-0.5 shrink-0">
          <Image src="/logo.png" alt="BIMS School" width={32} height={32} className="object-contain" />
        </div>
        <div>
          <p className="font-bold text-sm leading-none">BIMS Companion</p>
          <p className="text-xs text-muted-foreground mt-0.5">Teacher Portal</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-border pt-3 space-y-1">
        <Link
          href="/teacher/profile"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            pathname.startsWith('/teacher/profile')
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <UserCircle className="w-4 h-4 shrink-0" />
          Profile
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
