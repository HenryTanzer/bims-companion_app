import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import {
  analyseStudentRevision,
  buildFallbackRevisionTasks,
  type RevisionSubjectSummary,
  type RevisionTask,
} from '@/lib/revision-analysis'

type AiPlanResponse = {
  title?: string
  description?: string
  focus_areas?: string[]
  tasks?: RevisionTask[]
}

function pickSubject(subjects: RevisionSubjectSummary[], requestedSubjectId?: string) {
  if (requestedSubjectId) {
    return subjects.find(subject => subject.id === requestedSubjectId) ?? null
  }

  return [...subjects].sort((a, b) => {
    const aPriority = a.weakAreas[0]?.priority ?? (a.quizAverage === null ? 20 : 100 - a.quizAverage)
    const bPriority = b.weakAreas[0]?.priority ?? (b.quizAverage === null ? 20 : 100 - b.quizAverage)
    return bPriority - aPriority
  })[0] ?? null
}

function cleanTasks(tasks: unknown, fallback: RevisionTask[]) {
  if (!Array.isArray(tasks)) return fallback

  const cleaned = tasks
    .map(task => {
      if (!task || typeof task !== 'object') return null
      const item = task as Partial<RevisionTask>
      if (!item.title || !item.detail) return null
      const type = item.type && ['lesson', 'quiz', 'flashcards', 'notes', 'exam-practice', 'study-session'].includes(item.type)
        ? item.type
        : 'notes'
      return {
        title: String(item.title).slice(0, 120),
        detail: String(item.detail).slice(0, 500),
        type,
        estimated_minutes: Math.max(5, Math.min(90, Number(item.estimated_minutes) || 20)),
        ...(item.link ? { link: String(item.link).slice(0, 120) } : {}),
      } satisfies RevisionTask
    })
    .filter((task): task is RevisionTask => Boolean(task))

  return cleaned.length ? cleaned.slice(0, 6) : fallback
}

async function generateAiPlan(subject: RevisionSubjectSummary) {
  const fallbackTasks = buildFallbackRevisionTasks(subject)

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      title: `${subject.name} revision plan`,
      description: 'A focused plan built from your recent activity and completion gaps.',
      focus_areas: subject.weakAreas.slice(0, 4).map(area => area.label),
      tasks: fallbackTasks,
    }
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      system: `You create concise A-Level revision plans for BIMS School students.
Return JSON only with keys: title, description, focus_areas, tasks.
tasks must be an array of 4 to 6 items with title, detail, type, estimated_minutes, and optional link.
Allowed task types: lesson, quiz, flashcards, notes, exam-practice, study-session.
Use UK spelling. Be specific, supportive, and exam-focused.`,
      messages: [{
        role: 'user',
        content: JSON.stringify({
          subject: subject.name,
          quizAverage: subject.quizAverage,
          quizAttempts: subject.quizAttempts,
          moduleAverage: subject.moduleAverage,
          completedLessons: subject.completedLessons,
          totalLessons: subject.totalLessons,
          lowConfidenceCards: subject.lowConfidenceCards,
          weakAreas: subject.weakAreas.slice(0, 6).map(area => ({
            label: area.label,
            reason: area.reason,
            score: area.score,
            attempts: area.attempts,
          })),
        }),
      }],
    })

    const text = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')
      .trim()
    const parsed = JSON.parse(text) as AiPlanResponse
    return {
      title: parsed.title?.slice(0, 120) || `${subject.name} revision plan`,
      description: parsed.description?.slice(0, 500) || 'A focused plan built from your recent activity.',
      focus_areas: Array.isArray(parsed.focus_areas)
        ? parsed.focus_areas.map(area => String(area).slice(0, 80)).slice(0, 6)
        : subject.weakAreas.slice(0, 4).map(area => area.label),
      tasks: cleanTasks(parsed.tasks, fallbackTasks),
    }
  } catch {
    return {
      title: `${subject.name} revision plan`,
      description: 'A focused plan built from your recent activity and completion gaps.',
      focus_areas: subject.weakAreas.slice(0, 4).map(area => area.label),
      tasks: fallbackTasks,
    }
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorised', { status: 401 })

  const body = await request.json().catch(() => ({})) as { subjectId?: string }
  const subjects = await analyseStudentRevision(supabase, user.id)
  const subject = pickSubject(subjects, body.subjectId)
  if (!subject) return new Response('No enrolled subject found', { status: 400 })

  const generated = await generateAiPlan(subject)
  const focusAreas = generated.focus_areas.length
    ? generated.focus_areas
    : subject.weakAreas.slice(0, 4).map(area => area.label)

  const { data, error } = await (supabase as any)
    .from('revision_plans')
    .insert({
      student_id: user.id,
      subject_id: subject.id,
      title: generated.title,
      description: generated.description,
      focus_areas: focusAreas,
      tasks: generated.tasks,
      source: 'ai',
      status: 'active',
      created_by: user.id,
    })
    .select('id, student_id, subject_id, title, description, focus_areas, tasks, source, status, due_date, created_by, created_at, subjects(name, color)')
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ plan: data })
}
