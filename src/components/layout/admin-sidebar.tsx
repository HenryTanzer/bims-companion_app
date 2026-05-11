'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, GraduationCap, BookOpen } from 'lucide-react'
import Image from 'next/image'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/teachers', label: 'Teachers', icon: GraduationCap },
]

export function AdminSidebar() {
  const pathname = usePathname()

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-border bg-card min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white p-0.5 shrink-0">
          <Image src="/logo.png" alt="BIMS" width={28} height={28} className="object-contain" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm leading-tight truncate">BIMS Admin</p>
          <p className="text-xs text-muted-foreground truncate">School Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive(href, exact)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Portal switcher */}
      <div className="p-3 border-t border-border space-y-1">
        <p className="text-xs text-muted-foreground px-3 pb-1">Switch portal</p>
        <Link
          href="/teacher"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          Teacher portal
        </Link>
      </div>
    </aside>
  )
}
