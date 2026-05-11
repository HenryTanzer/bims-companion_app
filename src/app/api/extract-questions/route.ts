import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const PROMPT = `This is an A-Level exam past paper. Extract ONLY the multiple-choice questions (MCQs).

For each MCQ:
- Copy the question text exactly as written in the paper
- List the answer options as plain text, without the letter prefix (A/B/C/D)
- Set correct_answer as the 0-based index of the correct option (0 = first option, 1 = second, etc.)
- Set difficulty as "easy", "medium", or "hard" based on the cognitive level required

If a mark scheme is included in this document, use it to determine the correct answers.
If no mark scheme is present, make your best judgement — the teacher will verify before saving.

Return ONLY a valid JSON array with no other text, explanation, or markdown fences:
[{"question":"...","options":["...","...","...","..."],"correct_answer":0,"difficulty":"medium"}]

If there are no multiple-choice questions in this paper, return exactly: []`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const { fileUrl } = await request.json() as { fileUrl: string }
  if (!fileUrl) return Response.json({ error: 'fileUrl required' }, { status: 400 })

  // Fetch the PDF from Supabase Storage public URL
  let base64: string
  try {
    const res = await fetch(fileUrl)
    if (!res.ok) return Response.json({ error: 'Could not fetch PDF file' }, { status: 400 })
    const buffer = await res.arrayBuffer()
    base64 = Buffer.from(buffer).toString('base64')
  } catch {
    return Response.json({ error: 'Could not fetch PDF file' }, { status: 400 })
  }

  // Send to Claude Sonnet with the PDF as a document block
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          } as any,
          { type: 'text', text: PROMPT },
        ],
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '[]'
    // Strip markdown code fences if the model wraps the output
    const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const questions = JSON.parse(cleaned)
    return Response.json({ questions: Array.isArray(questions) ? questions : [] })
  } catch {
    return Response.json({ error: 'Failed to extract questions. The paper may be scanned or have no MCQs.' }, { status: 500 })
  }
}
