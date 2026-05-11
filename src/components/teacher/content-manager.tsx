'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Trash2, CheckCircle2 } from 'lucide-react'

type Subject = { id: string; name: string }
type Topic = { id: string; subject_id: string; name: string }

export function ContentManager({ subjects, topics: initialTopics, teacherId }: {
  subjects: Subject[]
  topics: Topic[]
  teacherId: string
}) {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const defaultTab = searchParams.get('tab') ?? 'questions'

  const [topics, setTopics] = useState<Topic[]>(initialTopics)

  // ── Quiz Question state ──────────────────────────────────────
  const [qSubject, setQSubject] = useState('')
  const [qTopic, setQTopic] = useState('none')
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctIdx, setCorrectIdx] = useState<number | null>(null)
  const [explanation, setExplanation] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [savingQ, setSavingQ] = useState(false)

  // ── Flashcard state ──────────────────────────────────────────
  const [fSubject, setFSubject] = useState('')
  const [fTopic, setFTopic] = useState('none')
  const [term, setTerm] = useState('')
  const [definition, setDefinition] = useState('')
  const [savingF, setSavingF] = useState(false)

  // ── Topic state ──────────────────────────────────────────────
  const [tSubject, setTSubject] = useState('')
  const [topicName, setTopicName] = useState('')
  const [topicDesc, setTopicDesc] = useState('')
  const [savingT, setSavingT] = useState(false)

  const topicsForQSubject = topics.filter(t => t.subject_id === qSubject)
  const topicsForFSubject = topics.filter(t => t.subject_id === fSubject)

  async function saveQuestion() {
    if (!qSubject || !question.trim()) { toast.error('Subject and question are required'); return }
    if (options.some(o => !o.trim())) { toast.error('All 4 answer options are required'); return }
    if (correctIdx === null) { toast.error('Select the correct answer'); return }

    setSavingQ(true)
    const { error } = await supabase.from('quiz_questions').insert({
      subject_id: qSubject,
      topic_id: qTopic !== 'none' ? qTopic : null,
      question: question.trim(),
      options,
      correct_answer: correctIdx,
      explanation: explanation.trim() || null,
      difficulty,
      created_by: teacherId,
    } as any)

    if (error) { toast.error('Failed to save question'); setSavingQ(false); return }

    toast.success('Question saved!')
    setQuestion('')
    setOptions(['', '', '', ''])
    setCorrectIdx(null)
    setExplanation('')
    setDifficulty('medium')
    setSavingQ(false)
  }

  async function saveFlashcard() {
    if (!fSubject || !term.trim() || !definition.trim()) {
      toast.error('Subject, term, and definition are required'); return
    }
    setSavingF(true)
    const { error } = await supabase.from('flashcards').insert({
      subject_id: fSubject,
      topic_id: fTopic !== 'none' ? fTopic : null,
      term: term.trim(),
      definition: definition.trim(),
      created_by: teacherId,
    } as any)

    if (error) { toast.error('Failed to save flashcard'); setSavingF(false); return }

    toast.success('Flashcard saved!')
    setTerm('')
    setDefinition('')
    setSavingF(false)
  }

  async function saveTopic() {
    if (!tSubject || !topicName.trim()) { toast.error('Subject and topic name are required'); return }
    setSavingT(true)
    const { data, error } = await supabase.from('topics').insert({
      subject_id: tSubject,
      name: topicName.trim(),
      description: topicDesc.trim() || null,
      order_index: topics.filter(t => t.subject_id === tSubject).length,
    } as any).select('id, subject_id, name').single()

    if (error) { toast.error('Failed to save topic'); setSavingT(false); return }

    toast.success('Topic created!')
    setTopics(prev => [...prev, data as any])
    setTopicName('')
    setTopicDesc('')
    setSavingT(false)
  }

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="w-full">
        <TabsTrigger value="questions" className="flex-1">Quiz Questions</TabsTrigger>
        <TabsTrigger value="flashcards" className="flex-1">Flashcards</TabsTrigger>
        <TabsTrigger value="topics" className="flex-1">Topics</TabsTrigger>
      </TabsList>

      {/* ── Quiz Questions ───────────────────────────────────── */}
      <TabsContent value="questions" className="mt-4">
        <Card>
          <CardHeader><CardTitle className="text-base">New Quiz Question</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={qSubject} onValueChange={(v: string | null) => { if (v) { setQSubject(v); setQTopic('none') } }}>
                  <SelectTrigger><SelectValue placeholder="Select subject">{subjects.find(s => s.id === qSubject)?.name ?? 'Select subject'}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Topic <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                <Select value={qTopic} onValueChange={(v: string | null) => { if (v) setQTopic(v) }} disabled={!qSubject}>
                  <SelectTrigger><SelectValue placeholder="No topic">{qTopic === 'none' ? 'No topic' : (topics.find(t => t.id === qTopic)?.name ?? 'No topic')}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No topic</SelectItem>
                    {topicsForQSubject.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <div className="flex gap-2">
                {(['easy', 'medium', 'hard'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors capitalize ${
                      difficulty === d
                        ? d === 'easy' ? 'bg-green-500/20 border-green-500 text-green-600'
                          : d === 'medium' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-600'
                          : 'bg-red-500/20 border-red-500 text-red-600'
                        : 'border-border text-muted-foreground hover:bg-accent'
                    }`}
                  >{d}</button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Question</Label>
              <Textarea
                placeholder="Type your question here..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Answer Options <span className="text-muted-foreground font-normal text-xs">— click the circle to mark correct</span></Label>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      onClick={() => setCorrectIdx(i)}
                      className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                        correctIdx === i
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-border hover:border-primary'
                      }`}
                    >
                      {correctIdx === i
                        ? <CheckCircle2 className="w-4 h-4" />
                        : <span className="text-xs font-bold">{String.fromCharCode(65 + i)}</span>
                      }
                    </button>
                    <Input
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      value={opt}
                      onChange={e => {
                        const next = [...options]
                        next[i] = e.target.value
                        setOptions(next)
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Explanation <span className="text-muted-foreground font-normal text-xs">(optional — shown after answering)</span></Label>
              <Textarea
                placeholder="Explain why the correct answer is right..."
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                rows={2}
              />
            </div>

            <Button onClick={saveQuestion} disabled={savingQ} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              {savingQ ? 'Saving...' : 'Save Question'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Flashcards ───────────────────────────────────────── */}
      <TabsContent value="flashcards" className="mt-4">
        <Card>
          <CardHeader><CardTitle className="text-base">New Flashcard</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={fSubject} onValueChange={(v: string | null) => { if (v) { setFSubject(v); setFTopic('none') } }}>
                  <SelectTrigger><SelectValue placeholder="Select subject">{subjects.find(s => s.id === fSubject)?.name ?? 'Select subject'}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Topic <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                <Select value={fTopic} onValueChange={(v: string | null) => { if (v) setFTopic(v) }} disabled={!fSubject}>
                  <SelectTrigger><SelectValue placeholder="No topic">{fTopic === 'none' ? 'No topic' : (topics.find(t => t.id === fTopic)?.name ?? 'No topic')}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No topic</SelectItem>
                    {topicsForFSubject.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Term</Label>
              <Input placeholder="e.g. Mitosis" value={term} onChange={e => setTerm(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Definition</Label>
              <Textarea
                placeholder="e.g. A type of cell division producing two genetically identical daughter cells..."
                value={definition}
                onChange={e => setDefinition(e.target.value)}
                rows={4}
              />
            </div>

            <Button onClick={saveFlashcard} disabled={savingF} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              {savingF ? 'Saving...' : 'Save Flashcard'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Topics ──────────────────────────────────────────── */}
      <TabsContent value="topics" className="mt-4 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">New Topic</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={tSubject} onValueChange={(v: string | null) => { if (v) setTSubject(v) }}>
                <SelectTrigger><SelectValue placeholder="Select subject">{subjects.find(s => s.id === tSubject)?.name ?? 'Select subject'}</SelectValue></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Topic Name</Label>
              <Input placeholder="e.g. Cell Biology" value={topicName} onChange={e => setTopicName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <Input placeholder="Brief description of this topic" value={topicDesc} onChange={e => setTopicDesc(e.target.value)} />
            </div>
            <Button onClick={saveTopic} disabled={savingT} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              {savingT ? 'Saving...' : 'Create Topic'}
            </Button>
          </CardContent>
        </Card>

        {/* Existing topics list */}
        {subjects.map(subject => {
          const subjectTopics = topics.filter(t => t.subject_id === subject.id)
          if (subjectTopics.length === 0) return null
          return (
            <Card key={subject.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{subject.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {subjectTopics.map(t => (
                  <Badge key={t.id} variant="secondary">{t.name}</Badge>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </TabsContent>
    </Tabs>
  )
}
