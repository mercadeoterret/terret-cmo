'use client'
import { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, parseISO, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, X, Sparkles, Loader2, Search } from 'lucide-react'
import { RACES_CO, COMMERCIAL_DATES, RACES_INTL } from '@/lib/terret-context'

const DS = {
  bg: '#F2F0EA', surface: '#FFFFFF', border: '#E5E2D9', surface2: '#F7F5F0',
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

interface Evento {
  id?: string; fecha: string; titulo: string; descripcion?: string; tipo: string
  canal?: string; color?: string; estado?: string; copy_exacto?: string
  guion?: string; musica_sugerida?: string; referencia_visual?: string
  responsable?: string; source?: string; tipo_contenido?: string; campana_id?: string
}

interface FechaNueva {
  fecha: string; nombre: string; tipo: 'carrera' | 'comercial'; ciudad?: string; distancia?: string
}

export default function CalendarioPage() {
  const [cur, setCur] = useState(new Date())
  const [eventos, setEventos] = useState<Evento[]>([])
  const [selDay, setSelDay] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ titulo: '', tipo: 'contenido', canal: '', descripcion: '' })
  const [generandoId, setGenerandoId] = useState<string | null>(null)
  const [generandoDia, setGenerandoDia] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [buscandoFechas, setBuscandoFechas] = useState(false)
  const [fechasNuevas, setFechasNuevas] = useState<FechaNueva[]>([])
  const [showFechasModal, setShowFechasModal] = useState(false)
  const [fechasExtras, setFechasExtras] = useState<FechaNueva[]>([])

  const ms = startOfMonth(cur)
  const me = endOfMonth(cur)
  const days = eachDayOfInterval({ start: ms, end: me })
  const pad = (getDay(ms) + 6) % 7

  const load = useCallback(async () => {
    const from = format(ms, 'yyyy-MM-dd')
    const to = format(me, 'yyyy-MM-dd')
    const r = await fetch(`/api/tareas?from=${from}&to=${to}`)
    const d = await r.json()
    setEventos(Array.isArray(d) ? d.map((e: Evento) => ({ ...e, source: 'db' })) : [])
  }, [cur])

  useEffect(() => { load() }, [load])

  // Cargar fechas extras guardadas en localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('terret_fechas_extras')
      if (saved) setFechasExtras(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  function getDbEvs(dateStr: string): Evento[] {
    return eventos.filter(e => e.fecha === dateStr)
  }

  function getStaticEvs(dateStr: string): { titulo: string; tipo: string; color: string; badge: string }[] {
    const all: { titulo: string; tipo: string; color: string; badge: string }[] = []
    RACES_CO.filter(r => r.date === dateStr).forEach(r =>
      all.push({ titulo: r.name, tipo: 'carrera', color: DS.danger, badge: '🏃' }))
    COMMERCIAL_DATES.filter(f => f.date === dateStr).forEach(f =>
      all.push({ titulo: f.name, tipo: 'comercial', color: DS.warning, badge: '📅' }))
    RACES_INTL.filter(r => r.date === dateStr).forEach(r =>
      all.push({ titulo: `${r.name}`, tipo: 'intl', color: DS.info, badge: '🌎' }))
    fechasExtras.filter(f => f.fecha === dateStr).forEach(f =>
      all.push({ titulo: f.nombre, tipo: f.tipo, color: f.tipo === 'carrera' ? DS.danger : DS.warning, badge: f.tipo === 'carrera' ? '🏃' : '📅' }))
    return all
  }

  async function cambiarEstado(id: string, estado: string) {
    await fetch('/api/tareas', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado, completado: estado === 'publicado' })
    })
    load()
  }

  async function saveEv() {
    if (!form.titulo || !selDay) return
    await fetch('/api/tareas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, fecha: selDay, color: DS.info, estado: 'pendiente', responsable: 'David', tipo: 'contenido' })
    })
    setAddOpen(false)
    setForm({ titulo: '', tipo: 'contenido', canal: '', descripcion: '' })
    load()
  }

  async function generarContenidoPieza(ev: Evento) {
    if (!ev.id) return
    setGenerandoId(ev.id)

    let estrategiaCampana = ''
    if (ev.campana_id) {
      const r = await fetch('/api/campanas')
      const campanas = await r.json()
      const campana = campanas.find((c: { id: string; output_claude?: string }) => c.id === ev.campana_id)
      if (campana?.output_claude) estrategiaCampana = campana.output_claude.split('## Plan de contenido')[0].substring(0, 800)
    }

    const otrasHoy = eventos
      .filter(e => e.fecha === ev.fecha && e.id !== ev.id && e.copy_exacto)
      .map(e => `- ${e.canal} | ${e.tipo_contenido}: ${e.titulo}`)
      .join('\n')

    const prompt = `Eres el Director de Marketing de Terret, marca colombiana de accesorios para running.
${estrategiaCampana ? `CONTEXTO DE CAMPAÑA:\n${estrategiaCampana}\n` : ''}
PIEZA A GENERAR:
Fecha: ${ev.fecha} | Canal: ${ev.canal} | Tipo: ${ev.tipo_contenido} | Título: ${ev.titulo}
${otrasHoy ? `OTRAS PIEZAS HOY (no repetir):\n${otrasHoy}` : ''}

COPY EXACTO:
[Texto completo listo para publicar con hashtags]

GUION:
[Si es video: Hook(0-3s)→Desarrollo(4-25s)→CTA. Si no aplica: N/A]

MUSICA:
[Artista - Canción O género + mood]

REFERENCIA VISUAL:
[Locación, vestuario, iluminación, ángulo]

RESPONSABLE:
[David / Creadora / Comité]`

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

    const getField = (key: string) => {
      const match = text.match(new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-ZÁÉÍÓÚ ]+:|$)`, 'i'))
      return match ? match[1].trim().replace(/^N\/A$/i, '') : ''
    }

    await fetch('/api/tareas', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: ev.id,
        copy_exacto: getField('COPY EXACTO'),
        guion: getField('GUION'),
        musica_sugerida: getField('MUSICA'),
        referencia_visual: getField('REFERENCIA VISUAL'),
        responsable: getField('RESPONSABLE') || 'David',
      })
    })

    setGenerandoId(null)
    setExpandedId(ev.id)
    load()
  }

  async function generarTodoDia(fecha: string) {
    setGenerandoDia(fecha)
    const sinContenido = eventos.filter(e => e.fecha === fecha && !e.copy_exacto)
    for (const ev of sinContenido) await generarContenidoPieza(ev)
    setGenerandoDia(null)
  }

  async function buscarFechasNuevas() {
    setBuscandoFechas(true)
    setFechasNuevas([])

    const today = format(new Date(), 'yyyy-MM-dd')
    const prompt = `Busca en web carreras de running y fechas comerciales relevantes para Colombia en los próximos 6 meses desde ${today}.

Busca: "calendario carreras running Colombia 2026", "maratones Colombia 2026", "fechas comerciales Colombia 2026"

Responde ÚNICAMENTE con un JSON array así (sin texto adicional):
[
  {"fecha":"YYYY-MM-DD","nombre":"Nombre del evento","tipo":"carrera","ciudad":"Ciudad","distancia":"42K"},
  {"fecha":"YYYY-MM-DD","nombre":"Nombre fecha","tipo":"comercial"}
]

Solo incluye eventos que NO estén ya en esta lista:
${[...RACES_CO, ...COMMERCIAL_DATES].map(e => `- ${e.date}: ${e.name}`).join('\n').substring(0, 500)}`

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

    try {
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      if (Array.isArray(parsed)) {
        setFechasNuevas(parsed)
        setShowFechasModal(true)
      }
    } catch { /* ignore parse error */ }

    setBuscandoFechas(false)
  }

  function agregarFecha(f: FechaNueva) {
    const nuevas = [...fechasExtras, f]
    setFechasExtras(nuevas)
    localStorage.setItem('terret_fechas_extras', JSON.stringify(nuevas))
    setFechasNuevas(prev => prev.filter(x => x.fecha !== f.fecha || x.nombre !== f.nombre))
  }

  const selDbEvs = selDay ? getDbEvs(selDay) : []
  const selStaticEvs = selDay ? getStaticEvs(selDay) : []
  const selPendientes = selDbEvs.filter(e => !e.copy_exacto)

  return (
    <div style={{ maxWidth: 1150, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: DS.text, margin: 0, letterSpacing: '-0.5px' }}>Calendario editorial</h1>
          <p style={{ fontSize: 13, color: DS.textSecondary, margin: '4px 0 0' }}>Tareas, carreras y fechas comerciales.</p>
        </div>
        <button onClick={buscarFechasNuevas} disabled={buscandoFechas}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: DS.text, color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: buscandoFechas ? 'default' : 'pointer', fontFamily: 'inherit', opacity: buscandoFechas ? 0.7 : 1 }}>
          {buscandoFechas ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
          {buscandoFechas ? 'Buscando...' : 'Buscar fechas nuevas'}
        </button>
      </div>

      {/* Calendario */}
      <div style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {/* Nav mes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setCur(subMonths(cur, 1))}
              style={{ padding: '6px 10px', border: `1px solid ${DS.border}`, borderRadius: 8, background: DS.surface, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={15} color={DS.textSecondary} />
            </button>
            <h2 style={{ fontSize: 16, fontWeight: 700, minWidth: 200, textAlign: 'center', margin: 0, color: DS.text }}>
              {format(cur, "MMMM 'de' yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
            </h2>
            <button onClick={() => setCur(addMonths(cur, 1))}
              style={{ padding: '6px 10px', border: `1px solid ${DS.border}`, borderRadius: 8, background: DS.surface, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ChevronRight size={15} color={DS.textSecondary} />
            </button>
          </div>
          {/* Leyenda */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {[
              { color: DS.dangerLight, border: DS.danger, label: 'Carrera' },
              { color: DS.warningLight, border: DS.warning, label: 'Fecha comercial' },
              { color: '#EDE9FE', border: '#7C3AED', label: 'Contenido' },
              { color: DS.infoLight, border: DS.info, label: 'Pauta' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: DS.textSecondary }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color, border: `1px solid ${l.border}` }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Días de la semana */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: DS.textTertiary, padding: '4px 0', letterSpacing: '0.3px' }}>{d}</div>
          ))}
        </div>

        {/* Grid días */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
          {Array.from({ length: pad }).map((_, i) => (
            <div key={i} style={{ minHeight: 90, borderRadius: 8, background: DS.bg, opacity: 0.4 }} />
          ))}
          {days.map(day => {
            const ds = format(day, 'yyyy-MM-dd')
            const dbEvs = getDbEvs(ds)
            const staticEvs = getStaticEvs(ds)
            const sinContenido = dbEvs.filter(e => !e.copy_exacto).length
            const publicados = dbEvs.filter(e => e.estado === 'publicado').length
            const hasAnything = dbEvs.length > 0 || staticEvs.length > 0
            const today = isToday(day)

            return (
              <div key={ds} onClick={() => setSelDay(ds)}
                style={{
                  minHeight: 90, borderRadius: 8, padding: '6px 7px', cursor: 'pointer',
                  background: today ? '#FFF8F5' : DS.surface,
                  border: today ? `2px solid ${DS.accent}` : `1px solid ${hasAnything ? DS.border : 'transparent'}`,
                  background: today ? '#FFF8F5' : hasAnything ? DS.surface : DS.bg,
                }}>
                {/* Número del día */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: today ? 800 : 500, color: today ? DS.accent : DS.textSecondary }}>
                    {format(day, 'd')}
                  </span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {sinContenido > 0 && (
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 8, color: '#fff', fontWeight: 700 }}>{sinContenido}</span>
                      </div>
                    )}
                    {publicados > 0 && sinContenido === 0 && dbEvs.length > 0 && (
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: DS.success, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 8, color: '#fff', fontWeight: 700 }}>✓</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Eventos estáticos (carreras/fechas) — siempre visibles primero */}
                {staticEvs.slice(0, 1).map((ev, i) => (
                  <div key={`s${i}`} style={{
                    fontSize: 8, padding: '2px 5px', borderRadius: 4, marginBottom: 2,
                    background: ev.tipo === 'carrera' ? DS.dangerLight : ev.tipo === 'intl' ? DS.infoLight : DS.warningLight,
                    color: ev.tipo === 'carrera' ? DS.danger : ev.tipo === 'intl' ? DS.info : DS.warning,
                    fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}>
                    {ev.badge} {ev.titulo}
                  </div>
                ))}

                {/* Tareas de contenido */}
                {dbEvs.slice(0, staticEvs.length > 0 ? 2 : 3).map((ev, i) => (
                  <div key={`d${i}`} style={{
                    fontSize: 8, padding: '2px 5px', borderRadius: 4, marginBottom: 2,
                    background: (ev.color || DS.info) + '20',
                    color: ev.color || DS.info,
                    fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    opacity: ev.estado === 'publicado' ? 0.5 : 1,
                  }}>
                    {CANAL_ICON[ev.canal || ''] || '·'} {ev.titulo}
                  </div>
                ))}

                {/* Más eventos */}
                {(dbEvs.length + staticEvs.length) > (staticEvs.length > 0 ? 3 : 3) && (
                  <div style={{ fontSize: 8, color: DS.textTertiary, padding: '1px 4px', fontWeight: 600 }}>
                    +{(dbEvs.length + staticEvs.length) - (staticEvs.length > 0 ? 3 : 3)} más
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal día */}
      {selDay && !addOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}
          onClick={() => { setSelDay(null); setExpandedId(null) }}>
          <div style={{ background: DS.surface, borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${DS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: DS.text }}>
                {format(parseISO(selDay), "EEEE d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {selPendientes.length > 0 && !generandoDia && (
                  <button onClick={() => generarTodoDia(selDay)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: DS.text, color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Sparkles size={11} /> Generar todo el día
                  </button>
                )}
                {generandoDia === selDay && (
                  <span style={{ fontSize: 11, color: DS.info, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Loader2 size={12} className="animate-spin" /> Generando...
                  </span>
                )}
                <button onClick={() => { setSelDay(null); setExpandedId(null) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.textTertiary, fontSize: 18 }}>✕</button>
              </div>
            </div>

            <div style={{ padding: '16px 22px' }}>
              {/* Fechas estáticas del día */}
              {selStaticEvs.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: DS.textTertiary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Eventos del día</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selStaticEvs.map((ev, i) => (
                      <div key={i} style={{
                        padding: '10px 14px', borderRadius: 9,
                        background: ev.tipo === 'carrera' ? DS.dangerLight : ev.tipo === 'intl' ? DS.infoLight : DS.warningLight,
                        border: `1px solid ${ev.tipo === 'carrera' ? DS.danger : ev.tipo === 'intl' ? DS.info : DS.warning}40`,
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        <span style={{ fontSize: 16 }}>{ev.badge}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: DS.text }}>{ev.titulo}</div>
                          <div style={{ fontSize: 10, color: DS.textSecondary, marginTop: 1, textTransform: 'capitalize' }}>{ev.tipo}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tareas de contenido */}
              {selDbEvs.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: DS.textTertiary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                    Contenido ({selDbEvs.length} pieza{selDbEvs.length !== 1 ? 's' : ''})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selDbEvs.map((ev, i) => {
                      const isExpanded = expandedId === ev.id
                      const isGenerando = generandoId === ev.id
                      const tieneCopy = !!ev.copy_exacto

                      return (
                        <div key={i} style={{ borderRadius: 10, border: `1px solid ${DS.border}`, borderLeft: `3px solid ${ev.color || DS.info}`, overflow: 'hidden' }}>
                          <div style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: DS.text }}>{ev.titulo}</div>
                                <div style={{ fontSize: 10, color: DS.textSecondary, marginTop: 2 }}>
                                  {ev.canal && `${CANAL_ICON[ev.canal] || ''} ${ev.canal}`}
                                  {ev.tipo_contenido && ` · ${ev.tipo_contenido}`}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                                {ev.id && !isGenerando && (
                                  <button onClick={() => generarContenidoPieza(ev)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', background: tieneCopy ? DS.bg : '#7C3AED', color: tieneCopy ? DS.textSecondary : '#fff', border: 'none', borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                    <Sparkles size={9} />{tieneCopy ? 'Regen.' : 'Generar'}
                                  </button>
                                )}
                                {isGenerando && <Loader2 size={13} className="animate-spin" style={{ color: '#7C3AED' }} />}
                                {ev.id && ev.estado !== 'publicado' && (
                                  <button onClick={() => cambiarEstado(ev.id!, ev.estado === 'pendiente' ? 'en_progreso' : ev.estado === 'en_progreso' ? 'en_revision' : 'publicado')}
                                    style={{ padding: '5px 9px', background: DS.bg, border: 'none', borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: DS.text }}>
                                    {ev.estado === 'pendiente' ? '▶' : ev.estado === 'en_progreso' ? '👁' : '✓'}
                                  </button>
                                )}
                                {ev.estado === 'publicado' && <span style={{ fontSize: 10, color: DS.success, fontWeight: 700 }}>✓</span>}
                                {tieneCopy && ev.id && (
                                  <button onClick={() => setExpandedId(isExpanded ? null : ev.id!)}
                                    style={{ fontSize: 11, color: DS.info, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '4px' }}>
                                    {isExpanded ? '▲' : '▼'}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Estado badge */}
                            <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
                              {ev.responsable && (
                                <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 20, background: ev.responsable === 'Creadora' ? '#F3E8FF' : DS.infoLight, color: ev.responsable === 'Creadora' ? '#7C3AED' : DS.info }}>
                                  {ev.responsable}
                                </span>
                              )}
                              <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 20, background: ev.estado === 'publicado' ? DS.successLight : ev.estado === 'en_revision' ? DS.warningLight : ev.estado === 'en_progreso' ? DS.infoLight : DS.bg, color: ev.estado === 'publicado' ? DS.success : ev.estado === 'en_revision' ? DS.warning : ev.estado === 'en_progreso' ? DS.info : DS.textSecondary }}>
                                {ev.estado || 'pendiente'}
                              </span>
                              {!tieneCopy && (
                                <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 20, background: '#EDE9FE', color: '#7C3AED' }}>Sin contenido</span>
                              )}
                            </div>
                          </div>

                          {/* Contenido expandido */}
                          {isExpanded && tieneCopy && (
                            <div style={{ padding: '12px 14px', background: DS.bg, borderTop: `1px solid ${DS.border}` }}>
                              {[
                                { label: 'Copy', value: ev.copy_exacto },
                                { label: 'Guión', value: ev.guion },
                                { label: 'Música', value: ev.musica_sugerida },
                                { label: 'Referencia visual', value: ev.referencia_visual },
                              ].filter(f => f.value).map(field => (
                                <div key={field.label} style={{ marginBottom: 10 }}>
                                  <div style={{ fontSize: 9, fontWeight: 700, color: DS.textTertiary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{field.label}</div>
                                  <div style={{ fontSize: 12, color: DS.text, lineHeight: 1.6, whiteSpace: 'pre-wrap', background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 7, padding: '8px 10px' }}>{field.value}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {selDbEvs.length === 0 && selStaticEvs.length === 0 && (
                <div style={{ padding: '20px 0', textAlign: 'center', color: DS.textTertiary, fontSize: 13 }}>Sin eventos este día.</div>
              )}

              <button onClick={() => setAddOpen(true)}
                style={{ width: '100%', padding: '9px', border: `1px dashed ${DS.border}`, borderRadius: 8, fontSize: 12, color: DS.textSecondary, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', marginTop: 4 }}>
                <Plus size={13} /> Agregar evento manual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar evento */}
      {addOpen && selDay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }}
          onClick={() => setAddOpen(false)}>
          <div style={{ background: DS.surface, borderRadius: 14, padding: 24, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 800, color: DS.text, marginBottom: 16 }}>
              Agregar — {format(parseISO(selDay), "d 'de' MMMM", { locale: es })}
            </div>
            {[['Título *', 'titulo', 'Ej: Reel tobilleras'], ['Canal', 'canal', 'Instagram, TikTok...'], ['Descripción', 'descripcion', 'Detalles...']].map(([l, k, p]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: DS.textTertiary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{l}</label>
                <input value={(form as Record<string, string>)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={p}
                  style={{ width: '100%', padding: '9px 12px', border: `1px solid ${DS.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: DS.surface, color: DS.text }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setAddOpen(false)}
                style={{ flex: 1, padding: '10px', border: `1px solid ${DS.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: DS.surface, color: DS.textSecondary }}>
                Cancelar
              </button>
              <button onClick={saveEv}
                style={{ flex: 2, padding: '10px', background: DS.text, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal fechas nuevas */}
      {showFechasModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }}
          onClick={() => setShowFechasModal(false)}>
          <div style={{ background: DS.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 500, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: DS.text }}>Fechas encontradas</div>
              <button onClick={() => setShowFechasModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.textTertiary, fontSize: 18 }}>✕</button>
            </div>
            {fechasNuevas.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: DS.textTertiary, fontSize: 13 }}>
                No se encontraron fechas nuevas.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fechasNuevas.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: DS.bg, borderRadius: 10, border: `1px solid ${DS.border}` }}>
                    <span style={{ fontSize: 18 }}>{f.tipo === 'carrera' ? '🏃' : '📅'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: DS.text }}>{f.nombre}</div>
                      <div style={{ fontSize: 11, color: DS.textSecondary, marginTop: 2 }}>
                        {f.fecha} {f.ciudad && `· ${f.ciudad}`} {f.distancia && `· ${f.distancia}`}
                      </div>
                    </div>
                    <button onClick={() => agregarFecha(f)}
                      style={{ padding: '6px 12px', background: DS.success, color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      + Agregar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
