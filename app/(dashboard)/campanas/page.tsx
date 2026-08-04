'use client'
import { useState, useEffect } from 'react'
import { Loader2, ChevronDown, ChevronRight, Check, Calendar, Save, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'

// ─── TIPOS ───────────────────────────────────────────────────────────────────
interface Fase {
  id: string
  label: string
  emoji: string
  descripcion: string
  output: string
  loading: boolean
  done: boolean
  prompt: (ctx: CampanaCtx) => string
}

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

interface Tarea {
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
}

interface Campana {
  id: string; nombre: string; estado: string; fecha_inicio: string
  fecha_fin: string; objetivo: string; created_at: string
}

// ─── COLORES ─────────────────────────────────────────────────────────────────
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

// ─── PARSER DE TAREAS ─────────────────────────────────────────────────────────
function parseTareas(texto: string, campanaId: string): Record<string, unknown>[] {
  const tareas: Record<string, unknown>[] = []
  // Buscar bloques TAREA:
  const bloques = texto.split(/(?=TAREA:|\n-\s*TAREA:)/).filter(b => b.includes('FECHA:'))
  
  for (const bloque of bloques) {
    const get = (key: string) => {
      const match = bloque.match(new RegExp(`${key}:\\s*([^\\n]+)`))
      return match ? match[1].trim() : ''
    }
    const fecha = get('FECHA')
    const canal = get('CANAL')
    const tipo = get('TIPO')
    const titulo = get('TITULO') || get('TAREA')
    
    if (!fecha || !canal) continue
    
    // Extraer copy exacto (puede ser multiline)
    const copyMatch = bloque.match(/COPY:([\s\S]*?)(?=GUION:|MUSICA:|REFERENCIA:|RESPONSABLE:|TAREA:|$)/i)
    const copy = copyMatch ? copyMatch[1].trim() : ''
    
    const guionMatch = bloque.match(/GUION:([\s\S]*?)(?=MUSICA:|REFERENCIA:|RESPONSABLE:|TAREA:|$)/i)
    const guion = guionMatch ? guionMatch[1].trim() : ''
    
    const canalClean = canal.trim()
    
    tareas.push({
      fecha: fecha.trim(),
      canal: canalClean,
      tipo_contenido: tipo.trim() || 'Contenido',
      titulo: titulo.trim() || `${tipo} ${canalClean}`,
      copy_exacto: copy,
      guion: guion,
      musica_sugerida: get('MUSICA'),
      referencia_visual: get('REFERENCIA'),
      responsable: get('RESPONSABLE') || 'David',
      estado: 'pendiente',
      color: CANAL_COLORS[canalClean] || '#185fa5',
      campana_id: campanaId,
      tipo: ['Email','email'].some(e => canalClean.includes(e)) ? 'email' :
            ['WhatsApp','whatsapp'].some(e => canalClean.includes(e)) ? 'whatsapp' :
            ['Ads','Pauta'].some(e => canalClean.includes(e)) ? 'pauta' :
            ['Offline','Stand'].some(e => canalClean.includes(e)) ? 'offline' : 'contenido',
    })
  }
  return tareas
}

// ─── FASES DE GENERACIÓN ──────────────────────────────────────────────────────
function buildFases(ctx: CampanaCtx): Fase[] {
  const eventoLabel = EVENTOS.find(e => e.value === ctx.evento)?.label || 'Sin evento específico'
  const base = `CAMPAÑA: ${ctx.nombre}
PERÍODO: ${ctx.fecha_inicio} al ${ctx.fecha_fin}
PRESUPUESTO: ${ctx.presupuesto} COP
EVENTO RELACIONADO: ${eventoLabel}
OBJETIVO: ${ctx.objetivo}
CANALES: ${ctx.canales.join(', ')}
AUDIENCIA: ${ctx.audiencia.join(', ')}
CREADORA: ${ctx.creadora}
NOTAS: ${ctx.notas || 'Ninguna'}`

  return [
    {
      id: 'estrategia',
      label: 'Estrategia y narrativa',
      emoji: '🎯',
      descripcion: 'Concepto creativo, posicionamiento y narrativa de la campaña',
      output: '', loading: false, done: false,
      prompt: () => `${base}

Genera la ESTRATEGIA COMPLETA de la campaña con estas secciones:

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
    },
    {
      id: 'cronograma',
      label: 'Cronograma día a día',
      emoji: '📅',
      descripcion: 'Cada día del período con su tarea específica lista para ejecutar',
      output: '', loading: false, done: false,
      prompt: () => `${base}

Genera el CRONOGRAMA COMPLETO día a día desde ${ctx.fecha_inicio} hasta ${ctx.fecha_fin}.

FORMATO OBLIGATORIO para cada tarea (exactamente así):

TAREA:
FECHA: YYYY-MM-DD
CANAL: [Instagram/TikTok/Meta Ads/Google Ads/Email/WhatsApp/Offline]
TIPO: [Reel/Carrusel/Story/Post/Pauta/Email/Estado/Video UGC]
TITULO: [Título corto descriptivo]
COPY: [Texto EXACTO y completo para publicar — listo para copiar y pegar]
GUION: [Si es video: Hook exacto (0-3s) → Desarrollo (4-25s) → CTA (últimos 3s). Si no aplica, dejar vacío]
MUSICA: [Artista - Canción específica O género + mood. Ej: "Bad Bunny - Un Verano Sin Ti (energía latina)" o "EDM motivacional, 128 BPM, tipo Nike Run"]
REFERENCIA: [Descripción visual exacta: locación, vestuario, iluminación, ángulo de cámara]
RESPONSABLE: [David/Creadora/Comité]

Genera UNA tarea por día como mínimo. Para días de alta intensidad (antes de carreras, lanzamientos), genera múltiples tareas.
No saltes ningún día del período.
Los copies deben estar LISTOS para publicar sin modificaciones.`
    },
    {
      id: 'copies',
      label: 'Copies y carruseles',
      emoji: '✍️',
      descripcion: 'Textos completos, slide por slide de carruseles, captions con hashtags',
      output: '', loading: false, done: false,
      prompt: () => `${base}

Genera TODO el contenido de texto de la campaña:

## CAPTIONS PARA REELS/POSTS (5 variaciones)
Para cada uno:
- Primera línea (el gancho — máx 125 caracteres)
- Cuerpo del texto (completo, listo para publicar)
- CTA específico
- Hashtags (20 hashtags relevantes)

## CARRUSELES (3 carruseles completos)
Para cada carrusel:
- Slide 1 (portada): Texto exacto + descripción visual
- Slides 2-7: Texto exacto de cada slide
- Slide final: CTA exacto

## TEXTOS PARA STORIES (secuencia de 6 stories)
Para cada story:
- Texto en pantalla (máx 5 palabras potentes)
- Sticker sugerido (encuesta/pregunta/cuenta regresiva)
- CTA

## COPIES PARA META ADS (3 variaciones)
Cada una con:
- Texto principal (125 caracteres)
- Titular (40 caracteres)
- Descripción (30 caracteres)

Todo debe estar en voz de Terret. Todo listo para copiar y pegar directamente.`
    },
    {
      id: 'guiones',
      label: 'Guiones de video',
      emoji: '🎬',
      descripcion: 'Guiones completos para cada video UGC con música, locación y vestuario',
      output: '', loading: false, done: false,
      prompt: () => `${base}

Genera GUIONES COMPLETOS para todos los videos de la campaña:

## VIDEO UGC PRINCIPAL (60-90 segundos)
**CONCEPTO:** [Idea central]
**LOCACIÓN:** [Dónde grabar — específico: parque, ruta, gimnasio, calle]
**VESTUARIO:** [Qué ropa Terret usar — colores, productos específicos]
**ILUMINACIÓN:** [Natural mañana / tarde / noche / artificial]
**MÚSICA DE FONDO:** [Artista - Canción específica + timestamp de qué parte usar]
**GUION EXACTO:**
- HOOK (0-3s): [Texto exacto que dice la creadora O acción visual]
- DESARROLLO (4-45s): [Escena por escena — qué hace, qué dice, qué muestra]
- CTA (46-60s): [Texto exacto del cierre + call to action]
**SUBTÍTULOS:** [Frases clave para poner en pantalla]

## REEL 15 SEGUNDOS (x3 variaciones)
Para cada reel:
- Concepto en una línea
- Texto en pantalla segundo a segundo
- Audio/música sugerida
- Transiciones

## VIDEO PARA META ADS (30 segundos)
- Hook visual (qué se ve en el primer frame)
- Desarrollo
- Oferta/CTA final
- Texto en pantalla

La creadora debe poder leer esto y grabar sin preguntar nada.`
    },
    {
      id: 'pauta',
      label: 'Estrategia de pauta',
      emoji: '📢',
      descripcion: 'Estructura completa de Meta Ads, Google Ads y TikTok Ads',
      output: '', loading: false, done: false,
      prompt: () => `${base}

Genera la ESTRATEGIA COMPLETA DE PAUTA PAGADA:

## META ADS
**Estructura de campaña:**
- Campaña: [Nombre + objetivo de campaña]
- Presupuesto total Meta: $[X] COP
- Distribución por semana: Semana 1: $X, Semana 2: $X, etc.

**Conjuntos de anuncios:**
Para cada adset:
- Nombre del adset
- Audiencia detallada (intereses, comportamientos, edades)
- Presupuesto diario
- Formato del anuncio
- Copy a usar (de los generados en la fase de copies)

**Segmentación recomendada:**
- Audiencia fría (prospección)
- Audiencia tibia (retargeting visitantes web)
- Audiencia caliente (clientes anteriores)

## GOOGLE ADS
- Tipo de campaña recomendada
- Keywords principales (15 keywords con match type)
- Presupuesto diario
- Extensiones de anuncio

## TIKTOK ADS
- Formato de campaña
- Audiencia
- Presupuesto
- Creative guidelines específicas para TikTok

## CALENDARIO DE PAUTA
- Qué activar cuándo y por qué
- Cuándo escalar presupuesto
- Cuándo pausar y optimizar

## MÉTRICAS Y SEMÁFOROS
- Verde: ROAS >7x, CPM <$X, CTR >2%
- Amarillo: ROAS 5-7x — mantener y optimizar
- Rojo: ROAS <5x — pausar y revisar`
    },
    {
      id: 'email_whatsapp',
      label: 'Emails y WhatsApp',
      emoji: '📧',
      descripcion: 'Emails completos listos para enviar y estados de WhatsApp',
      output: '', loading: false, done: false,
      prompt: () => `${base}

Genera toda la comunicación directa de la campaña:

## SECUENCIA DE EMAILS (mínimo 4 emails)

### EMAIL 1 — ANUNCIO (enviar al inicio de campaña)
- ASUNTO A: [opción A]
- ASUNTO B: [opción B para A/B test]
- PREHEADER: [texto del preheader]
- CUERPO COMPLETO:
[Texto exacto del email — saludos, cuerpo, CTA]
- CTA BOTÓN: [Texto del botón]
- URL: [terretsports.com/...]

### EMAIL 2 — CONTENIDO DE VALOR (mitad de campaña)
[Mismo formato]

### EMAIL 3 — URGENCIA (3 días antes del fin/evento)
[Mismo formato]

### EMAIL 4 — ÚLTIMO LLAMADO (día final)
[Mismo formato]

## ESTADOS DE WHATSAPP (7 estados — uno por día de la semana)
Para cada estado:
- Texto (máx 139 caracteres)
- Emoji sugerido
- Día recomendado para publicar

## MENSAJES DE DIFUSIÓN WHATSAPP (3 mensajes)
Para cada mensaje:
- Texto completo (tono personal, no spam)
- Cuándo enviar
- Qué segmento de contactos

Todo debe estar listo para copiar y pegar directamente.`
    },
  ]
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function CampanasPage() {
  const [view, setView] = useState<'list' | 'builder' | 'detail'>('list')
  const [campanas, setCampanas] = useState<Campana[]>([])
  const [selectedCampana, setSelectedCampana] = useState<Campana | null>(null)

  // Builder state
  const [step, setStep] = useState(0) // 0=form, 1=fases
  const [ctx, setCtx] = useState<CampanaCtx>({
    nombre: '', descripcion: '', fecha_inicio: '', fecha_fin: '',
    presupuesto: '', evento: '', objetivo: '',
    canales: ['Meta Ads', 'Instagram orgánico', 'Email marketing'],
    creadora: 'Sí, disponible completo',
    audiencia: ['Corredores urbanos / running'], notas: ''
  })
  const [fases, setFases] = useState<Fase[]>([])
  const [openFase, setOpenFase] = useState<string | null>(null)
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

  function startBuilder() {
    const fs = buildFases(ctx)
    setFases(fs)
    setStep(1)
    setOpenFase(fs[0].id)
    setSavedId(null)
    setSyncDone(false)
  }

  async function generarFase(faseId: string) {
    const fase = fases.find(f => f.id === faseId)
    if (!fase) return

    setFases(prev => prev.map(f => f.id === faseId ? { ...f, loading: true, output: '' } : f))

    const res = await fetch('/api/claude', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'campana', messages: [{ role: 'user', content: fase.prompt(ctx) }] })
    })

    const reader = res.body!.getReader(); const dec = new TextDecoder(); let text = ''
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      text += dec.decode(value)
      setFases(prev => prev.map(f => f.id === faseId ? { ...f, output: text } : f))
    }

    setFases(prev => prev.map(f => f.id === faseId ? { ...f, loading: false, done: true } : f))
  }

  async function generarTodas() {
    for (const fase of fases) {
      if (!fase.done) await generarFase(fase.id)
    }
  }

  async function saveCampana(): Promise<string> {
    setSaving(true)
    const allOutput = fases.map(f => `\n\n## ${f.label}\n${f.output}`).join('')
    const res = await fetch('/api/campanas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: ctx.nombre, descripcion: ctx.descripcion,
        fecha_inicio: ctx.fecha_inicio || null, fecha_fin: ctx.fecha_fin || null,
        presupuesto: parseFloat(ctx.presupuesto.replace(/\./g, '').replace(',', '.')) || null,
        evento_relacionado: ctx.evento, objetivo: ctx.objetivo,
        canales: ctx.canales, audiencia: ctx.audiencia, notas: ctx.notas,
        output_claude: allOutput, estado: 'activa'
      })
    })
    const d = await res.json()
    setSavedId(d.id)
    setSaving(false)
    fetchCampanas()
    return d.id
  }

  async function syncCalendario() {
    setSyncing(true)
    let cid = savedId
    if (!cid) cid = await saveCampana()
    if (!cid) { setSyncing(false); return }

    const cronogramaFase = fases.find(f => f.id === 'cronograma')
    const guionesFase = fases.find(f => f.id === 'guiones')

    if (!cronogramaFase?.output) { setSyncing(false); return }

    const tareas = parseTareas(cronogramaFase.output, cid)

    // Enriquecer con guiones si existen
    if (guionesFase?.output) {
      // Los guiones ya están en los copies del cronograma
    }

    if (tareas.length > 0) {
      await fetch(`/api/tareas?campana_id=${cid}`, { method: 'DELETE' })
      await fetch('/api/tareas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tareas)
      })
      setSyncCount(tareas.length)
    }

    setSyncing(false)
    setSyncDone(true)
  }

  const fasesCompletadas = fases.filter(f => f.done).length
  const todasListas = fases.length > 0 && fasesCompletadas === fases.length

  // ─── VISTA LISTA ────────────────────────────────────────────────────────────
  if (view === 'list') return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a18', margin: 0 }}>Campañas</h1>
          <p style={{ fontSize: 13, color: '#6b6a63', margin: '4px 0 0' }}>{campanas.length} campaña{campanas.length !== 1 ? 's' : ''} guardadas</p>
        </div>
        <button onClick={() => { setView('builder'); setStep(0); setFases([]); setSavedId(null); setSyncDone(false) }}
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
                  <Eye size={12} /> Ver estrategia
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
    const sections = (selectedCampana as Campana & { output_claude?: string }).output_claude?.split(/^## /m).filter(Boolean) || []
    return (
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setView('list')} style={{ fontSize: 12, color: '#185fa5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>← Volver</button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a18', margin: 0, flex: 1 }}>{selectedCampana.nombre}</h1>
          <Link href={`/tareas?campana_id=${selectedCampana.id}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#1a1a18', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            <Calendar size={13} /> Ver tareas en calendario
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
              <button onClick={() => setOpenFase(openFase === title ? null : title)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18' }}>{title}</span>
                {openFase === title ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
              {openFase === title && (
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

  // ─── VISTA BUILDER ────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setView('list')} style={{ fontSize: 12, color: '#185fa5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>← Campañas</button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a18', margin: 0 }}>
          {step === 0 ? 'Nueva campaña' : ctx.nombre}
        </h1>
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
              <button onClick={startBuilder}
                disabled={!ctx.nombre || !ctx.fecha_inicio || !ctx.fecha_fin}
                style={{ padding: '12px 28px', background: ctx.nombre && ctx.fecha_inicio && ctx.fecha_fin ? '#1a1a18' : '#c0bfb5', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: ctx.nombre && ctx.fecha_inicio && ctx.fecha_fin ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                Generar estrategia completa →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: FASES */}
      {step === 1 && (
        <div>
          {/* Progress bar */}
          <div style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18' }}>{ctx.nombre}</div>
              <div style={{ fontSize: 11, color: '#9c9a92', marginTop: 2 }}>{ctx.fecha_inicio} → {ctx.fecha_fin} · {fasesCompletadas}/{fases.length} fases completadas</div>
              <div style={{ height: 4, background: '#f0efe8', borderRadius: 2, marginTop: 8, width: 200, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#1a1a18', borderRadius: 2, width: `${(fasesCompletadas / fases.length) * 100}%`, transition: 'width .3s' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!todasListas && (
                <button onClick={generarTodas}
                  style={{ padding: '9px 16px', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✦ Generar todo automáticamente
                </button>
              )}
              {!savedId && fasesCompletadas > 0 && (
                <button onClick={saveCampana} disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Guardar campaña
                </button>
              )}
              {savedId && !syncDone && (
                <button onClick={syncCalendario} disabled={syncing}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#185fa5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {syncing ? <Loader2 size={13} className="animate-spin" /> : <Calendar size={13} />}
                  {syncing ? 'Sincronizando...' : 'Poner en calendario'}
                </button>
              )}
              {syncDone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#dcfce7', color: '#15803d', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                  <Check size={13} /> {syncCount} tareas en calendario
                </div>
              )}
              {savedId && (
                <Link href="/tareas" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#f0efe8', color: '#1a1a18', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                  Ver tareas →
                </Link>
              )}
            </div>
          </div>

          {/* Fases */}
          {fases.map(fase => (
            <div key={fase.id} style={{ background: '#fff', border: `1px solid ${fase.done ? '#bbf7d0' : '#e0dfd5'}`, borderRadius: 11, overflow: 'hidden', marginBottom: 10 }}>
              {/* Header de fase */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', gap: 12 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{fase.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18' }}>{fase.label}</div>
                  <div style={{ fontSize: 11, color: '#9c9a92', marginTop: 1 }}>{fase.descripcion}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {fase.done && <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#15803d' }}><Check size={13} /> Completado</div>}
                  {!fase.loading && (
                    <button onClick={() => generarFase(fase.id)}
                      style={{ padding: '7px 14px', background: fase.done ? '#f0efe8' : '#1a1a18', color: fase.done ? '#6b6a63' : '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {fase.done ? '↻ Regenerar' : '✦ Generar'}
                    </button>
                  )}
                  {fase.output && (
                    <button onClick={() => setOpenFase(openFase === fase.id ? null : fase.id)}
                      style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#9c9a92' }}>
                      {openFase === fase.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Loading */}
              {fase.loading && (
                <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#185fa5', borderTop: '1px solid #f0efe8' }}>
                  <Loader2 size={14} className="animate-spin" /> Generando {fase.label.toLowerCase()}...
                </div>
              )}

              {/* Output */}
              {fase.output && openFase === fase.id && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f0efe8', fontSize: 13, color: '#1a1a18', lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 600, overflowY: 'auto' }}>
                  {fase.output}
                </div>
              )}

              {/* Preview cerrado */}
              {fase.output && openFase !== fase.id && !fase.loading && (
                <div style={{ padding: '0 20px 12px', borderTop: '1px solid #f0efe8', fontSize: 12, color: '#9c9a92', overflow: 'hidden', maxHeight: 36, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {fase.output.slice(0, 150)}...
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Estilos reutilizables
const lbl: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, color: '#6b6a63', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #c0bfb5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#1a1a18' }
