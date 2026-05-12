import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { ContentBlock } from '@/types/database'

export const maxDuration = 120

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const BLOCK_SCHEMA = `ContentBlock types for the blocks array:
{"type":"heading","content":"string","level":2}  (level 2 or 3)
{"type":"text","content":"string"}
{"type":"list","style":"bullet","items":["string"]}
{"type":"list","style":"numbered","items":["string"]}
{"type":"table","headers":["string"],"rows":[["string"]]}
{"type":"callout","variant":"key-term","title":"string","content":"string"}
{"type":"callout","variant":"info","title":"string","content":"string"}
{"type":"callout","variant":"tip","title":"string","content":"string"}
{"type":"callout","variant":"warning","title":"string","content":"string"}
{"type":"divider"}`

function buildPrompt(lessonTitle: string, topicTitle: string, unitTitle: string, subjectName: string) {
  return `You are generating A-Level ${subjectName} lesson content from a textbook.

Lesson: "${lessonTitle}"
Topic: "${topicTitle}"
Unit: "${unitTitle}"

Find the section of this textbook that corresponds to this lesson and extract its content in full.

Return ONLY valid JSON with no markdown fences or explanation:
{
  "learning_outcomes": ["Students will be able to..."],
  "blocks": [],
  "questions": [
    {"question":"","options":["","","",""],"correct_answer":0,"difficulty":"easy","explanation":""}
  ],
  "flashcards": [
    {"term":"","definition":""}
  ]
}

${BLOCK_SCHEMA}

Rules:
- learning_outcomes: 2–4 items beginning with an action verb ("Define...", "Explain...", "Analyse...")
- blocks: extract all content for this lesson (aim for 6–15 blocks). Use "key-term" callouts for definitions, "tip" for exam advice, "info" for key facts, "warning" for common mistakes
- questions: 3–5 MCQs testing key concepts. correct_answer is the 0-based index of the correct option
- flashcards: 4–8 key term and definition pairs from the lesson
- Do NOT produce image, video, or file blocks — skip any diagrams or figures
- Preserve textbook language exactly where possible — do not paraphrase
- If the lesson content cannot be found, return valid JSON with empty arrays`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const {
    jobId, lessonDbId, lessonTitle, topicTitle, unitTitle, subjectName, subjectId, fileUrl,
  } = await request.json() as {
    jobId: string
    lessonDbId: string
    lessonTitle: string
    topicTitle: string
    unitTitle: string
    subjectName: string
    subjectId: string
    fileUrl: string
  }

  if (!lessonDbId || !fileUrl) {
    return Response.json({ error: 'lessonDbId and fileUrl are required' }, { status: 400 })
  }

  // Fetch PDF
  let base64: string
  try {
    const res = await fetch(fileUrl)
    if (!res.ok) return Response.json({ error: 'Could not fetch PDF' }, { status: 400 })
    const buffer = await res.arrayBuffer()
    base64 = Buffer.from(buffer).toString('base64')
  } catch {
    return Response.json({ error: 'Could not fetch PDF' }, { status: 400 })
  }

  // Generate with Claude
  let blocks: ContentBlock[] = []
  let questions: any[] = []
  let flashcards: any[] = []
  let learningOutcomes: string[] = []

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          } as any,
          { type: 'text', text: buildPrompt(lessonTitle, topicTitle, unitTitle, subjectName) },
        ],
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    blocks = Array.isArray(parsed.blocks) ? parsed.blocks : []
    questions = Array.isArray(parsed.questions) ? parsed.questions : []
    flashcards = Array.isArray(parsed.flashcards) ? parsed.flashcards : []
    learningOutcomes = Array.isArray(parsed.learning_outcomes) ? parsed.learning_outcomes : []
  } catch {
    return Response.json({ error: 'AI generation failed for this lesson' }, { status: 500 })
  }

  // Save lesson content
  const { error: lessonError } = await (supabase as any)
    .from('curriculum_lessons')
    .update({ content: blocks, learning_outcomes: learningOutcomes })
    .eq('id', lessonDbId)

  if (lessonError) return Response.json({ error: 'Failed to save lesson content' }, { status: 500 })

  // Insert quiz questions
  let insertedQuestions = 0
  if (questions.length > 0) {
    const validDifficulties = ['easy', 'medium', 'hard']
    const qRows = questions
      .filter((q: any) => q.question && Array.isArray(q.options) && q.options.length === 4)
      .map((q: any) => ({
        subject_id: subjectId,
        lesson_id: lessonDbId,
        question: String(q.question),
        options: q.options.map(String),
        correct_answer: typeof q.correct_answer === 'number' ? q.correct_answer : 0,
        difficulty: validDifficulties.includes(q.difficulty) ? q.difficulty : 'medium',
        explanation: q.explanation ? String(q.explanation) : null,
        created_by: user.id,
        topic_id: null,
      }))

    if (qRows.length > 0) {
      const { data: qData } = await (supabase as any).from('quiz_questions').insert(qRows).select('id')
      insertedQuestions = (qData ?? []).length
    }
  }

  // Insert flashcards
  let insertedFlashcards = 0
  if (flashcards.length > 0) {
    const fRows = flashcards
      .filter((f: any) => f.term && f.definition)
      .map((f: any) => ({
        subject_id: subjectId,
        lesson_id: lessonDbId,
        term: String(f.term),
        definition: String(f.definition),
        created_by: user.id,
        topic_id: null,
      }))

    if (fRows.length > 0) {
      const { data: fData } = await (supabase as any).from('flashcards').insert(fRows).select('id')
      insertedFlashcards = (fData ?? []).length
    }
  }

  // Update job outline — mark this lesson done
  if (jobId) {
    const { data: jobData } = await (supabase as any)
      .from('curriculum_import_jobs')
      .select('outline')
      .eq('id', jobId)
      .single()

    if (jobData?.outline) {
      const outline = jobData.outline as any
      for (const unit of outline.units ?? []) {
        for (const topic of unit.topics ?? []) {
          const lesson = (topic.lessons ?? []).find((l: any) => l.db_id === lessonDbId)
          if (lesson) {
            lesson.status = 'done'
            lesson.stats = { blocks: blocks.length, questions: insertedQuestions, flashcards: insertedFlashcards }
          }
        }
      }
      await (supabase as any)
        .from('curriculum_import_jobs')
        .update({ outline, updated_at: new Date().toISOString() })
        .eq('id', jobId)
    }
  }

  return Response.json({
    stats: { blocks: blocks.length, questions: insertedQuestions, flashcards: insertedFlashcards },
  })
}
