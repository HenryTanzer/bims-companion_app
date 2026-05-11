'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RotateCcw, CheckCircle2, Zap, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { updateStudentProgress } from '@/lib/progress'

type Subject = { id: string; name: string; color: string }
type Topic = { id: string; subject_id: string; name: string }
type Flashcard = { id: string; term: string; definition: string }

type Phase = 'setup' | 'study' | 'done'

// Spaced repetition: days until next review based on confidence 1-4
const NEXT_REVIEW_DAYS: Record<number, number> = { 1: 1, 2: 3, 3: 7, 4: 14 }

const CONFIDENCE_LABELS = [
  { value: 1, label: 'Again', description: 'Completely forgot', color: 'border-red-500 bg-red-500/10 text-red-600 hover:bg-red-500/20' },
  { value: 2, label: 'Hard', description: 'Got it wrong', color: 'border-orange-500 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20' },
  { value: 3, label: 'Good', description: 'Got it right', color: 'border-blue-500 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' },
  { value: 4, label: 'Easy', description: 'Knew it instantly', color: 'border-green-500 bg-green-500/10 text-green-600 hover:bg-green-500/20' },
]

export function FlashcardLauncher({ subjects, topics, studentId }: {
  subjects: Subject[]
  topics: Topic[]
  studentId: string
}) {
  const supabase = createClient()

  const [phase, setPhase] = useState<Phase>('setup')
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('all')
  const [cards, setCards] = useState<Flashcard[]>([])
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(false)
  const [xpTotal, setXpTotal] = useState(0)
  const [reviewed, setReviewed] = useState(0)

  const filteredTopics = topics.filter(t => t.subject_id === subjectId)
  const selectedSubject = subjects.find(s => s.id === subjectId)

  async function startStudy() {
    if (!subjectId) { toast.error('Please select a subject'); return }
    setLoading(true)

    let query = supabase
      .from('flashcards')
      .select('id, term, definition')
      .eq('subject_id', subjectId)

    if (topicId !== 'all') query = query.eq('topic_id', topicId)

    const { data, error } = await query.limit(20)

    if (error || !data || data.length === 0) {
      toast.error('No flashcards found for this selection. Ask your teacher to add some!')
      setLoading(false)
      return
    }

    setCards([...data].sort(() => Math.random() - 0.5))
    setCurrent(0)
    setFlipped(false)
    setXpTotal(0)
    setReviewed(0)
    setPhase('study')
    setLoading(false)
  }

  async function handleConfidence(confidence: number) {
    const card = cards[current]
    const daysUntilReview = NEXT_REVIEW_DAYS[confidence]
    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + daysUntilReview)

    // Upsert the review record
    await supabase.from('flashcard_reviews').upsert({
      student_id: studentId,
      flashcard_id: card.id,
      confidence,
      next_review_at: nextReview.toISOString(),
      last_reviewed_at: new Date().toISOString(),
      review_count: 1,
    } as any, { onConflict: 'student_id,flashcard_id' })

    const xpGained = 5
    const newXpTotal = xpTotal + xpGained
    setXpTotal(newXpTotal)
    setReviewed(r => r + 1)

    if (current + 1 >= cards.length) {
      await updateStudentProgress(studentId, newXpTotal)
      setPhase('done')
    } else {
      setCurrent(c => c + 1)
      setFlipped(false)
    }
  }

  function handlePrev() {
    if (current > 0) { setCurrent(c => c - 1); setFlipped(false) }
  }
  function handleNext() {
    if (current < cards.length - 1) { setCurrent(c => c + 1); setFlipped(false) }
  }

  // ── Setup ────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <Card>
        <CardHeader><CardTitle>Choose your deck</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject</label>
            <Select value={subjectId} onValueChange={(v: string | null) => { if (v) { setSubjectId(v); setTopicId('all') } }}>
              <SelectTrigger><SelectValue placeholder="Select a subject">{subjects.find(s => s.id === subjectId)?.name ?? 'Select a subject'}</SelectValue></SelectTrigger>
              <SelectContent>
                {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {subjectId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Topic <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Select value={topicId} onValueChange={(v: string | null) => { if (v) setTopicId(v) }}>
                <SelectTrigger><SelectValue placeholder="All topics">{topicId === 'all' ? 'All topics' : (filteredTopics.find(t => t.id === topicId)?.name ?? 'All topics')}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All topics</SelectItem>
                  {filteredTopics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="pt-2 space-y-3">
            <p className="text-xs text-muted-foreground">Up to 20 cards · +5 XP per card reviewed · Spaced repetition scheduling</p>
            <Button onClick={startStudy} disabled={!subjectId || loading} className="w-full">
              {loading ? 'Loading...' : 'Start Studying'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Done ─────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <Card>
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <CheckCircle2 className="w-14 h-14 mx-auto text-green-500" />
          <div>
            <h2 className="text-2xl font-bold">Deck Complete!</h2>
            <p className="text-muted-foreground text-sm mt-1">{selectedSubject?.name}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
            <div>
              <p className="text-3xl font-bold">{reviewed}</p>
              <p className="text-xs text-muted-foreground">Cards reviewed</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <Zap className="w-5 h-5 text-yellow-500" />
                <p className="text-3xl font-bold">+{xpTotal}</p>
              </div>
              <p className="text-xs text-muted-foreground">XP earned</p>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setPhase('setup')}>
              <RotateCcw className="w-4 h-4 mr-2" />New Deck
            </Button>
            <Button onClick={startStudy}>Study Again</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Study ────────────────────────────────────────────────────
  const card = cards[current]
  const progress = ((current + 1) / cards.length) * 100

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{selectedSubject?.name}</Badge>
        <span className="text-sm text-muted-foreground font-medium">{current + 1} / {cards.length}</span>
      </div>
      <Progress value={progress} className="h-1.5" />

      {/* Flashcard with 3D flip */}
      <div
        className="relative w-full cursor-pointer"
        style={{ perspective: '1200px', height: '280px' }}
        onClick={() => setFlipped(f => !f)}
      >
        <div
          className="relative w-full h-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-xl border border-border bg-card flex flex-col items-center justify-center p-8 text-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-4 font-medium">Term</p>
            <p className="text-2xl font-bold leading-snug">{card.term}</p>
            <p className="text-xs text-muted-foreground mt-6">Click to reveal definition</p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-xl border border-primary/30 bg-primary/5 flex flex-col items-center justify-center p-8 text-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-4 font-medium">Definition</p>
            <p className="text-lg leading-relaxed">{card.definition}</p>
          </div>
        </div>
      </div>

      {/* Navigation row */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={handlePrev} disabled={current === 0}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <p className="text-xs text-muted-foreground">
          {flipped ? 'How well did you know this?' : 'Click the card to flip it'}
        </p>
        <Button variant="ghost" size="icon" onClick={handleNext} disabled={current === cards.length - 1}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Confidence buttons — only show after flip */}
      {flipped && (
        <div className="grid grid-cols-4 gap-2">
          {CONFIDENCE_LABELS.map(({ value, label, description, color }) => (
            <button
              key={value}
              onClick={() => handleConfidence(value)}
              className={cn(
                'flex flex-col items-center gap-1 py-3 px-2 rounded-lg border text-xs font-medium transition-all',
                color
              )}
            >
              <span className="font-bold text-sm">{label}</span>
              <span className="opacity-75">{description}</span>
            </button>
          ))}
        </div>
      )}

      {/* XP counter */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Zap className="w-4 h-4 text-yellow-500" />
        <span>+{xpTotal} XP earned this session</span>
      </div>
    </div>
  )
}
