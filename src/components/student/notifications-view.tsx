'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Reaction = '👍' | '✅' | '🙌' | '💡' | '❓'
type Announcement = {
  id: string
  title: string
  body: string
  created_at: string
  subject_id: string | null
  subjects: { name: string; color: string } | null
  teacher_name: string
}
type Engagement = {
  announcement_id: string
  reaction: Reaction | null
  seen_at: string
  reacted_at: string | null
}
type EngagementUpsert = {
  announcement_id: string
  user_id: string
  seen_at: string
  reaction?: Reaction | null
  reacted_at?: string | null
}
type EngagementTable = {
  upsert: (values: EngagementUpsert[], options: { onConflict: string }) => Promise<{ error: { message?: string } | null }>
} & {
  upsert: (values: EngagementUpsert, options: { onConflict: string }) => Promise<{ error: { message?: string } | null }>
}
type EngagementDb = {
  from: (table: 'announcement_engagements') => EngagementTable
}

const REACTIONS: { emoji: Reaction; label: string }[] = [
  { emoji: '👍', label: 'Got it' },
  { emoji: '✅', label: 'Understood' },
  { emoji: '🙌', label: 'Thanks' },
  { emoji: '💡', label: 'Helpful' },
  { emoji: '❓', label: 'Question' },
]

export function NotificationsView({
  announcements,
  engagements,
  userId,
}: {
  announcements: Announcement[]
  engagements: Engagement[]
  userId: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const db = useMemo(() => supabase as unknown as EngagementDb, [supabase])
  const [reactionByAnnouncement, setReactionByAnnouncement] = useState<Record<string, Reaction | null>>(
    Object.fromEntries(engagements.map(e => [e.announcement_id, e.reaction]))
  )
  const [savingReactionId, setSavingReactionId] = useState<string | null>(null)

  useEffect(() => {
    const unseen = announcements.filter(a => !(a.id in reactionByAnnouncement))
    if (unseen.length === 0) return

    let cancelled = false
    async function markSeen() {
      const now = new Date().toISOString()
      const { error } = await db.from('announcement_engagements').upsert(
        unseen.map(a => ({
          announcement_id: a.id,
          user_id: userId,
          seen_at: now,
        })),
        { onConflict: 'announcement_id,user_id' }
      )
      if (cancelled || error) return
      setReactionByAnnouncement(prev => ({
        ...prev,
        ...Object.fromEntries(unseen.map(a => [a.id, null])),
      }))
    }
    markSeen()
    return () => { cancelled = true }
  }, [announcements, db, reactionByAnnouncement, userId])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  async function react(announcementId: string, reaction: Reaction) {
    const current = reactionByAnnouncement[announcementId]
    const nextReaction = current === reaction ? null : reaction
    setSavingReactionId(announcementId)
    const now = new Date().toISOString()
    const { error } = await db.from('announcement_engagements').upsert({
      announcement_id: announcementId,
      user_id: userId,
      seen_at: now,
      reaction: nextReaction,
      reacted_at: nextReaction ? now : null,
    }, { onConflict: 'announcement_id,user_id' })

    if (error) {
      toast.error('Failed to save reaction')
    } else {
      setReactionByAnnouncement(prev => ({ ...prev, [announcementId]: nextReaction }))
    }
    setSavingReactionId(null)
  }

  if (announcements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Bell className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-sm">No announcements yet.</p>
        <p className="text-muted-foreground text-xs mt-1">Your teacher&apos;s messages will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {announcements.map(a => {
        const selectedReaction = reactionByAnnouncement[a.id]
        return (
          <Card key={a.id}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {a.subjects ? (
                  <Badge
                    style={{
                      backgroundColor: a.subjects.color + '22',
                      color: a.subjects.color,
                      borderColor: a.subjects.color + '44',
                    }}
                    variant="outline"
                  >
                    {a.subjects.name}
                  </Badge>
                ) : (
                  <Badge variant="secondary">All students</Badge>
                )}
                <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <CheckCheck className="w-3 h-3" />
                  Seen
                </span>
              </div>
              <p className="font-semibold text-sm">{a.title}</p>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.body}</p>
              <p className="text-xs text-muted-foreground mt-2">From {a.teacher_name}</p>

              <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground mr-1">React:</span>
                {REACTIONS.map(({ emoji, label }) => (
                  <button
                    key={emoji}
                    onClick={() => react(a.id, emoji)}
                    disabled={savingReactionId === a.id}
                    title={label}
                    className={`h-8 min-w-8 px-2 rounded-full border text-sm transition-colors ${
                      selectedReaction === emoji
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    {savingReactionId === a.id && selectedReaction === emoji
                      ? <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                      : emoji}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
