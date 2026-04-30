'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  Home,
  Plus,
  Target,
  FileText,
  Users,
  Package,
  Calendar,
  Truck,
  HardHat,
  Boxes,
  ChefHat,
  BookOpen,
  ListChecks,
  Carrot,
  ClipboardList,
  ShoppingCart,
  Wallet,
  Receipt,
  Percent,
  Repeat,
  BarChart3,
  PiggyBank,
  FileBarChart,
  TrendingUp,
  UserCog,
  DollarSign,
  CalendarCheck,
  Building2,
  Award,
  LineChart,
  Settings,
  ShieldCheck,
  History,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

type SidebarProps = {
  nombre: string
  rol: string
  color: string
}

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  /** Si true, el item está "Próximamente": redirige a /proximamente */
  wip?: boolean
  /** Si está definido, solo los nombres listados ven este item.
   *  Temporal: usamos `nombre` mientras no exista profile.puede_aprobar */
  visibleParaNombres?: string[]
  /** Botón destacado tipo "Nueva Cotización" */
  destacada?: boolean
}

type NavSection = {
  id: string
  label: string
  items: NavItem[]
  /** Si está definido, la sección entera solo es visible para esos nombres */
  visibleParaNombres?: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// USUARIOS APROBADORES (mientras no hay profile.puede_aprobar)
// ─────────────────────────────────────────────────────────────────────────────

const APROBADORES = ['Jorge', 'Danna']

function esAprobador(nombre: string): boolean {
  const primero = (nombre || '').trim().split(/\s+/)[0]
  return APROBADORES.some((n) => n.toLowerCase() === primero.toLowerCase())
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTRUCTURA DEL SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────
// Items sueltos arriba (sin sección): Inicio + Nueva Cotización
// Después: secciones agrupadas

const ITEMS_SUPERIORES: NavItem[] = [
  { label: 'Inicio', href: '/', icon: Home },
  {
    label: 'Nueva Cotización',
    href: '/cotizaciones/nueva',
    icon: Plus,
    destacada: true,
  },
]

const SIDEBAR_SECTIONS: NavSection[] = [
  {
    id: 'ventas',
    label: 'Ventas',
    items: [
      { label: 'Leads', href: '/leads', icon: Target, wip: true },
      { label: 'Cotizaciones', href: '/cotizaciones', icon: FileText },
      { label: 'Wedding Planners', href: '/wps', icon: Users },
      { label: 'Configuración', href: '/catalogo', icon: Package },
    ],
  },
  {
    id: 'operaciones',
    label: 'Operaciones',
    items: [
      { label: 'Eventos', href: '/operaciones/eventos', icon: Calendar, wip: true },
      { label: 'Logística', href: '/operaciones/logistica', icon: Truck, wip: true },
      { label: 'Personal de evento', href: '/operaciones/personal', icon: HardHat, wip: true },
      { label: 'Bodega de mobiliario', href: '/operaciones/bodega', icon: Boxes, wip: true },
    ],
  },
  {
    id: 'cocina',
    label: 'Cocina',
    items: [
      { label: 'Producción de eventos', href: '/cocina/produccion', icon: ChefHat, wip: true },
      { label: 'Recetas', href: '/cocina/recetas', icon: BookOpen, wip: true },
      { label: 'Subrecetas', href: '/cocina/subrecetas', icon: ListChecks, wip: true },
      { label: 'Almacén de insumos', href: '/cocina/almacen', icon: Carrot, wip: true },
      { label: 'Inventario de cocina', href: '/cocina/inventario', icon: ClipboardList, wip: true },
      { label: 'Órdenes de compra', href: '/cocina/ordenes', icon: ShoppingCart, wip: true },
    ],
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    items: [
      { label: 'Cuentas por cobrar', href: '/finanzas/por-cobrar', icon: Wallet, wip: true },
      { label: 'Cuentas por pagar', href: '/finanzas/por-pagar', icon: Receipt, wip: true },
      { label: 'Comisiones', href: '/finanzas/comisiones', icon: Percent, wip: true },
      { label: 'Pagos recurrentes', href: '/finanzas/recurrentes', icon: Repeat, wip: true },
    ],
  },
  {
    id: 'contabilidad',
    label: 'Contabilidad',
    visibleParaNombres: APROBADORES,
    items: [
      { label: 'Ingresos / Egresos', href: '/contabilidad/movimientos', icon: BarChart3, wip: true },
      { label: 'Caja chica', href: '/contabilidad/caja-chica', icon: PiggyBank, wip: true },
      { label: 'Facturación fiscal', href: '/contabilidad/facturacion', icon: FileBarChart, wip: true },
      { label: 'Estado de resultados', href: '/contabilidad/resultados', icon: TrendingUp, wip: true },
    ],
  },
  {
    id: 'rh',
    label: 'Recursos humanos',
    items: [
      { label: 'Empleados', href: '/rh/empleados', icon: UserCog, wip: true },
      { label: 'Nómina', href: '/rh/nomina', icon: DollarSign, wip: true, visibleParaNombres: APROBADORES },
      { label: 'Asistencia', href: '/rh/asistencia', icon: CalendarCheck, wip: true },
    ],
  },
  {
    id: 'directorio',
    label: 'Directorio',
    items: [
      { label: 'Proveedores', href: '/directorio/proveedores', icon: Building2, wip: true },
      { label: 'Transportistas', href: '/directorio/transportistas', icon: Truck, wip: true },
    ],
  },
  {
    id: 'analisis',
    label: 'Análisis',
    items: [
      { label: 'Ejecutivos', href: '/ejecutivos', icon: Award },
      { label: 'Métricas', href: '/metricas', icon: BarChart3 },
      { label: 'Rentabilidad por evento', href: '/analisis/rentabilidad', icon: LineChart, wip: true, visibleParaNombres: APROBADORES },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    visibleParaNombres: APROBADORES,
    items: [
      { label: 'Configuración general', href: '/sistema/configuracion', icon: Settings, wip: true },
      { label: 'Permisos y roles', href: '/sistema/permisos', icon: ShieldCheck, wip: true },
      { label: 'Bitácora', href: '/sistema/bitacora', icon: History, wip: true },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function rutaCoincide(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

function hrefDestino(item: NavItem): string {
  if (item.wip) {
    return `/proximamente?modulo=${encodeURIComponent(item.label)}`
  }
  return item.href
}

function itemEsVisible(item: NavItem, nombre: string): boolean {
  if (!item.visibleParaNombres) return true
  return item.visibleParaNombres.some(
    (n) => n.toLowerCase() === (nombre || '').trim().split(/\s+/)[0]?.toLowerCase()
  )
}

function seccionEsVisible(seccion: NavSection, nombre: string): boolean {
  if (!seccion.visibleParaNombres) return true
  return seccion.visibleParaNombres.some(
    (n) => n.toLowerCase() === (nombre || '').trim().split(/\s+/)[0]?.toLowerCase()
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────────────────────────────────────

export default function Sidebar({ nombre, rol, color }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Estado de secciones colapsadas (persistido en localStorage)
  // Default: TODAS expandidas (decisión de Jorge)
  const STORAGE_KEY = 'altaporta:sidebar:secciones-cerradas'
  const [seccionesCerradas, setSeccionesCerradas] = useState<Set<string>>(new Set())
  const [hidratado, setHidratado] = useState(false)

  // Cargar estado guardado de localStorage al montar
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const arr = JSON.parse(raw) as string[]
        if (Array.isArray(arr)) {
          setSeccionesCerradas(new Set(arr))
        }
      }
    } catch {
      // localStorage no disponible o corrupto: ignorar
    }
    setHidratado(true)
  }, [])

  // Persistir cambios
  useEffect(() => {
    if (!hidratado) return
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Array.from(seccionesCerradas))
      )
    } catch {
      // ignore
    }
  }, [seccionesCerradas, hidratado])

  // Auto-expandir la sección del item activo
  useEffect(() => {
    const seccionActiva = SIDEBAR_SECTIONS.find((s) =>
      s.items.some((i) => !i.wip && rutaCoincide(pathname, i.href))
    )
    if (seccionActiva && seccionesCerradas.has(seccionActiva.id)) {
      setSeccionesCerradas((prev) => {
        const next = new Set(prev)
        next.delete(seccionActiva.id)
        return next
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  function toggleSeccion(id: string) {
    setSeccionesCerradas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const inicial = (nombre || '?').trim().charAt(0).toUpperCase() || '?'
  const usuarioEsAprobador = esAprobador(nombre)

  // Filtrar secciones e items según permisos del usuario
  const seccionesVisibles = useMemo(() => {
    return SIDEBAR_SECTIONS.filter((s) => seccionEsVisible(s, nombre))
      .map((s) => ({
        ...s,
        items: s.items.filter((i) => itemEsVisible(i, nombre)),
      }))
      .filter((s) => s.items.length > 0)
  }, [nombre])

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-stone-900 text-stone-100 flex flex-col">
      {/* LOGO */}
      <div className="px-6 py-6 flex items-center gap-3 shrink-0">
        <div
          className="w-12 h-12 bg-amber-700 rounded-lg flex items-center justify-center text-white text-2xl"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          A
        </div>
        <div>
          <div
            className="text-lg leading-none"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Altaporta
          </div>
          <div className="text-xs tracking-widest text-amber-700 mt-0.5">
            CATERING
          </div>
        </div>
      </div>

      {/* USUARIO */}
      <div className="px-6 py-4 border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
            style={{ backgroundColor: color }}
          >
            {inicial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{nombre}</div>
            <div className="text-xs text-stone-400 truncate">
              {rol}
              {usuarioEsAprobador ? ' · Aprobador' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* NAV */}
      <nav className="flex-1 overflow-y-auto py-3">
        {/* Items superiores (Inicio + Nueva Cotización) */}
        <div className="space-y-1 mb-3">
          {ITEMS_SUPERIORES.map((item) => (
            <SidebarItem
              key={item.href}
              item={item}
              activo={rutaCoincide(pathname, item.href)}
            />
          ))}
        </div>

        {/* Secciones colapsables */}
        <div className="space-y-0.5">
          {seccionesVisibles.map((seccion) => {
            const cerrada = seccionesCerradas.has(seccion.id)
            return (
              <SidebarSeccion
                key={seccion.id}
                seccion={seccion}
                cerrada={cerrada}
                pathname={pathname}
                onToggle={() => toggleSeccion(seccion.id)}
              />
            )
          })}
        </div>
      </nav>

      {/* FOOTER */}
      <div className="px-6 py-4 border-t border-stone-800 space-y-2 shrink-0">
        <button
          onClick={handleLogout}
          className="w-full text-sm text-stone-400 hover:text-stone-100 text-left transition cursor-pointer"
        >
          Cerrar sesión
        </button>
        <div className="text-xs text-stone-500 pt-2">
          Sistema Altaporta
          <br />
          v0.3 · Estructura modular
        </div>
      </div>
    </aside>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: Sección colapsable
// ─────────────────────────────────────────────────────────────────────────────

function SidebarSeccion({
  seccion,
  cerrada,
  pathname,
  onToggle,
}: {
  seccion: NavSection
  cerrada: boolean
  pathname: string
  onToggle: () => void
}) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full px-6 py-2 flex items-center justify-between text-xs uppercase tracking-widest text-stone-500 hover:text-stone-300 transition cursor-pointer"
      >
        <span>{seccion.label}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${cerrada ? '-rotate-90' : ''}`}
        />
      </button>
      {!cerrada && (
        <div className="space-y-0.5 mt-1">
          {seccion.items.map((item) => (
            <SidebarItem
              key={item.href}
              item={item}
              activo={!item.wip && rutaCoincide(pathname, item.href)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: Item individual
// ─────────────────────────────────────────────────────────────────────────────

function SidebarItem({ item, activo }: { item: NavItem; activo: boolean }) {
  const Icon = item.icon
  const destino = hrefDestino(item)

  if (item.destacada) {
    return (
      <Link
        href={destino}
        className={`mx-3 px-4 py-2.5 rounded-lg flex items-center gap-3 font-medium transition ${
          activo
            ? 'bg-amber-600 text-white'
            : 'bg-amber-700 hover:bg-amber-600 text-white'
        }`}
      >
        <Icon size={18} />
        <span>{item.label}</span>
      </Link>
    )
  }

  return (
    <Link
      href={destino}
      className={`mx-3 px-4 py-2 rounded-lg flex items-center gap-3 text-sm transition ${
        activo
          ? 'bg-stone-800 text-amber-500'
          : item.wip
          ? 'text-stone-500 hover:bg-stone-800/50 hover:text-stone-400'
          : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
      }`}
    >
      <Icon size={16} className="shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.wip && (
        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-stone-800 text-stone-500 rounded">
          Pronto
        </span>
      )}
    </Link>
  )
}
