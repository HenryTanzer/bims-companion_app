import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorised', { status: 401 })

  const { messages, subject } = await request.json() as {
    messages: { role: 'user' | 'assistant'; content: string }[]
    subject: string
  }

  if (!messages?.length) return new Response('No messages', { status: 400 })

  const system = `You are a helpful A-Level study assistant for BIMS School, specialising in ${subject}. \
Help students understand concepts, work through exam questions, and explain ideas clearly. \
Keep answers concise and exam-focused. Use UK spelling. \
If the student asks about a topic outside ${subject}, politely redirect them to ask their teacher or use other resources.`

  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system,
    messages,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
    cancel() {
      stream.abort()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
