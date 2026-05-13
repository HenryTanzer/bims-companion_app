'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Settings, UserCircle, LogOut, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveAvatarSrc } from '@/lib/career-avatars'

type UserMenuProps = {
  name: string
  email: string
  initials: string
  role: string
  avatarUrl?: string | null
  settingsHref: string
  profileHref: string
}

export function UserMenu({
  name,
  email,
  initials,
  role,
  avatarUrl,
  settingsHref,
  profileHref,
}: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function handleSignOut() {
    setOpen(false)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function navigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  const roleLabel =
    role === 'admin' ? 'Administrator' : role === 'teacher' ? 'Teacher' : 'Student'

  const resolvedAvatar = resolveAvatarSrc(avatarUrl)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-full hover:ring-2 hover:ring-primary/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open user menu"
      >
        <Avatar className="h-8 w-8">
          {resolvedAvatar && <AvatarImage src={resolvedAvatar} alt={name} />}
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-muted-foreground transition-transform hidden sm:block',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-border bg-popover shadow-lg shadow-black/10 z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          {/* User info header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
            <Avatar className="h-10 w-10 shrink-0">
              {resolvedAvatar && <AvatarImage src={resolvedAvatar} alt={name} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{name}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
              <span className="inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {roleLabel}
              </span>
            </div>
          </div>

          {/* Navigation items */}
          <div className="p-1">
            <MenuItem icon={UserCircle} label="Profile" onClick={() => navigate(profileHref)} />
            <MenuItem icon={Settings} label="Settings" onClick={() => navigate(settingsHref)} />
          </div>

          <div className="border-t border-border p-1">
            <MenuItem
              icon={LogOut}
              label="Sign out"
              onClick={handleSignOut}
              destructive
            />
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left',
        destructive
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-foreground hover:bg-accent'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </button>
  )
}
