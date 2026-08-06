'use client'
import React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, parseISO, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, X, Sparkles, Loader2, Search } from 'lucide-react'
import { RACES_CO, COMMERCIAL_DATES, RACES_INTL } from '@/lib/terret-context'

const DS = {
  bg: '#F2F0EA', surface: '#FFFFFF', border: '#E5E2D9',
  text: '#1C1B18', textSecondary: '#6B6860', textTertiary: '#9B9890',
  accent: '#E8520A', accentLight: '#FEF0E8',
  success: '#1A7A4A', successLight: '#E8F5EE',
  warning: '#B45309', warningLight: '#FEF3C7',
  danger: '#C91B1B', dangerLight: '#FEE2E2',
  info: '#185FA5', infoLight: '#EBF3FC',
}

function CanalIcon({ canal, size = 14, opacity = 1 }: { canal: string; size?: number; opacity?: number }) {
  const s = size
  const icons: Record<string, React.ReactElement> = {
    'Instagram': <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><defs><radialGradient id="ig" cx="30%" cy="107%" r="150%"><stop offset="0%" stopColor="#fdf497"/><stop offset="20%" stopColor="#fd5949"/><stop offset="60%" stopColor="#d6249f"/><stop offset="100%" stopColor="#285AEB"/></radialGradient></defs><rect width="24" height="24" rx="6" fill="url(#ig)"/><circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none"/><circle cx="17.5" cy="6.5" r="1.2" fill="white"/></svg>,
    'Instagram orgánico': <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><defs><radialGradient id="ig2" cx="30%" cy="107%" r="150%"><stop offset="0%" stopColor="#fdf497"/><stop offset="20%" stopColor="#fd5949"/><stop offset="60%" stopColor="#d6249f"/><stop offset="100%" stopColor="#285AEB"/></radialGradient></defs><rect width="24" height="24" rx="6" fill="url(#ig2)"/><circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none"/><circle cx="17.5" cy="6.5" r="1.2" fill="white"/></svg>,
    'TikTok': <svg width={s} height={s} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#010101"/><path d="M16.5 7.5c-.8-.5-1.4-1.3-1.6-2.2h-2v9.5c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.2 0 .4 0 .6.1V10.6c-.2 0-.4-.1-.6-.1-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4V9.2c.8.5 1.8.8 2.8.8V7.8c-.4 0-.8-.1-1.2-.3z" fill="white"/></svg>,
    'TikTok orgánico': <svg width={s} height={s} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#010101"/><path d="M16.5 7.5c-.8-.5-1.4-1.3-1.6-2.2h-2v9.5c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.2 0 .4 0 .6.1V10.6c-.2 0-.4-.1-.6-.1-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4V9.2c.8.5 1.8.8 2.8.8V7.8c-.4 0-.8-.1-1.2-.3z" fill="white"/></svg>,
    'Meta Ads': <svg width={s} height={s} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#1877F2"/><path d="M13 21v-7h2.3l.3-2.7H13v-1.7c0-.8.2-1.3 1.3-1.3H16V5.1c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8V11H8v2.7h2.1V21H13z" fill="white"/></svg>,
    'Google Ads': <svg width={s} height={s} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="white" stroke="#E5E2D9"/><path d="M12 5C8.13 5 5 8.13 5 12s3.13 7 7 7 7-3.13 7-7h-7V5z" fill="#4285F4"/><path d="M19 12c0-1.11-.26-2.16-.72-3.1L14 12h5z" fill="#EA4335"/><path d="M5 12c0 1.94.78 3.7 2.05 4.95L12 12H5z" fill="#34A853"/><path d="M12 19c1.94 0 3.7-.78 4.95-2.05L12 12v7z" fill="#FBBC05"/></svg>,
    'WhatsApp': <svg width={s} height={s} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#25D366"/><path d="M12 4.5C7.86 4.5 4.5 7.86 4.5 12c0 1.3.32 2.53.88 3.6L4.5 19.5l3.97-.87A7.44 7.44 0 0012 19.5c4.14 0 7.5-3.36 7.5-7.5S16.14 4.5 12 4.5zm3.6 10.5c-.15.42-1.1.84-1.5.87-.36.03-.84.04-1.35-.08-.31-.08-.71-.2-1.22-.44-2.1-.94-3.47-3.04-3.58-3.18-.1-.14-.87-1.16-.87-2.21 0-1.05.55-1.57.74-1.78.2-.21.43-.26.57-.26h.41c.13 0 .31.05.48.46l.69 1.7c.05.14.03.3-.05.43l-.3.44c-.1.14-.2.3-.08.58.41.93 1.07 1.65 1.92 2.12.27.14.48.12.65-.05l.35-.44c.17-.22.38-.27.62-.17l1.6.75c.23.11.38.16.44.27.06.1.06.56-.1.98z" fill="white"/></svg>,
    'WhatsApp / estados': <svg width={s} height={s} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#25D366"/><path d="M12 4.5C7.86 4.5 4.5 7.86 4.5 12c0 1.3.32 2.53.88 3.6L4.5 19.5l3.97-.87A7.44 7.44 0 0012 19.5c4.14 0 7.5-3.36 7.5-7.5S16.14 4.5 12 4.5zm3.6 10.5c-.15.42-1.1.84-1.5.87-.36.03-.84.04-1.35-.08-.31-.08-.71-.2-1.22-.44-2.1-.94-3.47-3.04-3.58-3.18-.1-.14-.87-1.16-.87-2.21 0-1.05.55-1.57.74-1.78.2-.21.43-.26.57-.26h.41c.13 0 .31.05.48.46l.69 1.7c.05.14.03.3-.05.43l-.3.44c-.1.14-.2.3-.08.58.41.93 1.07 1.65 1.92 2.12.27.14.48.12.65-.05l.35-.44c.17-.22.38-.27.62-.17l1.6.75c.23.11.38.16.44.27.06.1.06.56-.1.98z" fill="white"/></svg>,
    'Email': <svg width={s} height={s} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#1A7A4A"/><path d="M6 8h12c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1V9c0-.55.45-1 1-1zm6 5l6-4H6l6 4z" fill="white"/></svg>,
    'Email marketing': <svg width={s} height={s} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#1A7A4A"/><path d="M6 8h12c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1V9c0-.55.45-1 1-1zm6 5l6-4H6l6 4z" fill="white"/></svg>,
    'Shopify Email': <svg width={s} height={s} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#96BF48"/><path d="M15.5 6.5c-.1-.7-.7-1-1.2-1.1l-.4 1.9c.5.1.9.1 1.1.1.2-.3.6-.6.5-.9zm-2 .2l-.5 2.2c-.5-.2-1-.3-1.5-.3-.9 0-1.4.5-1.4 1.1 0 1.3 3.3 1.7 3.3 4.2 0 2.1-1.4 3.2-3.2 3.2-2.3 0-3.5-1.4-3.5-1.4l.6-2c0 0 1.1 1 1.9 1 .5 0 .7-.4.7-.7 0-1.7-3-1.7-3-4 0-2 1.4-3.9 4-3.9.8 0 1.7.2 2.6.6z" fill="white"/></svg>,
    'Influencers / UGC': <svg width={s} height={s} viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#B45309"/><circle cx="12" cy="9" r="3" fill="white"/><path d="M6 19c0-3.3 2.7-6 6-6s6 2.7 6 6H6z" fill="white"/></svg>,
  }
  return <span style={{ opacity, display: 'inline-flex', flexShrink: 0 }} title={canal}>{icons[canal] || <span style={{ fontSize: 7, fontWeight: 800, padding: '1px 3px', borderRadius: 3, background: '#F2F0EA', color: '#6B6860' }}>{canal?.substring(0,2).toUpperCase()}</span>}</span>
}

const CANAL_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  'Instagram': { label: 'IG', bg: '#F3E8FF', color: '#7C3AED' },
  'Instagram orgánico': { label: 'IG', bg: '#F3E8FF', color: '#7C3AED' },
  'TikTok': { label: 'TK', bg: '#E0F7FA', color: '#006064' },
  'TikTok orgánico': { label: 'TK', bg: '#E0F7FA', color: '#006064' },
  'Meta Ads': { label: 'MA', bg: '#EBF3FC', color: '#185FA5' },
  'Google Ads': { label: 'GA', bg: '#E8F5E9', color: '#1B5E20' },
  'Email': { label: 'EM', bg: '#E8F5EE', color: '#1A7A4A' },
  'Email marketing': { label: 'EM', bg: '#E8F5EE', color: '#1A7A4A' },
  'Shopify Email': { label: 'EM', bg: '#E8F5EE', color: '#1A7A4A' },
  'WhatsApp': { label: 'WA', bg: '#E8F5EE', color: '#1A7A4A' },
  'WhatsApp / estados': { label: 'WA', bg: '#DCFCE7', color: '#15803D' },
  'Influencers / UGC': { label: 'UG', bg: '#FEF3C7', color: '#B45309' },
}

const CANAL_ICON: Record<string, string> = {
  'Instagram': '📸', 'Instagram orgánico': '📸', 'TikTok': '🎵', 'TikTok orgánico': '🎵',
  'Meta Ads': '💰', 'Google Ads': '🔍', 'Email': '📧', 'Email marketing': '📧',
  'WhatsApp': '💬', 'WhatsApp / estados': '💬', 'Influencers / UGC': '🎬', 'Shopify Email': '📧',
}

interface Evento {
  id?: string; fecha: string; titulo: string; tipo: string
  canal?: string; color?: string; estado?: string; copy_exacto?: string
  guion?: string; musica_sugerida?: string; referencia_visual?: string
  responsable?: string; source?: string; tipo_contenido?: string; campana_id?: string
}

interface FechaNueva {
  fecha: string; nombre: string; tipo: 'carrera' | 'comercial'; ciudad?: string; distancia?: string; fuente?: string
}

type FiltroCalendario = 'todo' | 'tareas' | 'fechas'

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
  const [buscarError, setBuscarError] = useState('')
  const [showBuscarConfig, setShowBuscarConfig] = useState(false)
  const [buscarDesde, setBuscarDesde] = useState('')
  const [buscarHasta, setBuscarHasta] = useState('')
  const [fechasExtras, setFechasExtras] = useState<FechaNueva[]>([])
  const [filtro, setFiltro] = useState<FiltroCalendario>('todo')

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

  useEffect(() => {
    fetch('/api/fechas-calendario')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setFechasExtras(d.map((f: Record<string,string>) => ({ id: f.id, fecha: f.fecha, nombre: f.nombre, tipo: f.tipo as 'carrera' | 'comercial', ciudad: f.ciudad, distancia: f.distancia, fuente: f.fuente }))) })
      .catch(() => {})
  }, [])

  function getDbEvs(dateStr: string) {
    return eventos.filter(e => e.fecha === dateStr)
  }

  function getStaticEvs(dateStr: string) {
    const all: { titulo: string; tipo: string; color: string; colorBg: string; icon: string }[] = []
    if (filtro === 'tareas') return all
    RACES_CO.filter(r => r.date === dateStr).forEach(r =>
      all.push({ titulo: r.name, tipo: 'Carrera CO', color: DS.danger, colorBg: DS.dangerLight, icon: '🏃' }))
    COMMERCIAL_DATES.filter(f => f.date === dateStr).forEach(f =>
      all.push({ titulo: f.name, tipo: 'Fecha comercial', color: DS.warning, colorBg: DS.warningLight, icon: '📅' }))
    RACES_INTL.filter(r => r.date === dateStr).forEach(r =>
      all.push({ titulo: r.name, tipo: 'Carrera Internacional', color: DS.info, colorBg: DS.infoLight, icon: '🌎' }))
    fechasExtras.filter(f => f.fecha === dateStr).forEach(f =>
      all.push({ titulo: f.nombre, tipo: f.tipo === 'carrera' ? 'Carrera' : 'Fecha comercial', color: f.tipo === 'carrera' ? DS.danger : DS.warning, colorBg: f.tipo === 'carrera' ? DS.dangerLight : DS.warningLight, icon: f.tipo === 'carrera' ? '🏃' : '📅' }))
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
      if (campana?.output_claude) estrategiaCampana = campana.output_claude.split('## Plan de contenido')[0].substring(0, 600)
    }
    const otrasHoy = eventos.filter(e => e.fecha === ev.fecha && e.id !== ev.id && e.copy_exacto).map(e => `- ${e.canal} | ${e.tipo_contenido}: ${e.titulo}`).join('\n')
    const prompt = `Eres el Director de Marketing de Terret, marca colombiana de accesorios para running.
${estrategiaCampana ? `CONTEXTO:\n${estrategiaCampana}\n` : ''}
PIEZA: ${ev.fecha} | ${ev.canal} | ${ev.tipo_contenido} | ${ev.titulo}
${otrasHoy ? `OTRAS HOY:\n${otrasHoy}` : ''}
Responde ÚNICAMENTE con JSON válido sin texto adicional ni markdown:
{"copy_exacto":"[caption completo con hashtags]","guion":"[si video: Hook 0-3s → Desarrollo → CTA. Si no aplica: vacío]","musica_sugerida":"[artista - canción o género + mood]","referencia_visual":"[locación, vestuario, iluminación, ángulo]","responsable":"[David o Creadora o Comité]"}`
    const res = await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'campana', messages: [{ role: 'user', content: prompt }] }) })
    const reader = res.body!.getReader(); const dec = new TextDecoder(); let text = ''
    while (true) { const { done, value } = await reader.read(); if (done) break; text += dec.decode(value) }
    let campos = { copy_exacto: '', guion: '', musica_sugerida: '', referencia_visual: '', responsable: 'David' }
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      campos = { ...campos, ...parsed }
    } catch {
      campos.copy_exacto = text.trim()
    }
    await fetch('/api/tareas', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ev.id, ...campos }) })
    setGenerandoId(null); setExpandedId(ev.id); load()
  }

  async function generarTodoDia(fecha: string) {
    setGenerandoDia(fecha)
    for (const ev of eventos.filter(e => e.fecha === fecha && !e.copy_exacto)) await generarContenidoPieza(ev)
    setGenerandoDia(null)
  }

  async function buscarFechasNuevas() {
    setBuscandoFechas(true); setFechasNuevas([]); setBuscarError(''); setShowBuscarConfig(false)
    const today = format(new Date(), 'yyyy-MM-dd')
    const desde = buscarDesde || today
    const hasta = buscarHasta || format(new Date(new Date().getTime() + 180 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    const existentes = [...RACES_CO, ...COMMERCIAL_DATES].map(e => `${e.date}: ${e.name}`).join('\n').substring(0, 400)
    const existentesDB = fechasExtras.map((f: FechaNueva) => `${f.fecha}: ${f.nombre}`).join('\n')
    const prompt = `Busca en web carreras de running y fechas comerciales para Colombia entre ${desde} y ${hasta}. Busca específicamente: "calendario running Colombia 2026", "maratones Colombia atletismo", "carreras populares Colombia". Responde ÚNICAMENTE con un JSON array válido, sin texto antes ni después, sin markdown:\n[{"fecha":"YYYY-MM-DD","nombre":"Nombre completo","tipo":"carrera","ciudad":"Ciudad","distancia":"distancias","fuente":"URL exacta o sitio web"}]\nSolo incluye eventos con fecha confirmada. No incluyas estas:\n${existentes}\n${existentesDB}`
    const res = await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'campana', messages: [{ role: 'user', content: prompt }] }) })
    const reader = res.body!.getReader(); const dec = new TextDecoder(); let text = ''
    while (true) { const { done, value } = await reader.read(); if (done) break; text += dec.decode(value) }
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      // Intentar extraer JSON si hay texto extra
      const jsonMatch = clean.match(/\[[\s\S]*\]/)
      const jsonStr = jsonMatch ? jsonMatch[0] : clean
      const parsed = JSON.parse(jsonStr)
      if (Array.isArray(parsed) && parsed.length > 0) {
        setFechasNuevas(parsed)
        setShowFechasModal(true)
      } else {
        setBuscarError('No se encontraron fechas nuevas. Intenta con otro rango de fechas.')
      }
    } catch {
      setBuscarError('Error al procesar la respuesta. Intenta de nuevo.')
    }
    setBuscandoFechas(false)
  }

  async function eliminarFechaExtra(id: string) {
    await fetch(`/api/fechas-calendario?id=${id}`, { method: 'DELETE' })
    setFechasExtras(prev => prev.filter((f: FechaNueva & { id?: string }) => f.id !== id))
  }

  async function agregarFecha(f: FechaNueva) {
    await fetch('/api/fechas-calendario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f)
    })
    setFechasExtras(prev => [...prev, f])
    setFechasNuevas(prev => prev.filter(x => !(x.fecha === f.fecha && x.nombre === f.nombre)))
  }

  const selDbEvs = selDay ? getDbEvs(selDay) : []
  const selStaticEvs = selDay ? getStaticEvs(selDay) : []

  return (
    <div style={{ maxWidth: 1150, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: DS.text, margin: 0, letterSpacing: '-0.5px' }}>Calendario editorial</h1>
          <p style={{ fontSize: 13, color: DS.textSecondary, margin: '4px 0 0' }}>Tareas, carreras y fechas comerciales.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={buscarFechasNuevas} disabled={buscandoFechas}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: DS.surface, color: DS.text, border: `1px solid ${DS.border}`, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {buscandoFechas ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            {buscandoFechas ? 'Buscando...' : 'Buscar fechas'}
          </button>
        </div>
      </div>

      {/* Calendario */}
      <div style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${DS.border}`, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setCur(subMonths(cur, 1))} style={{ padding: '6px 10px', border: `1px solid ${DS.border}`, borderRadius: 8, background: DS.surface, cursor: 'pointer' }}><ChevronLeft size={14} color={DS.textSecondary} /></button>
            <span style={{ fontSize: 15, fontWeight: 700, color: DS.text, minWidth: 180, textAlign: 'center' }}>
              {format(cur, "MMMM 'de' yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
            </span>
            <button onClick={() => setCur(addMonths(cur, 1))} style={{ padding: '6px 10px', border: `1px solid ${DS.border}`, borderRadius: 8, background: DS.surface, cursor: 'pointer' }}><ChevronRight size={14} color={DS.textSecondary} /></button>
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 4, background: DS.bg, borderRadius: 8, padding: 3 }}>
            {([['todo', 'Todo'], ['tareas', 'Solo tareas'], ['fechas', 'Solo fechas']] as [FiltroCalendario, string][]).map(([val, label]) => (
              <button key={val} onClick={() => setFiltro(val)}
                style={{ padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: filtro === val ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', background: filtro === val ? DS.surface : 'transparent', color: filtro === val ? DS.text : DS.textSecondary, boxShadow: filtro === val ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Leyenda */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {[
              { color: DS.danger, label: 'Carrera' },
              { color: DS.warning, label: 'Fecha' },
              { color: '#7C3AED', label: 'Contenido' },
              { color: DS.success, label: 'Publicado' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: DS.textTertiary }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Días semana */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: DS.bg, borderBottom: `1px solid ${DS.border}` }}>
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: DS.textTertiary, padding: '8px 0', letterSpacing: '0.5px' }}>{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {Array.from({ length: pad }).map((_, i) => (
            <div key={i} style={{ minHeight: 100, background: DS.bg, borderRight: `1px solid ${DS.border}`, borderBottom: `1px solid ${DS.border}`, opacity: 0.4 }} />
          ))}
          {days.map((day, idx) => {
            const ds = format(day, 'yyyy-MM-dd')
            const dbEvs = filtro === 'fechas' ? [] : getDbEvs(ds)
            const staticEvs = getStaticEvs(ds)
            const total = dbEvs.length
            const sinContenido = dbEvs.filter(e => !e.copy_exacto).length
            const publicados = dbEvs.filter(e => e.estado === 'publicado').length
            const today = isToday(day)
            const col = (idx + pad) % 7
            const isLastCol = col === 6

            return (
              <div key={ds} onClick={() => setSelDay(ds)}
                style={{
                  minHeight: 100, cursor: 'pointer', padding: '8px',
                  background: today ? '#FFFBF8' : DS.surface,
                  borderRight: isLastCol ? 'none' : `1px solid ${DS.border}`,
                  borderBottom: `1px solid ${DS.border}`,
                  outline: today ? `2px solid ${DS.accent}` : 'none',
                  outlineOffset: '-2px',
                  transition: 'background 0.1s',
                }}>
                {/* Número día */}
                <div style={{ fontSize: 12, fontWeight: today ? 800 : 500, color: today ? DS.accent : DS.textSecondary, marginBottom: 5 }}>
                  {format(day, 'd')}
                </div>

                {/* Fechas estáticas — siempre primero, compactas */}
                {staticEvs.map((ev, i) => (
                  <div key={`s${i}`} style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, marginBottom: 2,
                    background: ev.colorBg, color: ev.color,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}>
                    <span>{ev.icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.titulo}</span>
                  </div>
                ))}

                {/* Tareas — solo badges de colores + contador */}
                {total > 0 && filtro !== 'fechas' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: staticEvs.length > 0 ? 4 : 0 }}>
                    {/* Iconos SVG de canal */}
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', flex: 1, alignItems: 'center' }}>
                      {dbEvs.slice(0, 5).map((ev, i) => (
                        <CanalIcon key={i} canal={ev.canal || ''} size={14} opacity={ev.estado === 'publicado' ? 0.35 : 1} />
                      ))}
                      {total > 5 && <span style={{ fontSize: 8, color: DS.textTertiary, fontWeight: 700 }}>+{total - 5}</span>}
                    </div>
                    {/* Contador */}
                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                      {sinContenido > 0 && (
                        <div style={{ background: '#7C3AED', color: '#fff', borderRadius: 10, fontSize: 8, fontWeight: 700, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>
                          {sinContenido}
                        </div>
                      )}
                      {publicados > 0 && (
                        <div style={{ background: DS.successLight, color: DS.success, borderRadius: 10, fontSize: 8, fontWeight: 700, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>
                          {publicados}✓
                        </div>
                      )}
                    </div>
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
            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${DS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: DS.text }}>
                {format(parseISO(selDay), "EEEE d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {selDbEvs.filter(e => !e.copy_exacto).length > 0 && !generandoDia && (
                  <button onClick={() => generarTodoDia(selDay)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: DS.text, color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Sparkles size={11} /> Generar día
                  </button>
                )}
                {generandoDia === selDay && <span style={{ fontSize: 11, color: DS.info, display: 'flex', alignItems: 'center', gap: 5 }}><Loader2 size={12} className="animate-spin" /> Generando...</span>}
                <button onClick={() => { setSelDay(null); setExpandedId(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.textTertiary, fontSize: 18 }}>✕</button>
              </div>
            </div>

            <div style={{ padding: '16px 22px' }}>
              {/* Fechas estáticas */}
              {selStaticEvs.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: DS.textTertiary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Eventos del día</div>
                  {selStaticEvs.map((ev, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: ev.colorBg, borderRadius: 9, marginBottom: 6, border: `1px solid ${ev.color}30` }}>
                      <span style={{ fontSize: 18 }}>{ev.icon}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: DS.text }}>{ev.titulo}</div>
                        <div style={{ fontSize: 10, color: ev.color, fontWeight: 600, marginTop: 1 }}>{ev.tipo}</div>
                      {(ev as unknown as { fuente?: string }).fuente && <div style={{ fontSize: 9, color: DS.info, marginTop: 2 }}>🔗 {(ev as unknown as { fuente?: string }).fuente}</div>}
                      {(ev as unknown as { id?: string }).id && (
                        <button onClick={() => eliminarFechaExtra((ev as unknown as { id: string }).id)}
                          style={{ marginTop: 6, padding: '4px 10px', background: DS.dangerLight, color: DS.danger, border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Eliminar
                        </button>
                      )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tareas */}
              {selDbEvs.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: DS.textTertiary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                    Contenido — {selDbEvs.length} pieza{selDbEvs.length !== 1 ? 's' : ''}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selDbEvs.map((ev, i) => {
                      const isExpanded = expandedId === ev.id
                      const isGenerando = generandoId === ev.id
                      const tieneCopy = !!ev.copy_exacto
                      return (
                        <div key={i} style={{ borderRadius: 10, border: `1px solid ${DS.border}`, borderLeft: `3px solid ${ev.color || DS.info}`, overflow: 'hidden' }}>
                          <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 14, flexShrink: 0 }}>{CANAL_ICON[ev.canal || ''] || '·'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: DS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.titulo}</div>
                              <div style={{ fontSize: 10, color: DS.textSecondary, marginTop: 1 }}>{ev.canal}{ev.tipo_contenido && ` · ${ev.tipo_contenido}`}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 10, fontWeight: 700, background: ev.estado === 'publicado' ? DS.successLight : ev.estado === 'en_revision' ? DS.warningLight : ev.estado === 'en_progreso' ? DS.infoLight : DS.bg, color: ev.estado === 'publicado' ? DS.success : ev.estado === 'en_revision' ? DS.warning : ev.estado === 'en_progreso' ? DS.info : DS.textSecondary }}>
                                {ev.estado || 'pendiente'}
                              </span>
                              {ev.id && !isGenerando && (
                                <button onClick={() => generarContenidoPieza(ev)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 8px', background: tieneCopy ? DS.bg : '#7C3AED', color: tieneCopy ? DS.textSecondary : '#fff', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                  <Sparkles size={9} />{tieneCopy ? 'Regen.' : 'Generar'}
                                </button>
                              )}
                              {isGenerando && <Loader2 size={12} className="animate-spin" style={{ color: '#7C3AED' }} />}
                              {ev.id && ev.estado !== 'publicado' && !isGenerando && (
                                <button onClick={() => cambiarEstado(ev.id!, ev.estado === 'pendiente' ? 'en_progreso' : ev.estado === 'en_progreso' ? 'en_revision' : 'publicado')}
                                  style={{ padding: '4px 8px', background: DS.bg, border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: DS.text }}>
                                  {ev.estado === 'pendiente' ? '▶' : ev.estado === 'en_progreso' ? '👁' : '✓'}
                                </button>
                              )}
                              {tieneCopy && ev.id && (
                                <button onClick={() => setExpandedId(isExpanded ? null : ev.id!)}
                                  style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: DS.info, fontSize: 11, fontWeight: 700 }}>
                                  {isExpanded ? '▲' : '▼'}
                                </button>
                              )}
                            </div>
                          </div>
                          {isExpanded && tieneCopy && (
                            <div style={{ padding: '12px 14px', background: DS.bg, borderTop: `1px solid ${DS.border}` }}>
                              {[{ label: 'Copy', value: ev.copy_exacto }, { label: 'Guión', value: ev.guion }, { label: 'Música', value: ev.musica_sugerida }, { label: 'Referencia visual', value: ev.referencia_visual }].filter(f => f.value).map(field => (
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
                style={{ width: '100%', padding: '9px', border: `1px dashed ${DS.border}`, borderRadius: 8, fontSize: 12, color: DS.textSecondary, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', marginTop: 8 }}>
                <Plus size={13} /> Agregar evento manual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar */}
      {addOpen && selDay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }} onClick={() => setAddOpen(false)}>
          <div style={{ background: DS.surface, borderRadius: 14, padding: 24, width: '100%', maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 800, color: DS.text, marginBottom: 16 }}>Agregar — {format(parseISO(selDay), "d 'de' MMMM", { locale: es })}</div>
            {[['Título *', 'titulo', 'Ej: Reel tobilleras'], ['Canal', 'canal', 'Instagram, TikTok...'], ['Descripción', 'descripcion', 'Detalles...']].map(([l, k, p]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: DS.textTertiary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{l}</label>
                <input value={(form as Record<string, string>)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={p}
                  style={{ width: '100%', padding: '9px 12px', border: `1px solid ${DS.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setAddOpen(false)} style={{ flex: 1, padding: 10, border: `1px solid ${DS.border}`, borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', background: DS.surface, color: DS.textSecondary }}>Cancelar</button>
              <button onClick={saveEv} style={{ flex: 2, padding: 10, background: DS.text, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal fechas nuevas */}
      {showFechasModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }} onClick={() => setShowFechasModal(false)}>
          <div style={{ background: DS.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 500, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: DS.text }}>Fechas encontradas</div>
              <button onClick={() => setShowFechasModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.textTertiary, fontSize: 18 }}>✕</button>
            </div>
            {fechasNuevas.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: DS.textTertiary }}>No se encontraron fechas nuevas.</div>
            ) : fechasNuevas.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: DS.bg, borderRadius: 10, border: `1px solid ${DS.border}`, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>{f.tipo === 'carrera' ? '🏃' : '📅'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: DS.text }}>{f.nombre}</div>
                  <div style={{ fontSize: 11, color: DS.textSecondary, marginTop: 2 }}>{f.fecha}{f.ciudad && ` · ${f.ciudad}`}{f.distancia && ` · ${f.distancia}`}</div>
                {f.fuente && <div style={{ fontSize: 10, color: DS.info, marginTop: 2 }}>🔗 {f.fuente}</div>}
                </div>
                <button onClick={() => agregarFecha(f)} style={{ padding: '6px 12px', background: DS.success, color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ Agregar</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
