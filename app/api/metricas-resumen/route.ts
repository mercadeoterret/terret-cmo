import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const sb = createServiceClient()
  
  // Traer todas las piezas publicadas con metricas en los ultimos 30 dias
  const desde = new Date()
  desde.setDate(desde.getDate() - 30)
  const desdeStr = desde.toISOString().split('T')[0]
  
  const { data } = await sb
    .from('calendario_eventos')
    .select('canal, tipo_contenido, metricas, fecha, titulo')
    .eq('estado', 'publicado')
    .gte('fecha', desdeStr)
    .not('metricas', 'eq', '{}')
  
  if (!data || data.length === 0) return NextResponse.json({ piezas: 0, canales: {}, tipos: {}, alertas: [] })

  // Consolidar por canal
  const canales: Record<string, { piezas: number; engagement_total: number; views_total: number; roas_total: number; roas_count: number }> = {}
  const tipos: Record<string, { piezas: number; engagement_total: number }> = {}
  const alertas: { titulo: string; canal: string; metrica: string; valor: number; benchmark: number }[] = []

  const BENCHMARKS: Record<string, { key: string; green: number; yellow: number }> = {
    'Engagement (%)': { key: 'Engagement (%)', green: 5, yellow: 2 },
    'Tasa apertura (%)': { key: 'Tasa apertura (%)', green: 25, yellow: 15 },
    'Tasa clics (%)': { key: 'Tasa clics (%)', green: 3, yellow: 1 },
    'ROAS': { key: 'ROAS', green: 7, yellow: 5 },
    'CTR (%)': { key: 'CTR (%)', green: 2, yellow: 1 },
    'Tasa completado (%)': { key: 'Tasa completado (%)', green: 50, yellow: 25 },
  }

  for (const pieza of data) {
    const m = pieza.metricas as Record<string, number> || {}
    const canal = pieza.canal || 'Otro'
    const tipo = pieza.tipo_contenido || 'Otro'

    if (!canales[canal]) canales[canal] = { piezas: 0, engagement_total: 0, views_total: 0, roas_total: 0, roas_count: 0 }
    if (!tipos[tipo]) tipos[tipo] = { piezas: 0, engagement_total: 0 }

    canales[canal].piezas++
    tipos[tipo].piezas++

    if (m['Engagement (%)']) {
      canales[canal].engagement_total += m['Engagement (%)']
      tipos[tipo].engagement_total += m['Engagement (%)']
    }
    if (m['Reproducciones'] || m['Vistas']) {
      canales[canal].views_total += m['Reproducciones'] || m['Vistas'] || 0
    }
    if (m['ROAS']) {
      canales[canal].roas_total += m['ROAS']
      canales[canal].roas_count++
    }

    // Detectar alertas
    for (const [key, bench] of Object.entries(BENCHMARKS)) {
      if (m[key] !== undefined && m[key] < bench.yellow) {
        alertas.push({ titulo: pieza.titulo, canal, metrica: key, valor: m[key], benchmark: bench.green })
      }
    }
  }

  // Calcular promedios
  const canalesResumen = Object.entries(canales).map(([canal, d]) => ({
    canal,
    piezas: d.piezas,
    engagement_promedio: d.engagement_total / d.piezas || 0,
    views_total: d.views_total,
    roas_promedio: d.roas_count > 0 ? d.roas_total / d.roas_count : 0,
  })).sort((a, b) => b.engagement_promedio - a.engagement_promedio)

  const tiposResumen = Object.entries(tipos).map(([tipo, d]) => ({
    tipo,
    piezas: d.piezas,
    engagement_promedio: d.engagement_total / d.piezas || 0,
  })).sort((a, b) => b.engagement_promedio - a.engagement_promedio)

  return NextResponse.json({
    piezas: data.length,
    canales: canalesResumen,
    tipos: tiposResumen,
    alertas: alertas.slice(0, 5),
    mejor_canal: canalesResumen[0]?.canal || null,
    mejor_tipo: tiposResumen[0]?.tipo || null,
  })
}
