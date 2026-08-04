'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const NAV = [
  { section: 'Principal' },
  { href: '/', label: '🏠 Inicio' },
  { href: '/campanas', label: '📣 Crear campaña', badge: 'IA' },
  { href: '/calendario', label: '📅 Calendario editorial' },
  { href: '/contenido', label: '✏️ Copies y guiones' },
  { href: '/briefs', label: '📋 Briefings' },
  { section: 'Análisis' },
  { href: '/kpis', label: '📊 KPIs y métricas' },
  { href: '/reporte', label: '📄 Reporte semanal' },
  { section: 'Equipo' },
  { href: '/comite', label: '👥 Modo comité' },
  { section: 'Config' },
  { href: '/meta', label: '📡 Meta API', badge: 'Próximo' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(console.error)
  }, [])
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f5f4ef', colorScheme: 'light' }}>
      <aside style={{ width: 220, flexShrink: 0, background: '#f0efe8', borderRight: '2px solid #e0dfd5', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #e0dfd5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: '#1a1a18', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>T</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a18' }}>Terret CMO</div>
              <div style={{ fontSize: 11, color: '#6b6a63' }}>Director de Marketing</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: 12 }}>
          {NAV.map((item, i) => {
            if ('section' in item) return (
              <div key={i} style={{ fontSize: 10, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: 1, padding: '14px 8px 4px', fontWeight: 700 }}>{item.section}</div>
            )
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 12px', borderRadius: 8, marginBottom: 2, textDecoration: 'none',
                background: active ? '#1a1a18' : 'transparent',
                color: active ? '#ffffff' : '#1a1a18',
                fontWeight: active ? 700 : 400, fontSize: 13,
                border: active ? 'none' : '1px solid transparent',
              }}>
                <span>{item.label}</span>
                {item.badge && (
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 10, fontWeight: 700, background: item.badge === 'IA' ? '#185fa5' : '#b45309', color: '#fff' }}>{item.badge}</span>
                )}
              </Link>
            )
          })}
        </nav>
        <div style={{ padding: 12, borderTop: '1px solid #e0dfd5', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }}></div>
          <span style={{ fontSize: 11, color: '#6b6a63' }}>Claude API activo</span>
        </div>
      </aside>
      <main style={{ flex: 1, overflowY: 'auto', padding: 28, background: '#f5f4ef', color: '#1a1a18' }}>
        {children}
      </main>
    </div>
  )
}
