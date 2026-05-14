'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, GraduationCap, NotebookPen, Brain, CreditCard, FileText } from 'lucide-react'

type SearchType = 'lesson' | 'note' | 'quiz' | 'flashcard' | 'paper'

export type SearchItem = {
  id: string
  type: SearchType
  title: string
  body: string
  subjectName: string
  subjectColor: string
  href: string
}

const TYPE_META: Record<SearchType, { label: string; icon: React.ElementType }> = {
  lesson: { label: 'Lessons', icon: GraduationCap },
  note: { label: 'My Notes', icon: NotebookPen },
  quiz: { label: 'Quiz Questions', icon: Brain },
  flashcard: { label: 'Flashcards', icon: CreditCard },
  paper: { label: 'Past Papers', icon: FileText },
}

const ORDER: SearchType[] = ['lesson', 'note', 'quiz', 'flashcard', 'paper']

function score(item: SearchItem, query: string) {
  const q = query.toLowerCase()
  const title = item.title.toLowerCase()
  const body = item.body.toLowerCase()
  let value = 0
  if (title === q) value += 100
  if (title.includes(q)) value += 50
  if (body.includes(q)) value += 20
  if (item.subjectName.toLowerCase().includes(q)) value += 10
  return value
}

function excerpt(text: string, query: string) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  const index = clean.toLowerCase().indexOf(query.toLowerCase())
  const start = Math.max(0, index === -1 ? 0 : index - 80)
  const end = Math.min(clean.length, start + 180)
  return `${start > 0 ? '...' : ''}${clean.slice(start, end)}${end < clean.length ? '...' : ''}`
}

export function SearchView({ items }: { items: SearchItem[] }) {
  const [query, setQuery] = useState('')
  const trimmed = query.trim()

  const results = useMemo(() => {
    if (trimmed.length < 2) return []
    return items
      .map(item => ({ item, score: score(item, trimmed) }))
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
      .map(result => result.item)
  }, [items, trimmed])

  const grouped = ORDER.map(type => ({
    type,
    results: results.filter(item => item.type === type).slice(0, 8),
  })).filter(group => group.results.length > 0)

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search lessons, notes, quiz questions, flashcards, and papers..."
          className="pl-9 h-11"
          autoFocus
        />
      </div>

      {trimmed.length < 2 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Type at least two characters to search your study material.
          </CardContent>
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No results found for “{trimmed}”.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ type, results: groupResults }) => {
            const Icon = TYPE_META[type].icon
            return (
              <section key={type} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold">{TYPE_META[type].label}</h2>
                  <span className="text-xs text-muted-foreground">{groupResults.length}</span>
                </div>
                <div className="space-y-2">
                  {groupResults.map(item => (
                    <Link key={`${item.type}-${item.id}`} href={item.href}>
                      <Card className="hover:border-primary/50 transition-colors">
                        <CardContent className="py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{item.title}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {excerpt(item.body, trimmed)}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="shrink-0 text-xs"
                              style={{
                                color: item.subjectColor,
                                borderColor: item.subjectColor + '55',
                                backgroundColor: item.subjectColor + '16',
                              }}
                            >
                              {item.subjectName}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
