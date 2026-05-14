'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Send, Trash2, Loader2, Megaphone, Eye, Smile, ChevronDown, ChevronRight } from 'lucide-react'

type Subject = { id: string; name: string; color: string }
type Announcement = {
  id: string
  title: string
  body: string
  created_at: string
  subject_id: string | null
  subjects: { name: string; color: string } | null
}
type Engagement = {
  announcement_id: string
  user_id: string
  seen_at: string
  reaction: string | null
  reacted_at: string | null
  profiles: { full_name: string; email: string; role: string } | null
}

export function MessagesManager({
  subjects,
  initialAnnouncements,
  initialEngagements,
  initialRecipientCounts,
  audienceCounts,
  userId,
}: {
  subjects: Subject[]
  initialAnnouncements: Announcement[]
  initialEngagements: Engagement[]
  initialRecipientCounts: Record<string, number>
  audienceCounts: Record<string, number>
  userId: string
}) {
  const supabase = createClient()

  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements)
  const [subjectId, setSubjectId] = useState<string>('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [engagements, setEngagements] = useState<Engagement[]>(initialEngagements)
  const [recipientCounts, setRecipientCounts] = useState<Record<string, number>>(initialRecipientCounts)
  const [expandedEngagementId, setExpandedEngagementId] = useState<string | null>(null)

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and message are required.')
      return
    }
    setSending(true)
    const payload = {
      teacher_id: userId,
      subject_id: subjectId || null,
      title: title.trim(),
      body: body.trim(),
    }
    const { data, error } = await (supabase as any)
      .from('announcements')
      .insert(payload)
      .select('id, title, body, created_at, subject_id, subjects(name, color)')
      .single()

    if (error) {
      toast.error('Failed to send announcement.')
    } else {
      setAnnouncements([data, ...announcements])
      setRecipientCounts(prev => ({ ...prev, [data.id]: subjectId ? audienceCounts[subjectId] ?? 0 : audienceCounts.all ?? 0 }))
      setTitle('')
      setBody('')
      setSubjectId('')
      toast.success('Announcement sent.')
    }
    setSending(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const { error } = await (supabase as any).from('announcements').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete announcement.')
    } else {
      setAnnouncements(announcements.filter(a => a.id !== id))
      setEngagements(engagements.filter(e => e.announcement_id !== id))
      toast.success('Announcement deleted.')
    }
    setDeletingId(null)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  function engagementFor(announcementId: string) {
    return engagements.filter(e => e.announcement_id === announcementId)
  }

  function reactionCounts(rows: Engagement[]) {
    return rows.reduce((acc, row) => {
      if (row.reaction) acc[row.reaction] = (acc[row.reaction] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  return (
    <div className="space-y-6">
      {/* Compose card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="w-4 h-4" />
            Send Announcement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Audience</label>
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All students</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Quiz on Chapter 4 this Friday"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your announcement here..."
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <Button onClick={handleSend} disabled={sending} className="w-full sm:w-auto">
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send
          </Button>
        </CardContent>
      </Card>

      {/* Sent history */}
      <div>
        <h2 className="text-base font-semibold mb-3">Sent Announcements</h2>
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements sent yet.</p>
        ) : (
          <div className="space-y-3">
            {announcements.map(a => {
              const rows = engagementFor(a.id)
              const reactions = reactionCounts(rows)
              const recipientCount = recipientCounts[a.id] ?? 0
              const expanded = expandedEngagementId === a.id
              return (
              <Card key={a.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {a.subjects ? (
                          <Badge
                            style={{ backgroundColor: a.subjects.color + '22', color: a.subjects.color, borderColor: a.subjects.color + '44' }}
                            variant="outline"
                          >
                            {a.subjects.name}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">All students</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
                      </div>
                      <p className="font-medium text-sm">{a.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>
                      <div className="flex items-center gap-3 flex-wrap mt-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {rows.length}/{recipientCount} seen
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Smile className="w-3.5 h-3.5" />
                          {rows.filter(row => row.reaction).length} reactions
                        </span>
                        {Object.entries(reactions).map(([reaction, count]) => (
                          <span key={reaction} className="rounded-full bg-muted px-2 py-0.5">
                            {reaction} {count}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => setExpandedEngagementId(expanded ? null : a.id)}
                        aria-label="View read receipts"
                      >
                        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(a.id)}
                        disabled={deletingId === a.id}
                      >
                        {deletingId === a.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="mt-4 pt-3 border-t border-border">
                      {rows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No one has seen this announcement yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {rows.map(row => (
                            <div key={row.user_id} className="flex items-center justify-between gap-3 text-sm">
                              <div className="min-w-0">
                                <p className="font-medium truncate">{row.profiles?.full_name ?? 'Unknown user'}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {row.profiles?.email ?? 'No email'} · seen {formatDate(row.seen_at)}
                                </p>
                              </div>
                              {row.reaction && (
                                <span className="text-base rounded-full bg-muted px-2 py-1" title={row.reacted_at ? `Reacted ${formatDate(row.reacted_at)}` : undefined}>
                                  {row.reaction}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
