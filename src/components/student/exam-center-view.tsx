'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, ExternalLink, Inbox } from 'lucide-react'

type Subject = { id: string; name: string; color: string }
type Paper = {
  id: string
  subject_id: string
  title: string
  year: number
  paper_number: number | null
  file_url: string | null
}

export function ExamCenterView({
  subjects,
  papers,
}: {
  subjects: Subject[]
  papers: Paper[]
}) {
  const [activeSubject, setActiveSubject] = useState<string>(subjects[0]?.id ?? '')

  if (subjects.length === 0) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
        <Inbox className="w-10 h-10 opacity-40" />
        <p className="text-sm">You are not enrolled in any subjects yet. Contact your teacher.</p>
      </Card>
    )
  }

  const visiblePapers = papers.filter(p => p.subject_id === activeSubject)

  // Group by year
  const byYear = visiblePapers.reduce<Record<number, Paper[]>>((acc, p) => {
    ;(acc[p.year] ??= []).push(p)
    return acc
  }, {})
  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a)

  return (
    <div className="space-y-4">
      {/* Subject tabs */}
      <div className="flex gap-2 flex-wrap">
        {subjects.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSubject(s.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeSubject === s.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Papers */}
      {visiblePapers.length === 0 ? (
        <Card className="p-8 flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
          <FileText className="w-8 h-8 opacity-40" />
          <p className="text-sm">No past papers uploaded for this subject yet.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {years.map(year => (
            <div key={year}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{year}</p>
              <div className="space-y-2">
                {byYear[year].map(paper => (
                  <Card key={paper.id} className="flex items-center gap-4 px-4 py-3">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{paper.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{paper.year}</span>
                        {paper.paper_number && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            Paper {paper.paper_number}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {paper.file_url ? (
                      <a href={paper.file_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open
                        </Button>
                      </a>
                    ) : (
                      <Button size="sm" variant="outline" disabled className="shrink-0 text-muted-foreground">
                        No file
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
