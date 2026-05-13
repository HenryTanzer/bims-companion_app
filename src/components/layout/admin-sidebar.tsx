'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, GraduationCap, BookOpen, LogOut, Menu, X, Settings } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/teachers', label: 'Teachers', icon: GraduationCap },
]

export function AdminSidebar() {
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

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

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
        'w-56 shrink-0 flex flex-col border-r border-border bg-card z-50',
        'fixed inset-y-0 left-0 transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full',
        'md:relative md:translate-x-0 md:min-h-screen'
      )}>
        {/* Logo + close */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white p-0.5 shrink-0">
              <Image src="/logo.png" alt="BIMS" width={28} height={28} className="object-contain" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight truncate">BIMS Admin</p>
              <p className="text-xs text-muted-foreground truncate">School Portal</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden p-1 rounded-md text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive(href, exact)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-3 border-t border-border space-y-1">
          <Link
            href="/teacher"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            Teacher portal
          </Link>
          <Link
            href="/admin/settings"
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive('/admin/settings')
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <Settings className="w-4 h-4 shrink-0" />
            Settings
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors w-full"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
