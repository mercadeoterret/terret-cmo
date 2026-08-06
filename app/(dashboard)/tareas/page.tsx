'use client'
import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, Filter, X, Loader2, TrendingUp, Copy } from 'lucide-react'

const DS = {
  bg: '#F2F0EA', surface: '#FFFFFF', border: '#E5E2D9', surface2: '#F7F5F0',
  text: '#1C1B18', textSecondary: '#6B6860', textTertiary: '#9B9890',
  accent: '#E8520A', accentLight: '#FEF0E8',
  success: '#1A7A4A', successLight: '#E8F5EE',
  warning: '#B45309', warningLight: '#FEF3C7',
  danger: '#C91B1B', dangerLight: '#FEE2E2',
  info: '#185FA5', infoLight: '#EBF3FC',
}

interface Tarea {
  id: string; fecha: string; titulo: string; canal: string; tipo_contenido: string
  copy_exacto: string; guion: string; musica_sugerida: string; referencia_visual: string
  responsable: string; estado: string; color: string; campana_id: string
  campanas?: { nombre: string }
  metricas?: Record<string, number>
}

const ESTADOS = [
  { id: 'pendiente', label: 'Pendiente', color: DS.textSecondary, bg: DS.bg },
  { id: 'en_progreso', label: 'En progreso', color: DS.warning, bg: DS.warningLight },
  { id: 'en_revision', label: 'En revisión', color: DS.info, bg: DS.infoLight },
  { id: 'publicado', label: 'Publicado', color: DS.success, bg: DS.successLight },
]

const CANAL_ICON: Record<string, string> = {
  'Instagram': '📸', 'Instagram orgánico': '📸', 'TikTok': '🎵', 'TikTok orgánico': '🎵',
  'Meta Ads': '💰', 'Google Ads': '🔍', 'Email': '📧', 'Email marketing': '📧',
  'WhatsApp': '💬', 'WhatsApp / estados': '💬', 'Influencers / UGC': '🎬',
  'Shopify Email': '📧',
}

const CONTENT_METRICS: Record<string, { label: string; hint: string; unit?: string; benchmarkGreen?: number; benchmarkYellow?: number }[]> = {
  'Reel': [
    { label: 'Reproducciones', hint: 'Total vistas del video' },
    { label: 'Me gustas', hint: 'Total likes' },
    { label: 'Comentarios', hint: 'Total comentarios' },
    { label: 'Compartidos', hint: 'Veces compartido' },
    { label: 'Guardados', hint: 'Veces guardado' },
    { label: 'Alcance', hint: 'Personas únicas que lo vieron' },
  ],
  'Carrusel': [
    { label: 'Alcance', hint: 'Personas únicas que lo vieron' },
    { label: 'Me gustas', hint: 'Total likes' },
    { label: 'Guardados', hint: 'Métrica más importante en carruseles' },
    { label: 'Compartidos', hint: 'Veces compartido' },
    { label: 'Comentarios', hint: 'Total comentarios' },

  ],
  'Story': [
    { label: 'Vistas', hint: 'Total visualizaciones' },
    { label: 'Respuestas', hint: 'DMs recibidos por la story' },
    { label: 'Clics en enlace', hint: 'Si tenía link o sticker' },
    { label: 'Salidas', hint: 'Personas que salieron al ver la story' },

  ],
  'Video UGC': [
    { label: 'Reproducciones', hint: 'Total vistas' },
    { label: 'Tasa completado (%)', hint: '% que vio el 75%+ del video', unit: '%', benchmarkGreen: 50, benchmarkYellow: 25 },
    { label: 'Me gustas', hint: 'Total likes' },
    { label: 'Compartidos', hint: 'Veces compartido' },
    { label: 'Comentarios', hint: 'Total comentarios' },
  ],
  'Email': [
    { label: 'Enviados', hint: 'Total emails enviados' },
    { label: 'Tasa apertura (%)', hint: '% que abrió el email', unit: '%', benchmarkGreen: 25, benchmarkYellow: 15 },
    { label: 'Tasa clics (%)', hint: '% que hizo clic', unit: '%', benchmarkGreen: 3, benchmarkYellow: 1 },
    { label: 'Revenue (COP)', hint: 'Ventas atribuidas al email' },
    { label: 'Desuscritos', hint: 'Personas que se dieron de baja' },
  ],
  'Pauta Meta': [
    { label: 'Inversión (COP)', hint: 'Total gastado' },
    { label: 'Revenue (COP)', hint: 'Ventas atribuidas' },
    { label: 'ROAS', hint: 'Revenue / Inversión', unit: 'x', benchmarkGreen: 7, benchmarkYellow: 5 },
    { label: 'CPM (COP)', hint: 'Costo por mil impresiones' },
    { label: 'CTR (%)', hint: 'Tasa de clics', unit: '%', benchmarkGreen: 2, benchmarkYellow: 1 },
    { label: 'Compras', hint: 'Número de compras' },
  ],
  'Estado WhatsApp': [
    { label: 'Visualizaciones', hint: 'Total personas que vieron el estado' },
    { label: 'Respuestas', hint: 'Personas que respondieron' },
    { label: 'Clics en enlace', hint: 'Si tenía enlace' },
  ],
}

function getMetricasParaTipo(tipoContenido: string): typeof CONTENT_METRICS[string] {
  const key = Object.keys(CONTENT_METRICS).find(k =>
    tipoContenido?.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(tipoContenido?.toLowerCase())
  )
  return key ? CONTENT_METRICS[key] : CONTENT_METRICS['Reel']
}

function calcularMetricasAuto(form: Record<string, string>): Record<string, { valor: number; label: string; benchmarkGreen?: number; benchmarkYellow?: number }> {
  const n = (k: string) => parseFloat(form[k] || '0') || 0
  const auto: Record<string, { valor: number; label: string; benchmarkGreen?: number; benchmarkYellow?: number }> = {}

  // Engagement rate (Reel / Carrusel / Story)
  const likes = n('Me gustas')
  const comments = n('Comentarios')
  const shares = n('Compartidos')
  const saves = n('Guardados')
  const reach = n('Alcance')
  if (reach > 0 && (likes + comments + shares + saves) > 0) {
    auto['Engagement (%)'] = {
      valor: ((likes + comments + shares + saves) / reach) * 100,
      label: 'Engagement rate',
      benchmarkGreen: 5, benchmarkYellow: 2
    }
  }

  // Tasa de retención Story
  const vistas = n('Vistas')
  const salidas = n('Salidas')
  if (vistas > 0 && salidas > 0) {
    auto['Retención (%)'] = {
      valor: ((vistas - salidas) / vistas) * 100,
      label: 'Tasa de retención',
      benchmarkGreen: 70, benchmarkYellow: 50
    }
  }

  // ROAS Pauta Meta
  const inversion = n('Inversión (COP)')
  const revenue = n('Revenue (COP)')
  if (inversion > 0 && revenue > 0) {
    auto['ROAS calculado'] = {
      valor: revenue / inversion,
      label: 'ROAS',
      benchmarkGreen: 7, benchmarkYellow: 5
    }
  }

  // Tasa de apertura Email (si no se ingresó)
  const enviados = n('Enviados')
  const aperturas = n('Aperturas')
  if (enviados > 0 && aperturas > 0 && !form['Tasa apertura (%)']) {
    auto['Tasa apertura calculada (%)'] = {
      valor: (aperturas / enviados) * 100,
      label: 'Tasa de apertura',
      benchmarkGreen: 25, benchmarkYellow: 15
    }
  }

  return auto
}

function Semaforo({ value, benchmarkGreen, benchmarkYellow }: { value: number; benchmarkGreen?: number; benchmarkYellow?: number }) {
  if (!benchmarkGreen || !value) return null
  const ok = value >= benchmarkGreen
  const warn = value >= (benchmarkYellow || 0)
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
      background: ok ? DS.successLight : warn ? DS.warningLight : DS.dangerLight,
      color: ok ? DS.success : warn ? DS.warning : DS.danger,
    }}>
      {ok ? '✓ Bueno' : warn ? '↗ Regular' : '⚠ Bajo'}
    </span>
  )
}

export default function TareasPage() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroResponsable, setFiltroResponsable] = useState('todos')
  const [filtroCanal, setFiltroCanal] = useState('todos')
  const [filtroCampana, setFiltroCampana] = useState('todos')
  const [campanas, setCampanas] = useState<{ id: string; nombre: string }[]>([])
  const [selectedTarea, setSelectedTarea] = useState<Tarea | null>(null)
  const [modalTab, setModalTab] = useState<'brief' | 'metricas' | 'analisis'>('brief')
  const [view, setView] = useState<'lista' | 'kanban'>('lista')
  const [metricasForm, setMetricasForm] = useState<Record<string, string>>({})
  const [savingMetricas, setSavingMetricas] = useState(false)
  const [analisis, setAnalisis] = useState('')
  const [loadingAnalisis, setLoadingAnalisis] = useState(false)

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  const loadTareas = useCallback(async () => {
    setLoading(true)
    const from = new Date(today); from.setDate(from.getDate() - 30)
    const to = new Date(today); to.setDate(to.getDate() + 60)
    const r = await fetch(`/api/tareas?from=${format(from, 'yyyy-MM-dd')}&to=${format(to, 'yyyy-MM-dd')}`)
    const d = await r.json()
    setTareas(Array.isArray(d) ? d : [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch('/api/campanas').then(r => r.json()).then(d => setCampanas(Array.isArray(d) ? d : []))
  }, [])

  useEffect(() => { loadTareas() }, [loadTareas])

  async function cambiarEstado(id: string, estado: string) {
    await fetch('/api/tareas', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado, completado: estado === 'publicado' })
    })
    setTareas(prev => prev.map(t => t.id === id ? { ...t, estado } : t))
    if (selectedTarea?.id === id) setSelectedTarea(prev => prev ? { ...prev, estado } : null)
  }

  async function guardarMetricas() {
    if (!selectedTarea) return
    setSavingMetricas(true)
    const metricas: Record<string, number> = {}
    Object.entries(metricasForm).forEach(([k, v]) => { if (v) metricas[k] = parseFloat(v) })
    // Agregar métricas calculadas automáticamente
    const auto = calcularMetricasAuto(metricasForm)
    Object.entries(auto).forEach(([k, m]) => { metricas[k] = parseFloat(m.valor.toFixed(2)) })
    await fetch('/api/tareas', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedTarea.id, metricas })
    })
    setTareas(prev => prev.map(t => t.id === selectedTarea.id ? { ...t, metricas } : t))
    setSelectedTarea(prev => prev ? { ...prev, metricas } : null)
    setSavingMetricas(false)
  }

  async function analizarContenido() {
    if (!selectedTarea) return
    setLoadingAnalisis(true)
    setAnalisis('')
    const metricas = selectedTarea.metricas || {}
    const metricasDef = getMetricasParaTipo(selectedTarea.tipo_contenido)
    const metricasText = metricasDef.map(m => `${m.label}: ${metricas[m.label] || '—'}${m.unit || ''}`).join('\n')

    const prompt = `Analiza este contenido publicado de Terret (marca colombiana de accesorios para running):

Pieza: ${selectedTarea.titulo}
Canal: ${selectedTarea.canal}
Tipo: ${selectedTarea.tipo_contenido}
Fecha: ${selectedTarea.fecha}
Campaña: ${selectedTarea.campanas?.nombre || '—'}

MÉTRICAS REALES:
${metricasText}

Dame:
1. DIAGNÓSTICO: ¿funcionó bien o mal? ¿por qué? (compara con benchmarks del sector)
2. QUÉ FUNCIONÓ: elementos a repetir
3. QUÉ MEJORAR: cambios concretos para el próximo contenido similar
4. DECISIÓN: ¿repetir este formato/canal? ¿escalar presupuesto? ¿pausar?
5. APRENDIZAJE: una sola frase que resume el insight más importante

Sé directo y accionable. No des contexto genérico.`

    const res = await fetch('/api/claude', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'campana', messages: [{ role: 'user', content: prompt }] })
    })
    const reader = res.body!.getReader()
    const dec = new TextDecoder()
    let text = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      text += dec.decode(value)
      setAnalisis(text)
    }
    setLoadingAnalisis(false)
  }

  function abrirTarea(t: Tarea) {
    setSelectedTarea(t)
    setModalTab('brief')
    setMetricasForm(
      Object.fromEntries(
        Object.entries(t.metricas || {}).map(([k, v]) => [k, String(v)])
      )
    )
    setAnalisis('')
  }

  const tareasFiltradas = tareas.filter(t => {
    if (filtroEstado !== 'todos' && t.estado !== filtroEstado) return false
    if (filtroResponsable !== 'todos' && t.responsable !== filtroResponsable) return false
    if (filtroCanal !== 'todos' && t.canal !== filtroCanal) return false
    if (filtroCampana !== 'todos' && t.campana_id !== filtroCampana) return false
    return true
  })

  const porEstado = ESTADOS.reduce((acc, e) => {
    acc[e.id] = tareasFiltradas.filter(t => t.estado === e.id)
    return acc
  }, {} as Record<string, Tarea[]>)

  const vencidas = tareas.filter(t => t.fecha < todayStr && t.estado === 'pendiente').length
  const hoy = tareas.filter(t => t.fecha === todayStr && t.estado !== 'publicado').length
  const esta_semana = tareas.filter(t => {
    const d = new Date(t.fecha + 'T12:00:00')
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff >= 0 && diff <= 7 && t.estado !== 'publicado'
  }).length

  const TareaCard = ({ t, compact = false }: { t: Tarea; compact?: boolean }) => {
    const vencida = t.fecha < todayStr && t.estado === 'pendiente'
    const esHoy = t.fecha === todayStr
    const tieneMetricas = t.metricas && Object.keys(t.metricas).length > 0

    return (
      <div onClick={() => abrirTarea(t)} style={{
        background: DS.surface,
        border: `1px solid ${vencida ? '#FCA5A5' : esHoy ? '#FDE68A' : DS.border}`,
        borderLeft: `3px solid ${t.color || DS.info}`,
        borderRadius: 10, padding: compact ? '10px 14px' : '14px 16px',
        cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{CANAL_ICON[t.canal] || '📌'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: DS.textTertiary, textTransform: 'uppercase' }}>{t.canal}</span>
              {t.tipo_contenido && <span style={{ fontSize: 10, color: DS.textTertiary }}>· {t.tipo_contenido}</span>}
              {(() => {
                const e = ESTADOS.find(x => x.id === t.estado) || ESTADOS[0]
                return <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, fontWeight: 700, background: e.bg, color: e.color }}>{e.label}</span>
              })()}
              {vencida && <span style={{ fontSize: 9, fontWeight: 700, color: DS.danger, background: DS.dangerLight, padding: '2px 6px', borderRadius: 20 }}>⚠ Vencida</span>}
              {esHoy && t.estado !== 'publicado' && <span style={{ fontSize: 9, fontWeight: 700, color: DS.warning, background: DS.warningLight, padding: '2px 6px', borderRadius: 20 }}>📌 Hoy</span>}
              {tieneMetricas && <span style={{ fontSize: 9, fontWeight: 700, color: DS.success, background: DS.successLight, padding: '2px 6px', borderRadius: 20 }}>📊 Con métricas</span>}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: DS.text, marginBottom: compact ? 0 : 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: compact ? 'nowrap' : 'normal' }}>
              {t.titulo}
            </div>
            {!compact && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <span style={{ fontSize: 11, color: DS.textTertiary }}>
                  {format(new Date(t.fecha + 'T12:00:00'), "d 'de' MMMM", { locale: es })}
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: t.responsable === 'Creadora' ? '#F3E8FF' : DS.infoLight, color: t.responsable === 'Creadora' ? '#7C3AED' : DS.info }}>
                  {t.responsable}
                </span>
                {t.campanas?.nombre && <span style={{ fontSize: 10, color: DS.textTertiary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📣 {t.campanas.nombre}</span>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            {t.estado !== 'publicado' ? (
              <button onClick={() => cambiarEstado(t.id, t.estado === 'pendiente' ? 'en_progreso' : t.estado === 'en_progreso' ? 'en_revision' : 'publicado')}
                style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', background: t.estado === 'en_revision' ? DS.successLight : DS.bg, color: t.estado === 'en_revision' ? DS.success : DS.text }}>
                {t.estado === 'pendiente' ? '▶ Iniciar' : t.estado === 'en_progreso' ? '👁 Revisar' : '✓ Publicar'}
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: DS.success, fontWeight: 700 }}>
                <Check size={12} /> Publicado
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const metricasDef = selectedTarea ? getMetricasParaTipo(selectedTarea.tipo_contenido) : []

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: DS.text, margin: 0, letterSpacing: '-0.5px' }}>Tareas</h1>
        <p style={{ fontSize: 13, color: DS.textSecondary, margin: '4px 0 0' }}>Todo lo que hay que publicar, con el copy y brief listos.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Vencidas', value: vencidas, color: DS.danger, bg: DS.dangerLight, emoji: '⚠️' },
          { label: 'Para hoy', value: hoy, color: DS.warning, bg: DS.warningLight, emoji: '📌' },
          { label: 'Esta semana', value: esta_semana, color: DS.info, bg: DS.infoLight, emoji: '📅' },
          { label: 'Total pendientes', value: tareas.filter(t => t.estado !== 'publicado').length, color: DS.textSecondary, bg: DS.bg, emoji: '📋' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}30`, borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>{s.emoji} {s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.value > 0 && s.label === 'Vencidas' ? DS.danger : DS.text, letterSpacing: '-1px' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Filter size={13} color={DS.textTertiary} />
        {[
          { value: filtroEstado, onChange: setFiltroEstado, options: [['todos', 'Todos los estados'], ...ESTADOS.map(e => [e.id, e.label])] },
          { value: filtroResponsable, onChange: setFiltroResponsable, options: [['todos', 'Todos los responsables'], ['David', 'David'], ['Creadora', 'Creadora'], ['Comité', 'Comité']] },
          { value: filtroCampana, onChange: setFiltroCampana, options: [['todos', 'Todas las campañas'], ...campanas.map(c => [c.id, c.nombre])] },
          { value: filtroCanal, onChange: setFiltroCanal, options: [['todos', 'Todos los canales'], ...['Instagram orgánico', 'TikTok orgánico', 'Meta Ads', 'Email marketing', 'WhatsApp / estados', 'Google Ads'].map(c => [c, c])] },
        ].map((f, i) => (
          <select key={i} value={f.value} onChange={e => f.onChange(e.target.value)}
            style={{ padding: '7px 10px', border: `1px solid ${DS.border}`, borderRadius: 8, fontSize: 12, fontFamily: 'inherit', color: DS.text, background: DS.surface, outline: 'none' }}>
            {f.options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        ))}

        {(filtroEstado !== 'todos' || filtroResponsable !== 'todos' || filtroCanal !== 'todos' || filtroCampana !== 'todos') && (
          <button onClick={() => { setFiltroEstado('todos'); setFiltroResponsable('todos'); setFiltroCanal('todos'); setFiltroCampana('todos') }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', border: `1px solid ${DS.border}`, borderRadius: 8, fontSize: 12, background: DS.surface, color: DS.textSecondary, cursor: 'pointer', fontFamily: 'inherit' }}>
            <X size={12} /> Limpiar
          </button>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: DS.textTertiary }}>{tareasFiltradas.length} tareas</span>
          {['lista', 'kanban'].map(v => (
            <button key={v} onClick={() => setView(v as 'lista' | 'kanban')}
              style={{ padding: '7px 12px', border: `1px solid ${DS.border}`, borderRadius: 8, fontSize: 12, fontWeight: view === v ? 700 : 400, background: view === v ? DS.text : DS.surface, color: view === v ? '#fff' : DS.textSecondary, cursor: 'pointer', fontFamily: 'inherit' }}>
              {v === 'lista' ? '☰' : '⊞'}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: DS.textTertiary, fontSize: 13 }}>Cargando tareas...</div>
      ) : tareasFiltradas.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', background: DS.surface, borderRadius: 14, border: `1px solid ${DS.border}` }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: DS.text, marginBottom: 6 }}>Sin tareas con estos filtros</div>
          <div style={{ fontSize: 13, color: DS.textTertiary }}>Ajusta los filtros o crea una nueva campaña.</div>
        </div>
      ) : view === 'lista' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tareasFiltradas.sort((a, b) => {
            const aVenc = a.fecha < todayStr && a.estado === 'pendiente'
            const bVenc = b.fecha < todayStr && b.estado === 'pendiente'
            if (aVenc && !bVenc) return -1
            if (!aVenc && bVenc) return 1
            return a.fecha.localeCompare(b.fecha)
          }).map(t => <TareaCard key={t.id} t={t} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, alignItems: 'start' }}>
          {ESTADOS.map(estado => (
            <div key={estado.id}>
              <div style={{ padding: '8px 12px', background: estado.bg, borderRadius: 8, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: estado.color }}>{estado.label}</span>
                <span style={{ fontSize: 11, color: estado.color, fontWeight: 700 }}>{porEstado[estado.id]?.length || 0}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(porEstado[estado.id] || []).map(t => <TareaCard key={t.id} t={t} compact />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {selectedTarea && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}
          onClick={() => setSelectedTarea(null)}>
          <div style={{ background: DS.surface, borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${DS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{CANAL_ICON[selectedTarea.canal] || '📌'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: DS.text, marginBottom: 6, lineHeight: 1.3 }}>{selectedTarea.titulo}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: DS.infoLight, color: DS.info }}>{selectedTarea.canal}</span>
                    {selectedTarea.tipo_contenido && <span style={{ fontSize: 11, color: DS.textTertiary, padding: '3px 8px', background: DS.bg, borderRadius: 20 }}>{selectedTarea.tipo_contenido}</span>}
                    <span style={{ fontSize: 11, color: DS.textTertiary }}>
                      {format(new Date(selectedTarea.fecha + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
                    </span>
                    {selectedTarea.campanas?.nombre && <span style={{ fontSize: 11, color: DS.textTertiary }}>📣 {selectedTarea.campanas.nombre}</span>}
                  </div>
                </div>
                <button onClick={() => setSelectedTarea(null)} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: DS.textTertiary, fontSize: 18, flexShrink: 0 }}>✕</button>
              </div>

              {/* Estado */}
              <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                {ESTADOS.map(e => (
                  <button key={e.id} onClick={() => cambiarEstado(selectedTarea.id, e.id)}
                    style={{ flex: 1, padding: '7px 4px', border: selectedTarea.estado === e.id ? `2px solid ${e.color}` : `1px solid ${DS.border}`, borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: selectedTarea.estado === e.id ? e.bg : DS.surface, color: selectedTarea.estado === e.id ? e.color : DS.textTertiary }}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${DS.border}`, padding: '0 24px' }}>
              {[
                { id: 'brief', label: '📋 Brief' },
                { id: 'metricas', label: '📊 Métricas', disabled: selectedTarea.estado !== 'publicado' },
                { id: 'analisis', label: '🧠 Análisis CMO', disabled: selectedTarea.estado !== 'publicado' },
              ].map(tab => (
                <button key={tab.id} onClick={() => !tab.disabled && setModalTab(tab.id as typeof modalTab)}
                  style={{
                    padding: '12px 16px', border: 'none', background: 'none', cursor: tab.disabled ? 'default' : 'pointer',
                    fontSize: 12, fontWeight: modalTab === tab.id ? 700 : 400,
                    color: tab.disabled ? DS.textTertiary : modalTab === tab.id ? DS.accent : DS.textSecondary,
                    borderBottom: modalTab === tab.id ? `2px solid ${DS.accent}` : '2px solid transparent',
                    fontFamily: 'inherit', opacity: tab.disabled ? 0.5 : 1,
                  }}>
                  {tab.label}
                  {tab.id === 'metricas' && tab.disabled && <span style={{ fontSize: 9, marginLeft: 4 }}>· Solo publicados</span>}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ padding: '20px 24px' }}>

              {/* BRIEF TAB */}
              {modalTab === 'brief' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {selectedTarea.copy_exacto && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: DS.textTertiary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>📝 Copy listo para publicar</div>
                      <div style={{ background: DS.bg, borderRadius: 10, padding: 14, fontSize: 13, color: DS.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {selectedTarea.copy_exacto}
                      </div>
                      <button onClick={() => navigator.clipboard.writeText(selectedTarea.copy_exacto)}
                        style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: DS.infoLight, color: DS.info, border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <Copy size={11} /> Copiar
                      </button>
                    </div>
                  )}
                  {selectedTarea.guion && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: DS.textTertiary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>🎬 Guión del video</div>
                      <div style={{ background: DS.bg, borderRadius: 10, padding: 14, fontSize: 13, color: DS.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selectedTarea.guion}</div>
                    </div>
                  )}
                  {selectedTarea.musica_sugerida && (
                    <div style={{ background: DS.bg, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>🎵</span>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: DS.textTertiary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>Música sugerida</div>
                        <div style={{ fontSize: 13, color: DS.text, fontWeight: 600 }}>{selectedTarea.musica_sugerida}</div>
                      </div>
                    </div>
                  )}
                  {selectedTarea.referencia_visual && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: DS.textTertiary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>📷 Referencia visual y locación</div>
                      <div style={{ background: DS.bg, borderRadius: 10, padding: 14, fontSize: 13, color: DS.text, lineHeight: 1.6 }}>{selectedTarea.referencia_visual}</div>
                    </div>
                  )}
                  {!selectedTarea.copy_exacto && !selectedTarea.guion && (
                    <div style={{ padding: '30px 0', textAlign: 'center', color: DS.textTertiary, fontSize: 13 }}>
                      El contenido de esta pieza aún no ha sido generado.
                    </div>
                  )}
                </div>
              )}

              {/* MÉTRICAS TAB */}
              {modalTab === 'metricas' && selectedTarea.estado === 'publicado' && (
                <div>
                  <div style={{ fontSize: 12, color: DS.textSecondary, marginBottom: 20 }}>
                    Ingresa las métricas reales de este contenido (idealmente cada lunes después de publicado).
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>
                    {metricasDef.map(m => {
                      const v = parseFloat(metricasForm[m.label] || '0')
                      return (
                        <div key={m.label} style={{ background: DS.bg, borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <label style={{ fontSize: 10, fontWeight: 700, color: DS.textTertiary, textTransform: 'uppercase', letterSpacing: '.5px' }}>{m.label}</label>
                            {v > 0 && m.benchmarkGreen && <Semaforo value={v} benchmarkGreen={m.benchmarkGreen} benchmarkYellow={m.benchmarkYellow} />}
                          </div>
                          <input type="number" step="0.1" value={metricasForm[m.label] || ''}
                            onChange={e => setMetricasForm(f => ({ ...f, [m.label]: e.target.value }))}
                            placeholder="0"
                            style={{ width: '100%', padding: '8px 10px', border: `1px solid ${DS.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: DS.surface, color: DS.text, boxSizing: 'border-box' }} />
                          <div style={{ fontSize: 10, color: DS.textTertiary, marginTop: 5 }}>{m.hint}</div>
                        </div>
                      )
                    })}
                  </div>
                  {/* Métricas calculadas automáticamente */}
                  {(() => {
                    const auto = calcularMetricasAuto(metricasForm)
                    const keys = Object.keys(auto)
                    if (keys.length === 0) return null
                    return (
                      <div style={{ background: DS.infoLight, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: DS.info, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>⚡ Calculado automáticamente</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                          {keys.map(k => {
                            const m = auto[k]
                            return (
                              <div key={k} style={{ background: DS.surface, borderRadius: 8, padding: '10px 12px' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: DS.textTertiary, marginBottom: 4 }}>{m.label}</div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: DS.text }}>{m.valor.toFixed(2)}{k.includes('%') || k.includes('rate') ? '%' : k.includes('ROAS') ? 'x' : ''}</div>
                                {m.benchmarkGreen && <Semaforo value={m.valor} benchmarkGreen={m.benchmarkGreen} benchmarkYellow={m.benchmarkYellow} />}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={guardarMetricas} disabled={savingMetricas}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: DS.text, color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {savingMetricas ? <Loader2 size={13} className="animate-spin" /> : '💾'}
                      {savingMetricas ? 'Guardando...' : 'Guardar métricas'}
                    </button>
                    <button onClick={() => setModalTab('analisis')}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: DS.accentLight, color: DS.accent, border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <TrendingUp size={13} /> Analizar con CMO →
                    </button>
                  </div>
                </div>
              )}

              {/* ANÁLISIS TAB */}
              {modalTab === 'analisis' && selectedTarea.estado === 'publicado' && (
                <div>
                  {!analisis && !loadingAnalisis && (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>🧠</div>
                      <div style={{ fontSize: 13, color: DS.textSecondary, marginBottom: 20 }}>
                        El CMO analizará este contenido con las métricas registradas y dará decisiones concretas.
                      </div>
                      <button onClick={analizarContenido}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: DS.text, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', margin: '0 auto' }}>
                        <TrendingUp size={15} /> Analizar este contenido
                      </button>
                    </div>
                  )}
                  {loadingAnalisis && !analisis && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '30px 0', color: DS.info, fontSize: 13 }}>
                      <Loader2 size={16} className="animate-spin" /> El CMO está analizando...
                    </div>
                  )}
                  {analisis && (
                    <div>
                      <div style={{ fontSize: 13, color: DS.textSecondary, lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 16 }}>{analisis}</div>
                      <button onClick={analizarContenido}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: DS.bg, color: DS.textSecondary, border: `1px solid ${DS.border}`, borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        ↻ Re-analizar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
