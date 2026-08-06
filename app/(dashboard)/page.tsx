'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2 } from 'lucide-react'
import { RACES_CO, COMMERCIAL_DATES } from '@/lib/terret-context'

interface KPI { roas_meta: number; roas_google: number; roas_tiktok: number; revenue_total_m: number }
interface MetricasResumen {
  piezas: number
  canales: { canal: string; piezas: number; engagement_promedio: number; views_total: number }[]
  tipos: { tipo: string; piezas: number; engagement_promedio: number }[]
  alertas: { titulo: string; canal: string; metrica: string; valor: number; benchmark: number }[]
  mejor_canal: string | null
  mejor_tipo: string | null
}
interface Tarea { id: string; titulo: string; fecha: string; canal: string; estado: string; responsable: string; campanas?: { nombre: string } }

const DS = {
  bg: '#F2F0EA', surface: '#FFFFFF', border: '#E5E2D9',
  text: '#1C1B18', textSecondary: '#6B6860', textTertiary: '#9B9890',
  accent: '#E8520A', accentLight: '#FEF0E8',
  success: '#1A7A4A', successLight: '#E8F5EE',
  warning: '#B45309', warningLight: '#FEF3C7',
  danger: '#C91B1B', dangerLight: '#FEE2E2',
  info: '#185FA5', infoLight: '#EBF3FC',
}

const CANAL_ICON: Record<string, string> = {
  'Instagram': '📸', 'Instagram orgánico': '📸', 'TikTok': '🎵', 'TikTok orgánico': '🎵',
  'Meta Ads': '💰', 'Google Ads': '🔍', 'Email': '📧', 'Email marketing': '📧',
  'WhatsApp': '💬', 'WhatsApp / estados': '💬', 'Influencers / UGC': '🎬',
  'Shopify Email': '📧',
}

export default function HomePage() {
  const [kpis, setKpis] = useState<KPI | null>(null)
  const [tareasHoy, setTareasHoy] = useState<Tarea[]>([])
  const [tareasVencidas, setTareasVencidas] = useState<Tarea[]>([])
  const [insight, setInsight] = useState('')
  const [loadingInsight, setLoadingInsight] = useState(false)
  const [campanas, setCampanas] = useState<{ id: string; nombre: string; fecha_inicio: string; fecha_fin: string }[]>([])
  const [metricasResumen, setMetricasResumen] = useState<MetricasResumen | null>(null)

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  useEffect(() => {
    fetch('/api/kpis').then(r => r.json()).then(d => { if (d[0]) setKpis(d[0]) })
    fetch(`/api/tareas?fecha=${todayStr}`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setTareasHoy(d.filter((t: Tarea) => t.estado !== 'publicado'))
    })
    const weekAgo = format(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    fetch(`/api/tareas?from=${weekAgo}&to=${todayStr}`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setTareasVencidas(d.filter((t: Tarea) => t.estado === 'pendiente' && t.fecha < todayStr))
    })
    fetch('/api/campanas').then(r => r.json()).then(d => { if (Array.isArray(d)) setCampanas(d.slice(0, 3)) })
    fetch('/api/metricas-resumen').then(r => r.json()).then(d => { if (d.piezas !== undefined) setMetricasResumen(d) })
  }, [])

  const proximas = [...RACES_CO.filter(r => r.date >= todayStr), ...COMMERCIAL_DATES.filter(f => f.date >= todayStr)]
    .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5)

  async function loadInsight() {
    setLoadingInsight(true); setInsight('')
    const res = await fetch('/api/claude', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'chat',
        messages: [{ role: 'user', content: `Fecha hoy: ${format(today, "d 'de' MMMM yyyy", { locale: es })}. KPIs: ROAS Meta ${kpis?.roas_meta ?? '—'}x, Google ${kpis?.roas_google ?? '—'}x, TikTok ${kpis?.roas_tiktok ?? '—'}x. Próximas carreras: ${RACES_CO.filter(r => r.date >= todayStr).slice(0, 2).map(r => r.name).join(', ')}. Tareas vencidas sin publicar: ${tareasVencidas.length}. Tareas para hoy: ${tareasHoy.length}. Dame el insight estratégico más importante para Terret esta semana. Máximo 2 oraciones. Directo y accionable.` }]
      })
    })
    const reader = res.body!.getReader(); const dec = new TextDecoder(); let text = ''
    while (true) { const { done, value } = await reader.read(); if (done) break; text += dec.decode(value); setInsight(text) }
    setLoadingInsight(false)
  }

  const roasColor = (v: number) => v >= 7 ? DS.success : v >= 5 ? DS.warning : v > 0 ? DS.danger : DS.textTertiary
  const roasBg = (v: number) => v >= 7 ? DS.successLight : v >= 5 ? DS.warningLight : v > 0 ? DS.dangerLight : DS.bg

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: DS.text, letterSpacing: '-0.5px' }}>
          {format(today, "EEEE d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
        </div>
        <div style={{ fontSize: 13, color: DS.textSecondary, marginTop: 3 }}>Tu Director de Marketing está listo.</div>
      </div>

      {/* Tareas de hoy */}
      {(tareasHoy.length > 0 || tareasVencidas.length > 0) && (
        <div style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 14, padding: '18px 20px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: DS.text, display: 'flex', alignItems: 'center', gap: 8 }}>
              {tareasVencidas.length > 0 ? (
                <span style={{ background: DS.dangerLight, color: DS.danger, padding: '3px 8px', borderRadius: 6, fontSize: 11 }}>
                  ⚠ {tareasVencidas.length} vencida{tareasVencidas.length !== 1 ? 's' : ''}
                </span>
              ) : null}
              {tareasHoy.length > 0 ? (
                <span style={{ background: DS.accentLight, color: DS.accent, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                  📌 {tareasHoy.length} para hoy
                </span>
              ) : null}
            </div>
            <Link href="/tareas" style={{ fontSize: 12, color: DS.info, textDecoration: 'none', fontWeight: 600 }}>Ver todas →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...tareasVencidas.slice(0, 2), ...tareasHoy.slice(0, 3)].map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: DS.bg, borderRadius: 8 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{CANAL_ICON[t.canal] || '📌'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: DS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titulo}</div>
                  <div style={{ fontSize: 10, color: DS.textTertiary, marginTop: 1 }}>{t.canal} · {t.campanas?.nombre}</div>
                </div>
                {t.fecha < todayStr && (
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: DS.dangerLight, color: DS.danger, fontWeight: 700, flexShrink: 0 }}>VENCIDA</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* KPIs */}
        <div style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: DS.text }}>KPIs esta semana</div>
            <Link href="/kpis" style={{ fontSize: 11, color: DS.info, textDecoration: 'none', fontWeight: 600 }}>Actualizar →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { l: 'Meta Ads', v: kpis?.roas_meta },
              { l: 'Google', v: kpis?.roas_google },
              { l: 'TikTok', v: kpis?.roas_tiktok },
              { l: 'Revenue MTD', v: kpis?.revenue_total_m, suffix: 'M', prefix: '$', noRoas: true },
            ].map(({ l, v, suffix, prefix, noRoas }) => (
              <div key={l} style={{ background: v && !noRoas ? roasBg(v) : DS.bg, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: DS.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{l}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: v && !noRoas ? roasColor(v) : DS.text, letterSpacing: '-0.5px' }}>
                  {v ? `${prefix || ''}${v}${suffix || (noRoas ? '' : 'x')}` : '—'}
                </div>
                {v && !noRoas && (
                  <div style={{ fontSize: 10, color: roasColor(v), fontWeight: 600, marginTop: 4 }}>
                    {v >= 7 ? '✓ En objetivo' : v >= 5 ? '↗ Sobre mínimo' : '⚠ Bajo mínimo'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Próximas fechas */}
        <div style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: DS.text, marginBottom: 16 }}>Fechas clave</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {proximas.map((p, i) => {
              const dias = differenceInDays(new Date(p.date + 'T12:00:00'), today)
              const isCarrera = 'dist' in p
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 11, color: DS.textTertiary, minWidth: 48 }}>
                    {format(new Date(p.date + 'T12:00:00'), 'd MMM', { locale: es })}
                  </div>
                  <div style={{ flex: 1, fontSize: 12, color: DS.text, fontWeight: 500 }}>{p.name}</div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                    background: dias <= 7 ? DS.dangerLight : dias <= 21 ? DS.warningLight : DS.successLight,
                    color: dias <= 7 ? DS.danger : dias <= 21 ? DS.warning : DS.success,
                    flexShrink: 0
                  }}>{dias}d</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Campañas activas + Acciones rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Campañas */}
        <div style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: DS.text }}>Campañas activas</div>
            <Link href="/campanas" style={{ fontSize: 11, color: DS.info, textDecoration: 'none', fontWeight: 600 }}>Ver todas →</Link>
          </div>
          {campanas.length === 0 ? (
            <div style={{ fontSize: 12, color: DS.textTertiary, padding: '20px 0', textAlign: 'center' }}>Sin campañas activas</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {campanas.map(c => (
                <Link key={c.id} href="/campanas" style={{ display: 'block', padding: '10px 12px', background: DS.bg, borderRadius: 8, textDecoration: 'none' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: DS.text }}>{c.nombre}</div>
                  <div style={{ fontSize: 10, color: DS.textTertiary, marginTop: 2 }}>{c.fecha_inicio} → {c.fecha_fin}</div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Acciones rápidas */}
        <div style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: DS.text, marginBottom: 16 }}>Acciones rápidas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { href: '/campanas', label: 'Nueva campaña', icon: '◈', primary: true },
              { href: '/tareas', label: 'Ver tareas pendientes', icon: '◻' },
              { href: '/calendario', label: 'Calendario editorial', icon: '▦' },
              { href: '/kpis', label: 'Actualizar KPIs', icon: '▲' },
              { href: '/comite', label: 'Generar propuesta comité', icon: '◎' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: a.primary ? DS.text : DS.bg,
                color: a.primary ? '#fff' : DS.textSecondary,
                borderRadius: 9, textDecoration: 'none', fontSize: 12, fontWeight: a.primary ? 700 : 500,
              }}>
                <span style={{ fontSize: 14 }}>{a.icon}</span>
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Rendimiento de contenido */}
      {metricasResumen && metricasResumen.piezas > 0 && (
        <div style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 14, padding: '18px 20px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: DS.text, marginBottom: 16 }}>
            Rendimiento últimos 30 días
            <span style={{ fontSize: 11, fontWeight: 400, color: DS.textTertiary, marginLeft: 8 }}>{metricasResumen.piezas} piezas con métricas</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: metricasResumen.alertas.length > 0 ? 16 : 0 }}>
            {metricasResumen.mejor_canal && (
              <div style={{ background: DS.successLight, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: DS.success, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>✓ Mejor canal</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: DS.text }}>{metricasResumen.mejor_canal}</div>
                <div style={{ fontSize: 11, color: DS.textSecondary, marginTop: 2 }}>Mayor engagement promedio</div>
              </div>
            )}
            {metricasResumen.mejor_tipo && (
              <div style={{ background: DS.infoLight, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: DS.info, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>✓ Mejor formato</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: DS.text }}>{metricasResumen.mejor_tipo}</div>
                <div style={{ fontSize: 11, color: DS.textSecondary, marginTop: 2 }}>Mayor engagement promedio</div>
              </div>
            )}
            {metricasResumen.canales.length > 0 && (
              <div style={{ background: DS.bg, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: DS.textTertiary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Engagement por canal</div>
                {metricasResumen.canales.slice(0, 3).map(c => (
                  <div key={c.canal} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: DS.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{c.canal}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c.engagement_promedio >= 5 ? DS.success : c.engagement_promedio >= 2 ? DS.warning : DS.danger }}>
                      {c.engagement_promedio > 0 ? `${c.engagement_promedio.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {metricasResumen.alertas.length > 0 && (
            <div style={{ background: DS.dangerLight, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: DS.danger, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>⚠ Contenidos bajo benchmark</div>
              {metricasResumen.alertas.slice(0, 3).map((a, i) => (
                <div key={i} style={{ fontSize: 12, color: DS.text, marginBottom: 4 }}>
                  <strong>{a.canal}</strong> · {a.titulo.slice(0, 40)}... — {a.metrica}: {a.valor} (benchmark: {a.benchmark})
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Insight del CMO */}
      <div style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: insight ? 12 : 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: DS.text }}>Insight del CMO</div>
          <button onClick={loadInsight} disabled={loadingInsight}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: DS.accentLight, color: DS.accent, border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {loadingInsight ? <Loader2 size={12} className="animate-spin" /> : '✦'}
            {loadingInsight ? 'Analizando...' : insight ? 'Actualizar' : 'Nuevo análisis'}
          </button>
        </div>
        {insight && (
          <div style={{ fontSize: 13, color: DS.textSecondary, lineHeight: 1.7, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${DS.border}` }}>
            {insight}
          </div>
        )}
        {!insight && !loadingInsight && (
          <div style={{ fontSize: 12, color: DS.textTertiary, marginTop: 8 }}>
            Haz clic en "Nuevo análisis" para que el CMO evalúe la situación actual.
          </div>
        )}
      </div>
    </div>
  )
}
