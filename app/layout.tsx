import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Altaporta Cotizador',
  description: 'Sistema de cotización Altaporta Catering',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="antialiased bg-stone-50 text-stone-900">
        {children}
      </body>
    </html>
  )
}
