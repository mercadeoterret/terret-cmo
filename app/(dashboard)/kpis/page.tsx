'use client'
import { useState, useEffect } from 'react'
import { format, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2, Save, TrendingUp, Plus, ChevronDown, ChevronRight } from 'lucide-react'

const DS = {
  bg: '#F2F0EA', surface: '#FFFFFF', border: '#E5E2D9', surface2: '#F7F5F0',
  text: '#1C1B18', textSecondary: '#6B6860', textTertiary: '#9B9890',
  accent: '#E8520A', accentLight: '#FEF0E8',
  success: '#1A7A4A', successLight: '#E8F5EE',
  warning: '#B45309', warningLight: '#FEF3C7',
  danger: '#C91B1B', dangerLight: '#FEE2E2',
  info: '#185FA5', infoLight: '#EBF3FC',
}

// Métricas de contenido por canal/tipo
const CONTENT_METRICS: Record<string, { label: string; metrics: { key: string; label: string; hint: string; unit?: string }[] }> = {
  'Reel': {
    label: 'Reel de Instagram/TikTok',
    metrics: [
      { key: 'views', label: 'Reproducciones', hint: 'Total de veces que se reprodujo el video' },
      { key: 'likes', label: 'Me gustas', hint: 'Total de likes' },
      { key: 'comments', label: 'Comentarios', hint: 'Total de comentarios' },
      { key: 'shares', label: 'Compartidos', hint: 'Veces que se compartió' },
      { key: 'saves', label: 'Guardados', hint: 'Veces que se guardó (Instagram)' },
      { key: 'reach', label: 'Alcance', hint: 'Personas únicas que lo vieron' },
      { key: 'engagement_rate', label: 'Tasa de engagement (%)', hint: '(likes+comments+shares+saves) / reach × 100', unit: '%' },
    ]
  },
  'Carrusel': {
    label: 'Carrusel de Instagram',
    metrics: [
      { key: 'reach', label: 'Alcance', hint: 'Personas únicas que lo vieron' },
      { key: 'likes', label: 'Me gustas', hint: 'Total de likes' },
      { key: 'comments', label: 'Comentarios', hint: 'Total de comentarios' },
      { key: 'saves', label: 'Guardados', hint: 'Veces que se guardó — métrica más importante en carruseles' },
      { key: 'shares', label: 'Compartidos', hint: 'Veces que se compartió' },
      { key: 'swipe_rate', label: 'Tasa de deslizamiento (%)', hint: 'Personas que pasaron a la 2da slide', unit: '%' },
    ]
  },
  'Video UGC': {
    label: 'Video UGC',
    metrics: [
      { key: 'views', label: 'Reproducciones', hint: 'Total de veces que se reprodujo' },
      { key: 'completion_rate', label: 'Tasa de completado (%)', hint: 'Personas que vieron el 75%+ del video', unit: '%' },
      { key: 'likes', label: 'Me gustas', hint: 'Total de likes' },
      { key: 'shares', label: 'Compartidos', hint: 'Veces que se compartió' },
      { key: 'comments', label: 'Comentarios', hint: 'Total de comentarios' },
    ]
  },
  'Email': {
    label: 'Email marketing',
    metrics: [
      { key: 'sent', label: 'Enviados', hint: 'Total de emails enviados' },
      { key: 'open_rate', label: 'Tasa de apertura (%)', hint: 'Porcentaje que abrió el email', unit: '%' },
      { key: 'click_rate', label: 'Tasa de clics (%)', hint: 'Porcentaje que hizo clic en algún enlace', unit: '%' },
      { key: 'revenue', label: 'Revenue generado (COP)', hint: 'Ventas atribuidas al email' },
      { key: 'unsubscribes', label: 'Desuscritos', hint: 'Personas que se dieron de baja' },
    ]
  },
  'Pauta Meta': {
    label: 'Pauta Meta Ads',
    metrics: [
      { key: 'spend', label: 'Inversión (COP)', hint: 'Total gastado en la pauta' },
      { key: 'revenue', label: 'Revenue generado (COP)', hint: 'Ventas atribuidas a esta pauta' },
      { key: 'roas', label: 'ROAS', hint: 'Revenue / Inversión', unit: 'x' },
      { key: 'cpm', label: 'CPM (COP)', hint: 'Costo por mil impresiones' },
      { key: 'ctr', label: 'CTR (%)', hint: 'Tasa de clics sobre impresiones', unit: '%' },
      { key: 'cpc', label: 'CPC (COP)', hint: 'Costo por clic' },
      { key: 'purchases', label: 'Compras', hint: 'Número de compras atribuidas' },
    ]
  },
  'Estado WhatsApp': {
    label: 'Estado de WhatsApp',
    metrics: [
      { key: 'views', label: 'Visualizaciones', hint: 'Total de personas que vieron el estado' },
      { key: 'replies', label: 'Respuestas', hint: 'Personas que respondieron al estado' },
      { key: 'link_clicks', label: 'Clics en enlace', hint: 'Si el estado tenía un enlace' },
    ]
  },
}

// Semáforos por métrica
function getSemaforo(key: string, value: number): { color: string; bg: string; label: string } {
  const benchmarks: Record<string, { green: number; yellow: number }> = {
    engagement_rate: { green: 5, yellow: 2 },
    open_rate: { green: 25, yellow: 15 },
    click_rate: { green: 3, yellow: 1 },
    completion_rate: { green: 50, yellow: 25 },
    swipe_rate: { green: 40, yellow: 20 },
    ctr: { green: 2, yellow: 1 },
    roas: { green: 7, yellow: 5 },
  }
  const bench = benchmarks[key]
  if (!bench) return { color: DS.textTertiary, bg: DS.bg, label: '—' }
  if (value >= bench.green) return { color: DS.success, bg: DS.successLight, label: '✓ Bueno' }
  if (value >= bench.yellow) return { color: DS.warning, bg: DS.warningLight, label: '↗ Regular' }
  return { color: DS.danger, bg: DS.dangerLight, label: '⚠ Bajo' }
}

export default function KPIsPage() {
  const [form, setForm] = useState<Record<string, string>>({
    semana: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    roas_meta: '', roas_google: '', roas_tiktok: '', cpc_cop: '', ctr_pct: '',
    conversion_rate_pct: '', inversion_meta_k: '', revenue_meta_m: '',
    inversion_google_k: '', revenue_google_k: '', inversion_tiktok_k: '',
    revenue_tiktok_k: '', revenue_email_k: '', revenue_total_m: '', notas: ''
  })
  const [kpis, setKpis] = useState<Record<string, unknown>[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [analisis, setAnalisis] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'pauta' | 'contenido'>('pauta')
  const [selectedTipoContenido, setSelectedTipoContenido] = useState('Reel')
  const [contentMetrics, setContentMetrics] = useState<Record<string, string>>({})
  const [contentAnalisis, setContentAnalisis] = useState('')
  const [loadingContent, setLoadingContent] = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)

  useEffect(() => {
    fetch('/api/kpis').then(r => r.json()).then(d => {
      if (!Array.isArray(d)) return
      setKpis(d)
      if (d[0]) {
        const k = d[0] as Record<string, unknown>
        setForm({
          semana: (k.semana as string) || form.semana,
          roas_meta: (k.roas_meta as number)?.toString() || '',
          roas_google: (k.roas_google as number)?.toString() || '',
          roas_tiktok: (k.roas_tiktok as number)?.toString() || '',
          cpc_cop: (k.cpc_cop as number)?.toString() || '',
          ctr_pct: (k.ctr_pct as number)?.toString() || '',
          conversion_rate_pct: (k.conversion_rate_pct as number)?.toString() || '',
          inversion_meta_k: (k.inversion_meta_k as number)?.toString() || '',
          revenue_meta_m: (k.revenue_meta_m as number)?.toString() || '',
          inversion_google_k: (k.inversion_google_k as number)?.toString() || '',
          revenue_google_k: (k.revenue_google_k as number)?.toString() || '',
          inversion_tiktok_k: (k.inversion_tiktok_k as number)?.toString() || '',
          revenue_tiktok_k: (k.revenue_tiktok_k as number)?.toString() || '',
          revenue_email_k: (k.revenue_email_k as number)?.toString() || '',
          revenue_total_m: (k.revenue_total_m as number)?.toString() || '',
          notas: (k.notas as string) || ''
        })
      }
    })
  }, [])

  async function save() {
    setSaving(true)
    const b: Record<string, string | number> = { semana: form.semana }
    ;['roas_meta', 'roas_google', 'roas_tiktok', 'cpc_cop', 'ctr_pct', 'conversion_rate_pct',
      'inversion_meta_k', 'revenue_meta_m', 'inversion_google_k', 'revenue_google_k',
      'inversion_tiktok_k', 'revenue_tiktok_k', 'revenue_email_k', 'revenue_total_m'].forEach(f => {
      if (form[f]) b[f] = parseFloat(form[f])
    })
    if (form.notas) b.notas = form.notas
    await fetch('/api/kpis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  async function analizar() {
    setLoading(true); setAnalisis('')
    const p = `Analiza los KPIs de Terret esta semana:\nROAS Meta ${form.roas_meta}x | Google ${form.roas_google}x | TikTok ${form.roas_tiktok}x\nCPC $${form.cpc_cop} COP | CTR ${form.ctr_pct}% | Conv ${form.conversion_rate_pct}%\nMeta: $${form.inversion_meta_k}K invertido → $${form.revenue_meta_m}M revenue\nGoogle: $${form.inversion_google_k}K → $${form.revenue_google_k}K\nTikTok: $${form.inversion_tiktok_k}K → $${form.revenue_tiktok_k}K\nEmail: $${form.revenue_email_k}K | Total MTD: $${form.revenue_total_m}M\n\nDame:\n1. DIAGNÓSTICO (3 bullets concisos)\n2. TOP 3 ACCIONES esta semana\n3. CANAL A ESCALAR\n4. CANAL A PAUSAR O PIVOTAR`
    const r = await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'kpis', messages: [{ role: 'user', content: p }] }) })
    const reader = r.body!.getReader(); const dec = new TextDecoder(); let text = ''
    while (true) { const { done, value } = await reader.read(); if (done) break; text += dec.decode(value); setAnalisis(text) }
    setLoading(false)
  }

  async function analizarContenido() {
    setLoadingContent(true); setContentAnalisis('')
    const tipo = CONTENT_METRICS[selectedTipoContenido]
    const metricsText = tipo.metrics.map(m => `${m.label}: ${contentMetrics[m.key] || '—'}${m.unit || ''}`).join('\n')
    const p = `Analiza las métricas de este contenido de Terret:\nTipo: ${selectedTipoContenido}\n${metricsText}\n\nDame:\n1. DIAGNÓSTICO: ¿funcionó bien o mal? ¿por qué?\n2. QUÉ REPETIR en el próximo contenido similar\n3. QUÉ CAMBIAR\n4. BENCHMARK: compara con promedios de la industria para este tipo de contenido en Colombia`
    const r = await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'kpis', messages: [{ role: 'user', content: p }] }) })
    const reader = r.body!.getReader(); const dec = new TextDecoder(); let text = ''
    while (true) { const { done, value } = await reader.read(); if (done) break; text += dec.decode(value); setContentAnalisis(text) }
    setLoadingContent(false)
  }

  const roasColor = (v: number) => v >= 7 ? DS.success : v >= 5 ? DS.warning : v > 0 ? DS.danger : DS.textTertiary
  const roasBg = (v: number) => v >= 7 ? DS.successLight : v >= 5 ? DS.warningLight : v > 0 ? DS.dangerLight : DS.bg
  const roasLabel = (v: number) => v >= 7 ? '✓ En objetivo' : v >= 5 ? '↗ Sobre mínimo' : v > 0 ? '⚠ Bajo mínimo 5x' : '—'

  const lbl: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, color: DS.textTertiary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }
  const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', border: `1px solid ${DS.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: DS.surface, color: DS.text }

  const tipoActual = CONTENT_METRICS[selectedTipoContenido]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: DS.text, margin: 0, letterSpacing: '-0.5px' }}>KPIs y métricas</h1>
        <p style={{ fontSize: 13, color: DS.textSecondary, margin: '4px 0 0' }}>Actualiza cada semana. El CMO los usa en análisis y reportes.</p>
      </div>

      {/* Semáforos ROAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { l: 'ROAS Meta Ads', v: parseFloat(form.roas_meta) || 0 },
          { l: 'ROAS Google', v: parseFloat(form.roas_google) || 0 },
          { l: 'ROAS TikTok', v: parseFloat(form.roas_tiktok) || 0 },
          { l: 'Revenue MTD', v: parseFloat(form.revenue_total_m) || 0, isMoney: true },
        ].map(({ l, v, isMoney }) => (
          <div key={l} style={{ background: !isMoney && v ? roasBg(v) : DS.surface, border: `1px solid ${DS.border}`, borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: DS.textTertiary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>{l}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: !isMoney && v ? roasColor(v) : DS.text, letterSpacing: '-1px' }}>
              {v ? (isMoney ? `$${v}M` : `${v}x`) : '—'}
            </div>
            {!isMoney && v > 0 && (
              <>
                <div style={{ height: 3, background: 'rgba(0,0,0,0.08)', borderRadius: 2, margin: '10px 0 6px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min((v / 10) * 100, 100)}%`, background: roasColor(v), borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 10, color: roasColor(v), fontWeight: 700 }}>{roasLabel(v)}</div>
              </>
            )}
            {isMoney && <div style={{ fontSize: 10, color: DS.textTertiary, marginTop: 6 }}>COP</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[{ id: 'pauta', label: '📊 KPIs de pauta' }, { id: 'contenido', label: '📱 Métricas de contenido' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as 'pauta' | 'contenido')}
            style={{ padding: '8px 16px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: activeTab === tab.id ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', background: activeTab === tab.id ? DS.text : 'transparent', color: activeTab === tab.id ? '#fff' : DS.textSecondary }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'pauta' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 14, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: DS.text }}>Actualizar KPIs</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ ...lbl, margin: 0 }}>Semana</label>
                <input type="date" value={form.semana} onChange={e => setForm(f => ({ ...f, semana: e.target.value }))}
                  style={{ padding: '6px 10px', border: `1px solid ${DS.border}`, borderRadius: 8, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: DS.surface }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { title: 'ROAS por canal', fields: [{ l: 'ROAS Meta', f: 'roas_meta', p: '7.3' }, { l: 'ROAS Google', f: 'roas_google', p: '5.4' }, { l: 'ROAS TikTok', f: 'roas_tiktok', p: '4.0' }] },
                { title: 'Métricas generales', fields: [{ l: 'CPC (COP)', f: 'cpc_cop', p: '420' }, { l: 'CTR (%)', f: 'ctr_pct', p: '2.4' }, { l: 'Conv. Rate (%)', f: 'conversion_rate_pct', p: '3.1' }] },
                { title: 'Inversión y revenue', fields: [{ l: 'Inv. Meta (K COP)', f: 'inversion_meta_k', p: '580' }, { l: 'Rev. Meta (M COP)', f: 'revenue_meta_m', p: '4.2' }, { l: 'Inv. Google (K)', f: 'inversion_google_k', p: '120' }, { l: 'Rev. Google (K)', f: 'revenue_google_k', p: '650' }, { l: 'Inv. TikTok (K)', f: 'inversion_tiktok_k', p: '80' }, { l: 'Rev. TikTok (K)', f: 'revenue_tiktok_k', p: '320' }, { l: 'Rev. Email (K)', f: 'revenue_email_k', p: '410' }, { l: 'Revenue Total (M)', f: 'revenue_total_m', p: '4.2' }] },
              ].map(section => (
                <div key={section.title}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: DS.textTertiary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${DS.border}` }}>{section.title}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: section.fields.length === 2 ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10 }}>
                    {section.fields.map(f => (
                      <div key={f.f}>
                        <label style={lbl}>{f.l}</label>
                        <input type="number" step="0.1" value={form[f.f]} onChange={e => setForm(fm => ({ ...fm, [f.f]: e.target.value }))} placeholder={f.p} style={inp} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <label style={lbl}>Notas de la semana</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Contexto relevante de la semana..." rows={2}
                  style={{ ...inp, resize: 'none' as const }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={save} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: DS.text, color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saved ? '¡Guardado!' : 'Guardar'}
              </button>
              <button onClick={analizar} disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: DS.infoLight, color: DS.info, border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {loading ? <Loader2 size={13} className="animate-spin" /> : <TrendingUp size={13} />}
                Analizar con CMO
              </button>
            </div>

            {(loading || analisis) && (
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${DS.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: DS.text, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={13} color={DS.info} /> Análisis del CMO
                </div>
                {loading && !analisis && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: DS.info }}><Loader2 size={13} className="animate-spin" />Analizando...</div>}
                <div style={{ fontSize: 13, color: DS.textSecondary, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{analisis}</div>
              </div>
            )}
          </div>

          {/* Historial */}
          <div style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: DS.text, marginBottom: 14 }}>Historial</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {kpis.slice(0, 8).map((k, i) => {
                const kk = k as Record<string, unknown>
                return (
                  <div key={i} style={{ padding: '12px 14px', borderRadius: 10, border: `1px solid ${i === 0 ? DS.info : DS.border}`, background: i === 0 ? DS.infoLight : DS.bg }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? DS.info : DS.textTertiary, marginBottom: 8 }}>
                      {format(new Date((kk.semana as string) + 'T12:00:00'), "d 'de' MMM yyyy", { locale: es })}
                      {i === 0 && <span style={{ marginLeft: 6, fontSize: 9 }}>← actual</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {[{ l: 'Meta', v: kk.roas_meta as number }, { l: 'Google', v: kk.roas_google as number }, { l: 'TikTok', v: kk.roas_tiktok as number }].map(r => (
                        <div key={r.l}>
                          <div style={{ fontSize: 9, color: DS.textTertiary }}>{r.l}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: r.v >= 7 ? DS.success : r.v >= 5 ? DS.warning : r.v > 0 ? DS.danger : DS.textTertiary }}>{r.v ? `${r.v}x` : '—'}</div>
                        </div>
                      ))}
                      <div style={{ marginLeft: 'auto' }}>
                        <div style={{ fontSize: 9, color: DS.textTertiary }}>Revenue</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: DS.text }}>{kk.revenue_total_m ? `$${kk.revenue_total_m}M` : '—'}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'contenido' && (
        <div style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 14, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: DS.text, marginBottom: 6 }}>Métricas por tipo de contenido</div>
          <div style={{ fontSize: 12, color: DS.textSecondary, marginBottom: 20 }}>Ingresa las métricas de un contenido publicado para analizarlo con el CMO.</div>

          {/* Selector de tipo */}
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Tipo de contenido</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.keys(CONTENT_METRICS).map(tipo => (
                <button key={tipo} onClick={() => { setSelectedTipoContenido(tipo); setContentMetrics({}); setContentAnalisis('') }}
                  style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${selectedTipoContenido === tipo ? DS.accent : DS.border}`, background: selectedTipoContenido === tipo ? DS.accentLight : DS.bg, color: selectedTipoContenido === tipo ? DS.accent : DS.textSecondary, fontSize: 12, fontWeight: selectedTipoContenido === tipo ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          {/* Campos de métricas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {tipoActual.metrics.map(metric => {
              const v = parseFloat(contentMetrics[metric.key] || '0')
              const sem = getSemaforo(metric.key, v)
              const hasBenchmark = v > 0 && sem.label !== '—'
              return (
                <div key={metric.key} style={{ background: hasBenchmark ? sem.bg : DS.bg, borderRadius: 10, padding: '14px 16px', border: `1px solid ${DS.border}` }}>
                  <label style={{ ...lbl, color: hasBenchmark ? sem.color : DS.textTertiary }}>{metric.label}</label>
                  <input type="number" step="0.1" value={contentMetrics[metric.key] || ''}
                    onChange={e => setContentMetrics(m => ({ ...m, [metric.key]: e.target.value }))}
                    placeholder="0"
                    style={{ ...inp, background: 'transparent', border: `1px solid ${hasBenchmark ? sem.color + '40' : DS.border}` }} />
                  <div style={{ fontSize: 10, color: DS.textTertiary, marginTop: 6 }}>{metric.hint}</div>
                  {hasBenchmark && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: sem.color, marginTop: 4 }}>{sem.label}</div>
                  )}
                </div>
              )
            })}
          </div>

          <button onClick={analizarContenido} disabled={loadingContent || Object.keys(contentMetrics).length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: DS.text, color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20 }}>
            {loadingContent ? <Loader2 size={13} className="animate-spin" /> : <TrendingUp size={13} />}
            Analizar con CMO
          </button>

          {(loadingContent || contentAnalisis) && (
            <div style={{ paddingTop: 20, borderTop: `1px solid ${DS.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: DS.text, marginBottom: 10 }}>Análisis del CMO</div>
              {loadingContent && !contentAnalisis && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: DS.info }}><Loader2 size={13} className="animate-spin" />Analizando...</div>}
              <div style={{ fontSize: 13, color: DS.textSecondary, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{contentAnalisis}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
