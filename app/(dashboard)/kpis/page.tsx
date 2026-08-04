'use client'
import { useState, useEffect } from 'react'
import { format, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2, Save, TrendingUp } from 'lucide-react'

interface KPI {
  id: string; semana: string; roas_meta: number; roas_google: number; roas_tiktok: number
  cpc_cop: number; ctr_pct: number; conversion_rate_pct: number
  inversion_meta_k: number; revenue_meta_m: number; inversion_google_k: number
  revenue_google_k: number; inversion_tiktok_k: number; revenue_tiktok_k: number
  revenue_email_k: number; revenue_total_m: number; notas: string
}

const DEFAULT_FORM = {
  semana: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  roas_meta: '', roas_google: '', roas_tiktok: '', cpc_cop: '', ctr_pct: '',
  conversion_rate_pct: '', inversion_meta_k: '', revenue_meta_m: '',
  inversion_google_k: '', revenue_google_k: '', inversion_tiktok_k: '',
  revenue_tiktok_k: '', revenue_email_k: '', revenue_total_m: '', notas: ''
}

export default function KPIsPage() {
  const [kpis, setKpis] = useState<KPI[]>([])
  const [form, setForm] = useState<Record<string, string>>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [analisis, setAnalisis] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadKPIs() }, [])

  async function loadKPIs() {
    const r = await fetch('/api/kpis')
    const d = await r.json()
    setKpis(Array.isArray(d) ? d : [])
    if (d[0]) {
      const k = d[0]
      setForm({
        semana: k.semana || DEFAULT_FORM.semana,
        roas_meta: k.roas_meta?.toString() || '', roas_google: k.roas_google?.toString() || '',
        roas_tiktok: k.roas_tiktok?.toString() || '', cpc_cop: k.cpc_cop?.toString() || '',
        ctr_pct: k.ctr_pct?.toString() || '', conversion_rate_pct: k.conversion_rate_pct?.toString() || '',
        inversion_meta_k: k.inversion_meta_k?.toString() || '', revenue_meta_m: k.revenue_meta_m?.toString() || '',
        inversion_google_k: k.inversion_google_k?.toString() || '', revenue_google_k: k.revenue_google_k?.toString() || '',
        inversion_tiktok_k: k.inversion_tiktok_k?.toString() || '', revenue_tiktok_k: k.revenue_tiktok_k?.toString() || '',
        revenue_email_k: k.revenue_email_k?.toString() || '', revenue_total_m: k.revenue_total_m?.toString() || '',
        notas: k.notas || ''
      })
    }
  }

  async function save() {
    setSaving(true)
    const b: Record<string, string | number> = { semana: form.semana }
    const numFields = ['roas_meta','roas_google','roas_tiktok','cpc_cop','ctr_pct','conversion_rate_pct',
      'inversion_meta_k','revenue_meta_m','inversion_google_k','revenue_google_k',
      'inversion_tiktok_k','revenue_tiktok_k','revenue_email_k','revenue_total_m']
    numFields.forEach(f => { if (form[f]) b[f] = parseFloat(form[f]) })
    if (form.notas) b.notas = form.notas
    await fetch('/api/kpis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); loadKPIs()
  }

  async function analizar() {
    setLoading(true); setAnalisis('')
    const prompt = `Analiza los KPIs de Terret y dame recomendaciones concretas.
KPIs: ROAS Meta ${form.roas_meta}x | Google ${form.roas_google}x | TikTok ${form.roas_tiktok}x
CPC $${form.cpc_cop} COP | CTR ${form.ctr_pct}% | Conv ${form.conversion_rate_pct}%
Meta: $${form.inversion_meta_k}K → $${form.revenue_meta_m}M
Google: $${form.inversion_google_k}K → $${form.revenue_google_k}K
TikTok: $${form.inversion_tiktok_k}K → $${form.revenue_tiktok_k}K
Email: $${form.revenue_email_k}K (sin inversión) | Total MTD: $${form.revenue_total_m}M
Dame: 1. DIAGNÓSTICO RÁPIDO (3 bullets). 2. TOP 3 ACCIONES (acción → por qué → métrica). 3. CANAL A ESCALAR. 4. CANAL A PIVOTAR. 5. PROYECCIÓN 30 días.`

    const r = await fetch('/api/claude', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'kpis', messages: [{ role: 'user', content: prompt }] })
    })
    const reader = r.body!.getReader(); const dec = new TextDecoder(); let text = ''
    while (true) { const { done, value } = await reader.read(); if (done) break; text += dec.decode(value); setAnalisis(text) }
    setLoading(false)
  }

  const F = ({ l, f, p }: { l: string; f: string; p: string }) => (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b6a63', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{l}</label>
      <input type="number" step="0.1" value={form[f]} onChange={e => setForm(fm => ({ ...fm, [f]: e.target.value }))} placeholder={p}
        style={{ width: '100%', padding: '8px 12px', border: '1px solid #c0bfb5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
    </div>
  )

  const RC = ({ l, v }: { l: string; v: string }) => {
    const n = parseFloat(v) || 0
    const c = n >= 7 ? '#15803d' : n >= 5 ? '#b45309' : n > 0 ? '#dc2626' : '#9c9a92'
    return (
      <div style={{ background: '#f0efe8', borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#6b6a63', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{l}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>{n ? `${n}x` : '—'}</div>
        <div style={{ height: 4, background: '#e0dfd5', borderRadius: 2, margin: '8px 0 4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min((n / 7) * 100, 100)}%`, background: c, borderRadius: 2 }} />
        </div>
        <div style={{ fontSize: 10, color: c }}>{n === 0 ? '—' : n >= 7 ? '✓ En objetivo' : n >= 5 ? '↗ Sobre mínimo' : '⚠ Bajo mínimo 5x'}</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1a1a18', margin: 0 }}>KPIs y métricas</h1>
        <p style={{ fontSize: 13, color: '#6b6a63', margin: '4px 0 0' }}>Actualiza cada semana — el CMO los usa en análisis y reportes automáticos.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        <RC l="ROAS Meta Ads" v={form.roas_meta} />
        <RC l="ROAS Google" v={form.roas_google} />
        <RC l="ROAS TikTok" v={form.roas_tiktok} />
        <div style={{ background: '#f0efe8', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#6b6a63', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Revenue MTD</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a18' }}>{form.revenue_total_m ? `$${form.revenue_total_m}M` : '—'}</div>
          <div style={{ fontSize: 10, color: '#9c9a92', marginTop: 8 }}>COP</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>Actualizar KPIs</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#6b6a63', textTransform: 'uppercase' }}>Semana</label>
              <input type="date" value={form.semana} onChange={e => setForm(f => ({ ...f, semana: e.target.value }))}
                style={{ padding: '6px 10px', border: '1px solid #c0bfb5', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #f0efe8' }}>ROAS por canal</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <F l="ROAS Meta" f="roas_meta" p="7.3" /><F l="ROAS Google" f="roas_google" p="5.4" /><F l="ROAS TikTok" f="roas_tiktok" p="4.0" />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #f0efe8' }}>Métricas</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <F l="CPC (COP)" f="cpc_cop" p="420" /><F l="CTR (%)" f="ctr_pct" p="2.4" /><F l="Conv. Rate (%)" f="conversion_rate_pct" p="3.1" />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #f0efe8' }}>Inversión y revenue</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <F l="Inv. Meta (K)" f="inversion_meta_k" p="580" /><F l="Rev. Meta (M)" f="revenue_meta_m" p="4.2" />
                <F l="Inv. Google (K)" f="inversion_google_k" p="120" /><F l="Rev. Google (K)" f="revenue_google_k" p="650" />
                <F l="Inv. TikTok (K)" f="inversion_tiktok_k" p="80" /><F l="Rev. TikTok (K)" f="revenue_tiktok_k" p="320" />
                <F l="Rev. Email (K)" f="revenue_email_k" p="410" /><F l="Revenue Total (M)" f="revenue_total_m" p="4.2" />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b6a63', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Notas</label>
              <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Contexto de la semana..." rows={2}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #c0bfb5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}{saved ? '¡Guardado!' : 'Guardar KPIs'}
            </button>
            <button onClick={analizar} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#e6f1fb', color: '#185fa5', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {loading ? <Loader2 size={13} className="animate-spin" /> : <TrendingUp size={13} />}Analizar con IA
            </button>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a18', marginBottom: 12 }}>Historial semanal</div>
          {kpis.length === 0 ? <p style={{ fontSize: 11, color: '#9c9a92' }}>Sin datos aún.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {kpis.slice(0, 8).map((k, i) => (
                <div key={k.id} style={{ padding: 10, borderRadius: 8, border: i === 0 ? '1px solid #185fa5' : '1px solid #f0efe8', background: i === 0 ? '#f0f7ff' : 'transparent' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#9c9a92' }}>
                    {format(new Date(k.semana + 'T12:00:00'), 'd MMM yyyy', { locale: es })}
                    {i === 0 && <span style={{ color: '#185fa5', marginLeft: 4 }}>← actual</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                    {[{ l: 'Meta', v: k.roas_meta }, { l: 'Goog', v: k.roas_google }, { l: 'TT', v: k.roas_tiktok }].map(r => (
                      <div key={r.l}><div style={{ fontSize: 8, color: '#9c9a92' }}>{r.l}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: r.v >= 7 ? '#15803d' : r.v >= 5 ? '#b45309' : '#dc2626' }}>{r.v ? `${r.v}x` : '—'}</div></div>
                    ))}
                    <div style={{ marginLeft: 'auto' }}><div style={{ fontSize: 8, color: '#9c9a92' }}>Revenue</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a18' }}>{k.revenue_total_m ? `$${k.revenue_total_m}M` : '—'}</div></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {(loading || analisis) && (
        <div style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a18', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={13} color="#185fa5" />Análisis del CMO
          </div>
          {loading && !analisis && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#185fa5' }}><Loader2 size={13} className="animate-spin" />Analizando...</div>}
          <div style={{ fontSize: 12, color: '#6b6a63', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{analisis}</div>
        </div>
      )}
    </div>
  )
}
