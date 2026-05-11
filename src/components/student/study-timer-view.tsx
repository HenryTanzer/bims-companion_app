'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateStudentProgress } from '@/lib/progress'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Play, Pause, RotateCcw, Zap, BookOpen } from 'lucide-react'

type Subject = { id: string; name: string; color: string }

const DURATIONS = [
  { minutes: 15, label: '15 min', xp: 15 },
  { minutes: 25, label: '25 min', xp: 25 },
  { minutes: 45, label: '45 min', xp: 45 },
  { minutes: 60, label: '60 min', xp: 60 },
]

type Status = 'idle' | 'running' | 'paused' | 'complete'

const RADIUS = 88
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function StudyTimerView({
  subjects,
  studentId,
}: {
  subjects: Subject[]
  studentId: string
}) {
  const supabase = createClient()

  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[1]) // default 25 min
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    subjects.length === 1 ? subjects[0].id : null
  )
  const [status, setStatus] = useState<Status>('idle')
  const [timeLeft, setTimeLeft] = useState(DURATIONS[1].minutes * 60)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [xpEarned, setXpEarned] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId)
  const ringColor = selectedSubject?.color ?? 'hsl(var(--primary))'
  const totalSeconds = selectedDuration.minutes * 60
  const progress = timeLeft / totalSeconds
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const timeDisplay = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const handleComplete = useCallback(async () => {
    clearTimer()
    setStatus('complete')
    const xp = selectedDuration.xp
    setXpEarned(xp)

    // Save session to DB
    const { data } = await (supabase as any)
      .from('study_sessions')
      .insert({
        student_id: studentId,
        subject_id: selectedSubjectId,
        duration_minutes: selectedDuration.minutes,
        xp_earned: xp,
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    setSessionId(data?.id ?? null)

    // Award XP via progress utility
    try {
      await updateStudentProgress(studentId, xp)
      toast.success(`Session complete! +${xp} XP earned`)
    } catch {
      toast.error('Session saved but XP update failed')
    }
  }, [clearTimer, selectedDuration, selectedSubjectId, studentId, supabase])

  useEffect(() => {
    if (status !== 'running') return
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return clearTimer
  }, [status, handleComplete, clearTimer])

  function handleStart() {
    if (status === 'idle') {
      setTimeLeft(selectedDuration.minutes * 60)
    }
    setStatus('running')
  }

  function handlePause() {
    clearTimer()
    setStatus('paused')
  }

  function handleReset() {
    clearTimer()
    setStatus('idle')
    setTimeLeft(selectedDuration.minutes * 60)
    setSessionId(null)
    setXpEarned(0)
  }

  function handleDurationChange(d: typeof DURATIONS[0]) {
    if (status !== 'idle') return
    setSelectedDuration(d)
    setTimeLeft(d.minutes * 60)
  }

  return (
    <div className="max-w-lg mx-auto space-y-8">

      {/* Duration picker — only when idle */}
      {status === 'idle' && (
        <div className="flex gap-2 justify-center flex-wrap">
          {DURATIONS.map(d => (
            <button
              key={d.minutes}
              onClick={() => handleDurationChange(d)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                selectedDuration.minutes === d.minutes
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              {d.label}
              <span className="ml-1.5 text-xs opacity-60">+{d.xp} XP</span>
            </button>
          ))}
        </div>
      )}

      {/* Subject picker — only when idle */}
      {status === 'idle' && subjects.length > 1 && (
        <div className="flex gap-2 justify-center flex-wrap">
          <button
            onClick={() => setSelectedSubjectId(null)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
              !selectedSubjectId
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
            }`}
          >
            No subject
          </button>
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSubjectId(s.id)}
              className="px-4 py-2 rounded-full text-sm font-semibold border transition-all"
              style={
                selectedSubjectId === s.id
                  ? { backgroundColor: s.color + '30', color: s.color, borderColor: s.color + '80' }
                  : {}
              }
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Timer ring */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <svg width="220" height="220" className="-rotate-90">
            {/* Track */}
            <circle
              cx="110" cy="110" r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-border"
            />
            {/* Progress */}
            <circle
              cx="110" cy="110" r={RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }}
            />
          </svg>

          {/* Centre content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            {status === 'complete' ? (
              <>
                <Zap className="w-8 h-8 text-yellow-400" />
                <p className="text-3xl font-bold text-yellow-400">+{xpEarned}</p>
                <p className="text-xs text-muted-foreground font-medium">XP earned</p>
              </>
            ) : (
              <>
                <p className="text-4xl font-bold tabular-nums tracking-tight">{timeDisplay}</p>
                {selectedSubject && (
                  <p className="text-xs font-medium mt-0.5" style={{ color: ringColor }}>
                    {selectedSubject.name}
                  </p>
                )}
                {status === 'idle' && (
                  <p className="text-xs text-muted-foreground mt-0.5">ready</p>
                )}
                {status === 'paused' && (
                  <p className="text-xs text-orange-400 font-medium mt-0.5">paused</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {status === 'complete' ? (
            <Button onClick={handleReset} className="gap-2 px-6">
              <RotateCcw className="w-4 h-4" />
              Start another
            </Button>
          ) : (
            <>
              {(status === 'idle' || status === 'paused') && (
                <Button onClick={handleStart} className="gap-2 px-8 shadow-lg shadow-primary/25">
                  <Play className="w-4 h-4" />
                  {status === 'paused' ? 'Resume' : 'Start'}
                </Button>
              )}
              {status === 'running' && (
                <Button onClick={handlePause} variant="outline" className="gap-2 px-8">
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
              )}
              {status !== 'idle' && (
                <Button onClick={handleReset} variant="ghost" size="icon">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tip card */}
      {status === 'idle' && (
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="py-4 flex gap-3 items-start">
            <BookOpen className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Pick a duration, select your subject, and focus. XP is awarded only when you complete the full session — no skipping!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
