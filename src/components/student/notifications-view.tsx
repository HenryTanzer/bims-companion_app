import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Bell } from 'lucide-react'

type Announcement = {
  id: string
  title: string
  body: string
  created_at: string
  subject_id: string | null
  subjects: { name: string; color: string } | null
  teacher_name: string
}

export function NotificationsView({ announcements }: { announcements: Announcement[] }) {
  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
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
      {announcements.map(a => (
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
            </div>
            <p className="font-semibold text-sm">{a.title}</p>
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.body}</p>
            <p className="text-xs text-muted-foreground mt-2">From {a.teacher_name}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
