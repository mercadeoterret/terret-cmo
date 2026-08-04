'use client'
import { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, parseISO, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, X, Check } from 'lucide-react'
import { RACES_CO, COMMERCIAL_DATES, RACES_INTL } from '@/lib/terret-context'

const TIPO_COLORS: Record<string, string> = { contenido: '#7c3aed', pauta: '#185fa5', email: '#15803d', whatsapp: '#16a34a', offline: '#b45309', campana: '#dc2626' }
const CANAL_EMOJI: Record<string, string> = { 'Instagram': '📸', 'TikTok': '🎵', 'Meta Ads': '💰', 'Email': '📧', 'WhatsApp': '💬' }
interface Evento { id?: string; fecha: string; titulo: string; descripcion?: string; tipo: string; canal?: string; completado?: boolean; color?: string; estado?: string; copy_exacto?: string; guion?: string; musica_sugerida?: string; referencia_visual?: string; responsable?: string; source?: string }

export default function CalendarioPage() {
  const [cur, setCur] = useState(new Date())
  const [eventos, setEventos] = useState<Evento[]>([])
  const [selDay, setSelDay] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ titulo: '', tipo: 'contenido', canal: '', descripcion: '' })
  const ms = startOfMonth(cur), me = endOfMonth(cur)
  const days = eachDayOfInterval({ start: ms, end: me })
  const pad = (getDay(ms) + 6) % 7

  const load = useCallback(async () => {
    const from = format(ms, 'yyyy-MM-dd'), to = format(me, 'yyyy-MM-dd')
    const r = await fetch(`/api/tareas?from=${from}&to=${to}`)
    const d = await r.json()
    setEventos(Array.isArray(d) ? d.map((e: Evento) => ({ ...e, source: 'db' })) : [])
  }, [cur])

  useEffect(() => { load() }, [load])

  function getEvs(dateStr: string): Evento[] {
    const all: Evento[] = []
    eventos.filter(e => e.fecha === dateStr).forEach(e => all.push(e))
    RACES_CO.filter(r => r.date === dateStr).forEach(r => all.push({ fecha: dateStr, titulo: r.name, descripcion: `${r.city} · ${r.dist}`, tipo: 'offline', source: 'race', color: '#dc2626' }))
    COMMERCIAL_DATES.filter(f => f.date === dateStr).forEach(f => all.push({ fecha: dateStr, titulo: f.name, tipo: 'campana', source: 'commercial', color: f.type === 'commercial' ? '#b45309' : '#7c3aed' }))
    RACES_INTL.filter(r => r.date === dateStr).forEach(r => all.push({ fecha: dateStr, titulo: `🌎 ${r.name}`, descripcion: r.city, tipo: 'offline', source: 'intl', color: '#185fa5' }))
    return all
  }

  async function cambiarEstado(id: string, estado: string) {
    await fetch('/api/tareas', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, estado, completado: estado === 'publicado' }) })
    load()
  }

  async function saveEv() {
    if (!form.titulo || !selDay) return
    await fetch('/api/tareas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, fecha: selDay, color: TIPO_COLORS[form.tipo], estado: 'pendiente', responsable: 'David' }) })
    setAddOpen(false); setForm({ titulo: '', tipo: 'contenido', canal: '', descripcion: '' }); load()
  }

  const selEvs = selDay ? getEvs(selDay) : []
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a18', margin: 0 }}>Calendario editorial</h1>
        <p style={{ fontSize: 13, color: '#6b6a63', margin: '4px 0 0' }}>Todas las tareas, carreras y fechas comerciales en un solo lugar.</p>
      </div>
      <div style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setCur(subMonths(cur, 1))} style={{ padding: '6px 10px', border: '1px solid #e0dfd5', borderRadius: 8, background: '#fff', cursor: 'pointer' }}><ChevronLeft size={15} /></button>
            <h2 style={{ fontSize: 15, fontWeight: 700, minWidth: 190, textAlign: 'center', margin: 0 }}>{format(cur, "MMMM 'de' yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}</h2>
            <button onClick={() => setCur(addMonths(cur, 1))} style={{ padding: '6px 10px', border: '1px solid #e0dfd5', borderRadius: 8, background: '#fff', cursor: 'pointer' }}><ChevronRight size={15} /></button>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#6b6a63', alignItems: 'center' }}>
            {[['#fca5a5', 'Carrera CO'], ['#fde68a', 'Fecha comercial'], ['#ddd6fe', 'Contenido'], ['#bfdbfe', 'Pauta'], ['#a7f3d0', 'Email']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}</div>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
          {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#9c9a92', padding: '4px 0' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {Array.from({ length: pad }).map((_, i) => <div key={i} style={{ minHeight: 80, borderRadius: 6, background: '#f5f4ef', opacity: .3 }} />)}
          {days.map(day => {
            const ds = format(day, 'yyyy-MM-dd')
            const evs = getEvs(ds)
            const pendientes = evs.filter(e => e.source === 'db' && e.estado === 'pendiente').length
            const todos = evs.filter(e => e.source === 'db').length
            const allDone = todos > 0 && pendientes === 0
            return (
              <div key={ds} onClick={() => setSelDay(ds)}
                style={{ minHeight: 80, borderRadius: 6, padding: '5px 6px', cursor: 'pointer', background: isToday(day) ? '#fff' : evs.length ? '#fff' : '#f5f4ef', border: isToday(day) ? '2px solid #185fa5' : evs.length ? '1px solid #e0dfd5' : 'none', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isToday(day) ? '#185fa5' : '#6b6a63' }}>{format(day, 'd')}</span>
                  {allDone && <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={8} color="white" /></div>}
                  {pendientes > 0 && <div style={{ fontSize: 9, fontWeight: 700, background: '#dc2626', color: '#fff', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{pendientes}</div>}
                </div>
                {evs.slice(0, 3).map((ev, i) => (
                  <div key={i} style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, marginBottom: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: 600, opacity: ev.estado === 'publicado' ? .4 : 1, background: (ev.color || '#185fa5') + '25', color: ev.color || '#185fa5' }}>
                    {CANAL_EMOJI[ev.canal || ''] || ''} {ev.titulo}
                  </div>
                ))}
                {evs.length > 3 && <div style={{ fontSize: 8, color: '#9c9a92', padding: '0 4px' }}>+{evs.length - 3}</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal día */}
      {selDay && !addOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }} onClick={() => setSelDay(null)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 500, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a18' }}>{format(parseISO(selDay), "EEEE d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}</div>
              <button onClick={() => setSelDay(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9c9a92' }}><X size={16} /></button>
            </div>
            {selEvs.length === 0 ? <p style={{ fontSize: 13, color: '#9c9a92', textAlign: 'center', padding: '20px 0' }}>Sin eventos.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {selEvs.map((ev, i) => (
                  <div key={i} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #e0dfd5', borderLeft: `3px solid ${ev.color || '#185fa5'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18' }}>{ev.titulo}</div>
                      {ev.source === 'db' && ev.id && ev.estado !== 'publicado' && (
                        <button onClick={() => cambiarEstado(ev.id!, ev.estado === 'pendiente' ? 'en_progreso' : ev.estado === 'en_progreso' ? 'en_revision' : 'publicado')}
                          style={{ padding: '4px 10px', background: '#f0efe8', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          {ev.estado === 'pendiente' ? '▶ Iniciar' : ev.estado === 'en_progreso' ? '👁 Revisión' : '✓ Publicar'}
                        </button>
                      )}
                      {ev.estado === 'publicado' && <span style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>✓ Publicado</span>}
                    </div>
                    {ev.descripcion && <div style={{ fontSize: 11, color: '#6b6a63' }}>{ev.descripcion}</div>}
                    {ev.copy_exacto && <div style={{ fontSize: 12, color: '#6b6a63', marginTop: 6, padding: '8px', background: '#f5f4ef', borderRadius: 6, lineHeight: 1.5, overflow: 'hidden', maxHeight: 60 }}>{ev.copy_exacto}</div>}
                    {ev.musica_sugerida && <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 4, fontWeight: 600 }}>🎵 {ev.musica_sugerida}</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      {ev.canal && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: (ev.color || '#185fa5') + '20', color: ev.color || '#185fa5' }}>{ev.canal}</span>}
                      {ev.responsable && <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: ev.responsable === 'Creadora' ? '#f3e8ff' : '#e6f1fb', color: ev.responsable === 'Creadora' ? '#7c3aed' : '#185fa5' }}>{ev.responsable}</span>}
                      {ev.source === 'race' && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#fee2e2', color: '#b91c1c' }}>🏃 Carrera CO</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setAddOpen(true)} style={{ width: '100%', padding: '9px', border: '1px dashed #c0bfb5', borderRadius: 8, fontSize: 12, color: '#6b6a63', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
              <Plus size={13} /> Agregar evento manual
            </button>
          </div>
        </div>
      )}

      {addOpen && selDay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }} onClick={() => setAddOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Agregar — {format(parseISO(selDay), "d 'de' MMMM", { locale: es })}</div>
            {[['Título *', 'text', 'titulo', 'Ej: Reel tobilleras'],['Canal', 'text', 'canal', 'Instagram, TikTok...'],['Descripción', 'text', 'descripcion', 'Detalles...']].map(([l,t,k,p]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6b6a63', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{l}</label>
                <input value={(form as Record<string, string>)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={p} style={{ width: '100%', padding: '8px 12px', border: '1px solid #c0bfb5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <button onClick={saveEv} style={{ width: '100%', padding: 10, background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Guardar</button>
          </div>
        </div>
      )}
    </div>
  )
}
