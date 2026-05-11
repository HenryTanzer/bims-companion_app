'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, User, Mail, ShieldCheck, Calendar, PlayCircle } from 'lucide-react'

type Subject = { id: string; name: string; color: string }

type Profile = {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
}

export function ProfileForm({
  profile,
  enrolledSubjects,
}: {
  profile: Profile
  enrolledSubjects?: Subject[]
}) {
  const supabase = createClient()
  const [name, setName] = useState(profile.full_name)
  const [saving, setSaving] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const unchanged = name.trim() === profile.full_name

  async function handlePasswordChange() {
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast.error('Failed to update password')
    } else {
      toast.success('Password updated')
      setNewPassword('')
      setConfirmPassword('')
    }
    setSavingPassword(false)
  }

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) { toast.error('Name cannot be empty'); return }
    if (unchanged) return
    setSaving(true)
    const { error } = await (supabase as any)
      .from('profiles')
      .update({ full_name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
    if (error) {
      toast.error('Failed to save changes')
    } else {
      toast.success('Profile updated')
    }
    setSaving(false)
  }

  const joined = new Date(profile.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-5">
      {/* Avatar + role */}
      <Card>
        <CardContent className="pt-6 pb-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <User className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xl font-bold">{profile.full_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="capitalize">{profile.role}</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Joined {joined}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Account details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Display name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              Display name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Email — read only */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              Email
            </label>
            <input
              type="email"
              value={profile.email}
              readOnly
              className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed here. Contact your administrator.</p>
          </div>

          {/* Role — read only */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
              Role
            </label>
            <input
              type="text"
              value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              readOnly
              className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>

          <Button onClick={handleSave} disabled={saving || unchanged} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button
            onClick={handlePasswordChange}
            disabled={savingPassword || !newPassword || !confirmPassword}
            variant="outline"
            className="gap-2"
          >
            {savingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
            {savingPassword ? 'Updating…' : 'Update password'}
          </Button>
        </CardContent>
      </Card>

      {/* Relaunch tutorial */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">App Tutorial</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Take the guided tour again to learn about all the features available to you.
          </p>
          <Button
            variant="outline"
            className="shrink-0 gap-2"
            onClick={() => {
              localStorage.removeItem('bims_tutorial_v1')
              window.dispatchEvent(new CustomEvent('bims:launch-tutorial'))
            }}
          >
            <PlayCircle className="w-4 h-4" />
            Take the tour
          </Button>
        </CardContent>
      </Card>

      {/* Enrolled subjects — students only */}
      {enrolledSubjects !== undefined && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Enrolled subjects</CardTitle>
          </CardHeader>
          <CardContent>
            {enrolledSubjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Not enrolled in any subjects yet. Contact your teacher.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {enrolledSubjects.map(s => (
                  <Badge key={s.id} variant="secondary" className="text-sm px-3 py-1">
                    {s.name}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              Subject enrolments are managed by your teacher.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
