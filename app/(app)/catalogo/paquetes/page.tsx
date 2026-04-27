import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type Paquete = {
  id: string
  nombre: string
  descripcion: string | null
  color: string | null
  horas_servicio: number
  base_min_pax: number
  precios: number[]
  es_personalizado: boolean
  estado: string
}

export default async function PaquetesPage() {
  const supabase = await createClient()

  const { data: paquetes, error } = await supabase
    .from('paquetes')
    .select('*')
    .order('nombre', { ascending: true })

  if (error) {
    return <div className="p-12 text-rose-700">Error: {error.message}</div>
  }

  return (
    <div className="p-12 max-w-6xl">
      <div className="mb-8">
        <Link href="/catalogo" className="text-sm text-amber-700 hover:underline">
          ← Volver al catálogo
        </Link>
      </div>

      <div className="mb-10">
        <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
          Catálogo · Paquetes
        </div>
        <h1 className="font-serif text-4xl text-stone-900">
          Paquetes
        </h1>
      </div>

      <div className="space-y-4">
        {(paquetes as Paquete[] | null)?.map((paquete) => {
          const precioMin = paquete.precios?.length
            ? Math.min(...paquete.precios.filter((p) => p > 0))
            : 0
          const precioMax = paquete.precios?.length
            ? Math.max(...paquete.precios)
            : 0

          return (
            <div
              key={paquete.id}
              className="bg-white rounded-2xl border border-stone-200 p-6 flex items-center gap-6"
            >
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: paquete.color || '#E7E5E4' }}
              >
                📦
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-serif text-2xl text-stone-900">
                    {paquete.nombre}
                  </h3>
                  {paquete.es_personalizado && (
                    <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded">
                      Personalizado
                    </span>
                  )}
                </div>
                {paquete.descripcion && (
                  <p className="text-stone-600 text-sm mb-2">
                    {paquete.descripcion}
                  </p>
                )}
                <div className="flex gap-4 text-xs text-stone-500">
                  <span>⏱️ {paquete.horas_servicio} hrs</span>
                  <span>👥 desde {paquete.base_min_pax} pax</span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                {precioMax > 0 ? (
                  <>
                    <div className="font-serif text-2xl text-stone-900">
                      ${precioMin.toLocaleString('es-MX')}
                    </div>
                    <div className="text-xs text-stone-500">
                      hasta ${precioMax.toLocaleString('es-MX')} / pax
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-stone-400">Sin precio</div>
                )}
              </div>
            </div>
          )
        })}

        {paquetes?.length === 0 && (
          <div className="text-center py-12 text-stone-500">
            No hay paquetes registrados.
          </div>
        )}
      </div>
    </div>
  )
}
