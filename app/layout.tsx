import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Terret CMO',
  description: 'Director de Marketing — Terret',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Terret CMO' },
}
export const viewport: Viewport = { themeColor: '#1a1a18', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head><link rel="apple-touch-icon" href="/icon-192.png" /></head>
      <body style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', margin: 0 }}>
        {children}
      </body>
    </html>
  )
}
