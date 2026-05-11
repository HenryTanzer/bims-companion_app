'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Send, Bot, User, Loader2 } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }

type Subject = { id: string; name: string; color: string }

export function StudyBuddyChat({
  enrolledSubjects,
}: {
  enrolledSubjects: Subject[]
}) {
  const [selectedSubject, setSelectedSubject] = useState<string>(
    enrolledSubjects[0]?.name ?? ''
  )
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function send() {
    const text = input.trim()
    if (!text || streaming) return

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
        body: JSON.stringify({ messages: nextMessages, subject: selectedSubject }),
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
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
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
    setMessages([])
    setStreaming(false)
  }

  const hasSubjects = enrolledSubjects.length > 0

  if (!hasSubjects) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        You are not enrolled in any subjects yet. Contact your teacher to get enrolled.
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-14rem)]">
      {/* Subject selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground font-medium">Subject:</span>
        {enrolledSubjects.map(s => (
          <button
            key={s.id}
            onClick={() => { setSelectedSubject(s.name); clearChat() }}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              selectedSubject === s.name
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
            }`}
          >
            {s.name}
          </button>
        ))}
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Message thread */}
      <Card className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-muted-foreground">
            <Bot className="w-10 h-10 opacity-40" />
            <p className="text-sm max-w-xs">
              Ask me anything about <span className="font-medium text-foreground">{selectedSubject}</span>.
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

      {/* Input */}
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask about ${selectedSubject}… (Enter to send, Shift+Enter for new line)`}
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
