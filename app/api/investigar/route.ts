import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import { buildSystemPrompt, RACES_CO, COMMERCIAL_DATES } from '@/lib/terret-context'

export const maxDuration = 300

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CANAL_COLORS: Record<string, string> = {
  'Instagram': '#e040fb', 'Instagram orgánico': '#e040fb', 'TikTok': '#00bcd4',
  'TikTok orgánico': '#00bcd4', 'Meta Ads': '#1877f2', 'Google Ads': '#4285f4',
  'Email': '#15803d', 'Email marketing': '#15803d', 'WhatsApp': '#25d366',
  'WhatsApp / estados': '#25d366', 'Influencers / UGC': '#f59e0b',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const manual = body.manual === true

    const sb = createServiceClient()
    const { data: brandData } = await sb.from('brand_knowledge').select('contenido').eq('activo', true)
    const { data: kpisData } = await sb.from('kpis').select('*').order('semana', { ascending: false }).limit(1).single()
    const { data: campanasRecientes } = await sb.from('campanas').select('nombre, fecha_inicio, fecha_fin, objetivo').order('created_at', { ascending: false }).limit(5)
    const brandKnowledge = (brandData || []).map((b: { contenido: string }) => b.contenido)
    const kpis = kpisData || {}
    const system = buildSystemPrompt(kpis as Record<string, number>, brandKnowledge)

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const in60 = new Date(today); in60.setDate(in60.getDate() + 60)
    const in60Str = in60.toISOString().split('T')[0]

    const proximasCarreras = RACES_CO.filter(r => r.date >= todayStr && r.date <= in60Str)
    const proximasFechas = COMMERCIAL_DATES.filter(f => f.date >= todayStr && f.date <= in60Str)
    const campanasNombres = (campanasRecientes || []).map((c: Record<string, string>) => c.nombre).join(', ')

    // FASE 1: Investigar con web search
    const investigacionRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system,
      tools: [{
        type: 'web_search_20250305' as const,
        name: 'web_search',
      }],
      messages: [{
        role: 'user',
        content: `Eres el Director de Marketing de Terret, marca colombiana de accesorios para running (medias de compresión, cinturones, viseras). Hoy es ${todayStr}.

CONTEXTO:
- Carreras próximas (60 días): ${proximasCarreras.length ? proximasCarreras.map(r => `${r.date}: ${r.name} (${r.city})`).join(', ') : 'Ninguna registrada'}
- Fechas comerciales: ${proximasFechas.length ? proximasFechas.map(f => `${f.date}: ${f.name}`).join(', ') : 'Ninguna'}
- Campañas recientes (no repetir): ${campanasNombres || 'Ninguna'}

TAREA: Investiga en web y encuentra:
1. Carreras de running en Colombia próximas no registradas en el sistema
2. Tendencias actuales de running en Colombia (hashtags, contenidos virales, conversaciones)
3. Eventos deportivos o fechas relevantes para runners colombianos
4. Oportunidades de contenido basadas en temporada y contexto actual

Busca específicamente: "running Colombia 2026", "maratón Colombia próximo", "tendencias running Colombia", "carreras atletismo Colombia agosto septiembre 2026"

Con toda esa información, propón LA MEJOR oportunidad de campaña o contenido semanal para Terret ahora mismo. Sé específico y fundamenta la decisión.`
      }]
    })

    // Extraer texto de la investigación
    let investigacion = ''
    for (const block of investigacionRes.content) {
      if (block.type === 'text') investigacion += block.text
    }

    // FASE 2: Generar estrategia de la campaña
    const systemAutonomo = 'Eres el Director de Marketing de Terret, marca colombiana de accesorios para running (medias de compresión, cinturones, viseras). Tomas decisiones autónomas y ejecutivas. Nunca pides datos adicionales — decides tú mismo con el contexto disponible. Generas contenido específico, creativo y listo para ejecutar.'

    const estrategiaRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: systemAutonomo,
      messages: [{
        role: 'user',
        content: `${investigacion}

Con base en esta investigación, genera la CAMPAÑA COMPLETA para Terret.

Primero define estos datos en formato JSON en una línea:
CAMPAÑA_JSON: {"nombre":"...","descripcion":"...","fecha_inicio":"YYYY-MM-DD","fecha_fin":"YYYY-MM-DD","objetivo":"...","evento_relacionado":"...","canales":["..."],"audiencia":["..."]}

Luego genera la estrategia completa:

## CONCEPTO CREATIVO
## NARRATIVA DE LA CAMPAÑA  
## POSICIONAMIENTO
## MENSAJES CLAVE
## TONO Y ESTILO VISUAL`
      }]
    })

    const estrategiaTexto = estrategiaRes.content[0].type === 'text' ? estrategiaRes.content[0].text : ''

    // Extraer JSON de la campaña
    const jsonMatch = estrategiaTexto.match(/CAMPAÑA_JSON:\s*(\{[^}]+\})/)
    let campanaMeta = {
      nombre: `Campaña Terret — ${today.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}`,
      descripcion: 'Generada automáticamente por el CMO',
      fecha_inicio: todayStr,
      fecha_fin: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // max 8 días
      objetivo: 'Ventas directas — maximizar ROAS',
      evento_relacionado: '',
      canales: ['Meta Ads', 'Instagram orgánico', 'Email marketing'],
      audiencia: ['Corredores urbanos / running'],
    }
    if (jsonMatch) {
      try { campanaMeta = { ...campanaMeta, ...JSON.parse(jsonMatch[1]) } } catch { /* usar defaults */ }
    }

    // FASE 3: Generar plan de contenido
    const planRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: systemAutonomo,
      messages: [{
        role: 'user',
        content: `CAMPAÑA: ${campanaMeta.nombre}
PERÍODO: ${campanaMeta.fecha_inicio} al ${campanaMeta.fecha_fin}
CANALES: ${campanaMeta.canales.join(', ')}

ESTRATEGIA:
${estrategiaTexto}

Genera el plan de contenido completo.
FORMATO OBLIGATORIO — una línea por pieza:
YYYY-MM-DD | Canal | Tipo | "Título"

Tipos: Reel, Carrusel, Story, Post, Video UGC, Email, Estado WhatsApp, Pauta Meta, Pauta TikTok
Reglas: múltiples piezas por día permitidas, no saltar días, títulos específicos.
Responde ÚNICAMENTE con las líneas del plan.`
      }]
    })

    const planTexto = planRes.content[0].type === 'text' ? planRes.content[0].text : ''

    // Guardar campaña en Supabase
    const { data: campana, error: campanaError } = await sb.from('campanas').insert({
      nombre: campanaMeta.nombre,
      descripcion: campanaMeta.descripcion,
      fecha_inicio: campanaMeta.fecha_inicio,
      fecha_fin: campanaMeta.fecha_fin,
      objetivo: campanaMeta.objetivo,
      evento_relacionado: campanaMeta.evento_relacionado,
      canales: campanaMeta.canales,
      audiencia: campanaMeta.audiencia,
      notas: manual ? 'Generada manualmente por investigación CMO' : 'Generada automáticamente por CMO (cron semanal)',
      output_claude: `## Investigación\n${investigacion}\n\n## Estrategia y narrativa\n${estrategiaTexto}\n\n## Plan de contenido\n${planTexto}`,
      estado: 'activa',
    }).select().single()

    if (campanaError) return NextResponse.json({ error: campanaError.message }, { status: 500 })

    // Parsear e insertar piezas
    const lineas = planTexto.split('\n')
    const payload: Record<string, unknown>[] = []
    const seen = new Set<string>()
    for (const linea of lineas) {
      const match = linea.trim().match(/(\d{4}-\d{2}-\d{2})\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*"?([^"\n]+)"?/)
      if (!match) continue
      const [, fecha, canal, tipo, titulo] = match
      const key = `${fecha}|${canal.trim()}|${titulo.trim()}`
      if (seen.has(key)) continue
      seen.add(key)
      payload.push({
        fecha: fecha.trim(),
        canal: canal.trim(),
        tipo_contenido: tipo.trim(),
        titulo: titulo.trim(),
        tipo: 'contenido',
        copy_exacto: '', guion: '', musica_sugerida: '', referencia_visual: '',
        responsable: 'David', estado: 'pendiente',
        color: CANAL_COLORS[canal.trim()] || '#185fa5',
        campana_id: campana.id,
      })
    }

    if (payload.length > 0) {
      await sb.from('calendario_eventos').insert(payload)
    }

    return NextResponse.json({
      ok: true,
      campana_id: campana.id,
      campana_nombre: campana.nombre,
      piezas: payload.length,
      investigacion: investigacion.substring(0, 500),
    })

  } catch (e) {
    console.error('Error investigar:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  // Para el cron dominical
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://terret-cmo.vercel.app'}/api/investigar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ manual: false })
  })
  return res
}
