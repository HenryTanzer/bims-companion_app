import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 120

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function buildPrompt(subjectName: string) {
  return `You are analysing an A-Level ${subjectName} textbook to extract its content structure.

Examine the table of contents and chapter organisation of this textbook.

Return ONLY valid JSON with no markdown fences or explanation:
{
  "units": [
    {
      "title": "string",
      "year_group": "Year 12 | Year 13 | Both",
      "topics": [
        {
          "title": "string",
          "lessons": [
            { "title": "string" }
          ]
        }
      ]
    }
  ]
}

Rules:
- units = main chapters or themes (typically 4–8 for an A-Level textbook)
- topics = major sections within each unit (2–6 per unit)
- lessons = specific subsections or lesson pages (2–5 per topic)
- year_group: "Year 12" for AS-Level or first-year content, "Year 13" for A2 or second-year content, "Both" if the content spans both years or is unclear
- Total lessons across all units must not exceed 60
- Keep titles concise and descriptive — match the language used in the textbook
- If no clear table of contents exists, infer structure from chapter headings`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const { fileUrl, subjectName, subjectId } = await request.json() as {
    fileUrl: string
    subjectName: string
    subjectId: string
  }

  if (!fileUrl || !subjectName || !subjectId) {
    return Response.json({ error: 'fileUrl, subjectName and subjectId are required' }, { status: 400 })
  }

  let base64: string
  try {
    const res = await fetch(fileUrl)
    if (!res.ok) return Response.json({ error: 'Could not fetch the PDF file. Check the storage URL.' }, { status: 400 })
    const buffer = await res.arrayBuffer()
    base64 = Buffer.from(buffer).toString('base64')
  } catch {
    return Response.json({ error: 'Could not fetch the PDF file.' }, { status: 400 })
  }

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
          { type: 'text', text: buildPrompt(subjectName) },
        ],
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    const units = Array.isArray(parsed.units) ? parsed.units : []

    // Create the import job
    const { data: job, error: jobError } = await (supabase as any)
      .from('curriculum_import_jobs')
      .insert({
        teacher_id: user.id,
        subject_id: subjectId,
        status: 'outline_pending',
        file_url: fileUrl,
      })
      .select('id')
      .single()

    if (jobError || !job) {
      return Response.json({ error: 'Failed to create import job' }, { status: 500 })
    }

    return Response.json({ units, jobId: job.id })
  } catch {
    return Response.json(
      { error: 'Failed to extract structure. Make sure the PDF is readable and has a table of contents.' },
      { status: 500 }
    )
  }
}
