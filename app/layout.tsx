import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Terret CMO',
  description: 'Director de Marketing — Terret',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" style={{ colorScheme: 'light' }}>
      <head>
        <meta name="theme-color" content="#1a1a18" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body style={{ margin: 0, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background: '#f5f4ef', colorScheme: 'light' }}>
        {children}
      </body>
    </html>
  )
}
