'use client'
import { useState, useEffect } from 'react'
import { Loader2, ChevronDown, ChevronRight, Check, Calendar, Save, Trash2, Eye, Sparkles } from 'lucide-react'
import Link from 'next/link'

// ─── TIPOS ───────────────────────────────────────────────────────────────────
interface CampanaCtx {
  nombre: string
  descripcion: string
  fecha_inicio: string
  fecha_fin: string
  presupuesto: string
  evento: string
  objetivo: string
  canales: string[]
  creadora: string
  audiencia: string[]
  notas: string
}

interface Pieza {
  id?: string
  fecha: string
  canal: string
  tipo_contenido: string
  titulo: string
  copy_exacto: string
  guion: string
  musica_sugerida: string
  referencia_visual: string
  responsable: string
  estado: string
  color: string
  campana_id?: string
  generando?: boolean
  guardada?: boolean
}

interface DiaAgrupado {
  fecha: string
  piezas: Pieza[]
}

interface Campana {
  id: string
  nombre: string
  estado: string
  fecha_inicio: string
  fecha_fin: string
  objetivo: string
  created_at: string
  output_claude?: string
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const CANAL_COLORS: Record<string, string> = {
  'Instagram': '#e040fb',
  'TikTok': '#00bcd4',
  'Meta Ads': '#1877f2',
  'Google Ads': '#4285f4',
  'Email': '#15803d',
  'WhatsApp': '#25d366',
  'Offline': '#b45309',
  'Stories': '#e040fb',
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

// ─── PARSER DE PLAN DE CONTENIDO ─────────────────────────────────────────────
function parsePlanContenido(texto: string): Omit<Pieza, 'generando' | 'guardada'>[] {
  const piezas: Omit<Pieza, 'generando' | 'guardada'>[] = []
  const lineas = texto.split('\n').filter(l => l.trim())

  for (const linea of lineas) {
    // Formato: YYYY-MM-DD | Canal | Tipo | "Título"
    const match = linea.match(/(\d{4}-\d{2}-\d{2})\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*"?([^"]+)"?/)
    if (!match) continue
    const [, fecha, canal, tipo, titulo] = match
    const canalClean = canal.trim()
    piezas.push({
      fecha: fecha.trim(),
      canal: canalClean,
      tipo_contenido: tipo.trim(),
      titulo: titulo.trim(),
      copy_exacto: '',
      guion: '',
      musica_sugerida: '',
      referencia_visual: '',
      responsable: 'David',
      estado: 'pendiente',
      color: CANAL_COLORS[canalClean] || '#185fa5',
    })
  }
  return piezas
}

// ─── AGRUPAR PIEZAS POR DÍA ──────────────────────────────────────────────────
function agruparPorDia(piezas: Pieza[]): DiaAgrupado[] {
  const map: Record<string, Pieza[]> = {}
  for (const p of piezas) {
    if (!map[p.fecha]) map[p.fecha] = []
    map[p.fecha].push(p)
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, piezas]) => ({ fecha, piezas }))
}

function formatFecha(fecha: string) {
  const d = new Date(fecha + 'T12:00:00')
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function CampanasPage() {
  const [view, setView] = useState<'list' | 'builder' | 'detail'>('list')
  const [campanas, setCampanas] = useState<Campana[]>([])
  const [selectedCampana, setSelectedCampana] = useState<Campana | null>(null)

  // Builder state
  const [step, setStep] = useState(0) // 0=form, 1=estrategia, 2=plan, 3=piezas
  const [ctx, setCtx] = useState<CampanaCtx>({
    nombre: '', descripcion: '', fecha_inicio: '', fecha_fin: '',
    presupuesto: '', evento: '', objetivo: '',
    canales: ['Meta Ads', 'Instagram orgánico', 'Email marketing'],
    creadora: 'Sí, disponible completo',
    audiencia: ['Corredores urbanos / running'], notas: ''
  })

  // Fase 1 — Estrategia
  const [estrategia, setEstrategia] = useState('')
  const [estrategiaLoading, setEstrategiaLoading] = useState(false)
  const [estrategiaDone, setEstrategiaDone] = useState(false)
  const [openEstrategia, setOpenEstrategia] = useState(false)

  // Fase 2 — Plan de contenido
  const [planRaw, setPlanRaw] = useState('')
  const [planLoading, setPlanLoading] = useState(false)
  const [planDone, setPlanDone] = useState(false)
  const [openPlan, setOpenPlan] = useState(false)

  // Fase 3 — Piezas
  const [piezas, setPiezas] = useState<Pieza[]>([])
  const [openDia, setOpenDia] = useState<string | null>(null)
  const [openPieza, setOpenPieza] = useState<string | null>(null)

  // Guardar campaña
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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

  // ─── GENERAR ESTRATEGIA ────────────────────────────────────────────────────
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
      setEstrategia(text)
    }
    setEstrategiaLoading(false)
    setEstrategiaDone(true)
  }

  // ─── GENERAR PLAN DE CONTENIDO ─────────────────────────────────────────────
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
- Sé ambicioso pero realista con los recursos disponibles
- El título debe ser descriptivo y específico (no genérico)

Responde ÚNICAMENTE con las líneas del plan, sin texto adicional.`

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
      setPlanRaw(text)
    }

    // Parsear y crear piezas vacías
    const parsed = parsePlanContenido(text)
    setPiezas(parsed.map(p => ({ ...p, generando: false, guardada: false })))
    setPlanLoading(false)
    setPlanDone(true)
    setStep(3)
  }

  // ─── GUARDAR CAMPAÑA ───────────────────────────────────────────────────────
  async function saveCampana(): Promise<string> {
    if (savedId) return savedId
    setSaving(true)
    const res = await fetch('/api/campanas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: ctx.nombre,
        descripcion: ctx.descripcion,
        fecha_inicio: ctx.fecha_inicio || null,
        fecha_fin: ctx.fecha_fin || null,
        presupuesto: parseFloat(ctx.presupuesto.replace(/\./g, '').replace(',', '.')) || null,
        evento_relacionado: ctx.evento,
        objetivo: ctx.objetivo,
        canales: ctx.canales,
        audiencia: ctx.audiencia,
        notas: ctx.notas,
        output_claude: `## Estrategia y narrativa\n${estrategia}\n\n## Plan de contenido\n${planRaw}`,
        estado: 'activa'
      })
    })
    const d = await res.json()
    setSavedId(d.id)
    setSaving(false)
    fetchCampanas()
    return d.id
  }

  // ─── GUARDAR PIEZAS EN CALENDARIO ─────────────────────────────────────────
  async function guardarPiezasEnCalendario(campanaId: string) {
    const piezasSinGuardar = piezas.filter(p => !p.guardada && !p.id)
    if (piezasSinGuardar.length === 0) return

    const payload = piezasSinGuardar.map(p => ({
      fecha: p.fecha,
      canal: p.canal,
      tipo_contenido: p.tipo_contenido,
      titulo: p.titulo,
      copy_exacto: p.copy_exacto || '',
      guion: p.guion || '',
      musica_sugerida: p.musica_sugerida || '',
      referencia_visual: p.referencia_visual || '',
      responsable: p.responsable,
      estado: p.estado,
      color: p.color,
      campana_id: campanaId,
    }))

    const res = await fetch('/api/tareas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()

    if (Array.isArray(data)) {
      setPiezas(prev => {
        let idx = 0
        return prev.map(p => {
          if (!p.guardada && !p.id) {
            const saved = data[idx++]
            return saved ? { ...p, id: saved.id, campana_id: campanaId, guardada: true } : p
          }
          return p
        })
      })
    }
  }

  // ─── GENERAR PIEZA INDIVIDUAL ──────────────────────────────────────────────
  async function generarPieza(piezaIdx: number) {
    const pieza = piezas[piezaIdx]
    if (!pieza) return

    // Guardar campaña si no está guardada
    let cid = savedId
    if (!cid) cid = await saveCampana()

    // Guardar todas las piezas en calendario si no están guardadas
    await guardarPiezasEnCalendario(cid)

    // Contexto de lo ya generado ese día
    const diaActual = piezas.filter(p => p.fecha === pieza.fecha && p.copy_exacto)
    const contextoHoy = diaActual.length > 0
      ? `\nOTRAS PIEZAS YA GENERADAS PARA ESTE DÍA:\n${diaActual.map(p => `- ${p.canal} | ${p.tipo_contenido}: ${p.titulo}`).join('\n')}\n`
      : ''

    setPiezas(prev => prev.map((p, i) => i === piezaIdx ? { ...p, generando: true } : p))

    const prompt = `${getBase()}

ESTRATEGIA DE LA CAMPAÑA:
${estrategia}

PIEZA A GENERAR:
Fecha: ${pieza.fecha}
Canal: ${pieza.canal}
Tipo: ${pieza.tipo_contenido}
Título: ${pieza.titulo}
${contextoHoy}

Genera el contenido COMPLETO y LISTO PARA EJECUTAR de esta pieza:

COPY EXACTO:
[Texto completo listo para publicar. Para email: asunto + cuerpo completo. Para WhatsApp: mensaje completo. Para redes: caption con hashtags. Para pauta: texto principal + titular + descripción]

GUION:
[Solo si es video/reel/ugc. Hook exacto (0-3s) → Desarrollo (4-25s) → CTA final. Si no aplica, dejar vacío]

MUSICA:
[Artista - Canción específica O género + mood. Ej: "Bad Bunny - Un Verano Sin Ti" o "EDM motivacional 128 BPM"]

REFERENCIA VISUAL:
[Locación exacta, vestuario, iluminación, ángulo de cámara, colores dominantes]

RESPONSABLE:
[David / Creadora / Comité]

Todo debe estar 100% listo. La creadora o el trafficker deben poder ejecutar sin preguntar nada.`

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
    }

    // Parsear el output
    const getField = (key: string) => {
      const match = text.match(new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z]+:|$)`, 'i'))
      return match ? match[1].trim() : ''
    }

    const copy = getField('COPY EXACTO')
    const guion = getField('GUION')
    const musica = getField('MUSICA')
    const referencia = getField('REFERENCIA VISUAL')
    const responsable = getField('RESPONSABLE') || 'David'

    // Actualizar en Supabase si ya tiene ID
    const piezaActual = piezas[piezaIdx]
    if (piezaActual.id) {
      await fetch('/api/tareas', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: piezaActual.id,
          copy_exacto: copy,
          guion: guion,
          musica_sugerida: musica,
          referencia_visual: referencia,
          responsable: responsable,
          estado: 'pendiente',
        })
      })
    }

    setPiezas(prev => prev.map((p, i) => i === piezaIdx ? {
      ...p,
      copy_exacto: copy,
      guion: guion,
      musica_sugerida: musica,
      referencia_visual: referencia,
      responsable: responsable,
      generando: false,
      guardada: true,
    } : p))
  }

  // ─── GENERAR TODAS LAS PIEZAS DE UN DÍA ───────────────────────────────────
  async function generarDia(fecha: string) {
    const indices = piezas
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.fecha === fecha && !p.copy_exacto)
      .map(({ i }) => i)

    for (const idx of indices) {
      await generarPieza(idx)
    }
  }

  const diasAgrupados = agruparPorDia(piezas)
  const piezasGeneradas = piezas.filter(p => p.copy_exacto).length

  // ─── VISTA LISTA ────────────────────────────────────────────────────────────
  if (view === 'list') return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a18', margin: 0 }}>Campañas</h1>
          <p style={{ fontSize: 13, color: '#6b6a63', margin: '4px 0 0' }}>{campanas.length} campaña{campanas.length !== 1 ? 's' : ''} guardadas</p>
        </div>
        <button onClick={() => { setView('builder'); setStep(0); setEstrategia(''); setEstrategiaDone(false); setPlanRaw(''); setPlanDone(false); setPiezas([]); setSavedId(null) }}
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
              <span style={{
                fontSize: 10, padding: '3px 9px', borderRadius: 20, fontWeight: 700,
                background: c.estado === 'activa' ? '#dcfce7' : '#f0efe8',
                color: c.estado === 'activa' ? '#15803d' : '#6b6a63'
              }}>{c.estado}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link href={`/tareas?campana_id=${c.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#f0efe8', color: '#1a1a18', borderRadius: 8, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                  <Calendar size={12} /> Tareas
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

  // ─── VISTA DETALLE ───────────────────────────────────────────────────────────
  if (view === 'detail' && selectedCampana) {
    const sections = selectedCampana.output_claude?.split(/^## /m).filter(Boolean) || []
    return (
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setView('list')} style={{ fontSize: 12, color: '#185fa5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>← Volver</button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a18', margin: 0, flex: 1 }}>{selectedCampana.nombre}</h1>
          <Link href={`/tareas?campana_id=${selectedCampana.id}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#1a1a18', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            <Calendar size={13} /> Ver tareas
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { l: 'Período', v: `${selectedCampana.fecha_inicio || '—'} → ${selectedCampana.fecha_fin || '—'}` },
            { l: 'Objetivo', v: selectedCampana.objetivo || '—' },
            { l: 'Estado', v: selectedCampana.estado },
          ].map(m => (
            <div key={m.l} style={{ background: '#f0efe8', borderRadius: 9, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.5px' }}>{m.l}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18', marginTop: 4 }}>{m.v}</div>
            </div>
          ))}
        </div>
        {sections.map((s, i) => {
          const [title, ...rest] = s.split('\n')
          const content = rest.join('\n').trim()
          return (
            <div key={i} style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 11, overflow: 'hidden', marginBottom: 8 }}>
              <button onClick={() => setOpenDia(openDia === title ? null : title)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18' }}>{title}</span>
                {openDia === title ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
              {openDia === title && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f0efe8', fontSize: 13, color: '#6b6a63', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {content}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ─── VISTA BUILDER ─────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setView('list')} style={{ fontSize: 12, color: '#185fa5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>← Campañas</button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a18', margin: 0 }}>
          {step === 0 ? 'Nueva campaña' : ctx.nombre}
        </h1>
        {savedId && (
          <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
            Guardada
          </span>
        )}
      </div>

      {/* STEP 0: FORMULARIO */}
      {step === 0 && (
        <div style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 12, padding: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Nombre de la campaña *</label>
                <input value={ctx.nombre} onChange={e => setCtx(c => ({ ...c, nombre: e.target.value }))}
                  placeholder="Ej: You Never Run Alone — Maratón Medellín 2026"
                  style={inp} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>¿Qué comunicamos o lanzamos?</label>
                <textarea value={ctx.descripcion} onChange={e => setCtx(c => ({ ...c, descripcion: e.target.value }))}
                  placeholder="Producto, colección, evento, ocasión especial..." rows={3}
                  style={{ ...inp, resize: 'none' }} />
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
                <input value={ctx.presupuesto} onChange={e => setCtx(c => ({ ...c, presupuesto: e.target.value }))}
                  placeholder="Ej: 2.500.000" style={inp} />
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
                  return (
                    <button key={canal} onClick={() => setCtx(c => ({ ...c, canales: toggleArr(c.canales, canal) }))}
                      style={{ padding: '9px 12px', borderRadius: 8, fontSize: 12, fontWeight: on ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', border: on ? '1.5px solid #185fa5' : '1px solid #e0dfd5', background: on ? '#e6f1fb' : '#fff', color: on ? '#185fa5' : '#1a1a18' }}>
                      {canal}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label style={lbl}>Audiencia objetivo</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 6 }}>
                {['Corredores urbanos / running', 'Ciclistas', 'Fitness / gym', 'Compradores de regalo', 'Base de clientes Terret', 'Equipos deportivos B2B'].map(aud => {
                  const on = ctx.audiencia.includes(aud)
                  return (
                    <button key={aud} onClick={() => setCtx(c => ({ ...c, audiencia: toggleArr(c.audiencia, aud) }))}
                      style={{ padding: '9px 12px', borderRadius: 8, fontSize: 12, fontWeight: on ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', border: on ? '1.5px solid #7c3aed' : '1px solid #e0dfd5', background: on ? '#f3e8ff' : '#fff', color: on ? '#7c3aed' : '#1a1a18' }}>
                      {aud}
                    </button>
                  )
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
                <input value={ctx.notas} onChange={e => setCtx(c => ({ ...c, notas: e.target.value }))}
                  placeholder="Stock limitado, no usar rojo, etc." style={inp} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
              <button
                onClick={() => { setStep(1); generarEstrategia() }}
                disabled={!ctx.nombre || !ctx.fecha_inicio || !ctx.fecha_fin}
                style={{ padding: '12px 28px', background: ctx.nombre && ctx.fecha_inicio && ctx.fecha_fin ? '#1a1a18' : '#c0bfb5', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: ctx.nombre && ctx.fecha_inicio && ctx.fecha_fin ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                Generar estrategia →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEPS 1-3: GENERACIÓN */}
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
                {!estrategiaLoading && (
                  <button onClick={generarEstrategia}
                    style={{ padding: '7px 14px', background: estrategiaDone ? '#f0efe8' : '#1a1a18', color: estrategiaDone ? '#6b6a63' : '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {estrategiaDone ? '↻ Regenerar' : '✦ Generar'}
                  </button>
                )}
                {estrategia && (
                  <button onClick={() => setOpenEstrategia(!openEstrategia)}
                    style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#9c9a92' }}>
                    {openEstrategia ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                )}
              </div>
            </div>
            {estrategiaLoading && (
              <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#185fa5', borderTop: '1px solid #f0efe8' }}>
                <Loader2 size={14} className="animate-spin" /> Generando estrategia...
              </div>
            )}
            {estrategia && openEstrategia && (
              <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f0efe8', fontSize: 13, color: '#1a1a18', lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 500, overflowY: 'auto' }}>
                {estrategia}
              </div>
            )}
            {estrategia && !openEstrategia && !estrategiaLoading && (
              <div style={{ padding: '0 20px 12px', borderTop: '1px solid #f0efe8', fontSize: 12, color: '#9c9a92', overflow: 'hidden', maxHeight: 36, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {estrategia.slice(0, 150)}...
              </div>
            )}
          </div>

          {/* FASE 2 — PLAN DE CONTENIDO */}
          {estrategiaDone && (
            <div style={{ background: '#fff', border: `1px solid ${planDone ? '#bbf7d0' : '#e0dfd5'}`, borderRadius: 11, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', gap: 12 }}>
                <span style={{ fontSize: 20 }}>📋</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18' }}>Plan de contenido</div>
                  <div style={{ fontSize: 11, color: '#9c9a92', marginTop: 1 }}>El CMO decide qué publicar, cuándo y en qué canal</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {planDone && <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={13} /> {piezas.length} piezas</span>}
                  {!planLoading && (
                    <button onClick={generarPlan}
                      style={{ padding: '7px 14px', background: planDone ? '#f0efe8' : '#1a1a18', color: planDone ? '#6b6a63' : '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {planDone ? '↻ Regenerar' : '✦ Generar plan'}
                    </button>
                  )}
                  {planRaw && (
                    <button onClick={() => setOpenPlan(!openPlan)}
                      style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#9c9a92' }}>
                      {openPlan ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  )}
                </div>
              </div>
              {planLoading && (
                <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#185fa5', borderTop: '1px solid #f0efe8' }}>
                  <Loader2 size={14} className="animate-spin" /> El CMO está planificando el contenido...
                </div>
              )}
              {planRaw && openPlan && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f0efe8', fontSize: 12, color: '#1a1a18', lineHeight: 2, whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto', fontFamily: 'monospace' }}>
                  {planRaw}
                </div>
              )}
            </div>
          )}

          {/* FASE 3 — PIEZAS POR DÍA */}
          {planDone && piezas.length > 0 && (
            <div>
              {/* Header resumen */}
              <div style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 11, padding: '14px 20px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, color: '#6b6a63' }}>
                  <span style={{ fontWeight: 700, color: '#1a1a18' }}>{piezasGeneradas}</span> de <span style={{ fontWeight: 700, color: '#1a1a18' }}>{piezas.length}</span> piezas generadas
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!savedId && (
                    <button onClick={saveCampana} disabled={saving}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Guardar campaña
                    </button>
                  )}
                  {savedId && (
                    <Link href="/tareas"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#f0efe8', color: '#1a1a18', borderRadius: 8, fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                      <Calendar size={12} /> Ver en calendario
                    </Link>
                  )}
                </div>
              </div>

              {/* Días */}
              {diasAgrupados.map(({ fecha, piezas: piezasDia }) => {
                const todasGeneradas = piezasDia.every(p => p.copy_exacto)
                const algunaGenerando = piezasDia.some(p => p.generando)
                const isOpen = openDia === fecha

                return (
                  <div key={fecha} style={{ background: '#fff', border: `1px solid ${todasGeneradas ? '#bbf7d0' : '#e0dfd5'}`, borderRadius: 11, overflow: 'hidden', marginBottom: 8 }}>
                    {/* Header día */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', gap: 12 }}>
                      <button onClick={() => setOpenDia(isOpen ? null : fecha)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9c9a92' }}>
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      <div onClick={() => setOpenDia(isOpen ? null : fecha)} role="button" style={{ flex: 1, cursor: 'pointer' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18', textTransform: 'capitalize' }}>{formatFecha(fecha)}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          {piezasDia.map((p, i) => (
                            <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: p.copy_exacto ? '#dcfce7' : '#f0efe8', color: p.copy_exacto ? '#15803d' : '#6b6a63', fontWeight: 600 }}>
                              {p.canal} · {p.tipo_contenido}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {todasGeneradas && <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={13} /> Listo</span>}
                        {!algunaGenerando && (
                          <button onClick={() => generarDia(fecha)}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: todasGeneradas ? '#f0efe8' : '#1a1a18', color: todasGeneradas ? '#6b6a63' : '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            <Sparkles size={12} />
                            {todasGeneradas ? 'Regenerar día' : 'Generar día'}
                          </button>
                        )}
                        {algunaGenerando && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#185fa5' }}>
                            <Loader2 size={13} className="animate-spin" /> Generando...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Piezas del día */}
                    {isOpen && (
                      <div style={{ borderTop: '1px solid #f0efe8' }}>
                        {piezasDia.map((pieza, piezaIdx) => {
                          const globalIdx = piezas.findIndex(p => p === pieza)
                          const piezaKey = `${fecha}-${piezaIdx}`
                          const isOpenPieza = openPieza === piezaKey

                          return (
                            <div key={piezaIdx} style={{ borderBottom: piezaIdx < piezasDia.length - 1 ? '1px solid #f0efe8' : 'none' }}>
                              {/* Header pieza */}
                              <div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px 10px 44px', gap: 10 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: pieza.color, flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a18' }}>{pieza.titulo}</div>
                                  <div style={{ fontSize: 11, color: '#9c9a92', marginTop: 1 }}>{pieza.canal} · {pieza.tipo_contenido}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {pieza.copy_exacto && (
                                    <button onClick={() => setOpenPieza(isOpenPieza ? null : piezaKey)}
                                      style={{ fontSize: 11, color: '#185fa5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                                      {isOpenPieza ? 'Cerrar' : 'Ver contenido'}
                                    </button>
                                  )}
                                  {!pieza.generando && (
                                    <button onClick={() => generarPieza(globalIdx)}
                                      style={{ padding: '5px 10px', background: pieza.copy_exacto ? '#f0efe8' : '#1a1a18', color: pieza.copy_exacto ? '#6b6a63' : '#fff', border: 'none', borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                      {pieza.copy_exacto ? '↻ Regenerar' : '✦ Generar'}
                                    </button>
                                  )}
                                  {pieza.generando && <Loader2 size={13} className="animate-spin" style={{ color: '#185fa5' }} />}
                                </div>
                              </div>

                              {/* Contenido de la pieza */}
                              {isOpenPieza && pieza.copy_exacto && (
                                <div style={{ padding: '12px 20px 16px 44px', background: '#f9f8f4', borderTop: '1px solid #f0efe8' }}>
                                  {[
                                    { label: 'Copy exacto', value: pieza.copy_exacto },
                                    { label: 'Guión', value: pieza.guion },
                                    { label: 'Música sugerida', value: pieza.musica_sugerida },
                                    { label: 'Referencia visual', value: pieza.referencia_visual },
                                  ].filter(f => f.value).map(field => (
                                    <div key={field.label} style={{ marginBottom: 12 }}>
                                      <div style={{ fontSize: 10, fontWeight: 700, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{field.label}</div>
                                      <div style={{ fontSize: 12, color: '#1a1a18', lineHeight: 1.7, whiteSpace: 'pre-wrap', background: '#fff', border: '1px solid #e0dfd5', borderRadius: 7, padding: '8px 12px' }}>
                                        {field.value}
                                      </div>
                                    </div>
                                  ))}
                                  <div style={{ fontSize: 11, color: '#9c9a92' }}>Responsable: <strong>{pieza.responsable}</strong></div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, color: '#6b6a63', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #c0bfb5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#1a1a18' }
