'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Loader2, User, Mail, ShieldCheck, Calendar, Camera, Upload } from 'lucide-react'
import {
  CAREER_AVATARS,
  careerAvatarUrl,
  isCareerAvatar,
  getCareerDataUri,
  getCareerIdFromUrl,
  resolveAvatarSrc,
} from '@/lib/career-avatars'
import { cn } from '@/lib/utils'

type Subject = { id: string; name: string; color: string }

type Profile = {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
  avatar_url?: string | null
}

export function ProfileForm({
  profile,
  enrolledSubjects,
}: {
  profile: Profile
  enrolledSubjects?: Subject[]
}) {
  const supabase = createClient()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(profile.full_name)
  const [saving, setSaving] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url ?? null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const unchanged = name.trim() === profile.full_name

  const initials = profile.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const displaySrc = resolveAvatarSrc(avatarUrl)

  async function saveAvatarUrl(url: string) {
    const { error } = await (supabase as any)
      .from('profiles')
      .update({ avatar_url: url, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
    if (error) throw error
  }

  async function handleCareerSelect(id: string) {
    const url = careerAvatarUrl(id)
    try {
      await saveAvatarUrl(url)
      setAvatarUrl(url)
      setPickerOpen(false)
      toast.success('Avatar updated')
      router.refresh()
    } catch {
      toast.error('Failed to update avatar')
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2 MB')
      return
    }
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${profile.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const urlWithBust = `${publicUrl}?t=${Date.now()}`

      await saveAvatarUrl(urlWithBust)
      setAvatarUrl(urlWithBust)
      setPickerOpen(false)
      toast.success('Profile picture updated')
      router.refresh()
    } catch (err: any) {
      if (err?.message?.includes('Bucket not found') || err?.statusCode === '404') {
        toast.error('Create an "avatars" bucket in Supabase Storage to enable photo upload')
      } else {
        toast.error('Failed to upload image')
      }
    } finally {
      setUploadingAvatar(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handlePasswordChange() {
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { toast.error('Failed to update password') }
    else { toast.success('Password updated'); setNewPassword(''); setConfirmPassword('') }
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
    if (error) { toast.error('Failed to save changes') }
    else {
      toast.success('Profile updated')
      router.refresh()
    }
    setSaving(false)
  }

  const joined = new Date(profile.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const selectedCareerId = avatarUrl && isCareerAvatar(avatarUrl)
    ? getCareerIdFromUrl(avatarUrl)
    : null

  return (
    <div className="space-y-5">

      {/* Avatar + picker */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <Avatar className="h-16 w-16">
                {displaySrc && <AvatarImage src={displaySrc} alt={profile.full_name} />}
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => setPickerOpen(v => !v)}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors"
                aria-label="Change avatar"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>

            {/* Info */}
            <div>
              <p className="text-xl font-bold">{profile.full_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="capitalize">{profile.role}</Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Joined {joined}
                </span>
              </div>
              <button
                onClick={() => setPickerOpen(v => !v)}
                className="text-xs text-primary hover:underline mt-1.5 block"
              >
                {pickerOpen ? 'Close picker' : 'Change avatar'}
              </button>
            </div>
          </div>

          {/* Inline avatar picker */}
          {pickerOpen && (
            <div className="mt-5 space-y-4">
              <p className="text-sm font-medium text-muted-foreground">Choose a career avatar</p>

              {/* Career grid */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                {CAREER_AVATARS.map(career => {
                  const isSelected = selectedCareerId === career.id
                  return (
                    <button
                      key={career.id}
                      onClick={() => handleCareerSelect(career.id)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-1.5 rounded-xl transition-all',
                        isSelected
                          ? 'ring-2 ring-primary bg-primary/10'
                          : 'hover:bg-accent'
                      )}
                    >
                      <img
                        src={getCareerDataUri(career.id)}
                        alt={career.label}
                        className="w-12 h-12 rounded-full"
                        draggable={false}
                      />
                      <span className="text-[10px] text-muted-foreground text-center leading-tight">
                        {career.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Upload custom */}
              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Or upload a custom photo</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="gap-2"
                >
                  {uploadingAvatar
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Upload className="w-4 h-4" />}
                  {uploadingAvatar ? 'Uploading…' : 'Upload photo'}
                </Button>
                <p className="text-xs text-muted-foreground mt-1.5">PNG, JPG, WebP · max 2 MB</p>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Account details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <p className="text-xs text-muted-foreground">Contact your administrator to change email.</p>
          </div>

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
