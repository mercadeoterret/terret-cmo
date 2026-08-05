'use client'
import { useState, useEffect } from 'react'
import { Loader2, ChevronDown, ChevronRight, Check, Calendar, Save, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'

interface CampanaCtx {
  nombre: string; descripcion: string; fecha_inicio: string; fecha_fin: string
  presupuesto: string; evento: string; objetivo: string; canales: string[]
  creadora: string; audiencia: string[]; notas: string
}
interface Campana {
  id: string; nombre: string; estado: string; fecha_inicio: string
  fecha_fin: string; objetivo: string; created_at: string; output_claude?: string
}

const CANAL_COLORS: Record<string, string> = {
  'Instagram': '#e040fb', 'TikTok': '#00bcd4', 'Meta Ads': '#1877f2',
  'Google Ads': '#4285f4', 'Email': '#15803d', 'WhatsApp': '#25d366',
  'Offline': '#b45309', 'Stories': '#e040fb',
}

const EVENTOS = [
  { value: '', label: '— Sin relación específica —' },
  { value: 'medellin', label: 'Maratón de Medellín — 5-6 sep 2026 ⭐' },
  { value: 'mmb', label: 'Media Maratón de Bogotá — 26 jul 2026 ⭐' },
  { value: 'cali', label: 'Maratón de Cali — 2-3 may 2026' },
  { value: 'amor', label: 'Amor y Amistad — 20 sep 2026 🧡' },
  { value: 'madre', label: 'Día de la Madre — 10 may 2026' },
  { value: 'padre', label: 'Día del Padre — 21 jun 2026' },
  { value: 'bfco', label: 'Black Friday Colombia — 5-7 jun 2026' },
  { value: 'hotsale1', label: 'Hot Sale Colombia — 17-21 mar 2026' },
  { value: 'hotsale2', label: 'Hot Sale Colombia 2ª ed. — 20-24 oct 2026' },
]

function parsePlan(texto: string) {
  const piezas: { fecha: string; canal: string; tipo_contenido: string; titulo: string }[] = []
  for (const linea of texto.split(/\n|(?=\d{4}-\d{2}-\d{2}\s*\|)/)) {
    const match = linea.match(/(\d{4}-\d{2}-\d{2})\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*"?([^"\n]+)"?/)
    if (!match) continue
    const [, fecha, canal, tipo, titulo] = match
    piezas.push({ fecha: fecha.trim(), canal: canal.trim(), tipo_contenido: tipo.trim(), titulo: titulo.trim() })
  }
  return piezas
}

export default function CampanasPage() {
  const [view, setView] = useState<'list' | 'builder' | 'detail'>('list')
  const [campanas, setCampanas] = useState<Campana[]>([])
  const [selectedCampana, setSelectedCampana] = useState<Campana | null>(null)
  const [step, setStep] = useState(0)
  const [ctx, setCtx] = useState<CampanaCtx>({
    nombre: '', descripcion: '', fecha_inicio: '', fecha_fin: '',
    presupuesto: '', evento: '', objetivo: '',
    canales: ['Meta Ads', 'Instagram orgánico', 'Email marketing'],
    creadora: 'Sí, disponible completo',
    audiencia: ['Corredores urbanos / running'], notas: ''
  })
  const [estrategia, setEstrategia] = useState('')
  const [estrategiaLoading, setEstrategiaLoading] = useState(false)
  const [estrategiaDone, setEstrategiaDone] = useState(false)
  const [openEstrategia, setOpenEstrategia] = useState(false)
  const [planRaw, setPlanRaw] = useState('')
  const [planLoading, setPlanLoading] = useState(false)
  const [planDone, setPlanDone] = useState(false)
  const [openPlan, setOpenPlan] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [syncDone, setSyncDone] = useState(false)
  const [syncCount, setSyncCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => { fetchCampanas() }, [])

  async function fetchCampanas() {
    const r = await fetch('/api/campanas')
    const d = await r.json()
    setCampanas(Array.isArray(d) ? d : [])
  }

  function toggleArr(arr: string[], v: string) {
    return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]
  }

  function getBase() {
    const eventoLabel = EVENTOS.find(e => e.value === ctx.evento)?.label || 'Sin evento específico'
    return `CAMPAÑA: ${ctx.nombre}
PERÍODO: ${ctx.fecha_inicio} al ${ctx.fecha_fin}
PRESUPUESTO: ${ctx.presupuesto} COP
EVENTO RELACIONADO: ${eventoLabel}
OBJETIVO: ${ctx.objetivo}
CANALES DISPONIBLES: ${ctx.canales.join(', ')}
AUDIENCIA: ${ctx.audiencia.join(', ')}
CREADORA: ${ctx.creadora}
NOTAS: ${ctx.notas || 'Ninguna'}`
  }

  async function streamClaude(prompt: string, onChunk: (text: string) => void): Promise<string> {
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
      onChunk(text)
    }
    return text
  }

  async function generarEstrategia() {
    setEstrategiaLoading(true)
    setEstrategia('')
    setEstrategiaDone(false)
    setOpenEstrategia(true)
    const prompt = `${getBase()}

Genera la ESTRATEGIA COMPLETA de la campaña:

## CONCEPTO CREATIVO
(El gran concepto que une toda la campaña — el "por qué" emocional)

## NARRATIVA DE LA CAMPAÑA
(La historia que contamos — inicio, desarrollo, clímax, cierre)

## POSICIONAMIENTO
(Qué lugar queremos ocupar en la mente del corredor colombiano con esta campaña)

## MENSAJES CLAVE
(Los 3 mensajes principales que deben quedar grabados)

## TONO Y ESTILO VISUAL
(Cómo suena, cómo se ve — referencias concretas de estilo, colores, atmósfera)

## COMPETENCIA Y DIFERENCIACIÓN
(Qué están haciendo otros y cómo nos diferenciamos)

Sé específico. No genérico. Esta es la campaña de Terret para ${ctx.nombre}.`
    await streamClaude(prompt, setEstrategia)
    setEstrategiaLoading(false)
    setEstrategiaDone(true)
  }

  async function generarPlan() {
    setPlanLoading(true)
    setPlanRaw('')
    setPlanDone(false)
    setOpenPlan(true)
    const prompt = `${getBase()}

ESTRATEGIA DE LA CAMPAÑA:
${estrategia}

Eres el Director de Marketing de Terret. Decide el plan de contenido completo para esta campaña.

Para cada día del período (${ctx.fecha_inicio} al ${ctx.fecha_fin}), decide qué piezas de contenido se van a producir y publicar.

FORMATO OBLIGATORIO — una línea por pieza, exactamente así:
YYYY-MM-DD | Canal | Tipo | "Título de la pieza"

Canales disponibles: ${ctx.canales.join(', ')}
Tipos posibles: Reel, Carrusel, Story, Post, Video UGC, Email, Estado WhatsApp, Pauta Meta, Pauta Google, Pauta TikTok, Contenido Offline

Reglas:
- Un día puede tener múltiples piezas en diferentes canales
- No expliques por qué — solo el plan
- No saltes ningún día del período
- El título debe ser descriptivo y específico

Responde ÚNICAMENTE con las líneas del plan, sin texto adicional antes ni después.`
    const text = await streamClaude(prompt, setPlanRaw)
    setPlanLoading(false)
    setPlanDone(true)

    // Guardar campaña y piezas inmediatamente
    await guardarCampanaYPiezas(text)
  }

  async function guardarCampanaYPiezas(planTexto: string) {
    setSaving(true)
    // 1. Guardar campaña
    const res = await fetch('/api/campanas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: ctx.nombre, descripcion: ctx.descripcion,
        fecha_inicio: ctx.fecha_inicio || null, fecha_fin: ctx.fecha_fin || null,
        presupuesto: parseFloat(ctx.presupuesto.replace(/\./g, '').replace(',', '.')) || null,
        evento_relacionado: ctx.evento, objetivo: ctx.objetivo,
        canales: ctx.canales, audiencia: ctx.audiencia, notas: ctx.notas,
        output_claude: `## Estrategia y narrativa\n${estrategia}\n\n## Plan de contenido\n${planTexto}`,
        estado: 'activa'
      })
    })
    const campana = await res.json()
    const cid = campana.id
    setSavedId(cid)
    setSaving(false)

    // 2. Parsear y guardar piezas vacías en calendario_eventos
    const piezas = parsePlan(planTexto)
    if (piezas.length === 0) return

    setSyncing(true)
    const payload = piezas.map(p => ({
      fecha: p.fecha,
      canal: p.canal,
      tipo_contenido: p.tipo_contenido,
      titulo: p.titulo,
      copy_exacto: '',
      guion: '',
      musica_sugerida: '',
      referencia_visual: '',
      responsable: 'David',
      estado: 'pendiente',
      color: CANAL_COLORS[p.canal] || '#185fa5',
      campana_id: cid,
    }))

    await fetch('/api/tareas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    setSyncCount(piezas.length)
    setSyncing(false)
    setSyncDone(true)
    fetchCampanas()
  }

  const [openSection, setOpenSection] = useState<string | null>(null)

  // ─── VISTA LISTA ────────────────────────────────────────────────────────────
  if (view === 'list') return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a18', margin: 0 }}>Campañas</h1>
          <p style={{ fontSize: 13, color: '#6b6a63', margin: '4px 0 0' }}>{campanas.length} campaña{campanas.length !== 1 ? 's' : ''} guardadas</p>
        </div>
        <button onClick={() => { setView('builder'); setStep(0); setEstrategia(''); setEstrategiaDone(false); setPlanRaw(''); setPlanDone(false); setSavedId(null); setSyncDone(false) }}
          style={{ padding: '10px 20px', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Nueva campaña
        </button>
      </div>
      {campanas.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 12, padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📣</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a18', marginBottom: 6 }}>Sin campañas aún</div>
          <div style={{ fontSize: 13, color: '#9c9a92', marginBottom: 20 }}>Crea tu primera campaña y el CMO genera toda la estrategia.</div>
          <button onClick={() => { setView('builder'); setStep(0) }}
            style={{ padding: '10px 20px', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Crear primera campaña
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {campanas.map(c => (
            <div key={c.id} style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a18' }}>{c.nombre}</div>
                <div style={{ fontSize: 11, color: '#9c9a92', marginTop: 3 }}>
                  {c.fecha_inicio && c.fecha_fin ? `${c.fecha_inicio} → ${c.fecha_fin}` : 'Sin fechas'}
                  {c.objetivo ? ` · ${c.objetivo}` : ''}
                </div>
              </div>
              <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 20, fontWeight: 700, background: c.estado === 'activa' ? '#dcfce7' : '#f0efe8', color: c.estado === 'activa' ? '#15803d' : '#6b6a63' }}>{c.estado}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link href={`/calendario`}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#f0efe8', color: '#1a1a18', borderRadius: 8, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                  <Calendar size={12} /> Calendario
                </Link>
                <button onClick={() => { setSelectedCampana(c); setView('detail') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#e6f1fb', color: '#185fa5', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Eye size={12} /> Ver
                </button>
                <button onClick={async () => { await fetch(`/api/campanas?id=${c.id}`, { method: 'DELETE' }); fetchCampanas() }}
                  style={{ padding: '7px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9c9a92' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ─── VISTA DETALLE ──────────────────────────────────────────────────────────
  if (view === 'detail' && selectedCampana) {
    const sections = selectedCampana.output_claude?.split(/^## /m).filter(Boolean) || []
    return (
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setView('list')} style={{ fontSize: 12, color: '#185fa5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>← Volver</button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a18', margin: 0, flex: 1 }}>{selectedCampana.nombre}</h1>
          <Link href="/calendario" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#1a1a18', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            <Calendar size={13} /> Ver en calendario
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[{ l: 'Período', v: `${selectedCampana.fecha_inicio || '—'} → ${selectedCampana.fecha_fin || '—'}` }, { l: 'Objetivo', v: selectedCampana.objetivo || '—' }, { l: 'Estado', v: selectedCampana.estado }].map(m => (
            <div key={m.l} style={{ background: '#f0efe8', borderRadius: 9, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.5px' }}>{m.l}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18', marginTop: 4 }}>{m.v}</div>
            </div>
          ))}
        </div>
        {sections.map((s, i) => {
          const [title, ...rest] = s.split('\n')
          return (
            <div key={i} style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 11, overflow: 'hidden', marginBottom: 8 }}>
              <button onClick={() => setOpenSection(openSection === title ? null : title)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18' }}>{title}</span>
                {openSection === title ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
              {openSection === title && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f0efe8', fontSize: 13, color: '#6b6a63', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {rest.join('\n').trim()}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ─── VISTA BUILDER ──────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setView('list')} style={{ fontSize: 12, color: '#185fa5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>← Campañas</button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a18', margin: 0 }}>{step === 0 ? 'Nueva campaña' : ctx.nombre}</h1>
      </div>

      {step === 0 && (
        <div style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 12, padding: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Nombre de la campaña *</label>
                <input value={ctx.nombre} onChange={e => setCtx(c => ({ ...c, nombre: e.target.value }))} placeholder="Ej: You Never Run Alone — Maratón Medellín 2026" style={inp} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>¿Qué comunicamos o lanzamos?</label>
                <textarea value={ctx.descripcion} onChange={e => setCtx(c => ({ ...c, descripcion: e.target.value }))} placeholder="Producto, colección, evento, ocasión especial..." rows={3} style={{ ...inp, resize: 'none' }} />
              </div>
              <div>
                <label style={lbl}>Fecha de inicio *</label>
                <input type="date" value={ctx.fecha_inicio} onChange={e => setCtx(c => ({ ...c, fecha_inicio: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={lbl}>Fecha de fin *</label>
                <input type="date" value={ctx.fecha_fin} onChange={e => setCtx(c => ({ ...c, fecha_fin: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={lbl}>Presupuesto total (COP)</label>
                <input value={ctx.presupuesto} onChange={e => setCtx(c => ({ ...c, presupuesto: e.target.value }))} placeholder="Ej: 2.500.000" style={inp} />
              </div>
              <div>
                <label style={lbl}>¿Relacionada con?</label>
                <select value={ctx.evento} onChange={e => setCtx(c => ({ ...c, evento: e.target.value }))} style={inp}>
                  {EVENTOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Objetivo principal</label>
                <select value={ctx.objetivo} onChange={e => setCtx(c => ({ ...c, objetivo: e.target.value }))} style={inp}>
                  <option value="">Selecciona...</option>
                  <option>Ventas directas — maximizar ROAS</option>
                  <option>Lanzamiento de producto — generar awareness</option>
                  <option>Posicionamiento en carrera o evento</option>
                  <option>Crecimiento de comunidad y seguidores</option>
                  <option>Fidelización y recompra</option>
                  <option>Leads para Terret Merch B2B</option>
                </select>
              </div>
            </div>
            <div>
              <label style={lbl}>Canales activos</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 6 }}>
                {['Meta Ads', 'Google Ads', 'TikTok Ads', 'Instagram orgánico', 'TikTok orgánico', 'Email marketing', 'WhatsApp / estados', 'Influencers / UGC'].map(canal => {
                  const on = ctx.canales.includes(canal)
                  return <button key={canal} onClick={() => setCtx(c => ({ ...c, canales: toggleArr(c.canales, canal) }))} style={{ padding: '9px 12px', borderRadius: 8, fontSize: 12, fontWeight: on ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', border: on ? '1.5px solid #185fa5' : '1px solid #e0dfd5', background: on ? '#e6f1fb' : '#fff', color: on ? '#185fa5' : '#1a1a18' }}>{canal}</button>
                })}
              </div>
            </div>
            <div>
              <label style={lbl}>Audiencia objetivo</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 6 }}>
                {['Corredores urbanos / running', 'Ciclistas', 'Fitness / gym', 'Compradores de regalo', 'Base de clientes Terret', 'Equipos deportivos B2B'].map(aud => {
                  const on = ctx.audiencia.includes(aud)
                  return <button key={aud} onClick={() => setCtx(c => ({ ...c, audiencia: toggleArr(c.audiencia, aud) }))} style={{ padding: '9px 12px', borderRadius: 8, fontSize: 12, fontWeight: on ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', border: on ? '1.5px solid #7c3aed' : '1px solid #e0dfd5', background: on ? '#f3e8ff' : '#fff', color: on ? '#7c3aed' : '#1a1a18' }}>{aud}</button>
                })}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={lbl}>Creadora disponible</label>
                <select value={ctx.creadora} onChange={e => setCtx(c => ({ ...c, creadora: e.target.value }))} style={inp}>
                  <option>Sí, disponible completo</option>
                  <option>Sí, disponibilidad parcial</option>
                  <option>No disponible</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Notas o restricciones</label>
                <input value={ctx.notas} onChange={e => setCtx(c => ({ ...c, notas: e.target.value }))} placeholder="Stock limitado, no usar rojo, etc." style={inp} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
              <button onClick={() => { setStep(1); generarEstrategia() }} disabled={!ctx.nombre || !ctx.fecha_inicio || !ctx.fecha_fin}
                style={{ padding: '12px 28px', background: ctx.nombre && ctx.fecha_inicio && ctx.fecha_fin ? '#1a1a18' : '#c0bfb5', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: ctx.nombre && ctx.fecha_inicio && ctx.fecha_fin ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                Generar estrategia →
              </button>
            </div>
          </div>
        </div>
      )}

      {step >= 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* FASE 1 — ESTRATEGIA */}
          <div style={{ background: '#fff', border: `1px solid ${estrategiaDone ? '#bbf7d0' : '#e0dfd5'}`, borderRadius: 11, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', gap: 12 }}>
              <span style={{ fontSize: 20 }}>🎯</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18' }}>Estrategia y narrativa</div>
                <div style={{ fontSize: 11, color: '#9c9a92', marginTop: 1 }}>Concepto creativo, posicionamiento y narrativa de la campaña</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {estrategiaDone && <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={13} /> Completada</span>}
                {!estrategiaLoading && <button onClick={generarEstrategia} style={{ padding: '7px 14px', background: estrategiaDone ? '#f0efe8' : '#1a1a18', color: estrategiaDone ? '#6b6a63' : '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{estrategiaDone ? '↻ Regenerar' : '✦ Generar'}</button>}
                {estrategia && <button onClick={() => setOpenEstrategia(!openEstrategia)} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#9c9a92' }}>{openEstrategia ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>}
              </div>
            </div>
            {estrategiaLoading && <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#185fa5', borderTop: '1px solid #f0efe8' }}><Loader2 size={14} className="animate-spin" /> Generando estrategia...</div>}
            {estrategia && openEstrategia && <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f0efe8', fontSize: 13, color: '#1a1a18', lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 500, overflowY: 'auto' }}>{estrategia}</div>}
            {estrategia && !openEstrategia && !estrategiaLoading && <div style={{ padding: '0 20px 12px', borderTop: '1px solid #f0efe8', fontSize: 12, color: '#9c9a92', overflow: 'hidden', maxHeight: 36, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{estrategia.slice(0, 150)}...</div>}
          </div>

          {/* FASE 2 — PLAN DE CONTENIDO */}
          {estrategiaDone && (
            <div style={{ background: '#fff', border: `1px solid ${planDone ? '#bbf7d0' : '#e0dfd5'}`, borderRadius: 11, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', gap: 12 }}>
                <span style={{ fontSize: 20 }}>📋</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18' }}>Plan de contenido</div>
                  <div style={{ fontSize: 11, color: '#9c9a92', marginTop: 1 }}>El CMO decide qué publicar, cuándo y en qué canal — se guarda directo en el calendario</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {planDone && !syncing && <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={13} /> {syncCount} piezas en calendario</span>}
                  {syncing && <span style={{ fontSize: 11, color: '#185fa5', display: 'flex', alignItems: 'center', gap: 4 }}><Loader2 size={12} className="animate-spin" /> Guardando...</span>}
                  {!planLoading && !saving && !syncing && <button onClick={generarPlan} style={{ padding: '7px 14px', background: planDone ? '#f0efe8' : '#1a1a18', color: planDone ? '#6b6a63' : '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{planDone ? '↻ Regenerar' : '✦ Generar plan'}</button>}
                  {(planLoading || saving) && <Loader2 size={14} className="animate-spin" style={{ color: '#185fa5' }} />}
                  {planRaw && <button onClick={() => setOpenPlan(!openPlan)} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#9c9a92' }}>{openPlan ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>}
                </div>
              </div>
              {planLoading && <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#185fa5', borderTop: '1px solid #f0efe8' }}><Loader2 size={14} className="animate-spin" /> El CMO está planificando el contenido...</div>}
              {planRaw && openPlan && <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f0efe8', fontSize: 12, color: '#1a1a18', lineHeight: 2, whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto', fontFamily: 'monospace' }}>{planRaw}</div>}
              {planRaw && !openPlan && !planLoading && <div style={{ padding: '0 20px 12px', borderTop: '1px solid #f0efe8', fontSize: 12, color: '#9c9a92', overflow: 'hidden', maxHeight: 36, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{planRaw.slice(0, 150)}...</div>}
            </div>
          )}

          {/* CTA IR AL CALENDARIO */}
          {syncDone && (
            <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 11, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>✓ Campaña lista — {syncCount} piezas guardadas en el calendario</div>
                <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>Ve al calendario para generar el contenido de cada pieza día a día</div>
              </div>
              <Link href="/calendario" style={{ padding: '9px 18px', background: '#15803d', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={13} /> Ir al calendario →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, color: '#6b6a63', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #c0bfb5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#1a1a18' }
