'use client'
import { useState, useEffect, useRef } from 'react'
import { Loader2, ChevronDown, ChevronRight, Check, Calendar, Trash2, Sparkles, X } from 'lucide-react'
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
interface Pieza {
  id: string; fecha: string; canal: string; tipo_contenido: string; titulo: string
  copy_exacto?: string; guion?: string; musica_sugerida?: string
  referencia_visual?: string; responsable?: string; estado: string; color?: string
}

const CANAL_COLORS: Record<string, string> = {
  'Instagram': '#e040fb', 'Instagram orgánico': '#e040fb', 'TikTok': '#00bcd4',
  'TikTok orgánico': '#00bcd4', 'Meta Ads': '#1877f2', 'Google Ads': '#4285f4',
  'Email': '#15803d', 'Email marketing': '#15803d', 'WhatsApp': '#25d366',
  'WhatsApp / estados': '#25d366', 'Influencers / UGC': '#f59e0b',
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

function formatFecha(fecha: string) {
  const d = new Date(fecha + 'T12:00:00')
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
}

function agruparPorDia(piezas: Pieza[]) {
  const map: Record<string, Pieza[]> = {}
  for (const p of piezas) {
    if (!map[p.fecha]) map[p.fecha] = []
    map[p.fecha].push(p)
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([fecha, piezas]) => ({ fecha, piezas }))
}

export default function CampanasPage() {
  const [view, setView] = useState<'list' | 'builder' | 'detail'>('list')
  const [campanas, setCampanas] = useState<Campana[]>([])
  const [selectedCampana, setSelectedCampana] = useState<Campana | null>(null)
  const [detailPiezas, setDetailPiezas] = useState<Pieza[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  // Builder
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
  const [openPlan, setOpenPlan] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [showModoModal, setShowModoModal] = useState(false)
  const [showInvestigarForm, setShowInvestigarForm] = useState(false)
  const [investigarFechaInicio, setInvestigarFechaInicio] = useState('')
  const [investigarFechaFin, setInvestigarFechaFin] = useState('')
  const [investigarContexto, setInvestigarContexto] = useState('')
  const [investigando, setInvestigando] = useState(false)
  const [investigacionLog, setInvestigacionLog] = useState('')
  const [cronStatus, setCronStatus] = useState<string>('idle')
  const [proximoCron, setProximoCron] = useState<string>('')
  const [syncCount, setSyncCount] = useState(0)

  // Generación de piezas
  const [generandoId, setGenerandoId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const savedIdRef = useRef<string | null>(null)
  const estrategiaRef = useRef('')

  useEffect(() => {
    fetchCampanas()

    // Countdown al próximo domingo 10pm Colombia (UTC-5 = 03:00 UTC lunes)
    function calcProximoCron() {
      const now = new Date()
      const nextSunday = new Date(now)
      const day = now.getDay() // 0=dom, 1=lun...
      const daysUntilSunday = day === 0 ? 7 : 7 - day
      nextSunday.setDate(now.getDate() + daysUntilSunday)
      nextSunday.setUTCHours(3, 0, 0, 0) // 10pm Colombia = 3am UTC lunes
      const diff = nextSunday.getTime() - now.getTime()
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      return `${days}d ${hours}h ${mins}m`
    }

    setProximoCron(calcProximoCron())
    const cronInterval = setInterval(() => setProximoCron(calcProximoCron()), 30000)

    // Polling cron status cada 15s
    async function checkCronStatus() {
      try {
        const r = await fetch('/api/cron-status')
        const d = await r.json()
        if (d.estado) setCronStatus(d.estado)
        if (d.estado === 'running') fetchCampanas()
      } catch { /* ignore */ }
    }
    checkCronStatus()
    const statusInterval = setInterval(checkCronStatus, 15000)

    return () => { clearInterval(cronInterval); clearInterval(statusInterval) }
  }, [])

  async function investigarYGenerar() {
    setInvestigando(true)
    setShowModoModal(false)
    setShowInvestigarForm(false)
    setInvestigacionLog('Investigando tendencias, competencia y oportunidades...')
    try {
      const res = await fetch('/api/investigar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manual: true,
          fecha_inicio: investigarFechaInicio || undefined,
          fecha_fin: investigarFechaFin || undefined,
          contexto: investigarContexto || undefined,
        })
      })
      const data = await res.json()
      if (data.ok) {
        setInvestigacionLog(`✓ Campaña "${data.campana_nombre}" creada con ${data.piezas} piezas`)
        await fetchCampanas()
        setTimeout(() => {
          setInvestigando(false)
          setInvestigacionLog('')
        }, 2000)
      } else {
        setInvestigacionLog(`Error: ${data.error}`)
        setInvestigando(false)
      }
    } catch (e) {
      setInvestigacionLog(`Error: ${String(e)}`)
      setInvestigando(false)
    }
  }

  async function fetchCampanas() {
    const r = await fetch('/api/campanas')
    const d = await r.json()
    setCampanas(Array.isArray(d) ? d : [])
  }

  async function fetchDetailPiezas(campanaId: string) {
    setDetailLoading(true)
    const r = await fetch(`/api/tareas?campana_id=${campanaId}`)
    const d = await r.json()
    setDetailPiezas(Array.isArray(d) ? d : [])
    setDetailLoading(false)
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
    const text = await streamClaude(prompt, setEstrategia)
    estrategiaRef.current = text
    setEstrategiaLoading(false)
    setEstrategiaDone(true)
  }

  async function generarPlan() {
    setPlanLoading(true)
    setPlanRaw('')
    setPlanDone(false)
    setOpenPlan("plan")
    setSyncCount(0)

    // 1. Guardar campaña primero
    const res = await fetch('/api/campanas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: ctx.nombre, descripcion: ctx.descripcion,
        fecha_inicio: ctx.fecha_inicio || null, fecha_fin: ctx.fecha_fin || null,
        presupuesto: parseFloat(ctx.presupuesto.replace(/\./g, '').replace(',', '.')) || null,
        evento_relacionado: ctx.evento, objetivo: ctx.objetivo,
        canales: ctx.canales, audiencia: ctx.audiencia, notas: ctx.notas,
        output_claude: `## Estrategia y narrativa\n${estrategiaRef.current}`,
        estado: 'activa'
      })
    })
    const campana = await res.json()
    const cid = campana.id
    setSavedId(cid)
    savedIdRef.current = cid

    const prompt = `${getBase()}

ESTRATEGIA DE LA CAMPAÑA:
${estrategiaRef.current}

Eres el Director de Marketing de Terret. Decide el plan de contenido completo para esta campaña.

FORMATO OBLIGATORIO — una línea por pieza, exactamente así:
YYYY-MM-DD | Canal | Tipo | "Título de la pieza"

Canales disponibles: ${ctx.canales.join(', ')}
Tipos posibles: Reel, Carrusel, Story, Post, Video UGC, Email, Estado WhatsApp, Pauta Meta, Pauta Google, Pauta TikTok

Reglas:
- Un día puede tener múltiples piezas
- No saltes ningún día del período (${ctx.fecha_inicio} al ${ctx.fecha_fin})
- El título debe ser descriptivo y específico
- Responde ÚNICAMENTE con las líneas del plan, sin texto adicional`

    // 2. Stream del plan completo
    let buffer = ''
    const res2 = await fetch('/api/claude', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'campana', messages: [{ role: 'user', content: prompt }] })
    })
    const reader = res2.body!.getReader()
    const dec = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += dec.decode(value)
      setPlanRaw(buffer)
    }

    // 3. Parsear e insertar todas las piezas de una vez al final
    const lineas = buffer.split(/\n/)
    const payload: Record<string, unknown>[] = []
    const seen = new Set<string>()
    for (const linea of lineas) {
      const match = linea.trim().match(/(\d{4}-\d{2}-\d{2})\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*"?([^"\n]+)"?/)
      if (!match) continue
      const [, fecha, canal, tipo, titulo] = match
      const key = `${fecha}|${canal.trim()}|${titulo.trim()}`
      if (seen.has(key)) continue
      seen.add(key)
      payload.push({
        fecha: fecha.trim(), canal: canal.trim(), tipo_contenido: tipo.trim(),
        titulo: titulo.trim(), tipo: 'contenido', copy_exacto: '', guion: '', musica_sugerida: '',
        referencia_visual: '', responsable: 'David', estado: 'pendiente',
        color: CANAL_COLORS[canal.trim()] || '#185fa5', campana_id: cid,
      })
    }

    if (payload.length > 0) {
      const insertRes = await fetch('/api/tareas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const insertData = await insertRes.json()
      const count = Array.isArray(insertData) ? insertData.length : 0
      setSyncCount(count)
    }

    setPlanLoading(false)
    setPlanDone(true)
    fetchCampanas()
  }

  async function generarDia(fecha: string, estrategiaTexto: string) {
    const sinContenido = detailPiezas.filter(p => p.fecha === fecha && !p.copy_exacto)
    for (const pieza of sinContenido) {
      await generarContenidoPieza(pieza, estrategiaTexto)
    }
  }

  function extractEstrategiaResumen(estrategiaTexto: string): string {
    // Extraer solo concepto, mensajes clave y tono — no toda la estrategia
    const sections: string[] = []
    const conceptoMatch = estrategiaTexto.match(/CONCEPTO CREATIVO[\s\S]*?(?=##|$)/i)
    const mensajesMatch = estrategiaTexto.match(/MENSAJES CLAVE[\s\S]*?(?=##|$)/i)
    const tonoMatch = estrategiaTexto.match(/TONO Y ESTILO[\s\S]*?(?=##|$)/i)
    if (conceptoMatch) sections.push(conceptoMatch[0].trim().substring(0, 300))
    if (mensajesMatch) sections.push(mensajesMatch[0].trim().substring(0, 200))
    if (tonoMatch) sections.push(tonoMatch[0].trim().substring(0, 150))
    return sections.join('\n\n') || estrategiaTexto.substring(0, 500)
  }

  async function generarContenidoPieza(pieza: Pieza, estrategiaTexto: string) {
    const estrategiaResumen = extractEstrategiaResumen(estrategiaTexto)
    console.log('PIEZA ID:', pieza.id, 'PIEZA:', JSON.stringify(pieza))
    setGenerandoId(pieza.id)

    const otrasHoy = detailPiezas
      .filter(p => p.fecha === pieza.fecha && p.id !== pieza.id && p.copy_exacto)
      .map(p => `- ${p.canal} | ${p.tipo_contenido}: ${p.titulo}`)
      .join('\n')

    const prompt = `Eres el Director de Marketing de Terret, marca colombiana de accesorios para running.
${estrategiaResumen ? `\nCONTEXTO DE CAMPAÑA:\n${estrategiaResumen}\n` : ''}
PIEZA A GENERAR:
Fecha: ${pieza.fecha}
Canal: ${pieza.canal}
Tipo: ${pieza.tipo_contenido}
Título: ${pieza.titulo}
${otrasHoy ? `\nOTRAS PIEZAS YA GENERADAS PARA ESTE DÍA (no repetir):\n${otrasHoy}\n` : ''}
Genera el contenido COMPLETO y LISTO PARA EJECUTAR:

Responde ÚNICAMENTE con JSON válido, sin texto antes ni después, sin bloques markdown.

{"copy_exacto":"[caption/texto completo para publicar sin backticks. Para email: ASUNTO: ... CUERPO: ... Para WhatsApp: mensaje directo. Para redes: caption + hashtags]","guion":"[SIEMPRE para video/reel/ugc/story/carrusel. VOZ EN OFF: SÍ o NO. Si NO: TEXTOS EN PANTALLA con segundo de aparición. SECUENCIA DE PLANOS numerada: qué se ve y duración en segundos. CTA FINAL: cómo termina. Para carrusel: SLIDE 1: texto, SLIDE 2, etc. Solo N/A si es email/pauta/WhatsApp]","musica_sugerida":"[Artista - Canción específica o género + BPM + mood + canción de referencia]","referencia_visual":"[Locación exacta en Medellín con zona. Hora del día y luz. Vestuario pieza por pieza. Ángulo y movimiento de cámara. Colores dominantes]","responsable":"[Creadora si es video/reel/ugc/story/carrusel/post. David si es email/pauta. Comité si requiere aprobación]"}`

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

    let updates = {
      id: pieza.id,
      copy_exacto: '',
      guion: '',
      musica_sugerida: '',
      referencia_visual: '',
      responsable: pieza.responsable || 'David',
    }
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      if (parsed.copy_exacto) updates.copy_exacto = parsed.copy_exacto.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim()
      if (parsed.guion) updates.guion = parsed.guion
      if (parsed.musica_sugerida) updates.musica_sugerida = parsed.musica_sugerida
      if (parsed.referencia_visual) updates.referencia_visual = parsed.referencia_visual
      if (parsed.responsable) updates.responsable = parsed.responsable
    } catch {
      updates.copy_exacto = text.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim()
    }

    const piezaId = pieza.id
    const patchRes = await fetch('/api/tareas', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    await patchRes.json()

    setDetailPiezas(prev => prev.map(p => p.id === piezaId ? { ...p, ...updates } : p))
  }

  // ─── VISTA LISTA ────────────────────────────────────────────────────────────
  if (view === 'list') return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a18', margin: 0 }}>Campañas</h1>
          <p style={{ fontSize: 13, color: '#6b6a63', margin: '4px 0 0' }}>{campanas.length} campaña{campanas.length !== 1 ? 's' : ''} guardadas</p>
        </div>
        <button onClick={() => setShowModoModal(true)}
          style={{ padding: '10px 20px', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Nueva campaña
        </button>
      </div>
      {/* Countdown + notificación cron */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F2F0EA', borderRadius: 10, padding: '8px 14px' }}>
          <span style={{ fontSize: 13 }}>⏱</span>
          <span style={{ fontSize: 12, color: '#6B6860' }}>Próxima auto-generación:</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1C1B18' }}>Domingo 10pm · en {proximoCron}</span>
        </div>
        {cronStatus === 'running' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EBF3FC', borderRadius: 10, padding: '8px 14px', animation: 'pulse 2s infinite' }}>
            <span style={{ fontSize: 13 }}>🤖</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#185FA5' }}>El CMO está generando una campaña automáticamente...</span>
          </div>
        )}
        {cronStatus === 'done' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#E8F5EE', borderRadius: 10, padding: '8px 14px' }}>
            <span style={{ fontSize: 13 }}>✓</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1A7A4A' }}>Nueva campaña generada automáticamente</span>
          </div>
        )}
      </div>

      {campanas.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 12, padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📣</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a18', marginBottom: 6 }}>Sin campañas aún</div>
          <div style={{ fontSize: 13, color: '#9c9a92', marginBottom: 20 }}>Crea tu primera campaña y el CMO genera toda la estrategia.</div>
          <button onClick={() => { setView('builder'); setStep(0) }} style={{ padding: '10px 20px', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Crear primera campaña</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {campanas.map(c => (
            <div key={c.id} style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a18' }}>{c.nombre}</div>
                <div style={{ fontSize: 11, color: '#9c9a92', marginTop: 3 }}>{c.fecha_inicio && c.fecha_fin ? `${c.fecha_inicio} → ${c.fecha_fin}` : 'Sin fechas'}{c.objetivo ? ` · ${c.objetivo}` : ''}</div>
              </div>
              <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 20, fontWeight: 700, background: c.estado === 'activa' ? '#dcfce7' : '#f0efe8', color: c.estado === 'activa' ? '#15803d' : '#6b6a63' }}>{c.estado}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setSelectedCampana(c); setDetailPiezas([]); setExpandedId(null); fetchDetailPiezas(c.id); setView('detail') }}
                  style={{ padding: '7px 14px', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Ver campaña
                </button>
                <Link href="/calendario" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#f0efe8', color: '#1a1a18', borderRadius: 8, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                  <Calendar size={12} /> Calendario
                </Link>
                <button onClick={async () => { await fetch(`/api/campanas?id=${c.id}`, { method: 'DELETE' }); fetchCampanas() }}
                  style={{ padding: '7px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9c9a92' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    {showModoModal && !showInvestigarForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }} onClick={() => setShowModoModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a18', marginBottom: 4 }}>Nueva campaña</div>
            <div style={{ fontSize: 13, color: '#6b6a63', marginBottom: 20 }}>¿Cómo quieres crear esta campaña?</div>

            {/* Countdown */}
            <div style={{ background: '#F2F0EA', borderRadius: 10, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>⏱</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9B9890', textTransform: 'uppercase', letterSpacing: '.5px' }}>Próxima auto-generación</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1B18' }}>Domingo 10pm Colombia — en {proximoCron}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => { setShowModoModal(false); setView('builder'); setStep(0); setEstrategia(''); setEstrategiaDone(false); setPlanRaw(''); setPlanDone(false); setSavedId(null); setSyncCount(0) }}
                style={{ padding: '18px 20px', background: '#F7F5F0', border: '1.5px solid #E5E2D9', borderRadius: 12, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1B18', marginBottom: 4 }}>✏️ Crear manualmente</div>
                <div style={{ fontSize: 12, color: '#6B6860' }}>Tú defines el nombre, fechas, objetivo y canales. El CMO genera la estrategia y el plan.</div>
              </button>
              <button onClick={() => setShowInvestigarForm(true)}
                style={{ padding: '18px 20px', background: '#1C1B18', border: 'none', borderRadius: 12, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>🔍 Investigar y generar automáticamente</div>
                <div style={{ fontSize: 12, color: '#9c9a92' }}>El CMO investiga tendencias, competencia y oportunidades en web, analiza campañas anteriores y crea la campaña solo.</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {showInvestigarForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }} onClick={() => setShowInvestigarForm(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1C1B18', marginBottom: 4 }}>🔍 Investigar y generar</div>
            <div style={{ fontSize: 13, color: '#6B6860', marginBottom: 24 }}>Opcional — deja vacío y el CMO decide todo solo.</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#9B9890', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Fecha de inicio</label>
                  <input type="date" value={investigarFechaInicio} onChange={e => setInvestigarFechaInicio(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E2D9', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#9B9890', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Fecha de fin</label>
                  <input type="date" value={investigarFechaFin} onChange={e => setInvestigarFechaFin(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E2D9', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#9B9890', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Contexto adicional para el CMO</label>
                <textarea value={investigarContexto} onChange={e => setInvestigarContexto(e.target.value)} rows={4}
                  placeholder="Ej: Tenemos stock alto de cinturones, prioriza ese producto. No usar el concepto del maratón. Esta semana hay descuento del 20% en medias. Solo contenido orgánico, sin pauta esta semana."
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E2D9', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'none', lineHeight: 1.5 }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowInvestigarForm(false)}
                  style={{ flex: 1, padding: '11px', border: '1px solid #E5E2D9', borderRadius: 9, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', background: '#fff', color: '#6B6860' }}>
                  Volver
                </button>
                <button onClick={investigarYGenerar}
                  style={{ flex: 2, padding: '11px', background: '#1C1B18', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  🔍 Investigar y generar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {investigando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', maxWidth: 400 }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a18', marginBottom: 8 }}>El CMO está investigando...</div>
            <div style={{ fontSize: 13, color: '#6b6a63', lineHeight: 1.6 }}>{investigacionLog}</div>
          </div>
        </div>
      )}
    </div>
  )

  // ─── VISTA DETALLE ──────────────────────────────────────────────────────────
  if (view === 'detail' && selectedCampana) {
    const estrategiaTexto = selectedCampana.output_claude?.replace('## Estrategia y narrativa\n', '') || ''
    const dias = agruparPorDia(detailPiezas)
    const totalPiezas = detailPiezas.length
    const generadas = detailPiezas.filter(p => p.copy_exacto).length

    return (
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setView('list')} style={{ fontSize: 12, color: '#185fa5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>← Campañas</button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a18', margin: 0, flex: 1 }}>{selectedCampana.nombre}</h1>
          <Link href="/calendario" target="_blank" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#f0efe8', color: '#1a1a18', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            <Calendar size={13} /> Ver en calendario
          </Link>
        </div>

        {/* Métricas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { l: 'Período', v: `${selectedCampana.fecha_inicio || '—'} → ${selectedCampana.fecha_fin || '—'}` },
            { l: 'Objetivo', v: selectedCampana.objetivo || '—' },
            { l: 'Piezas totales', v: String(totalPiezas) },
            { l: 'Con contenido', v: `${generadas} / ${totalPiezas}` },
          ].map(m => (
            <div key={m.l} style={{ background: '#f0efe8', borderRadius: 9, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.5px' }}>{m.l}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18', marginTop: 4 }}>{m.v}</div>
            </div>
          ))}
        </div>

        {/* Estrategia colapsable */}
        {estrategiaTexto && (
          <div style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 11, overflow: 'hidden', marginBottom: 16 }}>
            <button onClick={() => setOpenEstrategia(!openEstrategia)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18' }}>🎯 Estrategia y narrativa</span>
              {openEstrategia ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
            {openEstrategia && (
              <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f0efe8', fontSize: 13, color: '#6b6a63', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto' }}>
                {estrategiaTexto}
              </div>
            )}
          </div>
        )}

        {/* Piezas por día */}
        {detailLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 20, color: '#185fa5', fontSize: 13 }}>
            <Loader2 size={16} className="animate-spin" /> Cargando piezas...
          </div>
        ) : totalPiezas === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 11, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#9c9a92', marginBottom: 16 }}>Esta campaña no tiene piezas en el calendario aún.</div>
            <button onClick={() => { setView('builder'); setStep(1); setEstrategiaDone(true); setEstrategia(selectedCampana?.output_claude || ''); estrategiaRef.current = selectedCampana?.output_claude || '' }} style={{ padding: '9px 18px', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Generar plan de contenido →</button>
          </div>
        ) : (
          dias.map(({ fecha, piezas }) => {
            const todasGeneradas = piezas.every(p => p.copy_exacto)
            const algunaGenerando = piezas.some(p => generandoId === p.id)
            const sinContenido = piezas.filter(p => !p.copy_exacto).length

            return (
              <div key={fecha} style={{ background: '#fff', border: `1px solid ${todasGeneradas ? '#bbf7d0' : '#e0dfd5'}`, borderRadius: 11, overflow: 'hidden', marginBottom: 8 }}>
                {/* Header día */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', gap: 12 }}>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setOpenPlan(openPlan === fecha ? null : fecha)}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18', textTransform: 'capitalize' }}>{formatFecha(fecha)}</div>
                    <div style={{ fontSize: 11, color: '#9c9a92', marginTop: 2 }}>{piezas.length} pieza{piezas.length !== 1 ? 's' : ''} · {sinContenido > 0 ? `${sinContenido} sin contenido` : 'Todo generado ✓'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {todasGeneradas && <span style={{ fontSize: 11, color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={12} /> Listo</span>}
                    {!algunaGenerando && sinContenido > 0 && (
                      <button onClick={() => generarDia(fecha, estrategiaTexto)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <Sparkles size={11} /> Generar día
                      </button>
                    )}
                    {algunaGenerando && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#185fa5' }}><Loader2 size={12} className="animate-spin" /> Generando...</div>}
                  </div>
                </div>

                {/* Piezas */}
                {piezas.map((pieza) => {
                  const isGenerando = generandoId === pieza.id
                  const isExpanded = expandedId === pieza.id
                  const tieneCopy = !!pieza.copy_exacto

                  return (
                    <div key={pieza.id} style={{ borderTop: '1px solid #f0efe8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: pieza.color || '#185fa5', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a18' }}>{pieza.titulo}</div>
                          <div style={{ fontSize: 11, color: '#9c9a92' }}>{pieza.canal} · {pieza.tipo_contenido}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {tieneCopy && (
                            <button onClick={() => setExpandedId(isExpanded ? null : pieza.id)}
                              style={{ fontSize: 11, color: '#185fa5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                              {isExpanded ? '▲ Cerrar' : '▼ Ver'}
                            </button>
                          )}
                          {!isGenerando && (
                            <button onClick={() => generarContenidoPieza(pieza, estrategiaTexto)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: tieneCopy ? '#f0efe8' : '#7c3aed', color: tieneCopy ? '#6b6a63' : '#fff', border: 'none', borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                              <Sparkles size={10} />{tieneCopy ? 'Regenerar' : 'Generar'}
                            </button>
                          )}
                          {isGenerando && <Loader2 size={13} className="animate-spin" style={{ color: '#7c3aed' }} />}
                        </div>
                      </div>

                      {isExpanded && tieneCopy && (
                        <div style={{ padding: '12px 20px 16px 38px', background: '#f9f8f4', borderTop: '1px solid #f0efe8' }}>
                          {[
                            { label: 'Copy exacto', value: pieza.copy_exacto },
                            { label: 'Guión', value: pieza.guion },
                            { label: 'Música sugerida', value: pieza.musica_sugerida },
                            { label: 'Referencia visual', value: pieza.referencia_visual },
                          ].filter(f => f.value).map(field => (
                            <div key={field.label} style={{ marginBottom: 10 }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{field.label}</div>
                              <div style={{ fontSize: 12, color: '#1a1a18', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: '#fff', border: '1px solid #e0dfd5', borderRadius: 7, padding: '8px 10px' }}>{field.value}</div>
                            </div>
                          ))}
                          <div style={{ fontSize: 11, color: '#9c9a92' }}>Responsable: <strong>{pieza.responsable}</strong></div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
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
                <div style={{ fontSize: 11, color: '#9c9a92', marginTop: 1 }}>Concepto creativo, posicionamiento y narrativa</div>
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

          {/* FASE 2 — PLAN */}
          {estrategiaDone && (
            <div style={{ background: '#fff', border: `1px solid ${planDone ? '#bbf7d0' : '#e0dfd5'}`, borderRadius: 11, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', gap: 12 }}>
                <span style={{ fontSize: 20 }}>📋</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18' }}>Plan de contenido</div>
                  <div style={{ fontSize: 11, color: '#9c9a92', marginTop: 1 }}>
                    {planLoading ? `Guardando piezas en calendario... ${syncCount} guardadas` : planDone ? `${syncCount} piezas guardadas en calendario` : 'El CMO decide qué publicar, cuándo y en qué canal'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {planDone && <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={13} /> {syncCount} piezas</span>}
                  {!planLoading && <button onClick={generarPlan} style={{ padding: '7px 14px', background: planDone ? '#f0efe8' : '#1a1a18', color: planDone ? '#6b6a63' : '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{planDone ? '↻ Regenerar' : '✦ Generar plan'}</button>}
                  {planLoading && <Loader2 size={14} className="animate-spin" style={{ color: '#185fa5' }} />}
                  {planRaw && <button onClick={() => setOpenPlan(openPlan === 'plan' ? null : 'plan')} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#9c9a92' }}>{openPlan === 'plan' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>}
                </div>
              </div>
              {planLoading && <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#185fa5', borderTop: '1px solid #f0efe8' }}><Loader2 size={14} className="animate-spin" /> Generando plan y guardando en calendario...</div>}
              {planRaw && openPlan && <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f0efe8', fontSize: 12, color: '#1a1a18', lineHeight: 2, whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto', fontFamily: 'monospace' }}>{planRaw}</div>}
            </div>
          )}

          {/* CTA */}
          {planDone && savedId && (
            <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 11, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>✓ {syncCount} piezas guardadas en el calendario</div>
                <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>Ahora genera el contenido de cada pieza desde la campaña o desde el calendario</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { fetchDetailPiezas(savedId); setSelectedCampana(campanas.find(c => c.id === savedId) || null as unknown as Campana); setView('detail') }}
                  style={{ padding: '9px 16px', background: '#15803d', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Ver piezas →
                </button>
                <Link href="/calendario" style={{ padding: '9px 16px', background: '#fff', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                  <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} /> Calendario
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, color: '#6b6a63', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #c0bfb5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#1a1a18' }
