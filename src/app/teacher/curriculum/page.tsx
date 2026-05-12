import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTeacherContext } from '@/lib/teacher-subjects'
import { CurriculumBuilder } from '@/components/teacher/curriculum-builder'
import type { YearGroup, ContentBlock } from '@/types/database'

export type LoadedLesson = {
  id: string
  topic_id: string
  title: string
  learning_outcomes: string[]
  content: ContentBlock[]
  is_published: boolean
  position: number
}

export type LoadedTopic = {
  id: string
  unit_id: string
  title: string
  description: string | null
  position: number
  lessons: LoadedLesson[]
}

export type LoadedUnit = {
  id: string
  subject_id: string
  title: string
  description: string | null
  year_group: YearGroup
  position: number
  topics: LoadedTopic[]
}

export default async function CurriculumPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { subjectIds, isAdmin } = await getTeacherContext(supabase, user.id)

  const [subjectsRes, unitsRes, importJobsRes] = await Promise.all([
    isAdmin
      ? (supabase as any).from('subjects').select('id, name, color')
      : subjectIds.length > 0
        ? (supabase as any).from('subjects').select('id, name, color').in('id', subjectIds)
        : Promise.resolve({ data: [] }),
    isAdmin
      ? (supabase as any).from('curriculum_units').select('*').order('position')
      : subjectIds.length > 0
        ? (supabase as any).from('curriculum_units').select('*').in('subject_id', subjectIds).order('position')
        : Promise.resolve({ data: [] }),
    // Fetch any incomplete import jobs for this teacher
    (supabase as any)
      .from('curriculum_import_jobs')
      .select('id, subject_id, status, outline, file_url')
      .eq('teacher_id', user.id)
      .neq('status', 'done'),
  ])

  const units: any[] = unitsRes.data ?? []
  const unitIds = units.map((u: any) => u.id)

  const [topicsRes, lessonsRes] = await Promise.all([
    unitIds.length > 0
      ? (supabase as any).from('curriculum_topics').select('*').in('unit_id', unitIds).order('position')
      : Promise.resolve({ data: [] }),
    unitIds.length > 0
      ? (supabase as any).from('curriculum_lessons').select('id, topic_id, title, learning_outcomes, content, is_published, position').order('position')
      : Promise.resolve({ data: [] }),
  ])

  const topics: any[] = topicsRes.data ?? []
  const lessons: any[] = lessonsRes.data ?? []
  const topicIds = new Set(topics.map((t: any) => t.id))

  const nestedUnits: LoadedUnit[] = units.map((unit: any) => ({
    ...unit,
    topics: topics
      .filter((t: any) => t.unit_id === unit.id)
      .map((topic: any) => ({
        ...topic,
        lessons: lessons.filter((l: any) => l.topic_id === topic.id && topicIds.has(topic.id)),
      })),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Curriculum Builder</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Build your course structure — units, topics, and lessons with rich content.
        </p>
      </div>
      <CurriculumBuilder
        initialUnits={nestedUnits}
        subjects={(subjectsRes.data ?? []) as { id: string; name: string; color: string }[]}
        teacherId={user.id}
        existingImportJobs={(importJobsRes.data ?? []) as any[]}
      />
    </div>
  )
}
