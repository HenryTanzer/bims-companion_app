'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react'

type Subject = { id: string; name: string }

export function StudentEnroller({
  studentId,
  studentName,
  allSubjects,
  initialEnrolledIds,
}: {
  studentId: string
  studentName: string
  allSubjects: Subject[]
  initialEnrolledIds: string[]
}) {
  const supabase = createClient()
  const [enrolledIds, setEnrolledIds] = useState<string[]>(initialEnrolledIds)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const unenrolled = allSubjects.filter(s => !enrolledIds.includes(s.id))

  async function enrol(subjectId: string) {
    setLoading(subjectId)
    const { error } = await supabase.from('enrollments').insert({
      student_id: studentId,
      subject_id: subjectId,
    } as any)
    if (error) { toast.error('Failed to enrol student'); setLoading(null); return }
    setEnrolledIds(prev => [...prev, subjectId])
    const name = allSubjects.find(s => s.id === subjectId)?.name
    toast.success(`${studentName} enrolled in ${name}`)
    setLoading(null)
  }

  async function unenrol(subjectId: string) {
    setLoading(subjectId)
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
    if (error) { toast.error('Failed to remove enrolment'); setLoading(null); return }
    setEnrolledIds(prev => prev.filter(id => id !== subjectId))
    const name = allSubjects.find(s => s.id === subjectId)?.name
    toast.success(`${studentName} removed from ${name}`)
    setLoading(null)
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Manage enrolments
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* Enrolled */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Enrolled in</p>
            <div className="flex flex-wrap gap-2">
              {enrolledIds.length === 0 && (
                <span className="text-xs text-muted-foreground">None</span>
              )}
              {allSubjects.filter(s => enrolledIds.includes(s.id)).map(s => (
                <div
                  key={s.id}
                  className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5 text-xs font-medium"
                >
                  {s.name}
                  <button
                    onClick={() => unenrol(s.id)}
                    disabled={loading === s.id}
                    className="hover:text-destructive transition-colors"
                    title={`Remove ${studentName} from ${s.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add to subject */}
          {unenrolled.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Add to subject</p>
              <div className="flex flex-wrap gap-2">
                {unenrolled.map(s => (
                  <button
                    key={s.id}
                    onClick={() => enrol(s.id)}
                    disabled={loading === s.id}
                    className="flex items-center gap-1 border border-dashed border-border rounded-full px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    {loading === s.id ? '...' : s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
