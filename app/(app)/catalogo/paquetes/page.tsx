import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ArchivadosToggle from './ArchivadosToggle'

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

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('puede_aprobar')
    .eq('id', user!.id)
    .single()
  const puedeEditar = profile?.puede_aprobar || false

  const { data: paquetes, error } = await supabase
    .from('paquetes')
    .select('*')
    .order('nombre', { ascending: true })

  if (error) {
    return <div className="p-12 text-rose-700">Error: {error.message}</div>
  }

  const todos = (paquetes as Paquete[] | null) || []
  const activos = todos.filter((p) => p.estado === 'ACTIVO')
  const borradores = todos.filter((p) => p.estado === 'BORRADOR')
  const archivados = todos.filter((p) => p.estado === 'ARCHIVADO')

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
            Catálogo · Paquetes
          </div>
          <h1 className="font-serif text-4xl text-stone-900">
            Paquetes
          </h1>
        </div>

        {puedeEditar && (
          <Link
            href="/catalogo/paquetes/nuevo"
            className="text-sm bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg transition"
          >
            + Nuevo paquete
          </Link>
        )}
      </div>

      <PaquetesGrupo paquetes={activos} puedeEditar={puedeEditar} />

      {borradores.length > 0 && (
        <div className="mt-12">
          <h2 className="font-serif text-xl text-stone-700 mb-4">
            Borradores ({borradores.length})
          </h2>
          <PaquetesGrupo paquetes={borradores} puedeEditar={puedeEditar} />
        </div>
      )}

      {archivados.length > 0 && (
        <ArchivadosToggle count={archivados.length}>
          <PaquetesGrupo paquetes={archivados} puedeEditar={puedeEditar} archivados />
        </ArchivadosToggle>
      )}

      {todos.length === 0 && (
        <div className="text-center py-12 text-stone-500">
          No hay paquetes registrados.
        </div>
      )}
    </div>
  )
}

function PaquetesGrupo({
  paquetes,
  puedeEditar,
  archivados,
}: {
  paquetes: Paquete[]
  puedeEditar: boolean
  archivados?: boolean
}) {
  return (
    <div className="space-y-4">
      {paquetes.map((paquete) => {
        const precioMin = paquete.precios?.length
          ? Math.min(...paquete.precios.filter((p) => p > 0))
          : 0
        const precioMax = paquete.precios?.length
          ? Math.max(...paquete.precios)
          : 0

        return (
          <div
            key={paquete.id}
            className={`rounded-2xl border p-6 flex items-center gap-6 ${
              archivados
                ? 'bg-stone-50 border-stone-200 opacity-70'
                : 'bg-white border-stone-200'
            }`}
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

            {puedeEditar && (
              <Link
                href={`/catalogo/paquetes/${paquete.id}/editar`}
                className="text-sm bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-lg transition flex-shrink-0"
              >
                Editar
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
