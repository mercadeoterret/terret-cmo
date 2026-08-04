'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, ChevronRight } from 'lucide-react'

interface Tarea {
  id: string; fecha: string; titulo: string; canal: string; tipo_contenido: string
  copy_exacto: string; guion: string; musica_sugerida: string; referencia_visual: string
  estado: string; campanas?: { nombre: string }
}

export default function CreadouraPage() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [selected, setSelected] = useState<Tarea | null>(null)

  useEffect(() => {
    const today = new Date()
    const to = new Date(today); to.setDate(to.getDate() + 14)
    fetch(`/api/tareas?responsable=Creadora&from=${format(today, 'yyyy-MM-dd')}&to=${format(to, 'yyyy-MM-dd')}`)
      .then(r => r.json()).then(d => setTareas(Array.isArray(d) ? d : []))
  }, [])

  async function marcarHecho(id: string) {
    await fetch('/api/tareas', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado: 'en_revision' })
    })
    setTareas(prev => prev.map(t => t.id === id ? { ...t, estado: 'en_revision' } : t))
    setSelected(prev => prev?.id === id ? { ...prev, estado: 'en_revision' } : prev)
  }

  const hoy = format(new Date(), 'yyyy-MM-dd')
  const tareasHoy = tareas.filter(t => t.fecha === hoy && t.estado !== 'publicado')
  const tareasPróximas = tareas.filter(t => t.fecha > hoy && t.estado !== 'publicado')

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ background: '#1a1a18', color: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>🎬 Vista Creadora</div>
        <div style={{ fontSize: 13, opacity: .7 }}>Tus tareas de los próximos 14 días con todo el brief listo.</div>
      </div>

      {tareasHoy.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a18', marginBottom: 12 }}>
            📌 Para hoy — {format(new Date(), "d 'de' MMMM", { locale: es })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tareasHoy.map(t => (
              <div key={t.id} onClick={() => setSelected(t)}
                style={{ background: '#fffbf0', border: '2px solid #fde68a', borderRadius: 12, padding: '16px 20px', cursor: 'pointer', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '2px 8px', borderRadius: 20, marginRight: 8 }}>{t.canal}</span>
                    <span style={{ fontSize: 11, color: '#9c9a92' }}>{t.tipo_contenido}</span>
                  </div>
                  {t.estado !== 'en_revision' && (
                    <button onClick={e => { e.stopPropagation(); marcarHecho(t.id) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <Check size={12} /> Marcar como listo
                    </button>
                  )}
                  {t.estado === 'en_revision' && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#185fa5' }}>✓ Enviado a revisión</span>
                  )}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a18', marginBottom: 6 }}>{t.titulo}</div>
                {t.copy_exacto && (
                  <div style={{ fontSize: 12, color: '#6b6a63', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {t.copy_exacto}
                  </div>
                )}
                {t.musica_sugerida && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>🎵 {t.musica_sugerida}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tareasPróximas.length > 0 && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a18', marginBottom: 12 }}>📅 Próximas tareas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tareasPróximas.map(t => (
              <div key={t.id} onClick={() => setSelected(t)}
                style={{ background: '#fff', border: '1px solid #e0dfd5', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 11, color: '#9c9a92', fontWeight: 700, minWidth: 60 }}>
                  {format(new Date(t.fecha + 'T12:00:00'), 'd MMM', { locale: es })}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#185fa5', background: '#e6f1fb', padding: '2px 8px', borderRadius: 20 }}>{t.canal}</span>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>{t.titulo}</div>
                <ChevronRight size={14} color="#9c9a92" />
              </div>
            ))}
          </div>
        </div>
      )}

      {tareas.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px solid #e0dfd5' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a18', marginBottom: 6 }}>Sin tareas asignadas</div>
          <div style={{ fontSize: 13, color: '#9c9a92' }}>Cuando David genere una campaña y la sincronice, tus tareas aparecerán aquí.</div>
        </div>
      )}

      {/* Modal detalle */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}
          onClick={() => setSelected(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#1a1a18' }}>{selected.titulo}</div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9c9a92', fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: '#e6f1fb', color: '#185fa5' }}>{selected.canal}</span>
              <span style={{ fontSize: 12, color: '#9c9a92' }}>{selected.tipo_contenido}</span>
              <span style={{ fontSize: 12, color: '#9c9a92', fontWeight: 600 }}>
                {format(new Date(selected.fecha + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
              </span>
            </div>

            {[
              { label: '📝 Copy exacto para publicar', value: selected.copy_exacto, copyable: true },
              { label: '🎬 Guión del video', value: selected.guion, copyable: false },
              { label: '🎵 Música sugerida', value: selected.musica_sugerida, copyable: false },
              { label: '📷 Referencia visual y locación', value: selected.referencia_visual, copyable: false },
            ].filter(s => s.value).map(s => (
              <div key={s.label} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>{s.label}</div>
                <div style={{ background: '#f5f4ef', borderRadius: 10, padding: 14, fontSize: 13, color: '#1a1a18', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.value}</div>
                {s.copyable && (
                  <button onClick={() => navigator.clipboard.writeText(s.value)}
                    style={{ marginTop: 8, padding: '6px 14px', background: '#e6f1fb', color: '#185fa5', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Copiar
                  </button>
                )}
              </div>
            ))}

            {selected.estado !== 'en_revision' && (
              <button onClick={() => { marcarHecho(selected.id); setSelected(null) }}
                style={{ width: '100%', padding: '12px', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Check size={16} /> Marcar como listo — enviar a revisión
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
