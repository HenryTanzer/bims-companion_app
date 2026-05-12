import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const PROMPT = `You are converting a section of an A-Level textbook into structured lesson content blocks.

Return ONLY a valid JSON array of content blocks matching this exact schema — no other text, no markdown fences:

[
  { "type": "heading", "content": "string", "level": 2 },
  { "type": "heading", "content": "string", "level": 3 },
  { "type": "text", "content": "string" },
  { "type": "list", "style": "bullet", "items": ["string"] },
  { "type": "list", "style": "numbered", "items": ["string"] },
  { "type": "table", "headers": ["string"], "rows": [["string"]] },
  { "type": "callout", "variant": "key-term", "title": "string", "content": "string" },
  { "type": "callout", "variant": "info", "title": "string", "content": "string" },
  { "type": "callout", "variant": "tip", "title": "string", "content": "string" },
  { "type": "callout", "variant": "warning", "title": "string", "content": "string" },
  { "type": "divider" }
]

Rules:
- Use "heading" level 2 for main section titles, level 3 for subsections
- Use "text" for paragraphs of explanation
- Use "list" bullet for unordered points, numbered for steps or sequences
- Use "table" for any tabular data, comparisons, or structured data — preserve all rows exactly
- Use "callout" with variant "key-term" for definitions and key vocabulary
- Use "callout" with variant "info" for important notes, facts, or context boxes
- Use "callout" with variant "tip" for exam tips or study advice
- Use "callout" with variant "warning" for common mistakes or misconceptions
- Use "divider" to separate major sections
- Do NOT produce "image", "video", or "file" blocks — skip any images or diagrams
- Preserve all factual content exactly — do not summarise or omit information
- Keep all text verbatim where possible; do not paraphrase the textbook
- If the document is blank or unreadable, return exactly: []`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const { base64, mimeType } = await request.json() as { base64: string; mimeType: string }
  if (!base64) return Response.json({ error: 'base64 required' }, { status: 400 })

  const mediaType = (mimeType === 'application/pdf' ? 'application/pdf' : 'application/pdf') as 'application/pdf'

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          } as any,
          { type: 'text', text: PROMPT },
        ],
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '[]'
    const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const blocks = JSON.parse(cleaned)
    return Response.json({ blocks: Array.isArray(blocks) ? blocks : [] })
  } catch {
    return Response.json({ error: 'Failed to parse document. Make sure it is a readable PDF.' }, { status: 500 })
  }
}
