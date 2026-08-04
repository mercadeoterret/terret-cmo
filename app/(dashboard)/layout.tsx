'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV = [
  { section: 'Principal' },
  { href: '/', label: 'Inicio', emoji: '🏠' },
  { href: '/campanas', label: 'Campañas', emoji: '📣', badge: 'IA' },
  { href: '/tareas', label: 'Tareas pendientes', emoji: '✅' },
  { href: '/calendario', label: 'Calendario', emoji: '📅' },
  { section: 'Contenido' },
  { href: '/contenido', label: 'Copies y guiones', emoji: '✏️' },
  { href: '/briefs', label: 'Briefings', emoji: '📋' },
  { href: '/creadora', label: 'Vista creadora', emoji: '🎬' },
  { section: 'Análisis' },
  { href: '/kpis', label: 'KPIs y métricas', emoji: '📊' },
  { href: '/reporte', label: 'Reporte semanal', emoji: '📄' },
  { section: 'Equipo' },
  { href: '/comite', label: 'Modo comité', emoji: '👥' },
  { href: '/meta', label: 'Meta API', emoji: '📡', badge: 'Próximo' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [pendientes, setPendientes] = useState(0)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    // Cargar tareas pendientes para badge
    fetch('/api/tareas?estado=pendiente')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPendientes(d.filter((t: {estado: string; fecha: string}) => t.estado === 'pendiente' && t.fecha <= new Date().toISOString().split('T')[0]).length) })
      .catch(() => {})
  }, [])

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      background: '#f5f4ef', colorScheme: 'light'
    }}>
      {/* SIDEBAR */}
      <aside style={{
        width: 220, flexShrink: 0, background: '#ffffff',
        borderRight: '1px solid #e0dfd5', display: 'flex',
        flexDirection: 'column', overflowY: 'auto',
        boxShadow: '1px 0 0 #e0dfd5'
      }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px', borderBottom: '1px solid #e0dfd5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, background: '#1a1a18', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 15, fontWeight: 800, flexShrink: 0
            }}>T</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18', lineHeight: 1.2 }}>Terret CMO</div>
              <div style={{ fontSize: 10, color: '#9c9a92', marginTop: 1 }}>Director de Marketing</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px' }}>
          {NAV.map((item, i) => {
            if ('section' in item) {
              return (
                <div key={i} style={{
                  fontSize: 9, fontWeight: 700, color: '#9c9a92',
                  textTransform: 'uppercase', letterSpacing: 1,
                  padding: '14px 8px 5px', marginTop: i === 0 ? 0 : 4
                }}>{item.section}</div>
              )
            }
            const active = pathname === item.href
            const isTareas = item.href === '/tareas'
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 7, marginBottom: 1,
                textDecoration: 'none', fontSize: 13,
                background: active ? '#1a1a18' : 'transparent',
                color: active ? '#ffffff' : '#1a1a18',
                fontWeight: active ? 600 : 400,
              }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>{item.emoji}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 10, fontWeight: 700,
                    background: item.badge === 'IA' ? '#185fa5' : '#b45309', color: '#fff',
                    flexShrink: 0
                  }}>{item.badge}</span>
                )}
                {isTareas && pendientes > 0 && (
                  <span style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 10, fontWeight: 700,
                    background: '#dc2626', color: '#fff', flexShrink: 0
                  }}>{pendientes}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e0dfd5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: '#9c9a92' }}>Claude API activo</span>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{
        flex: 1, overflowY: 'auto', padding: 28,
        background: '#f5f4ef', color: '#1a1a18'
      }}>
        {children}
      </main>
    </div>
  )
}
