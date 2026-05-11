'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home, Brain, CreditCard, FileText,
  BarChart2, Trophy, MessageSquare, LogOut, UserCircle, Layers
} from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/student', label: 'Home', icon: Home, exact: true },
  { href: '/student/quiz', label: 'Quiz', icon: Brain },
  { href: '/student/flashcards', label: 'Flashcards', icon: CreditCard },
  { href: '/student/exam-center', label: 'Exam Centre', icon: FileText },
  { href: '/student/modules', label: 'Modules', icon: Layers },
  { href: '/student/progress', label: 'Progress', icon: BarChart2 },
  { href: '/student/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/student/study-buddy', label: 'Study Buddy', icon: MessageSquare },
]

export function StudentSidebar() {
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
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white p-0.5 shrink-0">
          <Image src="/logo.png" alt="BIMS School" width={32} height={32} className="object-contain" />
        </div>
        <div>
          <p className="font-bold text-sm leading-none">BIMS Companion</p>
          <p className="text-xs text-muted-foreground mt-0.5">Student Portal</p>
        </div>
      </div>

      {/* Nav */}
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

      {/* Profile + Sign out */}
      <div className="px-3 pb-4 border-t border-border pt-3 space-y-1">
        <Link
          href="/student/profile"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            pathname.startsWith('/student/profile')
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
