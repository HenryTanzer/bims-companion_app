'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Send, Bot, User, Loader2, Trash2, NotebookPen, Save } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }
type Subject = { id: string; name: string; color: string }
type SavedChat = { date: string; messages: Message[] }
type DbError = { message?: string } | null
type UnitRow = { id: string; title: string }
type TopicRow = { id: string; unit_id: string; title: string }
type LessonRow = { id: string; topic_id: string; title: string }
type LessonNoteRow = { content: string | null }
type LessonOption = { id: string; title: string; topicTitle: string; unitTitle: string }
type ReadQuery<T> = {
  eq: (column: string, value: string | boolean) => ReadQuery<T>
  in: (column: string, values: string[]) => ReadQuery<T>
  order: (column: string, options?: { ascending?: boolean }) => Promise<{ data: T[] | null; error: DbError }>
  maybeSingle: () => Promise<{ data: T | null; error: DbError }>
}
type ReadTable<T> = { select: (columns: string) => ReadQuery<T> }
type LessonNotesTable = ReadTable<LessonNoteRow> & {
  upsert: (
    values: { student_id: string; lesson_id: string; content: string; updated_at: string },
    options: { onConflict: string }
  ) => Promise<{ error: DbError }>
}
type StudyBuddyDb = {
  from: (table: 'curriculum_units') => ReadTable<UnitRow>
} & {
  from: (table: 'curriculum_topics') => ReadTable<TopicRow>
} & {
  from: (table: 'curriculum_lessons') => ReadTable<LessonRow>
} & {
  from: (table: 'lesson_notes') => LessonNotesTable
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA')
}

function storageKey(studentId: string, subjectId: string) {
  return `bims_study_buddy_chat:${studentId}:${subjectId}`
}

function isMessage(value: unknown): value is Message {
  if (!value || typeof value !== 'object') return false
  const maybe = value as Partial<Message>
  return (maybe.role === 'user' || maybe.role === 'assistant') && typeof maybe.content === 'string'
}

export function StudyBuddyChat({
  enrolledSubjects,
  studentId,
}: {
  enrolledSubjects: Subject[]
  studentId: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const db = useMemo(() => supabase as unknown as StudyBuddyDb, [supabase])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    enrolledSubjects[0]?.id ?? ''
  )
  const [messages, setMessages] = useState<Message[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [lessonOptions, setLessonOptions] = useState<LessonOption[]>([])
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [loadingLessons, setLoadingLessons] = useState(false)
  const [savingToNotes, setSavingToNotes] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const selectedSubject = useMemo(
    () => enrolledSubjects.find(subject => subject.id === selectedSubjectId) ?? enrolledSubjects[0],
    [enrolledSubjects, selectedSubjectId]
  )

  useEffect(() => {
    if (!selectedSubject) return

    const key = storageKey(studentId, selectedSubject.id)
    let cancelled = false

    window.setTimeout(() => {
      if (cancelled) return

      try {
        const raw = window.localStorage.getItem(key)
        if (!raw) {
          setMessages([])
          setHydrated(true)
          return
        }

        const saved = JSON.parse(raw) as Partial<SavedChat>
        if (saved.date !== todayKey() || !Array.isArray(saved.messages) || !saved.messages.every(isMessage)) {
          window.localStorage.removeItem(key)
          setMessages([])
          setHydrated(true)
          return
        }

        setMessages(saved.messages)
        setHydrated(true)
        window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 0)
      } catch {
        window.localStorage.removeItem(key)
        setMessages([])
        setHydrated(true)
      }
    }, 0)

    return () => { cancelled = true }
  }, [selectedSubject, studentId])

  useEffect(() => {
    if (!hydrated || !selectedSubject) return

    const key = storageKey(studentId, selectedSubject.id)
    if (messages.length === 0) {
      window.localStorage.removeItem(key)
      return
    }

    window.localStorage.setItem(key, JSON.stringify({
      date: todayKey(),
      messages,
    } satisfies SavedChat))
  }, [hydrated, messages, selectedSubject, studentId])

  async function send() {
    const text = input.trim()
    if (!text || streaming || !selectedSubject) return

    const userMsg: Message = { role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setStreaming(true)

    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch('/api/study-buddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, subject: selectedSubject.name }),
        signal: ctrl.signal,
      })

      if (!res.ok || !res.body) {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: 'Sorry, something went wrong. Please try again.',
          }
          return updated
        })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    } catch (err: unknown) {
      if (!(err instanceof DOMException) || err.name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: 'Connection error. Please try again.',
          }
          return updated
        })
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
      setTimeout(() => textareaRef.current?.focus(), 0)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function clearChat() {
    if (streaming) abortRef.current?.abort()
    if (selectedSubject) window.localStorage.removeItem(storageKey(studentId, selectedSubject.id))
    setMessages([])
    setStreaming(false)
  }

  function switchSubject(subjectId: string) {
    if (subjectId === selectedSubjectId) return
    if (streaming) {
      abortRef.current?.abort()
      setStreaming(false)
    }
    setInput('')
    setHydrated(false)
    setSaveOpen(false)
    setSelectedLessonId('')
    setLessonOptions([])
    setSelectedSubjectId(subjectId)
  }

  async function loadLessonOptions(subject: Subject) {
    setLoadingLessons(true)
    setLessonOptions([])
    setSelectedLessonId('')

    const unitsRes = await db
      .from('curriculum_units')
      .select('id, title')
      .eq('subject_id', subject.id)
      .order('position')

    const units = unitsRes.data ?? []
    const unitIds = units.map(unit => unit.id)
    if (unitsRes.error || unitIds.length === 0) {
      if (unitsRes.error) toast.error('Failed to load lessons')
      setLoadingLessons(false)
      return
    }

    const topicsRes = await db
      .from('curriculum_topics')
      .select('id, unit_id, title')
      .in('unit_id', unitIds)
      .order('position')

    const topics = topicsRes.data ?? []
    const topicIds = topics.map(topic => topic.id)
    if (topicsRes.error || topicIds.length === 0) {
      if (topicsRes.error) toast.error('Failed to load lessons')
      setLoadingLessons(false)
      return
    }

    const lessonsRes = await db
      .from('curriculum_lessons')
      .select('id, topic_id, title')
      .in('topic_id', topicIds)
      .eq('is_published', true)
      .order('position')

    if (lessonsRes.error) {
      toast.error('Failed to load lessons')
      setLoadingLessons(false)
      return
    }

    const topicById = new Map(topics.map(topic => [topic.id, topic]))
    const unitById = new Map(units.map(unit => [unit.id, unit]))
    const options = (lessonsRes.data ?? []).map(lesson => {
      const topic = topicById.get(lesson.topic_id)
      const unit = topic ? unitById.get(topic.unit_id) : undefined
      return {
        id: lesson.id,
        title: lesson.title,
        topicTitle: topic?.title ?? 'Topic',
        unitTitle: unit?.title ?? 'Unit',
      }
    })

    setLessonOptions(options)
    setSelectedLessonId(options[0]?.id ?? '')
    setLoadingLessons(false)
  }

  function openSavePanel() {
    if (!selectedSubject) return
    const nextOpen = !saveOpen
    setSaveOpen(nextOpen)
    if (nextOpen && lessonOptions.length === 0) loadLessonOptions(selectedSubject)
  }

  function formatTranscript(subjectName: string) {
    const transcript = messages
      .filter(message => message.content.trim())
      .map(message => `${message.role === 'user' ? 'Student' : 'Study Buddy'}: ${message.content.trim()}`)
      .join('\n\n')

    const stamp = new Date().toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })

    return `Study Buddy chat - ${subjectName} (${stamp})\n\n${transcript}`
  }

  async function saveChatToNotes() {
    if (!selectedSubject || !selectedLessonId || savingToNotes) return

    setSavingToNotes(true)
    const { data, error: loadError } = await db
      .from('lesson_notes')
      .select('content')
      .eq('student_id', studentId)
      .eq('lesson_id', selectedLessonId)
      .maybeSingle()

    if (loadError) {
      toast.error('Failed to load lesson notes')
      setSavingToNotes(false)
      return
    }

    const existing = data?.content?.trim() ?? ''
    const transcript = formatTranscript(selectedSubject.name)
    const nextContent = existing ? `${existing}\n\n---\n\n${transcript}` : transcript

    const { error } = await db.from('lesson_notes').upsert({
      student_id: studentId,
      lesson_id: selectedLessonId,
      content: nextContent,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id,lesson_id' })

    if (error) {
      toast.error('Failed to save chat to notes')
    } else {
      toast.success('Chat saved to lesson notes')
      setSaveOpen(false)
    }
    setSavingToNotes(false)
  }

  const hasSubjects = enrolledSubjects.length > 0
  const selectedSubjectName = selectedSubject?.name ?? ''

  if (!hasSubjects) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        You are not enrolled in any subjects yet. Contact your teacher to get enrolled.
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-14rem)]">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground font-medium">Subject:</span>
        {enrolledSubjects.map(subject => (
          <button
            key={subject.id}
            onClick={() => switchSubject(subject.id)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              selectedSubjectId === subject.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
            }`}
          >
            {subject.name}
          </button>
        ))}
        {messages.length > 0 && (
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={openSavePanel}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <NotebookPen className="w-3 h-3" />
              Save to notes
            </button>
            <button
              onClick={clearChat}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear chat
            </button>
          </div>
        )}
      </div>

      {saveOpen && (
        <Card className="p-4 space-y-3 border-primary/30 bg-primary/5">
          <div className="flex items-start gap-3">
            <NotebookPen className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Save this chat to lesson notes</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pick a published {selectedSubjectName} lesson. The transcript will be added to your private notes.
              </p>
            </div>
          </div>

          {loadingLessons ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading lessons...
            </div>
          ) : lessonOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No published lessons are available for this subject yet.
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedLessonId}
                onChange={event => setSelectedLessonId(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {lessonOptions.map(lesson => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.unitTitle} / {lesson.topicTitle} / {lesson.title}
                  </option>
                ))}
              </select>
              <Button
                onClick={saveChatToNotes}
                disabled={!selectedLessonId || savingToNotes}
                className="gap-2 shrink-0"
              >
                {savingToNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingToNotes ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </Card>
      )}

      <Card className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-muted-foreground">
            <Bot className="w-10 h-10 opacity-40" />
            <p className="text-sm max-w-xs">
              Ask me anything about <span className="font-medium text-foreground">{selectedSubjectName}</span>.
              I can explain concepts, work through problems, and help you prepare for exams.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm'
              }`}
            >
              {msg.content}
              {msg.role === 'assistant' && streaming && i === messages.length - 1 && msg.content === '' && (
                <Loader2 className="w-3.5 h-3.5 animate-spin inline-block" />
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </Card>

      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask about ${selectedSubjectName}... (Enter to send, Shift+Enter for new line)`}
          rows={2}
          className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={streaming}
        />
        <Button
          onClick={send}
          disabled={!input.trim() || streaming}
          size="icon"
          className="h-10 w-10 rounded-xl shrink-0"
        >
          {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}
