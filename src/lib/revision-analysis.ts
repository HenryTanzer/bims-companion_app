import type { SupabaseClient } from '@supabase/supabase-js'

export type RevisionTask = {
  title: string
  detail: string
  type: 'lesson' | 'quiz' | 'flashcards' | 'notes' | 'exam-practice' | 'study-session'
  estimated_minutes: number
  link?: string
}

export type RevisionPlan = {
  id: string
  student_id: string
  subject_id: string
  title: string
  description: string | null
  focus_areas: string[]
  tasks: RevisionTask[]
  source: 'ai' | 'teacher'
  status: 'active' | 'completed' | 'archived'
  due_date: string | null
  created_by: string | null
  created_at: string
  subjects?: { name: string; color: string } | null
  profiles?: { full_name: string; email: string } | null
  student?: { full_name: string; email: string } | null
}

export type RevisionWeakArea = {
  label: string
  subjectId: string
  subjectName: string
  topicId: string | null
  topicName: string | null
  reason: string
  score: number | null
  attempts: number
  priority: number
}

export type RevisionSubjectSummary = {
  id: string
  name: string
  color: string
  quizAverage: number | null
  quizAttempts: number
  moduleAverage: number | null
  moduleSubmissions: number
  completedLessons: number
  totalLessons: number
  lowConfidenceCards: number
  weakAreas: RevisionWeakArea[]
}

type SubjectRow = { id: string; name: string; color: string }
type EnrollmentRow = { subject_id: string; subjects: SubjectRow | SubjectRow[] | null }
type QuizAttemptRow = {
  subject_id: string
  topic_id: string | null
  score: number
  total_questions: number
  answers: Record<string, number> | null
}
type QuestionRow = {
  id: string
  subject_id: string
  topic_id: string | null
  correct_answer: number
  lesson_id: string | null
  topics: { name: string } | null
}
type LessonRow = {
  id: string
  topic_id: string
  curriculum_topics: {
    title: string
    curriculum_units: { subject_id: string; title: string } | null
  } | null
}

function pct(score: number, total: number) {
  return total > 0 ? Math.round((score / total) * 100) : null
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null
}

function normaliseSubject(row: EnrollmentRow) {
  return Array.isArray(row.subjects) ? row.subjects[0] : row.subjects
}

export async function analyseStudentRevision(
  supabase: SupabaseClient,
  studentId: string,
  allowedSubjectIds?: string[]
): Promise<RevisionSubjectSummary[]> {
  const [enrollmentsRes, attemptsRes, flashcardsRes, flashReviewsRes, modulesRes, lessonProgressRes, lessonsRes] = await Promise.all([
    (supabase as any)
      .from('enrollments')
      .select('subject_id, subjects(id, name, color)')
      .eq('student_id', studentId),
    (supabase as any)
      .from('quiz_attempts')
      .select('subject_id, topic_id, score, total_questions, answers')
      .eq('student_id', studentId)
      .order('completed_at', { ascending: false })
      .limit(80),
    (supabase as any)
      .from('flashcards')
      .select('id, subject_id, topic_id, topics(name)'),
    (supabase as any)
      .from('flashcard_reviews')
      .select('flashcard_id, confidence')
      .eq('student_id', studentId),
    (supabase as any)
      .from('module_submissions')
      .select('score, total_questions, modules(subject_id)')
      .eq('student_id', studentId)
      .not('submitted_at', 'is', null),
    (supabase as any)
      .from('lesson_progress')
      .select('lesson_id, is_completed')
      .eq('student_id', studentId),
    (supabase as any)
      .from('curriculum_lessons')
      .select('id, topic_id, curriculum_topics(title, curriculum_units(subject_id, title))')
      .eq('is_published', true),
  ])

  const enrolledSubjects = ((enrollmentsRes.data ?? []) as EnrollmentRow[])
    .map(normaliseSubject)
    .filter((subject): subject is SubjectRow => Boolean(subject))
    .filter(subject => !allowedSubjectIds || allowedSubjectIds.includes(subject.id))

  const subjectById = new Map(enrolledSubjects.map(subject => [subject.id, subject]))
  const summaries = new Map<string, RevisionSubjectSummary>()
  for (const subject of enrolledSubjects) {
    summaries.set(subject.id, {
      id: subject.id,
      name: subject.name,
      color: subject.color,
      quizAverage: null,
      quizAttempts: 0,
      moduleAverage: null,
      moduleSubmissions: 0,
      completedLessons: 0,
      totalLessons: 0,
      lowConfidenceCards: 0,
      weakAreas: [],
    })
  }

  const attempts = ((attemptsRes.data ?? []) as QuizAttemptRow[])
    .filter(attempt => subjectById.has(attempt.subject_id))

  const quizScoresBySubject = new Map<string, number[]>()
  const topicStats = new Map<string, {
    subjectId: string
    topicId: string | null
    topicName: string | null
    scores: number[]
    attempts: number
  }>()

  for (const attempt of attempts) {
    const score = pct(attempt.score, attempt.total_questions)
    if (score === null) continue

    const scores = quizScoresBySubject.get(attempt.subject_id) ?? []
    quizScoresBySubject.set(attempt.subject_id, [...scores, score])

    const key = `${attempt.subject_id}:${attempt.topic_id ?? 'subject'}`
    const prev = topicStats.get(key) ?? {
      subjectId: attempt.subject_id,
      topicId: attempt.topic_id,
      topicName: null,
      scores: [],
      attempts: 0,
    }
    prev.scores.push(score)
    prev.attempts += 1
    topicStats.set(key, prev)
  }

  const questionAnswers = new Map<string, { selected: number; attempts: number }[]>()
  for (const attempt of attempts) {
    for (const [questionId, selected] of Object.entries(attempt.answers ?? {})) {
      const rows = questionAnswers.get(questionId) ?? []
      rows.push({ selected, attempts: 1 })
      questionAnswers.set(questionId, rows)
    }
  }

  const questionIds = [...questionAnswers.keys()]
  if (questionIds.length > 0) {
    const { data: questions } = await (supabase as any)
      .from('quiz_questions')
      .select('id, subject_id, topic_id, correct_answer, lesson_id, topics(name)')
      .in('id', questionIds)

    for (const question of (questions ?? []) as QuestionRow[]) {
      if (!subjectById.has(question.subject_id)) continue
      const answers = questionAnswers.get(question.id) ?? []
      const wrong = answers.filter(answer => answer.selected !== question.correct_answer).length
      if (wrong === 0) continue

      const key = `${question.subject_id}:${question.topic_id ?? 'subject'}`
      const prev = topicStats.get(key) ?? {
        subjectId: question.subject_id,
        topicId: question.topic_id,
        topicName: question.topics?.name ?? null,
        scores: [],
        attempts: 0,
      }
      prev.topicName = question.topics?.name ?? prev.topicName
      prev.attempts += wrong
      topicStats.set(key, prev)
    }
  }

  for (const [subjectId, scores] of quizScoresBySubject) {
    const summary = summaries.get(subjectId)
    if (!summary) continue
    summary.quizAverage = average(scores)
    summary.quizAttempts = scores.length
  }

  const lessons = ((lessonsRes.data ?? []) as LessonRow[])
    .filter(lesson => {
      const subjectId = lesson.curriculum_topics?.curriculum_units?.subject_id
      return Boolean(subjectId && subjectById.has(subjectId))
    })
  const completedLessonIds = new Set(
    ((lessonProgressRes.data ?? []) as { lesson_id: string; is_completed: boolean }[])
      .filter(row => row.is_completed)
      .map(row => row.lesson_id)
  )
  for (const lesson of lessons) {
    const subjectId = lesson.curriculum_topics?.curriculum_units?.subject_id
    if (!subjectId) continue
    const summary = summaries.get(subjectId)
    if (!summary) continue
    summary.totalLessons += 1
    if (completedLessonIds.has(lesson.id)) summary.completedLessons += 1
  }

  const moduleScoresBySubject = new Map<string, number[]>()
  for (const row of (modulesRes.data ?? []) as any[]) {
    const subjectId = row.modules?.subject_id as string | undefined
    const score = typeof row.score === 'number' && typeof row.total_questions === 'number'
      ? pct(row.score, row.total_questions)
      : null
    if (!subjectId || !subjectById.has(subjectId) || score === null) continue
    const prev = moduleScoresBySubject.get(subjectId) ?? []
    moduleScoresBySubject.set(subjectId, [...prev, score])
  }
  for (const [subjectId, scores] of moduleScoresBySubject) {
    const summary = summaries.get(subjectId)
    if (!summary) continue
    summary.moduleAverage = average(scores)
    summary.moduleSubmissions = scores.length
  }

  const flashcardSubject = new Map<string, { subjectId: string; topicName: string | null }>()
  for (const card of (flashcardsRes.data ?? []) as any[]) {
    if (subjectById.has(card.subject_id)) {
      flashcardSubject.set(card.id, { subjectId: card.subject_id, topicName: card.topics?.name ?? null })
    }
  }
  for (const review of (flashReviewsRes.data ?? []) as { flashcard_id: string; confidence: number }[]) {
    if (review.confidence > 2) continue
    const card = flashcardSubject.get(review.flashcard_id)
    if (!card) continue
    const summary = summaries.get(card.subjectId)
    if (summary) summary.lowConfidenceCards += 1
  }

  for (const stat of topicStats.values()) {
    const summary = summaries.get(stat.subjectId)
    const subject = subjectById.get(stat.subjectId)
    if (!summary || !subject) continue
    const topicScore = average(stat.scores)
    if (topicScore !== null && topicScore >= 70 && stat.attempts < 3) continue
    summary.weakAreas.push({
      label: stat.topicName ?? `${subject.name} quiz practice`,
      subjectId: stat.subjectId,
      subjectName: subject.name,
      topicId: stat.topicId,
      topicName: stat.topicName,
      reason: topicScore === null
        ? 'Recent incorrect quiz answers'
        : `Average quiz score ${topicScore}%`,
      score: topicScore,
      attempts: stat.attempts,
      priority: (topicScore === null ? 72 : 100 - topicScore) + Math.min(20, stat.attempts * 2),
    })
  }

  for (const summary of summaries.values()) {
    if (summary.totalLessons > 0 && summary.completedLessons < summary.totalLessons) {
      const missing = summary.totalLessons - summary.completedLessons
      summary.weakAreas.push({
        label: 'Unfinished curriculum lessons',
        subjectId: summary.id,
        subjectName: summary.name,
        topicId: null,
        topicName: null,
        reason: `${missing} published lesson${missing !== 1 ? 's' : ''} still to complete`,
        score: null,
        attempts: missing,
        priority: Math.min(85, 40 + missing * 3),
      })
    }
    if (summary.lowConfidenceCards > 0) {
      summary.weakAreas.push({
        label: 'Low confidence flashcards',
        subjectId: summary.id,
        subjectName: summary.name,
        topicId: null,
        topicName: null,
        reason: `${summary.lowConfidenceCards} card${summary.lowConfidenceCards !== 1 ? 's' : ''} marked low confidence`,
        score: null,
        attempts: summary.lowConfidenceCards,
        priority: Math.min(80, 45 + summary.lowConfidenceCards * 5),
      })
    }
    summary.weakAreas.sort((a, b) => b.priority - a.priority)
  }

  return [...summaries.values()]
}

export function buildFallbackRevisionTasks(subject: RevisionSubjectSummary): RevisionTask[] {
  const topAreas = subject.weakAreas.slice(0, 3)
  const focus = topAreas.length > 0 ? topAreas : [{
    label: `${subject.name} foundations`,
    reason: 'Build a steady revision baseline',
  }]

  const tasks: RevisionTask[] = [
    {
      title: `Review ${focus[0].label}`,
      detail: `Spend focused time revising this area. ${focus[0].reason}. Write three exam-style points in your notes.`,
      type: 'notes',
      estimated_minutes: 25,
    },
    {
      title: 'Complete targeted quiz practice',
      detail: `Take a ${subject.name} quiz and aim to improve accuracy on ${focus.map(area => area.label).join(', ')}.`,
      type: 'quiz',
      estimated_minutes: 20,
      link: '/student/quiz',
    },
    {
      title: 'Rebuild recall with flashcards',
      detail: 'Review difficult cards first, then create or revisit cards for definitions, formulas, and key terms.',
      type: 'flashcards',
      estimated_minutes: 15,
      link: '/student/flashcards',
    },
    {
      title: 'Ask Study Buddy for one explanation',
      detail: `Ask Study Buddy to explain the weakest area in ${subject.name}, then save the chat to lesson notes.`,
      type: 'study-session',
      estimated_minutes: 15,
      link: '/student/study-buddy',
    },
    {
      title: 'Finish with exam practice',
      detail: 'Attempt one short past-paper question and mark it against the explanation or mark scheme.',
      type: 'exam-practice',
      estimated_minutes: 20,
      link: '/student/exam-center',
    },
  ]

  if (subject.completedLessons < subject.totalLessons) {
    tasks.unshift({
      title: 'Close curriculum gaps',
      detail: `Complete at least one unfinished ${subject.name} lesson before starting question practice.`,
      type: 'lesson',
      estimated_minutes: 20,
      link: '/student/curriculum',
    })
  }

  return tasks.slice(0, 6)
}
