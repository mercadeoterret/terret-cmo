'use client'
import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, Clock, Send, ChevronDown, ChevronRight, Filter, X } from 'lucide-react'

interface Tarea {
  id: string; fecha: string; titulo: string; canal: string; tipo_contenido: string
  copy_exacto: string; guion: string; musica_sugerida: string; referencia_visual: string
  responsable: string; estado: string; color: string; campana_id: string
  campanas?: { nombre: string }
}

const ESTADOS = [
  { id: 'pendiente', label: 'Pendiente', color: '#6b6a63', bg: '#f0efe8' },
  { id: 'en_progreso', label: 'En progreso', color: '#b45309', bg: '#fef3c7' },
  { id: 'en_revision', label: 'En revisión', color: '#185fa5', bg: '#e6f1fb' },
  { id: 'publicado', label: 'Publicado', color: '#15803d', bg: '#dcfce7' },
]

const CANAL_EMOJI: Record<string, string> = {
  'Instagram': '📸', 'TikTok': '🎵', 'Meta Ads': '💰', 'Google Ads': '🔍',
  'Email': '📧', 'WhatsApp': '💬', 'Offline': '🏃', 'Stories': '📱',
}

export default function TareasPage() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [filtroResponsable, setFiltroResponsable] = useState<string>('todos')
  const [filtroCanal, setFiltroCanal] = useState<string>('todos')
  const [filtroCampana, setFiltroCampana] = useState<string>('todos')
  const [campanas, setCampanas] = useState<{id: string, nombre: string}[]>([])
  const [selectedTarea, setSelectedTarea] = useState<Tarea | null>(null)
  const [view, setView] = useState<'lista' | 'kanban'>('lista')

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  const loadTareas = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    // Cargar últimos 30 días + próximos 60 días
    const from = new Date(today); from.setDate(from.getDate() - 30)
    const to = new Date(today); to.setDate(to.getDate() + 60)
    params.set('from', format(from, 'yyyy-MM-dd'))
    params.set('to', format(to, 'yyyy-MM-dd'))
    const r = await fetch(`/api/tareas?${params}`)
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

  // Filtrar
  const tareasFiltradas = tareas.filter(t => {
    if (filtroEstado !== 'todos' && t.estado !== filtroEstado) return false
    if (filtroResponsable !== 'todos' && t.responsable !== filtroResponsable) return false
    if (filtroCanal !== 'todos' && t.canal !== filtroCanal) return false
    return true
  })

  // Agrupar por estado para kanban
  const porEstado = ESTADOS.reduce((acc, e) => {
    acc[e.id] = tareasFiltradas.filter(t => t.estado === e.id)
    return acc
  }, {} as Record<string, Tarea[]>)

  // Stats
  const vencidas = tareas.filter(t => t.fecha < todayStr && t.estado === 'pendiente').length
  const hoy = tareas.filter(t => t.fecha === todayStr && t.estado !== 'publicado').length
  const esta_semana = tareas.filter(t => {
    const d = new Date(t.fecha + 'T12:00:00')
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff >= 0 && diff <= 7 && t.estado !== 'publicado'
  }).length

  const EstadoBadge = ({ estado }: { estado: string }) => {
    const e = ESTADOS.find(x => x.id === estado) || ESTADOS[0]
    return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: e.bg, color: e.color }}>{e.label}</span>
  }

  const TareaCard = ({ t, compact = false }: { t: Tarea; compact?: boolean }) => {
    const vencida = t.fecha < todayStr && t.estado === 'pendiente'
    const esHoy = t.fecha === todayStr
    return (
      <div onClick={() => setSelectedTarea(t)}
        style={{
          background: '#fff', border: `1px solid ${vencida ? '#fca5a5' : esHoy ? '#fde68a' : '#e0dfd5'}`,
          borderRadius: 10, padding: compact ? '10px 14px' : '14px 16px',
          cursor: 'pointer', transition: 'box-shadow .15s',
          borderLeft: `3px solid ${t.color || '#185fa5'}`
        }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{CANAL_EMOJI[t.canal] || '📌'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#9c9a92', textTransform: 'uppercase' }}>{t.canal}</span>
              {t.tipo_contenido && <span style={{ fontSize: 10, color: '#9c9a92' }}>{t.tipo_contenido}</span>}
              <EstadoBadge estado={t.estado} />
              {vencida && <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '2px 6px', borderRadius: 20 }}>⚠ Vencida</span>}
              {esHoy && t.estado !== 'publicado' && <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '2px 6px', borderRadius: 20 }}>📌 Hoy</span>}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: compact ? 'nowrap' : 'normal' }}>
              {t.titulo}
            </div>
            {!compact && t.copy_exacto && (
              <div style={{ fontSize: 12, color: '#6b6a63', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {t.copy_exacto}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <span style={{ fontSize: 11, color: '#9c9a92' }}>
                {format(new Date(t.fecha + 'T12:00:00'), "d 'de' MMMM", { locale: es })}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: t.responsable === 'Creadora' ? '#f3e8ff' : '#e6f1fb', color: t.responsable === 'Creadora' ? '#7c3aed' : '#185fa5' }}>
                {t.responsable}
              </span>
              {t.campanas?.nombre && <span style={{ fontSize: 11, color: '#9c9a92', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📣 {t.campanas.nombre}</span>}
            </div>
          </div>
          {/* Acciones rápidas */}
          <div style={{ display: 'flex', flex: 'column', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            {t.estado !== 'publicado' && (
              <button onClick={() => cambiarEstado(t.id, t.estado === 'pendiente' ? 'en_progreso' : t.estado === 'en_progreso' ? 'en_revision' : 'publicado')}
                style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', background: t.estado === 'en_revision' ? '#dcfce7' : '#f0efe8', color: t.estado === 'en_revision' ? '#15803d' : '#1a1a18' }}>
                {t.estado === 'pendiente' ? '▶ Iniciar' : t.estado === 'en_progreso' ? '👁 Revisión' : '✓ Publicar'}
              </button>
            )}
            {t.estado === 'publicado' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#15803d', fontWeight: 700 }}>
                <Check size={13} /> Publicado
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a18', margin: 0 }}>Tareas pendientes</h1>
        <p style={{ fontSize: 13, color: '#6b6a63', margin: '4px 0 0' }}>Todo lo que hay que publicar, en qué canal, con el copy listo.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Vencidas', value: vencidas, color: '#dc2626', bg: '#fee2e2', emoji: '⚠️' },
          { label: 'Para hoy', value: hoy, color: '#b45309', bg: '#fef3c7', emoji: '📌' },
          { label: 'Esta semana', value: esta_semana, color: '#185fa5', bg: '#e6f1fb', emoji: '📅' },
          { label: 'Total pendientes', value: tareas.filter(t => t.estado !== 'publicado').length, color: '#6b6a63', bg: '#f0efe8', emoji: '📋' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}30`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{s.emoji} {s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.value > 0 && s.label === 'Vencidas' ? '#dc2626' : '#1a1a18' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros y vista */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Filter size={14} color="#9c9a92" />

        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid #e0dfd5', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', color: '#1a1a18', background: '#fff' }}>
          <option value="todos">Todos los estados</option>
          {ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>

        <select value={filtroResponsable} onChange={e => setFiltroResponsable(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid #e0dfd5', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', color: '#1a1a18', background: '#fff' }}>
          <option value="todos">Todos los responsables</option>
          <option value="David">David</option>
          <option value="Creadora">Creadora</option>
          <option value="Comité">Comité</option>
        </select>

        <select value={filtroCampana} onChange={e => setFiltroCampana(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #e0dfd5', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', background: '#fff', color: '#1a1a18', cursor: 'pointer' }}>
          <option value="todos">Todas las campañas</option>
          {campanas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>

        <select value={filtroCanal} onChange={e => setFiltroCanal(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid #e0dfd5', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', color: '#1a1a18', background: '#fff' }}>
          <option value="todos">Todos los canales</option>
          {['Instagram', 'TikTok', 'Meta Ads', 'Email', 'WhatsApp', 'Google Ads', 'Offline'].map(c => <option key={c}>{c}</option>)}
        </select>

        {(filtroEstado !== 'todos' || filtroResponsable !== 'todos' || filtroCanal !== 'todos' || filtroCampana !== 'todos') && (
          <button onClick={() => { setFiltroEstado('todos'); setFiltroResponsable('todos'); setFiltroCanal('todos'); setFiltroCampana('todos') }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', border: '1px solid #e0dfd5', borderRadius: 8, fontSize: 12, background: '#fff', color: '#6b6a63', cursor: 'pointer', fontFamily: 'inherit' }}>
            <X size={12} /> Limpiar filtros
          </button>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {['lista', 'kanban'].map(v => (
            <button key={v} onClick={() => setView(v as 'lista' | 'kanban')}
              style={{ padding: '7px 14px', border: '1px solid #e0dfd5', borderRadius: 8, fontSize: 12, fontWeight: view === v ? 700 : 400, background: view === v ? '#1a1a18' : '#fff', color: view === v ? '#fff' : '#1a1a18', cursor: 'pointer', fontFamily: 'inherit' }}>
              {v === 'lista' ? '☰ Lista' : '⊞ Kanban'}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 12, color: '#9c9a92' }}>{tareasFiltradas.length} tarea{tareasFiltradas.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9c9a92', fontSize: 13 }}>Cargando tareas...</div>
      ) : tareasFiltradas.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px solid #e0dfd5' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a18', marginBottom: 6 }}>Sin tareas con estos filtros</div>
          <div style={{ fontSize: 13, color: '#9c9a92' }}>Crea una campaña y sincronízala con el calendario.</div>
        </div>
      ) : view === 'lista' ? (
        /* VISTA LISTA */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tareasFiltradas.sort((a, b) => {
            // Ordenar: vencidas primero, luego hoy, luego por fecha
            const aVenc = a.fecha < todayStr && a.estado === 'pendiente'
            const bVenc = b.fecha < todayStr && b.estado === 'pendiente'
            if (aVenc && !bVenc) return -1
            if (!aVenc && bVenc) return 1
            return a.fecha.localeCompare(b.fecha)
          }).map(t => <TareaCard key={t.id} t={t} />)}
        </div>
      ) : (
        /* VISTA KANBAN */
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

      {/* MODAL DETALLE DE TAREA */}
      {selectedTarea && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}
          onClick={() => setSelectedTarea(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{CANAL_EMOJI[selectedTarea.canal] || '📌'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a18', marginBottom: 6 }}>{selectedTarea.titulo}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: '#e6f1fb', color: '#185fa5' }}>{selectedTarea.canal}</span>
                  {selectedTarea.tipo_contenido && <span style={{ fontSize: 11, color: '#9c9a92' }}>{selectedTarea.tipo_contenido}</span>}
                  <span style={{ fontSize: 11, color: '#9c9a92' }}>
                    {format(new Date(selectedTarea.fecha + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: selectedTarea.responsable === 'Creadora' ? '#f3e8ff' : '#e6f1fb', color: selectedTarea.responsable === 'Creadora' ? '#7c3aed' : '#185fa5' }}>
                    {selectedTarea.responsable}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedTarea(null)} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#9c9a92', flexShrink: 0 }}>✕</button>
            </div>

            {/* Estado */}
            <div style={{ background: '#f5f4ef', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Estado de la tarea</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {ESTADOS.map(e => (
                  <button key={e.id} onClick={() => cambiarEstado(selectedTarea.id, e.id)}
                    style={{ flex: 1, padding: '8px 4px', border: selectedTarea.estado === e.id ? `2px solid ${e.color}` : '1px solid #e0dfd5', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: selectedTarea.estado === e.id ? e.bg : '#fff', color: selectedTarea.estado === e.id ? e.color : '#6b6a63' }}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Copy exacto */}
            {selectedTarea.copy_exacto && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>📝 Copy listo para publicar</div>
                <div style={{ background: '#f5f4ef', borderRadius: 10, padding: 14, fontSize: 13, color: '#1a1a18', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {selectedTarea.copy_exacto}
                </div>
                <button onClick={() => navigator.clipboard.writeText(selectedTarea.copy_exacto)}
                  style={{ marginTop: 8, padding: '6px 14px', background: '#e6f1fb', color: '#185fa5', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Copiar copy
                </button>
              </div>
            )}

            {/* Guión */}
            {selectedTarea.guion && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>🎬 Guión del video</div>
                <div style={{ background: '#f5f4ef', borderRadius: 10, padding: 14, fontSize: 13, color: '#1a1a18', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {selectedTarea.guion}
                </div>
              </div>
            )}

            {/* Música */}
            {selectedTarea.musica_sugerida && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>🎵 Música sugerida</div>
                <div style={{ background: '#f0efe8', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1a1a18', fontWeight: 600 }}>
                  {selectedTarea.musica_sugerida}
                </div>
              </div>
            )}

            {/* Referencia visual */}
            {selectedTarea.referencia_visual && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>📷 Referencia visual</div>
                <div style={{ background: '#f0efe8', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1a1a18', lineHeight: 1.6 }}>
                  {selectedTarea.referencia_visual}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
