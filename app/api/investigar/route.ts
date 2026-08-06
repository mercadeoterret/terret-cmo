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

    // ── FASE 1: Investigar oportunidades + competencia ─────────────────────
    const investigacionRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }],
      system: 'Eres el Director de Marketing de Terret, marca colombiana de accesorios para running. Investiga con datos concretos. Nunca pidas información adicional.',
      messages: [{
        role: 'user',
        content: `Investiga para Terret (accesorios running Colombia). Hoy: ${todayStr}.

CONTEXTO:
- Carreras próximas: ${proximasCarreras.length ? proximasCarreras.map(r => `${r.date}: ${r.name} (${r.city})`).join(', ') : 'Ninguna'}
- Fechas comerciales: ${proximasFechas.length ? proximasFechas.map(f => `${f.date}: ${f.name}`).join(', ') : 'Ninguna'}
- Campañas recientes de Terret (contexto): ${campanasNombres || 'Ninguna'}

INVESTIGA EN WEB:
1. OPORTUNIDADES: Carreras running Colombia próximas, tendencias running colombiano, hashtags virales, conversaciones actuales
2. COMPETENCIA: Qué están publicando en redes sociales estas semanas Nike Colombia, Adidas Colombia, CEP Colombia, On Running Colombia, marcas running colombianas. Busca sus últimas publicaciones, formatos más usados, narrativas recientes
3. DIFERENCIACIÓN: Con base en lo que hace la competencia, qué oportunidades de contenido hay donde Terret pueda diferenciarse

Busca: "running Colombia 2026 tendencias", "Nike Colombia instagram running", "Adidas Colombia running", "medias compresion running Colombia", "carreras atletismo Colombia 2026"

Entrega un análisis estructurado de oportunidades Y de la competencia.`
      }]
    })

    let investigacion = ''
    for (const block of investigacionRes.content) {
      if (block.type === 'text') investigacion += block.text
    }

    // ── FASE 2: Cargar memoria de campañas relevantes ──────────────────────
    // Determinar tipo de campaña para cargar memoria relevante
    const tipoDetectado = proximasCarreras.length > 0 ? 'evento' : 'comunidad'
    const { data: memoriaData } = await sb
      .from('memoria_campanas')
      .select('campana_nombre, tipo_campana, narrativa_central, formatos_usados, decision_estrategica, metricas_destacadas')
      .or(`tipo_campana.eq.${tipoDetectado},tipo_campana.eq.general`)
      .order('created_at', { ascending: false })
      .limit(6)

    const memoriaTexto = memoriaData && memoriaData.length > 0
      ? `\nMEMORIA DE CAMPAÑAS ANTERIORES DE TERRET (úsala para tomar decisiones estratégicas nuevas, no repetir lo mismo):\n${memoriaData.map((m: Record<string, string>) =>
        `- "${m.campana_nombre}" (${m.tipo_campana}): Narrativa usada: ${m.narrativa_central}. Formatos: ${m.formatos_usados}. Decisión estratégica: ${m.decision_estrategica}${m.metricas_destacadas ? `. Métricas: ${m.metricas_destacadas}` : ''}`
      ).join('\n')}`
      : ''

    // ── FASE 3: Generar estrategia con contexto completo ───────────────────
    const systemAutonomo = system + `

ANÁLISIS DE COMPETENCIA Y MEMORIA DISPONIBLE: Usa esta información para tomar decisiones estratégicas que diferencien a Terret. Si la competencia está usando un formato, evalúa si Terret debe diferenciarse o competir directamente. Si ya usaste una narrativa antes, itera sobre ella desde un ángulo diferente — un mismo concepto como "entrenamiento 5am" puede explorarse desde la preparación, la comunidad, la recuperación, el producto técnico, el resultado. Piensa como director que construye un universo narrativo coherente pero siempre evolutivo.`

    const estrategiaRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: systemAutonomo,
      messages: [{
        role: 'user',
        content: `INVESTIGACIÓN Y ANÁLISIS DE COMPETENCIA:
${investigacion}
${memoriaTexto}

Con este contexto completo, genera la CAMPAÑA para Terret. Considera:
- Qué está haciendo la competencia y cómo diferenciarnos
- Qué narrativas ya hemos usado y cómo iterarlas estratégicamente
- La distribución correcta de contenido según el tipo de campaña

Primero el JSON en una línea:
CAMPAÑA_JSON: {"nombre":"...","descripcion":"...","fecha_inicio":"YYYY-MM-DD","fecha_fin":"YYYY-MM-DD","objetivo":"...","evento_relacionado":"...","canales":["..."],"audiencia":["..."],"tipo_campana":"evento|venta|comunidad|general"}

Luego la estrategia:
## CONCEPTO CREATIVO
## NARRATIVA DE LA CAMPAÑA
## DIFERENCIACIÓN DE COMPETENCIA (qué hace la competencia y cómo nos diferenciamos)
## POSICIONAMIENTO
## MENSAJES CLAVE
## TONO Y ESTILO VISUAL
## DECISIÓN ESTRATÉGICA (por qué esta campaña en este momento, qué iteramos de campañas anteriores)`
      }]
    })

    const estrategiaTexto = estrategiaRes.content[0].type === 'text' ? estrategiaRes.content[0].text : ''

    // Extraer JSON de la campaña
    const jsonMatch = estrategiaTexto.match(/CAMPAÑA_JSON:\s*(\{[^}]+\})/)
    let campanaMeta = {
      nombre: `Campaña Terret — ${today.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}`,
      descripcion: 'Generada automáticamente por el CMO',
      fecha_inicio: todayStr,
      fecha_fin: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      objetivo: 'Ventas directas — maximizar ROAS',
      evento_relacionado: '',
      canales: ['Meta Ads', 'Instagram orgánico', 'Email marketing'],
      audiencia: ['Corredores urbanos / running'],
      tipo_campana: 'general',
    }
    if (jsonMatch) {
      try { campanaMeta = { ...campanaMeta, ...JSON.parse(jsonMatch[1]) } } catch { /* usar defaults */ }
    }

    // ── FASE 4: Plan de contenido ──────────────────────────────────────────
    const planRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: systemAutonomo,
      messages: [{
        role: 'user',
        content: `CAMPAÑA: ${campanaMeta.nombre}
PERÍODO: ${campanaMeta.fecha_inicio} al ${campanaMeta.fecha_fin}
CANALES: ${campanaMeta.canales.join(', ')}
OBJETIVO: ${campanaMeta.objetivo}

ESTRATEGIA:
${estrategiaTexto}

Genera el plan de contenido aplicando la distribución estratégica correcta para este tipo de campaña.
Asegúrate de mezclar: contenido educativo, de comunidad/entretenimiento Y de conversión según las proporciones del tipo de campaña.
No pongas solo contenido de venta.

FORMATO: una línea por pieza:
YYYY-MM-DD | Canal | Tipo | "Título específico y descriptivo"

Tipos: Reel, Carrusel, Story, Post, Video UGC, Email, Estado WhatsApp, Pauta Meta, Pauta TikTok
Reglas: múltiples piezas por día, no saltar días, títulos muy específicos que reflejen la decisión estratégica.
Responde ÚNICAMENTE con las líneas del plan.`
      }]
    })

    const planTexto = planRes.content[0].type === 'text' ? planRes.content[0].text : ''

    // ── Guardar campaña ────────────────────────────────────────────────────
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
      output_claude: `## Investigación y análisis de competencia\n${investigacion}\n\n## Estrategia y narrativa\n${estrategiaTexto}\n\n## Plan de contenido\n${planTexto}`,
      estado: 'activa',
    }).select().single()

    if (campanaError) return NextResponse.json({ error: campanaError.message }, { status: 500 })

    // ── Parsear e insertar piezas ──────────────────────────────────────────
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
        fecha: fecha.trim(), canal: canal.trim(), tipo_contenido: tipo.trim(),
        titulo: titulo.trim(), tipo: 'contenido',
        copy_exacto: '', guion: '', musica_sugerida: '', referencia_visual: '',
        responsable: 'David', estado: 'pendiente',
        color: CANAL_COLORS[canal.trim()] || '#185fa5',
        campana_id: campana.id,
      })
    }

    if (payload.length > 0) {
      await sb.from('calendario_eventos').insert(payload)
    }

    // ── FASE 5: Guardar memoria comprimida de esta campaña ─────────────────
    // Extraer decisión estratégica del texto generado
    const decisionMatch = estrategiaTexto.match(/DECISIÓN ESTRATÉGICA[\s\S]*?(?=##|$)/i)
    const narrativaMatch = estrategiaTexto.match(/NARRATIVA DE LA CAMPAÑA[\s\S]*?(?=##|$)/i)
    const diferencMatch = estrategiaTexto.match(/DIFERENCIACIÓN DE COMPETENCIA[\s\S]*?(?=##|$)/i)

    const formatosUsados = [...new Set(payload.map((p: Record<string, unknown>) => p.tipo_contenido as string))].join(', ')

    await sb.from('memoria_campanas').insert({
      campana_id: campana.id,
      campana_nombre: campana.nombre,
      tipo_campana: campanaMeta.tipo_campana || 'general',
      narrativa_central: narrativaMatch ? narrativaMatch[0].replace('## NARRATIVA DE LA CAMPAÑA', '').trim().substring(0, 300) : campana.nombre,
      formatos_usados: formatosUsados,
      decision_estrategica: decisionMatch ? decisionMatch[0].replace('## DECISIÓN ESTRATÉGICA', '').trim().substring(0, 300) : '',
      metricas_destacadas: '',
      tags: campanaMeta.canales,
    })

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
