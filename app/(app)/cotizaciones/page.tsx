import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type Evento = {
  fecha?: string
  pax?: number
  zona_id?: string
  total?: number
}

type Cotizacion = {
  id: string
  folio: string | null
  cliente_nombre: string
  estado: string
  ejecutivo_id: string | null
  eventos: Evento[] | null
  fecha_creacion: string
}

const COLORES_ESTADO: Record<string, string> = {
  BORRADOR: 'bg-stone-100 text-stone-700',
  ENVIADA: 'bg-blue-100 text-blue-700',
  APROBADA: 'bg-emerald-100 text-emerald-700',
  CANCELADA: 'bg-rose-100 text-rose-700',
}

export default async function CotizacionesPage() {
  const supabase = await createClient()

  const { data: cotizaciones, error } = await supabase
    .from('cotizaciones')
    .select('id, folio, cliente_nombre, estado, ejecutivo_id, eventos, fecha_creacion')
    .order('fecha_creacion', { ascending: false })

  if (error) {
    return <div className="p-12 text-rose-700">Error: {error.message}</div>
  }

  const todas = (cotizaciones as Cotizacion[] | null) || []

  return (
    <div className="p-12 max-w-6xl">
      <div className="mb-10 flex items-start justify-between">
        <div>
          <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
            Cotizaciones
          </div>
          <h1 className="font-serif text-4xl text-stone-900">
            Cotizaciones
          </h1>
          <p className="text-stone-600 mt-2">
            {todas.length === 0
              ? 'Aún no hay cotizaciones. Crea la primera.'
              : `${todas.length} cotizaci${todas.length === 1 ? 'ón' : 'ones'} en total`}
          </p>
        </div>

        <Link
          href="/cotizaciones/nueva"
          className="text-sm bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg transition"
        >
          + Nueva cotización
        </Link>
      </div>

      {todas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-16 text-center">
          <div className="text-5xl mb-4">📄</div>
          <h2 className="font-serif text-2xl text-stone-900 mb-2">
            Sin cotizaciones aún
          </h2>
          <p className="text-stone-600 mb-6">
            Empieza creando tu primera cotización para un cliente.
          </p>
          <Link
            href="/cotizaciones/nueva"
            className="inline-block bg-amber-700 hover:bg-amber-800 text-white px-6 py-2.5 rounded-lg transition"
          >
            Crear primera cotización
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-stone-600 uppercase tracking-wide">
                  Cliente
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-stone-600 uppercase tracking-wide">
                  Fecha evento
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-stone-600 uppercase tracking-wide">
                  Pax
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-stone-600 uppercase tracking-wide">
                  Estado
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-stone-600 uppercase tracking-wide">
                  Total
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {todas.map((c) => {
                const primerEvento = c.eventos?.[0]
                const totalCotizacion = (c.eventos || []).reduce(
                  (sum, e) => sum + (e.total || 0),
                  0
                )

                return (
                  <tr key={c.id} className="border-b border-stone-100 hover:bg-stone-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-stone-900">
                        {c.cliente_nombre || 'Sin nombre'}
                      </div>
                      {c.folio && (
                        <div className="text-xs text-stone-500">{c.folio}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-700">
                      {primerEvento?.fecha
                        ? new Date(primerEvento.fecha).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-700">
                      {primerEvento?.pax ? `${primerEvento.pax} pax` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${
                          COLORES_ESTADO[c.estado] || 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {totalCotizacion > 0 ? (
                        <div className="font-medium text-stone-900">
                          ${totalCotizacion.toLocaleString('es-MX')}
                        </div>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/cotizaciones/${c.id}`}
                        className="text-sm text-amber-700 hover:text-amber-900"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
