import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type CardData = {
  href: string
  titulo: string
  icono: string
  bgIcono: string
  textoTitulo: string
  conteo: number
  detalle?: string
}

export default async function CatalogoPage() {
  const supabase = await createClient()

  const [paquetes, zonas, proteinas, niveles, adicionales] = await Promise.all([
    supabase.from('paquetes').select('id', { count: 'exact', head: true }),
    supabase.from('zonas').select('id', { count: 'exact', head: true }),
    supabase.from('proteinas').select('id', { count: 'exact', head: true }),
    supabase.from('niveles_proteina').select('id', { count: 'exact', head: true }),
    supabase.from('adicionales').select('id', { count: 'exact', head: true }),
  ])

  const cards: CardData[] = [
    {
      href: '/catalogo/paquetes',
      titulo: 'Paquetes',
      icono: '📦',
      bgIcono: 'bg-amber-100',
      textoTitulo: 'text-amber-700',
      conteo: paquetes.count || 0,
      detalle: 'activos',
    },
    {
      href: '/catalogo/proteinas',
      titulo: 'Proteínas',
      icono: '🥩',
      bgIcono: 'bg-rose-100',
      textoTitulo: 'text-rose-700',
      conteo: proteinas.count || 0,
      detalle: `${niveles.count || 0} niveles`,
    },
    {
      href: '/catalogo/zonas',
      titulo: 'Zonas y fletes',
      icono: '🚚',
      bgIcono: 'bg-emerald-100',
      textoTitulo: 'text-emerald-700',
      conteo: zonas.count || 0,
      detalle: 'activas',
    },
    {
      href: '/catalogo/adicionales',
      titulo: 'Adicionales',
      icono: '＋',
      bgIcono: 'bg-blue-100',
      textoTitulo: 'text-blue-700',
      conteo: adicionales.count || 0,
      detalle: 'activos',
    },
  ]

  return (
    <div className="p-12 max-w-6xl">
      <div className="mb-12">
        <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
          Administración
        </div>
        <h1 className="font-serif text-5xl text-stone-900 mb-2">Catálogo</h1>
        <p className="text-stone-600">
          Vista general del catálogo de Altaporta.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-white rounded-2xl border border-stone-200 p-6 hover:border-stone-300 transition group"
          >
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${card.bgIcono}`}>
                {card.icono}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs tracking-widest uppercase mb-2 ${card.textoTitulo}`}>
                  {card.titulo}
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-serif text-4xl text-stone-900">
                    {card.conteo}
                  </span>
                  <span className="text-sm text-stone-500">
                    {card.detalle}
                  </span>
                </div>
                <div className="text-sm text-amber-700 mt-3 group-hover:underline">
                  Ver detalle →
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
