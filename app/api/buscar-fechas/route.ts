import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { RACES_CO, COMMERCIAL_DATES, RACES_INTL } from '@/lib/terret-context'

export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { desde, hasta } = await req.json().catch(() => ({}))
    const today = new Date().toISOString().split('T')[0]
    const fechaDesde = desde || today
    const fechaHasta = hasta || new Date(new Date().getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const existentes = [...RACES_CO, ...COMMERCIAL_DATES, ...RACES_INTL]
      .map(e => `${e.date}: ${e.name}`).join('\n')

    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }],
      system: 'Eres un investigador de eventos deportivos de running. Buscas en fuentes reales. NUNCA inventes eventos ni fechas. Si no encuentras información verificada, no la incluyas.',
      messages: [{
        role: 'user',
        content: `Busca en internet eventos de running entre ${fechaDesde} y ${fechaHasta}.

Busca DOS tipos:
1. CARRERAS COLOMBIA: en runningcolombia.co, atletismocolombia.co, worldathletics.org
2. GRANDES MARATONES MUNDIALES: Boston, Londres, Berlin, Chicago, New York, Tokyo, Valencia y otras con más de 20.000 corredores

REGLAS: Solo incluye eventos con fecha exacta confirmada en fuentes reales. NO inventes.

No incluyas estos que ya tenemos:
${existentes}

Responde ÚNICAMENTE con JSON array válido:
[{"fecha":"YYYY-MM-DD","nombre":"Nombre exacto","tipo":"carrera","ciudad":"Ciudad, País","distancia":"distancias","fuente":"nombre del sitio real"}]

Si no encuentras nada verificado responde: []`
      }]
    })

    let text = ''
    for (const block of res.content) {
      if (block.type === 'text') text += block.text
    }

    try {
      const clean = text.replace(/```json|```/g, '').trim()
      const jsonMatch = clean.match(/\[[\s\S]*\]/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : []
      return NextResponse.json({ fechas: Array.isArray(parsed) ? parsed : [] })
    } catch {
      return NextResponse.json({ fechas: [] })
    }
  } catch (e) {
    console.error('Error buscar-fechas:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
