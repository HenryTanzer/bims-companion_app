import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Award, BookOpen, Brain, CheckCircle2, CreditCard, Flame, GraduationCap,
  Medal, Star, Target, Timer, Trophy, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type Achievement = {
  id: string
  title: string
  description: string
  category: 'XP' | 'Streak' | 'Quiz' | 'Lessons' | 'Flashcards' | 'Focus' | 'Modules' | 'Daily'
  icon: React.ElementType
  current: number
  target: number
  unlocked: boolean
}

const CATEGORY_STYLES: Record<Achievement['category'], string> = {
  XP: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  Streak: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  Quiz: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  Lessons: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  Flashcards: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  Focus: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
  Modules: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
  Daily: 'bg-pink-500/10 text-pink-600 border-pink-500/30',
}

export function AchievementsView({ achievements }: { achievements: Achievement[] }) {
  const unlocked = achievements.filter(a => a.unlocked)
  const locked = achievements.filter(a => !a.unlocked)
  const percent = achievements.length ? Math.round((unlocked.length / achievements.length) * 100) : 0

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Achievement Progress</p>
              <p className="text-3xl font-bold mt-1">{unlocked.length}/{achievements.length}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
          </div>
          <Progress value={percent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">{percent}% unlocked</p>
        </CardContent>
      </Card>

      {unlocked.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <h2 className="text-base font-semibold">Unlocked</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {unlocked.map(a => <AchievementCard key={a.id} achievement={a} />)}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">In Progress</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {locked.map(a => <AchievementCard key={a.id} achievement={a} />)}
        </div>
      </section>
    </div>
  )
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const Icon = achievement.icon
  const value = achievement.target === 0 ? 100 : Math.min(100, (achievement.current / achievement.target) * 100)

  return (
    <Card className={cn(
      'overflow-hidden',
      achievement.unlocked ? 'border-primary/40' : 'opacity-80'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
            achievement.unlocked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-sm leading-tight">{achievement.title}</p>
              <Badge variant="outline" className={cn('text-[10px] shrink-0', CATEGORY_STYLES[achievement.category])}>
                {achievement.category}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">{achievement.description}</p>
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.min(achievement.current, achievement.target).toLocaleString()}</span>
                <span>{achievement.target.toLocaleString()}</span>
              </div>
              <Progress value={value} className="h-1.5" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const achievementIcons = {
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  CreditCard,
  Flame,
  GraduationCap,
  Medal,
  Star,
  Target,
  Timer,
  Trophy,
  Zap,
}
