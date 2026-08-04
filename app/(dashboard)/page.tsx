'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { RefreshCw, Loader2 } from 'lucide-react'
import { RACES_CO, COMMERCIAL_DATES } from '@/lib/terret-context'

interface KPI { roas_meta: number; roas_google: number; roas_tiktok: number; revenue_total_m: number }

export default function HomePage() {
  const [kpis, setKpis] = useState<KPI | null>(null)
  const [insight, setInsight] = useState('')
  const [loadingInsight, setLoadingInsight] = useState(false)

  useEffect(() => {
    fetch('/api/kpis').then(r => r.json()).then(d => { if (d[0]) setKpis(d[0]) })
  }, [])

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const proximas = [...RACES_CO.filter(r => r.date >= todayStr), ...COMMERCIAL_DATES.filter(f => f.date >= todayStr)]
    .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 7)

  async function loadInsight() {
    setLoadingInsight(true); setInsight('')
    const res = await fetch('/api/claude', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'chat', messages: [{ role: 'user', content: `Fecha: ${format(today, "d 'de' MMMM yyyy", { locale: es })}. KPIs: ROAS Meta ${kpis?.roas_meta ?? '—'}x, Google ${kpis?.roas_google ?? '—'}x, TikTok ${kpis?.roas_tiktok ?? '—'}x. Próximas carreras: ${RACES_CO.filter(r => r.date >= todayStr).slice(0,3).map(r => r.name).join(', ')}. Dame el insight más importante para Terret esta semana. 3-4 oraciones máximo. Directo y accionable.` }] })
    })
    const reader = res.body!.getReader(); const decoder = new TextDecoder(); let text = ''
    while (true) { const { done, value } = await reader.read(); if (done) break; text += decoder.decode(value); setInsight(text) }
    setLoadingInsight(false)
  }

  const ROASCard = ({ label, value }: { label: string; value?: number }) => {
    const v = value ?? 0
    const color = v >= 7 ? '#15803d' : v >= 5 ? '#b45309' : v > 0 ? '#dc2626' : '#9c9a92'
    return (
      <div style={{ background: '#f0efe8', borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#6b6a63', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1a18' }}>{v ? `${v}x` : '—'}</div>
        <div style={{ height: 4, background: '#e0dfd5', borderRadius: 2, margin: '8px 0 4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min((v/7)*100,100)}%`, background: color, borderRadius: 2 }} />
        </div>
        <div style={{ fontSize: 10, color }}>{v === 0 ? '—' : v >= 7 ? '✓ En objetivo' : v >= 5 ? '↗ Sobre mínimo' : '⚠ Bajo mínimo 5x'}</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1a1a18', margin: 0 }}>
          {format(today, "EEEE d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
        </h1>
        <p style={{ fontSize: 13, color: '#6b6a63', margin: '4px 0 0' }}>Tu CMO está listo. ¿Qué movemos hoy?</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        <ROASCard label="ROAS Meta Ads" value={kpis?.roas_meta} />
        <ROASCard label="ROAS Google" value={kpis?.roas_google} />
        <ROASCard label="ROAS TikTok" value={kpis?.roas_tiktok} />
        <div style={{ background: '#f0efe8', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#6b6a63', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Revenue MTD</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1a18' }}>{kpis ? `$${kpis.revenue_total_m}M` : '—'}</div>
          <div style={{ fontSize: 10, color: '#9c9a92', marginTop: 8 }}>COP</div>
          <Link href="/kpis" style={{ fontSize: 10, color: '#185fa5', display: 'block', marginTop: 4 }}>Actualizar →</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a18', marginBottom: 12 }}>Acciones rápidas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { href: '/campanas', label: '+ Nueva campaña completa', primary: true },
              { href: '/calendario', label: '📅 Calendario editorial' },
              { href: '/contenido', label: '✏ Generar copy o guión' },
              { href: '/kpis', label: '📊 Actualizar KPIs' },
              { href: '/reporte', label: '📋 Ver reporte del lunes' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{
                display: 'block', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                textAlign: 'center', textDecoration: 'none', transition: 'background .1s',
                background: a.primary ? '#1a1a18' : 'transparent',
                color: a.primary ? '#fff' : '#1a1a18',
                border: a.primary ? 'none' : '1px solid #e0dfd5',
              }}>{a.label}</Link>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a18', marginBottom: 12 }}>Próximas fechas clave</div>
          {proximas.map((e, i) => {
            const fecha = new Date(e.date + 'T12:00:00')
            const dias = differenceInDays(fecha, today)
            const isRace = 'tier' in e
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < proximas.length-1 ? '1px solid #f0efe8' : 'none' }}>
                <div style={{ fontSize: 10, color: '#9c9a92', minWidth: 56 }}>{format(fecha, 'd MMM', { locale: es })}</div>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#1a1a18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 20, flexShrink: 0,
                  background: isRace ? '#fee2e2' : '#fef3c7', color: isRace ? '#b91c1c' : '#92400e' }}>
                  {dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `${dias}d`}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a18' }}>Insight del CMO</div>
          <button onClick={loadInsight} disabled={loadingInsight}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: '#e6f1fb', color: '#185fa5', border: 'none', cursor: 'pointer' }}>
            {loadingInsight ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            {loadingInsight ? 'Analizando...' : 'Nuevo análisis'}
          </button>
        </div>
        <p style={{ fontSize: 13, color: '#6b6a63', lineHeight: 1.7, margin: 0 }}>
          {insight || 'Haz clic en "Nuevo análisis" para que el CMO analice el contexto actual de Terret.'}
        </p>
      </div>
    </div>
  )
}
