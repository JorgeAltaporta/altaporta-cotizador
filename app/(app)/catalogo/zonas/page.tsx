import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type Locacion = { id: string; nombre: string }

type Zona = {
  id: string
  nombre: string
  descripcion: string | null
  color: string | null
  locaciones: Locacion[]
  precios_flete: number[]
  estado: string
}

export default async function ZonasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('puede_aprobar')
    .eq('id', user!.id)
    .single()
  const puedeEditar = profile?.puede_aprobar || false

  const { data: zonas, error } = await supabase
    .from('zonas')
    .select('*')
    .order('id', { ascending: true })

  if (error) {
    return <div className="p-12 text-rose-700">Error: {error.message}</div>
  }

  const todas = (zonas as Zona[] | null) || []
  const activas = todas.filter((z) => z.estado === 'ACTIVO')
  const borradores = todas.filter((z) => z.estado === 'BORRADOR')
  const archivadas = todas.filter((z) => z.estado === 'ARCHIVADO')

  return (
    <div className="p-12 max-w-6xl">
      <div className="mb-8">
        <Link href="/catalogo" className="text-sm text-amber-700 hover:underline">
          ← Volver al catálogo
        </Link>
      </div>

      <div className="mb-10 flex items-start justify-between">
        <div>
          <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
            Catálogo · Zonas y fletes
          </div>
          <h1 className="font-serif text-4xl text-stone-900">
            Zonas
          </h1>
        </div>

        {puedeEditar && (
          <Link
            href="/catalogo/zonas/nueva"
            className="text-sm bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg transition"
          >
            + Nueva zona
          </Link>
        )}
      </div>

      <ZonasGrupo zonas={activas} puedeEditar={puedeEditar} />

      {borradores.length > 0 && (
        <div className="mt-12">
          <h2 className="font-serif text-xl text-stone-700 mb-4">
            Borradores ({borradores.length})
          </h2>
          <ZonasGrupo zonas={borradores} puedeEditar={puedeEditar} />
        </div>
      )}

      {archivadas.length > 0 && (
        <div className="mt-12">
          <h2 className="font-serif text-xl text-stone-500 mb-4">
            Archivadas ({archivadas.length})
          </h2>
          <ZonasGrupo zonas={archivadas} puedeEditar={puedeEditar} archivadas />
        </div>
      )}

      {todas.length === 0 && (
        <div className="text-center py-12 text-stone-500">
          No hay zonas registradas.
        </div>
      )}
    </div>
  )
}

function ZonasGrupo({
  zonas,
  puedeEditar,
  archivadas,
}: {
  zonas: Zona[]
  puedeEditar: boolean
  archivadas?: boolean
}) {
  return (
    <div className="space-y-4">
      {zonas.map((zona) => {
        const fleteMin = zona.precios_flete?.length
          ? Math.min(...zona.precios_flete.filter((p) => p > 0))
          : 0
        const fleteMax = zona.precios_flete?.length
          ? Math.max(...zona.precios_flete)
          : 0

        return (
          <div
            key={zona.id}
            className={`rounded-2xl border p-6 ${
              archivadas
                ? 'bg-stone-50 border-stone-200 opacity-70'
                : 'bg-white border-stone-200'
            }`}
          >
            <div className="flex items-start gap-6 mb-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl text-white flex-shrink-0"
                style={{ backgroundColor: zona.color || '#A8A29E' }}
              >
                {zona.id}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-serif text-2xl text-stone-900">
                    {zona.nombre}
                  </h3>
                </div>
                {zona.descripcion && (
                  <p className="text-stone-600 text-sm">{zona.descripcion}</p>
                )}
              </div>

              <div className="text-right flex-shrink-0">
                {fleteMax > 0 ? (
                  <>
                    <div className="text-xs text-stone-500 mb-0.5">Flete</div>
                    <div className="font-serif text-xl text-stone-900">
                      ${fleteMin}
                      {fleteMin !== fleteMax && ` – $${fleteMax}`}
                    </div>
                    <div className="text-xs text-stone-500">por pax</div>
                  </>
                ) : (
                  <div className="text-sm text-emerald-700">Sin flete</div>
                )}
              </div>

              {puedeEditar && (
                <Link
                  href={`/catalogo/zonas/${zona.id}/editar`}
                  className="text-sm bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-lg transition flex-shrink-0"
                >
                  Editar
                </Link>
              )}
            </div>

            {zona.locaciones && zona.locaciones.length > 0 && (
              <div className="border-t border-stone-100 pt-4">
                <div className="text-xs tracking-widest text-stone-500 uppercase mb-2">
                  Locaciones ({zona.locaciones.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {zona.locaciones.map((loc) => (
                    <span
                      key={loc.id}
                      className="text-sm px-3 py-1 bg-stone-100 text-stone-700 rounded-full"
                    >
                      {loc.nombre}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
