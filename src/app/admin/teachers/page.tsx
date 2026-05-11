'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Loader2, BookOpen } from 'lucide-react'

type Teacher = {
  id: string
  full_name: string
  email: string
  role: string
}
type Subject = { id: string; name: string; color: string }

export default function AdminTeachersPage() {
  const supabase = createClient()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [assignmentMap, setAssignmentMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [reassigning, setReassigning] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [teachersRes, subjectsRes, assignmentsRes] = await Promise.all([
      (supabase as any).from('profiles').select('id, full_name, email, role').in('role', ['teacher', 'admin']).order('full_name'),
      supabase.from('subjects').select('id, name, color').order('name'),
      (supabase as any).from('teacher_subjects').select('teacher_id, subject_id'),
    ])
    setTeachers((teachersRes.data ?? []) as Teacher[])
    setSubjects((subjectsRes.data ?? []) as Subject[])
    const map = new Map<string, string>()
    for (const row of (assignmentsRes.data ?? []) as any[]) {
      // Use the first assignment per teacher (single-subject model)
      if (!map.has(row.teacher_id)) map.set(row.teacher_id, row.subject_id)
    }
    setAssignmentMap(map)
    setLoading(false)
  }

  async function reassign(teacherId: string, newSubjectId: string) {
    setReassigning(teacherId)
    // Remove existing assignments then insert new one
    await (supabase as any).from('teacher_subjects').delete().eq('teacher_id', teacherId)
    const { error } = await (supabase as any).from('teacher_subjects').insert({
      teacher_id: teacherId,
      subject_id: newSubjectId,
    })
    if (error) {
      toast.error('Failed to reassign unit')
    } else {
      setAssignmentMap(prev => new Map(prev).set(teacherId, newSubjectId))
      toast.success('Unit reassigned')
      setExpandedId(null)
    }
    setReassigning(null)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Teachers</h1>
        <p className="text-muted-foreground text-sm mt-1">
          View and reassign which unit each teacher manages.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : teachers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No teachers yet. Teachers appear here once they sign up.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {teachers.map(t => {
            const initials = t.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            const assignedSubjectId = assignmentMap.get(t.id)
            const assignedSubject = subjects.find(s => s.id === assignedSubjectId)
            const isExpanded = expandedId === t.id
            const isAdmin = t.role === 'admin'

            return (
              <Card key={t.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{t.full_name}</p>
                        {isAdmin && <Badge variant="destructive" className="text-xs">admin</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{t.email}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {assignedSubject ? (
                        <Badge
                          variant="secondary"
                          className="gap-1.5 text-xs"
                          style={{ borderColor: assignedSubject.color + '60', color: assignedSubject.color }}
                        >
                          <BookOpen className="w-3 h-3" />
                          {assignedSubject.name}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          No unit
                        </Badge>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => setExpandedId(isExpanded ? null : t.id)}
                      >
                        Reassign
                      </Button>
                    </div>
                  </div>

                  {/* Reassign panel */}
                  {isExpanded && (
                    <div className="border-t border-border pt-3 space-y-2">
                      <p className="text-xs text-muted-foreground">Select a new unit for {t.full_name.split(' ')[0]}:</p>
                      <div className="flex flex-wrap gap-2">
                        {subjects.map(s => (
                          <Button
                            key={s.id}
                            size="sm"
                            variant={assignedSubjectId === s.id ? 'default' : 'outline'}
                            className="text-xs h-7"
                            disabled={reassigning === t.id || assignedSubjectId === s.id}
                            onClick={() => reassign(t.id, s.id)}
                          >
                            {reassigning === t.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : s.name
                            }
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
