import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import EstadoSelector from './EstadoSelector'
import type { EntradaHistorial } from '@/lib/historial-cotizacion'

type Evento = { total?: number }

type Cotizacion = {
  id: string
  folio: string | null
  etiqueta: string | null
  cliente_nombre: string
  estado: string
  eventos: Evento[] | null
  fecha_creacion: string
  aplica_iva: boolean | null
  historial: EntradaHistorial[] | null
}

export default async function CotizacionesPage() {
  const supabase = await createClient()

  // Usuario actual para registrar cambios de estado en el historial
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nombre, puede_aprobar')
    .eq('id', user!.id)
    .single()

  const { data: cotizaciones } = await supabase
    .from('cotizaciones')
    .select(
      'id, folio, etiqueta, cliente_nombre, estado, eventos, fecha_creacion, aplica_iva, historial'
    )
    .order('fecha_creacion', { ascending: false })

  const lista = (cotizaciones || []) as Cotizacion[]

  return (
    <div className="p-12 max-w-6xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
            Cotizaciones
          </div>
          <h1 className="font-serif text-4xl text-stone-900">Cotizaciones</h1>
          <p className="text-stone-600 mt-2">
            {lista.length === 0
              ? 'No hay cotizaciones todavía.'
              : `${lista.length} cotización${lista.length === 1 ? '' : 'es'} en total.`}
          </p>
        </div>
        <Link
          href="/cotizaciones/nueva"
          className="bg-amber-700 hover:bg-amber-800 text-white px-5 py-2.5 rounded-lg transition font-medium flex-shrink-0"
        >
          + Nueva cotización
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h2 className="font-serif text-2xl text-stone-900 mb-2">Empieza tu primera cotización</h2>
          <p className="text-stone-600 mb-6">
            Crea cotizaciones para clientes con eventos, adicionales y ajustes.
          </p>
          <Link
            href="/cotizaciones/nueva"
            className="inline-block bg-amber-700 hover:bg-amber-800 text-white px-5 py-2.5 rounded-lg transition font-medium"
          >
            + Crear cotización
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-stone-700 uppercase tracking-wider">
                  Folio
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-stone-700 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-stone-700 uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-stone-700 uppercase tracking-wider">
                  Total
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-stone-700 uppercase tracking-wider">
                  Creación
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-stone-700 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => {
                const subtotal = (c.eventos || []).reduce((s, e) => s + (e.total || 0), 0)
                // Solo aproximación en lista (sin descuentos/cargos por simplicidad)
                const total = c.aplica_iva !== false ? subtotal * 1.16 : subtotal
                return (
                  <tr key={c.id} className="border-b border-stone-100 hover:bg-stone-50 transition">
                    <td className="px-6 py-4">
                      <Link
                        href={`/cotizaciones/${c.id}`}
                        className="text-sm font-mono text-amber-700 hover:underline"
                      >
                        {c.folio || '—'}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/cotizaciones/${c.id}`} className="block">
                        <div className="text-sm font-medium text-stone-900">
                          {c.cliente_nombre}
                        </div>
                        {c.etiqueta && (
                          <div className="text-xs text-stone-500 font-mono mt-0.5">
                            {c.etiqueta}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      {profile && (
                        <EstadoSelector
                          cotizacionId={c.id}
                          estadoActual={c.estado}
                          historialActual={c.historial}
                          usuario={{ id: profile.id, nombre: profile.nombre, puede_aprobar: profile.puede_aprobar }}
                          size="small"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-medium text-stone-900">
                        ${total.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-stone-500">
                      {new Date(c.fecha_creacion).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/cotizaciones/${c.id}/editar`}
                        className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-amber-700 hover:bg-amber-50 px-2 py-1 rounded transition"
                        title="Editar cotización"
                      >
                        ✏️
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
