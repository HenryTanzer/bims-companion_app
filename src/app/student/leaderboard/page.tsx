import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Trophy, Flame, Zap, Medal } from 'lucide-react'

const MEDAL_COLORS = ['text-yellow-500', 'text-slate-400', 'text-amber-600']
const MEDAL_BG = ['bg-yellow-500/10', 'bg-slate-500/10', 'bg-amber-600/10']

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rows } = await supabase
    .from('user_progress')
    .select('student_id, xp, level, streak')
    .order('xp', { ascending: false })
    .limit(25)

  if (!rows || rows.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No data yet. Complete some quizzes or flashcards to appear here!
          </CardContent>
        </Card>
      </div>
    )
  }

  const studentIds = (rows as any[]).map(r => r.student_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', studentIds)

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]))

  const currentUserRank = (rows as any[]).findIndex(r => r.student_id === user.id) + 1

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Top 25 students ranked by XP.</p>
      </div>

      {currentUserRank > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 flex items-center justify-between">
            <p className="text-sm font-medium">Your rank</p>
            <div className="flex items-center gap-3">
              <Badge variant="outline">#{currentUserRank}</Badge>
              <div className="flex items-center gap-1 text-sm">
                <Zap className="w-3.5 h-3.5 text-yellow-500" />
                <span className="font-bold">{(rows as any[])[currentUserRank - 1]?.xp ?? 0} XP</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" /> Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {(rows as any[]).map((row, i) => {
            const name = profileMap.get(row.student_id) ?? 'Unknown'
            const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
            const isCurrentUser = row.student_id === user.id
            const rank = i + 1
            const top3 = rank <= 3

            return (
              <div
                key={row.student_id}
                className={`flex items-center gap-4 py-3 ${isCurrentUser ? 'bg-primary/5 -mx-6 px-6' : ''}`}
              >
                {/* Rank */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${top3 ? MEDAL_BG[i] : 'bg-muted'}`}>
                  {top3
                    ? <Medal className={`w-4 h-4 ${MEDAL_COLORS[i]}`} />
                    : <span className="text-xs font-bold text-muted-foreground">{rank}</span>
                  }
                </div>

                {/* Avatar */}
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isCurrentUser ? 'text-primary' : ''}`}>
                    {name} {isCurrentUser && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">Level {row.level}</p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1 text-sm">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-muted-foreground">{row.streak}d</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-bold">
                    <Zap className="w-3.5 h-3.5 text-yellow-500" />
                    {row.xp}
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
