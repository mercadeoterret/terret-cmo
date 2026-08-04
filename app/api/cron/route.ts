import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import { buildSystemPrompt, RACES_CO, COMMERCIAL_DATES } from '@/lib/terret-context'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  return generarReporte()
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (body.secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  return generarReporte()
}

async function generarReporte() {
  const supabase = createServiceClient()
  const { data: kpis } = await supabase.from('kpis').select('*').order('semana', { ascending: false }).limit(2)
  const { data: brandData } = await supabase.from('brand_knowledge').select('contenido').eq('activo', true)
  const brandKnowledge = (brandData || []).map((b: { contenido: string }) => b.contenido)
  const kpisActuales = kpis?.[0] || {}

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const in30 = new Date(today); in30.setDate(in30.getDate() + 30)
  const in30Str = in30.toISOString().split('T')[0]

  const proximasCarreras = RACES_CO.filter(r => r.date >= todayStr && r.date <= in30Str)
  const proximasFechas = COMMERCIAL_DATES.filter(f => f.date >= todayStr && f.date <= in30Str)
  const { data: campanasActivas } = await supabase.from('campanas').select('nombre,fecha_inicio,fecha_fin,objetivo,estado').in('estado', ['activa'])

  const systemPrompt = buildSystemPrompt(kpisActuales, brandKnowledge)

  const prompt = `Genera el REPORTE SEMANAL para Terret — ${today.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

KPIs: ROAS Meta ${kpisActuales.roas_meta ?? '—'}x | Google ${kpisActuales.roas_google ?? '—'}x | TikTok ${kpisActuales.roas_tiktok ?? '—'}x | Revenue MTD $${kpisActuales.revenue_total_m ?? '—'}M

PRÓXIMAS CARRERAS (30 días):
${proximasCarreras.length ? proximasCarreras.map(r => `- ${r.date}: ${r.name} (${r.city})`).join('\n') : 'Ninguna'}

FECHAS COMERCIALES PRÓXIMAS:
${proximasFechas.length ? proximasFechas.map(f => `- ${f.date}: ${f.name}`).join('\n') : 'Ninguna'}

CAMPAÑAS ACTIVAS:
${campanasActivas?.length ? campanasActivas.map((c: {nombre: string; estado: string; fecha_inicio: string; fecha_fin: string}) => `- ${c.nombre} | ${c.fecha_inicio} → ${c.fecha_fin}`).join('\n') : 'Ninguna'}

Genera con estas secciones EXACTAS:
## 🔴 ALERTAS URGENTES
## 📊 DIAGNÓSTICO DE LA SEMANA
## 🎯 TOP 5 ACCIONES ESTA SEMANA
(Para cada acción: ### Acción N: [Título] / **Qué hacer:** / **Responsable:** / **Métrica:** / **Prioridad:** Alta|Media|Baja)
## 📅 PREPARAR PARA LAS PRÓXIMAS SEMANAS
## 💡 OPORTUNIDAD DE LA SEMANA
## 📈 PROYECCIÓN A 2 SEMANAS`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 3000, system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  })
  const reporteTexto = message.content[0].type === 'text' ? message.content[0].text : ''

  const accionesMsg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 800,
    messages: [{ role: 'user', content: `Extrae las 5 acciones de este reporte en JSON array. Formato: [{"titulo":"...","que_hacer":"...","responsable":"...","prioridad":"Alta|Media|Baja","metrica":"..."}]. Solo JSON, sin texto extra.\n\n${reporteTexto}` }],
  })

  let acciones = []
  try {
    const t = accionesMsg.content[0].type === 'text' ? accionesMsg.content[0].text : '[]'
    acciones = JSON.parse(t.replace(/```json|```/g, '').trim())
  } catch { acciones = [] }

  const lunes = new Date(today)
  const dow = today.getDay()
  lunes.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))

  const { data: reporte, error } = await supabase.from('reportes_lunes').upsert({
    fecha: lunes.toISOString().split('T')[0], tipo: 'automatico',
    kpi_snapshot: kpisActuales, reporte_markdown: reporteTexto, acciones,
  }, { onConflict: 'fecha' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, reporte })
}
