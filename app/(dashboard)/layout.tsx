'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Home, Megaphone, Calendar, PenLine, Clipboard, BarChart2, Users, FileText, Wifi } from 'lucide-react'

const NAV = [
  { section: 'Principal' },
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/campanas', label: 'Crear campaña', icon: Megaphone, badge: 'IA' },
  { href: '/calendario', label: 'Calendario editorial', icon: Calendar },
  { href: '/contenido', label: 'Copies y guiones', icon: PenLine },
  { href: '/briefs', label: 'Briefings', icon: Clipboard },
  { section: 'Análisis' },
  { href: '/kpis', label: 'KPIs y métricas', icon: BarChart2 },
  { href: '/reporte', label: 'Reporte semanal', icon: FileText },
  { section: 'Equipo' },
  { href: '/comite', label: 'Modo comité', icon: Users },
  { section: 'Config' },
  { href: '/meta', label: 'Meta API', icon: Wifi, badge: 'Próximo' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    }
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f5f4ef' }}>
      <aside style={{ width: 210, flexShrink: 0, background: '#f0efe8', borderRight: '1px solid #e0dfd5', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #e0dfd5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: '#1a1a18', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>T</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>Terret CMO</div>
              <div style={{ fontSize: 10, color: '#9c9a92' }}>Director de Marketing</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {NAV.map((item, i) => {
            if ('section' in item) return (
              <div key={i} style={{ fontSize: 9, color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '.8px', padding: '0 6px', margin: '14px 0 4px', fontWeight: 600 }}>{item.section}</div>
            )
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 6,
                fontSize: 12, marginBottom: 1, textDecoration: 'none', fontWeight: active ? 600 : 400,
                background: active ? '#fff' : 'transparent', color: active ? '#1a1a18' : '#6b6a63',
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              }}>
                <Icon size={14} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 8, fontWeight: 600,
                    background: item.badge === 'IA' ? '#e6f1fb' : '#fef3c7',
                    color: item.badge === 'IA' ? '#185fa5' : '#b45309' }}>{item.badge}</span>
                )}
              </Link>
            )
          })}
        </nav>
        <div style={{ padding: 12, borderTop: '1px solid #e0dfd5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }}></div>
            <span style={{ fontSize: 10, color: '#9c9a92' }}>Claude API activo</span>
          </div>
        </div>
      </aside>
      <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>{children}</main>
    </div>
  )
}
