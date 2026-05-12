'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, PenSquare, Users, FileText, BarChart2, MessageSquare, LogOut, UserCircle, Layers, Shield, Menu, X } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/teacher', label: 'Dashboard', icon: Home, exact: true, tutorial: 'nav-dashboard' },
  { href: '/teacher/content', label: 'Content', icon: PenSquare, tutorial: 'nav-content' },
  { href: '/teacher/modules', label: 'Modules', icon: Layers, tutorial: 'nav-modules' },
  { href: '/teacher/students', label: 'Students', icon: Users, tutorial: 'nav-students' },
  { href: '/teacher/exam-center', label: 'Exam Centre', icon: FileText, tutorial: 'nav-exam-center' },
  { href: '/teacher/analytics', label: 'Analytics', icon: BarChart2, tutorial: 'nav-analytics' },
  { href: '/teacher/messages', label: 'Messages', icon: MessageSquare, tutorial: 'nav-messages' },
]

export function TeacherSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onOpen() { if (window.innerWidth < 768) setOpen(true) }
    function onClose() { if (window.innerWidth < 768) setOpen(false) }
    window.addEventListener('bims:open-sidebar', onOpen)
    window.addEventListener('bims:close-sidebar', onClose)
    return () => {
      window.removeEventListener('bims:open-sidebar', onOpen)
      window.removeEventListener('bims:close-sidebar', onClose)
    }
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Hamburger — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 left-3 z-40 md:hidden p-2 rounded-lg bg-card border border-border shadow-sm"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside className={cn(
        'flex flex-col w-64 bg-card border-r border-border shrink-0 z-50',
        'fixed inset-y-0 left-0 transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full',
        'md:relative md:translate-x-0 md:min-h-screen'
      )}>
        <div className="flex items-center justify-between px-5 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white p-0.5 shrink-0">
              <Image src="/logo.png" alt="BIMS School" width={32} height={32} className="object-contain" />
            </div>
            <div>
              <p className="font-bold text-sm leading-none">BIMS Companion</p>
              <p className="text-xs text-muted-foreground mt-0.5">Teacher Portal</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden p-1 rounded-md text-muted-foreground hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon, exact, tutorial }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                data-tutorial={tutorial}
                onClick={() => setOpen(false)}
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
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Shield className="w-4 h-4 shrink-0" />
              Admin portal
            </Link>
          )}
          <Link
            href="/teacher/profile"
            data-tutorial="nav-profile"
            onClick={() => setOpen(false)}
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
    </>
  )
}
