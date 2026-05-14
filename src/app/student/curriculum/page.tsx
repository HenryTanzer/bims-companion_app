import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CurriculumView } from '@/components/student/curriculum-view'
import type { ContentBlock, YearGroup } from '@/types/database'

export type StudentLesson = {
  id: string
  topic_id: string
  title: string
  learning_outcomes: string[]
  content: ContentBlock[]
  is_published: boolean
  position: number
  completed: boolean
}

export type StudentTopic = {
  id: string
  unit_id: string
  title: string
  position: number
  lessons: StudentLesson[]
}

export type StudentUnit = {
  id: string
  subject_id: string
  title: string
  year_group: YearGroup
  position: number
  topics: StudentTopic[]
}

export type StudentSubject = {
  id: string
  name: string
  color: string
  units: StudentUnit[]
  linkedQuestionCount: number
  linkedFlashcardCount: number
}

export default async function StudentCurriculumPage({
  searchParams,
}: {
  searchParams?: Promise<{ lesson?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get enrolled subjects
  const { data: enrollments } = await (supabase as any)
    .from('enrollments')
    .select('subject_id, subjects(id, name, color)')
    .eq('student_id', user.id)

  const subjects: { id: string; name: string; color: string }[] =
    (enrollments ?? []).map((e: any) => e.subjects).filter(Boolean)

  if (subjects.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Curriculum</h1>
        <p className="text-muted-foreground text-sm">
          You are not enrolled in any subjects yet. Ask your teacher to enrol you.
        </p>
      </div>
    )
  }

  const subjectIds = subjects.map(s => s.id)

  // Load curriculum tree
  const { data: units } = await (supabase as any)
    .from('curriculum_units')
    .select('*')
    .in('subject_id', subjectIds)
    .order('position')

  const unitRows: any[] = units ?? []
  const unitIds = unitRows.map(u => u.id)

  const [topicsRes, lessonsRes, progressRes, qCountRes, fCountRes] = await Promise.all([
    unitIds.length > 0
      ? (supabase as any).from('curriculum_topics').select('*').in('unit_id', unitIds).order('position')
      : Promise.resolve({ data: [] }),
    unitIds.length > 0
      ? (supabase as any).from('curriculum_lessons')
          .select('id, topic_id, title, learning_outcomes, content, is_published, position')
          .eq('is_published', true)
          .order('position')
      : Promise.resolve({ data: [] }),
    (supabase as any)
      .from('lesson_progress')
      .select('lesson_id, is_completed')
      .eq('student_id', user.id),
    unitIds.length > 0
      ? (supabase as any).from('quiz_questions').select('id, subject_id, lesson_id').in('subject_id', subjectIds).not('lesson_id', 'is', null)
      : Promise.resolve({ data: [] }),
    unitIds.length > 0
      ? (supabase as any).from('flashcards').select('id, subject_id, lesson_id').in('subject_id', subjectIds).not('lesson_id', 'is', null)
      : Promise.resolve({ data: [] }),
  ])

  const topics: any[] = topicsRes.data ?? []
  const lessons: any[] = lessonsRes.data ?? []
  const progress: any[] = progressRes.data ?? []
  const completedLessonIds = new Set(
    progress.filter((p: any) => p.is_completed).map((p: any) => p.lesson_id)
  )

  // Count linked resources per subject
  const qBySubject = (qCountRes.data ?? []).reduce((acc: any, q: any) => {
    acc[q.subject_id] = (acc[q.subject_id] ?? 0) + 1; return acc
  }, {} as Record<string, number>)
  const fBySubject = (fCountRes.data ?? []).reduce((acc: any, f: any) => {
    acc[f.subject_id] = (acc[f.subject_id] ?? 0) + 1; return acc
  }, {} as Record<string, number>)

  const topicIds = new Set(topics.map((t: any) => t.id))

  const studentSubjects: StudentSubject[] = subjects.map(subject => ({
    ...subject,
    linkedQuestionCount: qBySubject[subject.id] ?? 0,
    linkedFlashcardCount: fBySubject[subject.id] ?? 0,
    units: unitRows
      .filter(u => u.subject_id === subject.id)
      .map(unit => ({
        ...unit,
        topics: topics
          .filter((t: any) => t.unit_id === unit.id)
          .map((topic: any) => ({
            ...topic,
            lessons: lessons
              .filter((l: any) => l.topic_id === topic.id && topicIds.has(topic.id))
              .map((l: any) => ({ ...l, completed: completedLessonIds.has(l.id) })),
          })),
      })),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Curriculum</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Follow your course, read lesson content, and track your progress.
        </p>
      </div>
      <CurriculumView subjects={studentSubjects} studentId={user.id} initialLessonId={params.lesson} />
    </div>
  )
}
