import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type Adicional = {
  id: string
  nombre: string
  descripcion: string | null
  categoria_id: string | null
  unidad: string | null
  precio: number
  notas: string | null
  usa_tarifa_por_rango: boolean
  estado: string
}

type Categoria = {
  id: string
  nombre: string
  icono: string | null
  orden: number
}

export default async function AdicionalesPage() {
  const supabase = await createClient()

  const [adicionalesResp, categoriasResp] = await Promise.all([
    supabase.from('adicionales').select('*').order('nombre'),
    supabase.from('categorias_adicionales').select('*').order('orden'),
  ])

  if (adicionalesResp.error) {
    return <div className="p-12 text-rose-700">Error: {adicionalesResp.error.message}</div>
  }

  const adicionales = (adicionalesResp.data || []) as Adicional[]
  const categorias = (categoriasResp.data || []) as Categoria[]

  // Agrupar por categoría
  const adicionalesPorCategoria = categorias.map((cat) => ({
    ...cat,
    items: adicionales.filter((a) => a.categoria_id === cat.id),
  }))

  // Adicionales sin categoría
  const sinCategoria = adicionales.filter(
    (a) => !a.categoria_id || !categorias.find((c) => c.id === a.categoria_id)
  )

  return (
    <div className="p-12 max-w-6xl">
      <div className="mb-8">
        <Link href="/catalogo" className="text-sm text-amber-700 hover:underline">
          ← Volver al catálogo
        </Link>
      </div>

      <div className="mb-10">
        <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
          Catálogo · Adicionales
        </div>
        <h1 className="font-serif text-4xl text-stone-900">
          Adicionales
        </h1>
        <p className="text-stone-600 mt-2">
          {adicionales.length} adicionales en {categorias.length} categorías
        </p>
      </div>

      <div className="space-y-8">
        {adicionalesPorCategoria.map((grupo) => (
          <div key={grupo.id}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xl">{grupo.icono}</span>
              <h2 className="font-serif text-2xl text-stone-900">
                {grupo.nombre}
              </h2>
              <span className="text-sm text-stone-500">
                ({grupo.items.length})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {grupo.items.map((ad) => (
                <div
                  key={ad.id}
                  className="bg-white rounded-xl border border-stone-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="font-medium text-stone-900">{ad.nombre}</div>
                    <div className="text-right flex-shrink-0">
                      {ad.usa_tarifa_por_rango ? (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                          tarifa por rango
                        </span>
                      ) : (
                        <>
                          <div className="font-medium text-stone-900">
                            ${ad.precio.toLocaleString('es-MX')}
                          </div>
                          {ad.unidad && (
                            <div className="text-xs text-stone-500">/ {ad.unidad}</div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {ad.notas && (
                    <p className="text-xs text-stone-500 mt-1">{ad.notas}</p>
                  )}
                </div>
              ))}

              {grupo.items.length === 0 && (
                <div className="col-span-full text-sm text-stone-400 py-3">
                  Sin adicionales en esta categoría
                </div>
              )}
            </div>
          </div>
        ))}

        {sinCategoria.length > 0 && (
          <div>
            <h2 className="font-serif text-2xl text-stone-500 mb-4">
              Sin categoría
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sinCategoria.map((ad) => (
                <div
                  key={ad.id}
                  className="bg-white rounded-xl border border-stone-200 p-4"
                >
                  <div className="font-medium text-stone-900">{ad.nombre}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
