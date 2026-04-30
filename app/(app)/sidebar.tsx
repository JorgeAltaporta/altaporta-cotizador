'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type SidebarProps = {
  nombre: string
  rol: string
  color: string
}

const NAV_ITEMS = [
  { label: 'Inicio',           href: '/',                  icon: '🏠' },
  { label: 'Nueva Cotización', href: '/cotizaciones/nueva', icon: '+', destacada: true },
  { label: 'Cotizaciones',     href: '/cotizaciones',      icon: '📄' },
  { label: 'Wedding Planners', href: '/wps',               icon: '👥' },
  { label: 'Ejecutivos',       href: '/ejecutivos',        icon: '🏆' },
  { label: 'Métricas',         href: '/metricas',          icon: '📊' },
  { label: 'Configuración',    href: '/catalogo',          icon: '📦' },
]

export default function Sidebar({ nombre, rol, color }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const inicial = nombre.trim().charAt(0).toUpperCase()

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-stone-900 text-stone-100 flex flex-col">
      {/* LOGO */}
      <div className="px-6 py-6 flex items-center gap-3">
        <div className="w-12 h-12 bg-amber-700 rounded-lg flex items-center justify-center text-white font-serif text-2xl">
          A
        </div>
        <div>
          <div className="font-serif text-lg leading-none">Altaporta</div>
          <div className="text-xs tracking-widest text-amber-700 mt-0.5">CATERING</div>
        </div>
      </div>

      {/* USUARIO */}
      <div className="px-6 py-4 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
            style={{ backgroundColor: color }}
          >
            {inicial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{nombre}</div>
            <div className="text-xs text-stone-400">{rol}</div>
          </div>
        </div>
      </div>

      {/* NAV */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const activo = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))

          if (item.destacada) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mx-3 px-4 py-2.5 rounded-lg flex items-center gap-3 font-medium transition ${
                  activo
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-700 hover:bg-amber-600 text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mx-3 px-4 py-2.5 rounded-lg flex items-center gap-3 transition ${
                activo
                  ? 'bg-stone-800 text-amber-500'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* FOOTER */}
      <div className="px-6 py-4 border-t border-stone-800 space-y-2">
        <button
          onClick={handleLogout}
          className="w-full text-sm text-stone-400 hover:text-stone-100 text-left transition"
        >
          Cerrar sesión
        </button>
        <div className="text-xs text-stone-500 pt-2">
          Módulo de Cotización
          <br />
          v0.2 · Prototipo
        </div>
      </div>
    </aside>
  )
}
