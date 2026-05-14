'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, Search, Shield, GraduationCap, User } from 'lucide-react'
import { resolveAvatarSrc } from '@/lib/career-avatars'

type UserRow = {
  id: string
  full_name: string
  email: string
  role: 'student' | 'teacher' | 'admin'
  created_at: string
  avatar_url: string | null
}

const ROLES = ['student', 'teacher', 'admin'] as const

export default function AdminUsersPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [changingId, setChangingId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, created_at, avatar_url')
      .order('created_at', { ascending: false })
    setUsers((data ?? []) as UserRow[])
    setLoading(false)
  }

  async function changeRole(userId: string, newRole: 'student' | 'teacher' | 'admin') {
    setChangingId(userId)
    const { error } = await (supabase as any)
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
    if (error) {
      toast.error('Failed to update role')
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      toast.success('Role updated')
    }
    setChangingId(null)
  }

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const roleIcon = (role: string) => {
    if (role === 'admin') return <Shield className="w-3 h-3" />
    if (role === 'teacher') return <GraduationCap className="w-3 h-3" />
    return <User className="w-3 h-3" />
  }

  const roleBadgeVariant = (role: string): 'destructive' | 'default' | 'secondary' =>
    role === 'admin' ? 'destructive' : role === 'teacher' ? 'default' : 'secondary'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {users.length} registered user{users.length !== 1 ? 's' : ''}. Change roles or review accounts.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {search ? 'No users match your search.' : 'No users yet.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => {
            const initials = u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            const isSelf = u.id === currentUserId
            const avatarSrc = resolveAvatarSrc(u.avatar_url)
            return (
              <Card key={u.id}>
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      {avatarSrc && <AvatarImage src={avatarSrc} alt={u.full_name} />}
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{u.full_name}</p>
                        {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={roleBadgeVariant(u.role)} className="gap-1 text-xs">
                        {roleIcon(u.role)}
                        {u.role}
                      </Badge>

                      {/* Role switcher — disabled for self to prevent lockout */}
                      {!isSelf && (
                        <div className="flex gap-1">
                          {ROLES.filter(r => r !== u.role).map(r => (
                            <Button
                              key={r}
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2"
                              disabled={changingId === u.id}
                              onClick={() => changeRole(u.id, r)}
                            >
                              {changingId === u.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : `→ ${r}`
                              }
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
