'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const NAV = [
  { section: 'Principal' },
  { href: '/', label: 'Inicio', icon: '⌂' },
  { href: '/campanas', label: 'Campañas', icon: '◈', badge: 'IA' },
  { href: '/tareas', label: 'Tareas', icon: '◻', badgeKey: 'pendientes' },
  { href: '/calendario', label: 'Calendario', icon: '▦' },
  { section: 'Contenido' },
  { href: '/creadora', label: 'Vista creadora', icon: '◉' },
  { section: 'Análisis' },
  { href: '/kpis', label: 'KPIs y métricas', icon: '▲' },
  { href: '/reporte', label: 'Reporte semanal', icon: '◫' },
  { section: 'Equipo' },
  { href: '/comite', label: 'Modo comité', icon: '◎' },
]

const DS = {
  bg: '#F2F0EA',
  surface: '#FFFFFF',
  border: '#E5E2D9',
  text: '#1C1B18',
  textSecondary: '#6B6860',
  accent: '#E8520A',
  accentLight: '#FEF0E8',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [pendientes, setPendientes] = useState(0)
  const [userEmail, setUserEmail] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    fetch('/api/tareas?estado=pendiente')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          const today = new Date().toISOString().split('T')[0]
          setPendientes(d.filter((t: { estado: string; fecha: string }) => t.estado === 'pendiente' && t.fecha <= today).length)
        }
      })
      .catch(() => {})

    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email)
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: DS.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* SIDEBAR */}
      <aside style={{
        width: 232, flexShrink: 0, background: DS.surface,
        borderRight: `1px solid ${DS.border}`, display: 'flex',
        flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 18px 16px', borderBottom: `1px solid ${DS.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, background: DS.text, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 16, fontWeight: 800, flexShrink: 0,
              letterSpacing: '-0.5px'
            }}>T</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: DS.text, letterSpacing: '-0.3px' }}>Terret CMO</div>
              <div style={{ fontSize: 11, color: DS.accent, marginTop: 1, fontWeight: 600 }}>Director de Marketing</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 10px' }}>
          {NAV.map((item, i) => {
            if ('section' in item) {
              return (
                <div key={i} style={{
                  fontSize: 9, fontWeight: 700, color: '#B8B5AC',
                  textTransform: 'uppercase', letterSpacing: '0.8px',
                  padding: '16px 8px 6px', marginTop: i === 0 ? 4 : 0
                }}>{item.section}</div>
              )
            }
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px', borderRadius: 8, marginBottom: 1,
                textDecoration: 'none', fontSize: 13,
                background: active ? DS.text : 'transparent',
                color: active ? '#fff' : DS.textSecondary,
                fontWeight: active ? 600 : 400,
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 14, flexShrink: 0, opacity: active ? 1 : 0.6 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 6, fontWeight: 700,
                    background: active ? 'rgba(255,255,255,0.2)' : DS.accent,
                    color: '#fff', flexShrink: 0
                  }}>{item.badge}</span>
                )}
                {item.badgeKey === 'pendientes' && pendientes > 0 && (
                  <span style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 6, fontWeight: 700,
                    background: active ? 'rgba(255,255,255,0.2)' : '#C91B1B',
                    color: '#fff', flexShrink: 0, minWidth: 18, textAlign: 'center'
                  }}>{pendientes}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: `1px solid ${DS.border}` }}>
          <div style={{ fontSize: 11, color: DS.textSecondary, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userEmail}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1A7A4A' }} />
              <span style={{ fontSize: 10, color: DS.textSecondary }}>Claude activo</span>
            </div>
            <button onClick={handleLogout} style={{
              fontSize: 11, color: DS.textSecondary, background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', padding: '2px 6px',
              borderRadius: 4
            }}>
              Salir →
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{
        flex: 1, overflowY: 'auto', padding: '28px 32px',
        background: DS.bg, color: DS.text
      }}>
        {children}
      </main>
    </div>
  )
}
