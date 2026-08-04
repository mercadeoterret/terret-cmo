'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react'
import { RACES_CO, COMMERCIAL_DATES } from '@/lib/terret-context'

interface KPI { roas_meta: number; roas_google: number; roas_tiktok: number; revenue_total_m: number }
interface Tarea { id: string; titulo: string; fecha: string; canal: string; estado: string; responsable: string }

export default function HomePage() {
  const [kpis, setKpis] = useState<KPI | null>(null)
  const [tareasHoy, setTareasHoy] = useState<Tarea[]>([])
  const [tareasVencidas, setTareasVencidas] = useState<Tarea[]>([])
  const [insight, setInsight] = useState('')
  const [loadingInsight, setLoadingInsight] = useState(false)

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  useEffect(() => {
    fetch('/api/kpis').then(r => r.json()).then(d => { if (d[0]) setKpis(d[0]) })
    fetch(`/api/tareas?fecha=${todayStr}`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setTareasHoy(d.filter((t: Tarea) => t.estado !== 'publicado'))
    })
    // Tareas vencidas (fecha anterior a hoy, no publicadas)
    const weekAgo = format(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    fetch(`/api/tareas?from=${weekAgo}&to=${todayStr}`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setTareasVencidas(d.filter((t: Tarea) => t.estado === 'pendiente' && t.fecha < todayStr))
    })
  }, [])

  const proximas = [...RACES_CO.filter(r => r.date >= todayStr), ...COMMERCIAL_DATES.filter(f => f.date >= todayStr)]
    .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6)

  async function loadInsight() {
    setLoadingInsight(true); setInsight('')
    const res = await fetch('/api/claude', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'chat',
        messages: [{
          role: 'user',
          content: `Fecha hoy: ${format(today, "d 'de' MMMM yyyy", { locale: es })}.
KPIs: ROAS Meta ${kpis?.roas_meta ?? '—'}x, Google ${kpis?.roas_google ?? '—'}x, TikTok ${kpis?.roas_tiktok ?? '—'}x.
Próximas carreras: ${RACES_CO.filter(r => r.date >= todayStr).slice(0, 2).map(r => r.name).join(', ')}.
Tareas vencidas sin publicar: ${tareasVencidas.length}.
Tareas para hoy: ${tareasHoy.length}.
Dame el insight estratégico más importante para Terret esta semana. Máximo 3 oraciones. Directo y accionable.`
        }]
      })
    })
    const reader = res.body!.getReader(); const dec = new TextDecoder(); let text = ''
    while (true) { const { done, value } = await reader.read(); if (done) break; text += dec.decode(value); setInsight(text) }
    setLoadingInsight(false)
  }

  const ROASCard = ({ label, value }: { label: string; value?: number }) => {
    const v = value ?? 0
    const color = v >= 7 ? '#15803d' : v >= 5 ? '#b45309' : v > 0 ? '#dc2626' : '#9c9a92'
    const status = v === 0 ? '—' : v >= 7 ? '✓ En objetivo' : v >= 5 ? '↗ Sobre mínimo' : '⚠ Bajo mínimo'
    return (
      <div style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#1a1a18', lineHeight: 1 }}>{v ? `${v}x` : '—'}</div>
        <div style={{ height: 3, background: '#f0efe8', borderRadius: 2, margin: '10px 0 6px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min((v / 7) * 100, 100)}%`, background: color, borderRadius: 2 }} />
        </div>
        <div style={{ fontSize: 11, color, fontWeight: 600 }}>{status}</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a18', margin: 0 }}>
          {format(today, "EEEE d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
        </h1>
        <p style={{ fontSize: 13, color: '#6b6a63', margin: '4px 0 0' }}>Tu Director de Marketing está listo.</p>
      </div>

      {/* Alertas de tareas vencidas */}
      {tareasVencidas.length > 0 && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c' }}>
              {tareasVencidas.length} tarea{tareasVencidas.length > 1 ? 's' : ''} vencida{tareasVencidas.length > 1 ? 's' : ''} sin publicar
            </div>
            <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>
              {tareasVencidas.slice(0, 3).map(t => t.titulo).join(', ')}
            </div>
          </div>
          <Link href="/tareas" style={{ marginLeft: 'auto', padding: '6px 12px', background: '#dc2626', color: '#fff', borderRadius: 7, fontSize: 11, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
            Ver tareas →
          </Link>
        </div>
      )}

      {/* Tareas de hoy */}
      {tareasHoy.length > 0 && (
        <div style={{ background: '#fffbf0', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 10 }}>
            📌 HOY — {tareasHoy.length} tarea{tareasHoy.length > 1 ? 's' : ''} pendiente{tareasHoy.length > 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tareasHoy.slice(0, 5).map(t => (
              <Link key={t.id} href="/tareas" style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                background: '#fff', borderRadius: 8, border: '1px solid #fde68a',
                textDecoration: 'none', fontSize: 12, color: '#1a1a18'
              }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#9c9a92' }}>{t.canal}</span>
                <span style={{ fontWeight: 500 }}>{t.titulo}</span>
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 5, background: t.responsable === 'Creadora' ? '#f3e8ff' : '#e6f1fb', color: t.responsable === 'Creadora' ? '#7c3aed' : '#185fa5', fontWeight: 600 }}>{t.responsable}</span>
              </Link>
            ))}
            {tareasHoy.length > 5 && (
              <Link href="/tareas" style={{ padding: '6px 12px', background: '#fef3c7', borderRadius: 8, fontSize: 12, color: '#92400e', fontWeight: 600, textDecoration: 'none' }}>
                +{tareasHoy.length - 5} más
              </Link>
            )}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <ROASCard label="ROAS Meta Ads" value={kpis?.roas_meta} />
        <ROASCard label="ROAS Google" value={kpis?.roas_google} />
        <ROASCard label="ROAS TikTok" value={kpis?.roas_tiktok} />
        <div style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Revenue MTD</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1a1a18', lineHeight: 1 }}>{kpis ? `$${kpis.revenue_total_m}M` : '—'}</div>
          <div style={{ fontSize: 10, color: '#9c9a92', margin: '10px 0 6px' }}>COP</div>
          <Link href="/kpis" style={{ fontSize: 11, color: '#185fa5', textDecoration: 'none', fontWeight: 600 }}>Actualizar KPIs →</Link>
        </div>
      </div>

      {/* Acciones + Fechas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18', marginBottom: 14 }}>Acciones rápidas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { href: '/campanas', label: '📣 Nueva campaña completa', primary: true },
              { href: '/tareas', label: '✅ Ver todas las tareas pendientes' },
              { href: '/calendario', label: '📅 Calendario editorial' },
              { href: '/contenido', label: '✏️ Generar copy o guión' },
              { href: '/creadora', label: '🎬 Vista de la creadora' },
              { href: '/reporte', label: '📄 Reporte del lunes' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{
                display: 'block', padding: '9px 14px', borderRadius: 8, fontSize: 13,
                fontWeight: a.primary ? 700 : 500, textDecoration: 'none', textAlign: 'center',
                background: a.primary ? '#1a1a18' : '#f5f4ef',
                color: a.primary ? '#fff' : '#1a1a18',
                border: a.primary ? 'none' : '1px solid #e0dfd5'
              }}>{a.label}</Link>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18', marginBottom: 14 }}>Próximas fechas clave</div>
          {proximas.map((e, i) => {
            const fecha = new Date(e.date + 'T12:00:00')
            const dias = differenceInDays(fecha, today)
            const isRace = 'tier' in e
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < proximas.length - 1 ? '1px solid #f5f4ef' : 'none' }}>
                <div style={{ fontSize: 10, color: '#9c9a92', minWidth: 52, fontWeight: 600 }}>{format(fecha, 'd MMM', { locale: es })}</div>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#1a1a18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, flexShrink: 0,
                  background: dias <= 7 ? '#fee2e2' : isRace ? '#fef3c7' : '#f0efe8',
                  color: dias <= 7 ? '#b91c1c' : isRace ? '#92400e' : '#6b6a63'
                }}>
                  {dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `${dias}d`}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Insight del CMO */}
      <div style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18' }}>💡 Insight del CMO</div>
          <button onClick={loadInsight} disabled={loadingInsight} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            background: '#e6f1fb', color: '#185fa5', border: 'none', borderRadius: 8,
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
          }}>
            {loadingInsight ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {loadingInsight ? 'Analizando...' : 'Nuevo análisis'}
          </button>
        </div>
        <p style={{ fontSize: 13, color: '#6b6a63', lineHeight: 1.7, margin: 0 }}>
          {insight || 'Haz clic en "Nuevo análisis" para que el CMO analice el contexto actual de Terret y te diga qué priorizar.'}
        </p>
      </div>
    </div>
  )
}
