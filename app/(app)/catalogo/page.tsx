import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type Tarjeta = {
  href: string
  titulo: string
  descripcion: string
  icono: string
  color: string
  soloAprobador?: boolean
}

const TARJETAS: Tarjeta[] = [
  {
    href: '/catalogo/paquetes',
    titulo: 'Paquetes',
    descripcion: 'Premium, Plus, Esencial, Light, Personalizados...',
    icono: '📦',
    color: 'amber',
  },
  {
    href: '/catalogo/proteinas',
    titulo: 'Proteínas',
    descripcion: 'Filete, salmón, ribeye, cordero...',
    icono: '🥩',
    color: 'rose',
  },
  {
    href: '/catalogo/zonas',
    titulo: 'Zonas y locaciones',
    descripcion: 'Mérida centro, haciendas, costa, fletes y horas extra',
    icono: '📍',
    color: 'emerald',
  },
  {
    href: '/catalogo/adicionales',
    titulo: 'Adicionales',
    descripcion: 'Postres, mobiliario extra, personal, servicios',
    icono: '✨',
    color: 'blue',
  },
  {
    href: '/catalogo/rangos',
    titulo: 'Rangos de pax',
    descripcion: 'Tarifas por número de invitados',
    icono: '👥',
    color: 'stone',
  },
  {
    href: '/catalogo/clausulas',
    titulo: 'Cláusulas globales',
    descripcion: 'Anticipo, vigencia, términos del PDF',
    icono: '📄',
    color: 'violet',
  },
  {
    href: '/configuracion/leads',
    titulo: 'Configuración Leads',
    descripcion: 'Umbrales, SLAs, razones de pérdida y verificación de WPs',
    icono: '🎯',
    color: 'amber',
    soloAprobador: true,
  },
]

const COLORES: Record<string, { bg: string; border: string; hover: string }> = {
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    hover: 'hover:border-amber-400 hover:bg-amber-100',
  },
  rose: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    hover: 'hover:border-rose-400 hover:bg-rose-100',
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    hover: 'hover:border-emerald-400 hover:bg-emerald-100',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    hover: 'hover:border-blue-400 hover:bg-blue-100',
  },
  stone: {
    bg: 'bg-stone-50',
    border: 'border-stone-200',
    hover: 'hover:border-stone-400 hover:bg-stone-100',
  },
  violet: {
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    hover: 'hover:border-violet-400 hover:bg-violet-100',
  },
}

export const dynamic = 'force-dynamic'

export default async function CatalogoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let puedeAprobar = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('puede_aprobar')
      .eq('id', user.id)
      .maybeSingle()
    puedeAprobar = !!profile?.puede_aprobar
  }

  // Filtrar tarjetas según permisos
  const tarjetasVisibles = TARJETAS.filter(
    (t) => !t.soloAprobador || puedeAprobar
  )

  return (
    <div className="p-12 max-w-5xl">
      <div className="mb-8">
        <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
          Configuración
        </div>
        <h1 className="font-serif text-4xl text-stone-900">Configuración</h1>
        <p className="text-stone-600 mt-2">
          Configura servicios, paquetes, zonas y reglas operativas del sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tarjetasVisibles.map((t) => {
          const c = COLORES[t.color] || COLORES.stone
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`block p-6 rounded-2xl border-2 transition ${c.bg} ${c.border} ${c.hover}`}
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl flex-shrink-0">{t.icono}</div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-serif text-xl text-stone-900 mb-1">
                    {t.titulo}
                  </h2>
                  <p className="text-sm text-stone-600">{t.descripcion}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
