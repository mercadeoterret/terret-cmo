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

async function setProgreso(sb: ReturnType<typeof createServiceClient>, fase: string, progreso: number, campana_nombre = '') {
  await sb.from('cron_status').upsert({
    id: 'singleton',
    estado: 'running',
    fase,
    progreso,
    campana_nombre,
    updated_at: new Date().toISOString()
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const manual = body.manual === true
    const fechaInicioOverride = body.fecha_inicio || null
    const fechaFinOverride = body.fecha_fin || null
    const contextoAdicional = body.contexto || ''

    const sb = createServiceClient()
    const { data: brandData } = await sb.from('brand_knowledge').select('contenido').eq('activo', true)
    const { data: kpisData } = await sb.from('kpis').select('*').order('semana', { ascending: false }).limit(1).single()
    const { data: campanasRecientes } = await sb.from('campanas').select('nombre, fecha_inicio, fecha_fin, objetivo').order('created_at', { ascending: false }).limit(5)
    const { data: memoriaData } = await sb.from('memoria_campanas').select('campana_nombre, tipo_campana, narrativa_central, formatos_usados, decision_estrategica').order('created_at', { ascending: false }).limit(6)

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
    const memoriaTexto = memoriaData && memoriaData.length > 0
      ? memoriaData.map((m: Record<string, string>) => `- "${m.campana_nombre}": Narrativa: ${m.narrativa_central}. Formatos: ${m.formatos_usados}.`).join('\n')
      : ''

    // ── FASE 1: Investigación + competencia (25%) ──────────────────────────
    await setProgreso(sb, 'Investigando tendencias y competencia...', 10)

    const investigacionRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }],
      system: 'Eres el Director de Marketing de Terret, marca colombiana de accesorios para running. Investigas con datos reales y concretos. Nunca inventes información.',
      messages: [{
        role: 'user',
        content: `Investiga para Terret (accesorios running Colombia). Hoy: ${todayStr}.

CONTEXTO:
- Carreras próximas (60 días): ${proximasCarreras.length ? proximasCarreras.map(r => `${r.date}: ${r.name} (${r.city})`).join(', ') : 'Ninguna registrada'}
- Fechas comerciales: ${proximasFechas.length ? proximasFechas.map(f => `${f.date}: ${f.name}`).join(', ') : 'Ninguna'}
- Campañas recientes Terret: ${campanasNombres || 'Ninguna'}
${contextoAdicional ? `- Contexto adicional: ${contextoAdicional}` : ''}

INVESTIGA:
1. Oportunidades: carreras Colombia próximas, tendencias running colombiano, hashtags virales
2. Competencia: qué están publicando Nike Colombia, Adidas Colombia, CEP Colombia esta semana
3. Diferenciación: dónde puede Terret diferenciarse de la competencia

Busca: "running Colombia 2026 tendencias", "Nike Colombia instagram running", "carreras atletismo Colombia 2026"

Responde SOLO en este formato (máx 350 palabras total):

## OPORTUNIDADES [máx 80 palabras]
## COMPETENCIA [Nike, Adidas, CEP, On Running — 1 frase cada uno, máx 120 palabras]
## DIFERENCIACIÓN TERRET [máx 60 palabras]
## HASHTAGS [top 5]`
      }]
    })

    let investigacion = ''
    for (const block of investigacionRes.content) {
      if (block.type === 'text') investigacion += block.text
    }
    // Limitar tamaño
    investigacion = investigacion.substring(0, 3000)

    await setProgreso(sb, 'Generando estrategia de campaña...', 35)

    // ── FASE 2: Estrategia (independiente, recibe resumen de fase 1) ────────
    const systemConMemoria = system + (memoriaTexto ? `\n\nCAMPAÑAS ANTERIORES DE TERRET (itera estratégicamente, no repitas):\n${memoriaTexto}` : '')

    const estrategiaRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: systemConMemoria,
      messages: [{
        role: 'user',
        content: `RESUMEN DE INVESTIGACIÓN:
${investigacion.substring(0, 1500)}

${contextoAdicional ? `CONTEXTO DEL EQUIPO: ${contextoAdicional}\n` : ''}
Genera la ESTRATEGIA de campaña para Terret. Solo estrategia — NO incluyas plan de contenido ni listado de fechas.

Primero el JSON en una línea:
CAMPAÑA_JSON: {"nombre":"...","descripcion":"...","fecha_inicio":"${fechaInicioOverride || todayStr}","fecha_fin":"${fechaFinOverride || new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}","objetivo":"...","evento_relacionado":"...","canales":["..."],"audiencia":["..."],"tipo_campana":"evento|venta|comunidad|general"}

Luego la estrategia (máximo 600 palabras):
## CONCEPTO CREATIVO
## NARRATIVA DE LA CAMPAÑA
## POSICIONAMIENTO
## MENSAJES CLAVE
## TONO Y ESTILO VISUAL
## DECISIÓN ESTRATÉGICA`
      }]
    })

    let estrategiaTexto = estrategiaRes.content[0].type === 'text' ? estrategiaRes.content[0].text : ''

    // Extraer JSON
    const jsonMatch = estrategiaTexto.match(/CAMPAÑA_JSON:\s*(\{[^}]+\})/)
    let campanaMeta = {
      nombre: `Campaña Terret — ${today.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}`,
      descripcion: 'Generada automáticamente por el CMO',
      fecha_inicio: fechaInicioOverride || todayStr,
      fecha_fin: fechaFinOverride || new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      objetivo: 'Ventas directas — maximizar ROAS',
      evento_relacionado: '',
      canales: ['Meta Ads', 'Instagram orgánico', 'Email marketing'],
      audiencia: ['Corredores urbanos / running'],
      tipo_campana: 'general',
    }
    if (jsonMatch) {
      try { campanaMeta = { ...campanaMeta, ...JSON.parse(jsonMatch[1]) } } catch { /* defaults */ }
    }

    await setProgreso(sb, 'Creando plan de contenido...', 60, campanaMeta.nombre)

    // ── FASE 3: Plan de contenido (independiente, recibe resumen de estrategia) ──
    // Solo el resumen de mensajes clave para el plan
    const mensajesMatch = estrategiaTexto.match(/## MENSAJES CLAVE([\s\S]*?)(?=##|$)/i)
    const conceptoMatch = estrategiaTexto.match(/## CONCEPTO CREATIVO([\s\S]*?)(?=##|$)/i)
    const estrategiaResumen = [
      conceptoMatch ? conceptoMatch[0].substring(0, 300) : '',
      mensajesMatch ? mensajesMatch[0].substring(0, 200) : ''
    ].filter(Boolean).join('\n')

    const planRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: 'Eres el Director de Marketing de Terret. Generas planes de contenido con frecuencia estratégica. Respondes ÚNICAMENTE con líneas de plan en formato exacto. Sin texto adicional.',
      messages: [{
        role: 'user',
        content: `CAMPAÑA: ${campanaMeta.nombre}
PERÍODO: ${campanaMeta.fecha_inicio} al ${campanaMeta.fecha_fin}
CANALES: ${campanaMeta.canales.join(', ')}
OBJETIVO: ${campanaMeta.objetivo}
CONCEPTO: ${estrategiaResumen}

REGLAS DE FRECUENCIA (obligatorias):
- Instagram orgánico: máximo 4 piezas/semana
- TikTok orgánico: máximo 3 piezas/semana
- Email: máximo 2/semana
- WhatsApp: máximo 2/semana
- Títulos: máximo 6 palabras

REGLAS DE PAUTA (MUY IMPORTANTE):
- Pauta Meta, Pauta TikTok, Google Ads: se configuran UNA SOLA VEZ por fase, no cada día
- Máximo 2 entradas de pauta por semana (una por fase de campaña)
- Las pautas se configuran al inicio de cada fase: semana 1 awareness, semana 3 conversión
- NO repitas pauta todos los días — una entrada de pauta representa toda la configuración de esa fase

FORMATO EXACTO — solo líneas así, nada más:
YYYY-MM-DD | Canal | Tipo | "Título corto"

Tipos permitidos: Reel, Carrusel, Story, Post, Video UGC, Email, Estado WhatsApp, Pauta Meta, Pauta TikTok`
      }]
    })

    const planTexto = planRes.content[0].type === 'text' ? planRes.content[0].text : ''

    await setProgreso(sb, 'Guardando campaña...', 80, campanaMeta.nombre)

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
      output_claude: `## Investigación\n${investigacion}\n\n## Estrategia\n${estrategiaTexto}\n\n## Plan\n${planTexto}`,
      investigacion_cmo: investigacion,
      estrategia_cmo: estrategiaTexto,
      plan_cmo: planTexto,
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

    // ── Guardar memoria ────────────────────────────────────────────────────
    const decisionMatch = estrategiaTexto.match(/## DECISIÓN ESTRATÉGICA([\s\S]*?)(?=##|$)/i)
    const narrativaMatch = estrategiaTexto.match(/## NARRATIVA DE LA CAMPAÑA([\s\S]*?)(?=##|$)/i)
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

    await setProgreso(sb, 'Campaña lista', 100, campana.nombre)

    // Reset a idle después de 5 segundos
    setTimeout(async () => {
      await sb.from('cron_status').upsert({ id: 'singleton', estado: 'done', fase: '', progreso: 0, campana_nombre: campana.nombre, updated_at: new Date().toISOString() })
    }, 5000)

    return NextResponse.json({
      ok: true,
      campana_id: campana.id,
      campana_nombre: campana.nombre,
      piezas: payload.length,
    })

  } catch (e) {
    console.error('Error investigar:', e)
    try {
      const sb2 = createServiceClient()
      await sb2.from('cron_status').upsert({ id: 'singleton', estado: 'idle', fase: '', progreso: 0, updated_at: new Date().toISOString() })
    } catch { /* ignore */ }
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
