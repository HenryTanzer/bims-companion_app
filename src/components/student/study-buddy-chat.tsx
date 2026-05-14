'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Send, Bot, User, Loader2, Trash2 } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }
type Subject = { id: string; name: string; color: string }
type SavedChat = { date: string; messages: Message[] }

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
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    enrolledSubjects[0]?.id ?? ''
  )
  const [messages, setMessages] = useState<Message[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
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
    setSelectedSubjectId(subjectId)
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
          <button
            onClick={clearChat}
            className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear chat
          </button>
        )}
      </div>

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
