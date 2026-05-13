'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  CheckCircle2, Minus, BookOpen, Download, Search,
  ChevronUp, ChevronDown, ChevronsUpDown, AlertCircle,
} from 'lucide-react'
import type {
  GradebookSubject,
  GradebookModule,
  GradebookEnrollment,
  GradebookSubmission,
} from '@/app/teacher/gradebook/page'

type StudentRow = { id: string; name: string }
type CellData = { score: number; total: number; pct: number } | null
type SortKey = 'name' | 'avg' | string // string = module id
type SortDir = 'asc' | 'desc'

function pctColor(pct: number) {
  if (pct >= 80) return 'bg-green-500/15 text-green-700 dark:text-green-400'
  if (pct >= 60) return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400'
  return 'bg-red-500/15 text-red-700 dark:text-red-400'
}

function SortIcon({ column, sortKey, sortDir }: { column: string; sortKey: SortKey; sortDir: SortDir }) {
  if (column !== sortKey) return <ChevronsUpDown className="w-3 h-3 text-muted-foreground/50" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-foreground" />
    : <ChevronDown className="w-3 h-3 text-foreground" />
}

function exportCsv(
  subjectName: string,
  studentRows: StudentRow[],
  subjectModules: (GradebookModule & { question_count: number })[],
  subMap: Map<string, CellData>,
  rowAvgFn: (id: string) => number | null,
) {
  const headers = ['Student', ...subjectModules.map(m => m.title), 'Average']
  const rows = studentRows.map(s => {
    const cols = subjectModules.map(m => {
      const c = subMap.get(`${s.id}:${m.id}`)
      return c ? `${c.score}/${c.total} (${c.pct}%)` : 'Not submitted'
    })
    const avg = rowAvgFn(s.id)
    return [s.name, ...cols, avg !== null ? `${avg}%` : '—']
  })
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gradebook-${subjectName.toLowerCase().replace(/\s+/g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function GradebookView({
  subjects,
  modules,
  enrollments,
  submissions,
}: {
  subjects: GradebookSubject[]
  modules: (GradebookModule & { question_count: number })[]
  enrollments: GradebookEnrollment[]
  submissions: GradebookSubmission[]
}) {
  const [activeSubjectId, setActiveSubjectId] = useState(subjects[0]?.id ?? '')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const now = new Date()

  const subjectModules = modules.filter(m => m.subject_id === activeSubjectId)

  // All students enrolled in this subject
  const allStudentRows: StudentRow[] = useMemo(() => Array.from(
    new Map(
      enrollments
        .filter(e => e.subject_id === activeSubjectId)
        .map(e => [
          e.student_id,
          { id: e.student_id, name: (e.profiles as any)?.full_name ?? 'Unknown' },
        ])
    ).values()
  ), [enrollments, activeSubjectId])

  // Submission lookup
  const subMap = useMemo(() => {
    const map = new Map<string, CellData>()
    for (const s of submissions) {
      if (s.score !== null && s.total_questions !== null && s.total_questions > 0) {
        map.set(`${s.student_id}:${s.module_id}`, {
          score: s.score,
          total: s.total_questions,
          pct: Math.round((s.score / s.total_questions) * 100),
        })
      }
    }
    return map
  }, [submissions])

  function rowAvg(studentId: string): number | null {
    const cells = subjectModules
      .map(m => subMap.get(`${studentId}:${m.id}`))
      .filter((c): c is NonNullable<typeof c> => c !== null)
    return cells.length > 0
      ? Math.round(cells.reduce((sum, c) => sum + c.pct, 0) / cells.length)
      : null
  }

  // Column stats
  const colStats = useMemo(() => {
    const result: Record<string, { avg: number | null; submitted: number }> = {}
    for (const mod of subjectModules) {
      const cells = allStudentRows
        .map(s => subMap.get(`${s.id}:${mod.id}`))
        .filter((c): c is NonNullable<typeof c> => c !== null)
      result[mod.id] = {
        avg: cells.length > 0
          ? Math.round(cells.reduce((sum, c) => sum + c.pct, 0) / cells.length)
          : null,
        submitted: cells.length,
      }
    }
    return result
  }, [allStudentRows, subjectModules, subMap])

  // Sort + filter
  const studentRows = useMemo(() => {
    let rows = allStudentRows.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase())
    )
    rows = [...rows].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') {
        cmp = a.name.localeCompare(b.name)
      } else if (sortKey === 'avg') {
        const aa = rowAvg(a.id) ?? -1
        const bb = rowAvg(b.id) ?? -1
        cmp = aa - bb
      } else {
        const ac = subMap.get(`${a.id}:${sortKey}`)?.pct ?? -1
        const bc = subMap.get(`${b.id}:${sortKey}`)?.pct ?? -1
        cmp = ac - bc
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [allStudentRows, search, sortKey, sortDir, subMap])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  function handleSubjectChange(id: string) {
    setActiveSubjectId(id)
    setSearch('')
    setSortKey('name')
    setSortDir('asc')
  }

  if (subjects.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
        No subjects found. Make sure you have been assigned a subject.
      </div>
    )
  }

  const activeSubject = subjects.find(s => s.id === activeSubjectId)

  return (
    <div className="space-y-4">

      {/* Subject tabs */}
      <div className="flex gap-2 flex-wrap">
        {subjects.map(s => (
          <button
            key={s.id}
            onClick={() => handleSubjectChange(s.id)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
              activeSubjectId === s.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search students…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Stats summary */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground ml-auto flex-wrap">
          <span>{allStudentRows.length} student{allStudentRows.length !== 1 ? 's' : ''}</span>
          <span>{subjectModules.length} module{subjectModules.length !== 1 ? 's' : ''}</span>
          {subjectModules.length > 0 && (
            <span>
              {subjectModules.reduce((sum, m) => sum + (colStats[m.id]?.submitted ?? 0), 0)} total submissions
            </span>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => exportCsv(
            activeSubject?.name ?? 'gradebook',
            studentRows,
            subjectModules,
            subMap,
            rowAvg,
          )}
          disabled={studentRows.length === 0 || subjectModules.length === 0}
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {subjectModules.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
          No modules for this subject yet. Create some in the Modules page.
        </div>
      ) : allStudentRows.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
          No students enrolled in this subject yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {/* Student name column */}
                <th className="sticky left-0 z-10 bg-muted/80 backdrop-blur px-4 py-3 text-left font-semibold text-foreground min-w-[160px]">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Student
                    <SortIcon column="name" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>

                {subjectModules.map(mod => {
                  const isOverdue = !!mod.due_date && new Date(mod.due_date) < now
                  const stats = colStats[mod.id]
                  return (
                    <th
                      key={mod.id}
                      className="px-4 py-3 text-center font-medium text-foreground min-w-[140px] max-w-[180px]"
                    >
                      <div className="space-y-1">
                        <button
                          onClick={() => handleSort(mod.id)}
                          className="flex items-center justify-center gap-1 w-full hover:text-foreground transition-colors"
                          title={mod.title}
                        >
                          <p className="truncate text-xs font-semibold max-w-[120px]">{mod.title}</p>
                          <SortIcon column={mod.id} sortKey={sortKey} sortDir={sortDir} />
                        </button>
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">{mod.question_count}q</span>
                          {mod.due_date && (
                            <span className={cn('text-xs', isOverdue ? 'text-orange-500 font-medium' : 'text-muted-foreground')}>
                              · {isOverdue ? 'Due ' : 'Due '}
                              {new Date(mod.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              {isOverdue && ' ⚠'}
                            </span>
                          )}
                          {!mod.is_published && (
                            <Badge variant="outline" className="text-xs py-0 px-1.5 h-4">Draft</Badge>
                          )}
                        </div>
                        {/* Submission count */}
                        <p className={cn(
                          'text-xs',
                          stats.submitted === allStudentRows.length
                            ? 'text-green-600 dark:text-green-400'
                            : stats.submitted === 0
                              ? 'text-muted-foreground'
                              : 'text-yellow-600 dark:text-yellow-400'
                        )}>
                          {stats.submitted}/{allStudentRows.length} submitted
                        </p>
                      </div>
                    </th>
                  )
                })}

                {/* Average column */}
                <th className="px-4 py-3 text-center font-semibold text-foreground min-w-[100px]">
                  <button
                    onClick={() => handleSort('avg')}
                    className="flex items-center justify-center gap-1 w-full hover:text-foreground transition-colors"
                  >
                    Avg
                    <SortIcon column="avg" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
              </tr>

              {/* Class average row */}
              <tr className="border-b border-border bg-muted/30">
                <td className="sticky left-0 z-10 bg-muted/50 backdrop-blur px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Class avg
                </td>
                {subjectModules.map(mod => {
                  const avg = colStats[mod.id]?.avg ?? null
                  return (
                    <td key={mod.id} className="px-4 py-2 text-center">
                      {avg !== null ? (
                        <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-semibold', pctColor(avg))}>
                          {avg}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  )
                })}
                <td className="px-4 py-2 text-center">
                  {(() => {
                    const allAvgs = subjectModules
                      .map(m => colStats[m.id]?.avg ?? null)
                      .filter((v): v is number => v !== null)
                    if (allAvgs.length === 0) return <span className="text-xs text-muted-foreground">—</span>
                    const overall = Math.round(allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length)
                    return (
                      <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-bold', pctColor(overall))}>
                        {overall}%
                      </span>
                    )
                  })()}
                </td>
              </tr>
            </thead>

            <tbody>
              {studentRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={subjectModules.length + 2}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No students match &ldquo;{search}&rdquo;
                  </td>
                </tr>
              ) : studentRows.map((student, i) => {
                const avg = rowAvg(student.id)
                return (
                  <tr
                    key={student.id}
                    className={cn(
                      'border-b border-border transition-colors hover:bg-accent/40',
                      i % 2 !== 0 && 'bg-muted/10'
                    )}
                  >
                    <td className="sticky left-0 z-10 backdrop-blur px-4 py-3 font-medium text-sm bg-card border-r border-border">
                      {student.name}
                    </td>

                    {subjectModules.map(mod => {
                      const cell = subMap.get(`${student.id}:${mod.id}`)
                      const isOverdue = !!mod.due_date && new Date(mod.due_date) < now
                      return (
                        <td key={mod.id} className="px-4 py-3 text-center">
                          {cell ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold', pctColor(cell.pct))}>
                                <CheckCircle2 className="w-3 h-3" />
                                {cell.pct}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {cell.score}/{cell.total}
                              </span>
                            </div>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center gap-1 text-xs text-orange-500">
                              <AlertCircle className="w-3 h-3" />
                              Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Minus className="w-3 h-3" />
                              Not submitted
                            </span>
                          )}
                        </td>
                      )
                    })}

                    <td className="px-4 py-3 text-center">
                      {avg !== null ? (
                        <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-bold', pctColor(avg))}>
                          {avg}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Average is across submitted modules only</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-block w-3 h-3 rounded bg-green-500/20" /> ≥ 80%
          <span className="inline-block w-3 h-3 rounded bg-yellow-500/20" /> 60–79%
          <span className="inline-block w-3 h-3 rounded bg-red-500/20" /> &lt; 60%
          <AlertCircle className="w-3 h-3 text-orange-500" />
          <span>Overdue &amp; missing</span>
        </div>
      </div>
    </div>
  )
}
