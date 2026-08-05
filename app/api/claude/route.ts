export const maxDuration = 300
export const runtime = 'edge'

import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { buildSystemPrompt } from '@/lib/terret-context'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { messages, mode } = await req.json()
    const supabase = createServiceClient()
    const { data: kpisData } = await supabase.from('kpis').select('*').order('semana', { ascending: false }).limit(1).single()
    const { data: brandData } = await supabase.from('brand_knowledge').select('contenido').eq('activo', true)
    const kpis = kpisData || {}
    const brandKnowledge = (brandData || []).map((b: { contenido: string }) => b.contenido)
    const system = buildSystemPrompt(kpis, brandKnowledge)
    const maxTokens = mode === 'campana' ? 8000 : 2000
    const stream = await anthropic.messages.stream({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, system, messages })
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        const final = await stream.finalMessage()
        console.log(`[Claude usage] input:${final.usage.input_tokens} output:${final.usage.output_tokens} total:${final.usage.input_tokens + final.usage.output_tokens}`)
        controller.close()
      },
    })
    return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  } catch (e) {
    console.error(e)
    return Response.json({ error: 'Error Claude API' }, { status: 500 })
  }
}
