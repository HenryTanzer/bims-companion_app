import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SearchView, type SearchItem } from '@/components/student/search-view'
import type { ContentBlock } from '@/types/database'

type Subject = { id: string; name: string; color: string }

function contentText(blocks: ContentBlock[] | null | undefined) {
  return (blocks ?? []).map(block => {
    switch (block.type) {
      case 'text':
      case 'heading':
      case 'callout':
        return block.content
      case 'list':
        return block.items.join(' ')
      case 'table':
        return [...block.headers, ...block.rows.flat()].join(' ')
      case 'image':
      case 'video':
        return block.caption ?? ''
      case 'file':
        return block.name
      case 'divider':
        return ''
    }
  }).join(' ')
}

export default async function StudentSearchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('subject_id, subjects(id, name, color)')
    .eq('student_id', user.id)

  const subjects: Subject[] = ((enrollments ?? []) as any[])
    .map(e => e.subjects)
    .filter(Boolean)

  const subjectById = new Map(subjects.map(subject => [subject.id, subject]))
  const subjectIds = subjects.map(subject => subject.id)

  if (subjectIds.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Search</h1>
          <p className="text-muted-foreground text-sm mt-1">
            You are not enrolled in any subjects yet.
          </p>
        </div>
      </div>
    )
  }

  const { data: units } = await (supabase as any)
    .from('curriculum_units')
    .select('id, subject_id, title')
    .in('subject_id', subjectIds)

  const unitRows = (units ?? []) as any[]
  const unitIds = unitRows.map(unit => unit.id as string)

  const [topicsRes, lessonsRes, notesRes, quizRes, flashcardRes, papersRes] = await Promise.all([
    unitIds.length
      ? (supabase as any).from('curriculum_topics').select('id, unit_id, title').in('unit_id', unitIds)
      : Promise.resolve({ data: [] }),
    unitIds.length
      ? (supabase as any).from('curriculum_lessons').select('id, topic_id, title, learning_outcomes, content').eq('is_published', true)
      : Promise.resolve({ data: [] }),
    (supabase as any).from('lesson_notes').select('lesson_id, content').eq('student_id', user.id),
    (supabase as any).from('quiz_questions').select('id, subject_id, question, explanation').in('subject_id', subjectIds),
    (supabase as any).from('flashcards').select('id, subject_id, term, definition').in('subject_id', subjectIds),
    supabase.from('past_papers').select('id, subject_id, title, year, paper_number').in('subject_id', subjectIds),
  ])

  const topics = (topicsRes.data ?? []) as any[]
  const lessons = (lessonsRes.data ?? []) as any[]
  const topicById = new Map(topics.map(topic => [topic.id, topic]))
  const unitById = new Map(unitRows.map(unit => [unit.id, unit]))
  const lessonById = new Map(lessons.map(lesson => [lesson.id, lesson]))

  const items: SearchItem[] = []

  for (const lesson of lessons) {
    const topic = topicById.get(lesson.topic_id)
    const unit = topic ? unitById.get(topic.unit_id) : undefined
    const subject = unit ? subjectById.get(unit.subject_id) : undefined
    if (!subject) continue
    items.push({
      id: lesson.id,
      type: 'lesson',
      title: lesson.title,
      body: `${unit?.title ?? ''} ${topic?.title ?? ''} ${(lesson.learning_outcomes ?? []).join(' ')} ${contentText(lesson.content)}`,
      subjectName: subject.name,
      subjectColor: subject.color,
      href: `/student/curriculum?lesson=${lesson.id}`,
    })
  }

  for (const note of (notesRes.data ?? []) as any[]) {
    const lesson = lessonById.get(note.lesson_id)
    if (!lesson) continue
    const topic = topicById.get(lesson.topic_id)
    const unit = topic ? unitById.get(topic.unit_id) : undefined
    const subject = unit ? subjectById.get(unit.subject_id) : undefined
    if (!subject) continue
    items.push({
      id: note.lesson_id,
      type: 'note',
      title: `Notes: ${lesson.title}`,
      body: note.content ?? '',
      subjectName: subject.name,
      subjectColor: subject.color,
      href: `/student/curriculum?lesson=${lesson.id}`,
    })
  }

  for (const question of (quizRes.data ?? []) as any[]) {
    const subject = subjectById.get(question.subject_id)
    if (!subject) continue
    items.push({
      id: question.id,
      type: 'quiz',
      title: question.question,
      body: question.explanation ?? '',
      subjectName: subject.name,
      subjectColor: subject.color,
      href: '/student/quiz',
    })
  }

  for (const card of (flashcardRes.data ?? []) as any[]) {
    const subject = subjectById.get(card.subject_id)
    if (!subject) continue
    items.push({
      id: card.id,
      type: 'flashcard',
      title: card.term,
      body: card.definition,
      subjectName: subject.name,
      subjectColor: subject.color,
      href: '/student/flashcards',
    })
  }

  for (const paper of (papersRes.data ?? []) as any[]) {
    const subject = subjectById.get(paper.subject_id)
    if (!subject) continue
    items.push({
      id: paper.id,
      type: 'paper',
      title: paper.title,
      body: `${paper.year} Paper ${paper.paper_number ?? ''}`,
      subjectName: subject.name,
      subjectColor: subject.color,
      href: '/student/exam-center',
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Find lessons, your notes, quiz questions, flashcards, and past papers.
        </p>
      </div>
      <SearchView items={items} />
    </div>
  )
}
