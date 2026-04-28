import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

type AdicionalEvento = {
  id: string
  adicionalId: string
  cantidad: number
  precioUnitario: number
}

type Evento = {
  id?: string
  fecha?: string
  zona_id?: string
  locacion_id?: string | null
  locacion_texto?: string | null
  pax?: number
  paquete_id?: string
  precio_por_pax?: number
  subtotal_paquete?: number
  flete?: number
  adicionales?: AdicionalEvento[]
  subtotal_adicionales?: number
  total?: number
}

type DescuentoGeneral = {
  tipo: 'porcentaje' | 'monto'
  valor: number
  concepto: string
}

type CargoExtra = {
  id: string
  concepto: string
  monto: number
}

type Cotizacion = {
  id: string
  folio: string | null
  cliente_nombre: string
  estado: string
  ejecutivo_id: string | null
  wp_id: string | null
  comision_override: number | null
  comision_ejecutivo_override: number | null
  descuento_general: DescuentoGeneral | null
  cargos_extra: CargoExtra[] | null
  vigencia_dias: number | null
  eventos: Evento[] | null
  notas_cliente: string | null
  notas_internas: string | null
  fecha_creacion: string
}

const COLORES_ESTADO: Record<string, string> = {
  BORRADOR: 'bg-stone-100 text-stone-700',
  PENDIENTE: 'bg-amber-100 text-amber-700',
  ENVIADA: 'bg-blue-100 text-blue-700',
  APROBADA: 'bg-emerald-100 text-emerald-700',
  CANCELADA: 'bg-rose-100 text-rose-700',
}

export default async function CotizacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cotizacion, error } = await supabase
    .from('cotizaciones')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !cotizacion) {
    notFound()
  }

  const c = cotizacion as Cotizacion

  const [paquetesResp, zonasResp, ejecutivoResp, wpResp, adicionalesResp] = await Promise.all([
    supabase.from('paquetes').select('id, nombre'),
    supabase.from('zonas').select('id, nombre'),
    c.ejecutivo_id
      ? supabase.from('profiles').select('nombre').eq('id', c.ejecutivo_id).single()
      : Promise.resolve({ data: null }),
    c.wp_id
      ? supabase.from('wedding_planners').select('nombre, comision_default').eq('id', c.wp_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('adicionales').select('id, nombre, unidad'),
  ])

  const paquetesMap = new Map((paquetesResp.data || []).map((p) => [p.id, p.nombre]))
  const zonasMap = new Map((zonasResp.data || []).map((z) => [z.id, z.nombre]))
  const adicionalesMap = new Map(
    (adicionalesResp.data || []).map((a) => [a.id, { nombre: a.nombre, unidad: a.unidad }])
  )

  // Subtotal de eventos (paquete + flete + adicionales)
  const subtotalEventos = (c.eventos || []).reduce((sum, e) => sum + (e.total || 0), 0)

  // Descuento aplicado
  const descuentoAplicado = (() => {
    if (!c.descuento_general) return 0
    if (c.descuento_general.tipo === 'porcentaje') {
      return subtotalEventos * (c.descuento_general.valor / 100)
    }
    return c.descuento_general.valor
  })()

  // Cargos extra
  const cargosExtra = c.cargos_extra || []
  const totalCargosExtra = cargosExtra.reduce((s, ce) => s + ce.monto, 0)

  // Total final
  const totalCotizacion = subtotalEventos - descuentoAplicado + totalCargosExtra

  // Comisiones
  const comisionWpPct = c.comision_override ?? wpResp.data?.comision_default ?? 0
  const comisionWpMonto = totalCotizacion * (comisionWpPct / 100)

  return (
    <div className="p-12 max-w-4xl">
      <div className="mb-8">
        <Link href="/cotizaciones" className="text-sm text-amber-700 hover:underline">
          ← Volver a cotizaciones
        </Link>
      </div>

      {/* HEADER */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span
              className={`text-xs px-2 py-1 rounded font-medium ${
                COLORES_ESTADO[c.estado] || 'bg-stone-100 text-stone-700'
              }`}
            >
              {c.estado}
            </span>
            {c.folio && (
              <span className="text-xs tracking-widest text-stone-500 uppercase">
                {c.folio}
              </span>
            )}
          </div>
          <h1 className="font-serif text-4xl text-stone-900">
            {c.cliente_nombre}
          </h1>
          <div className="flex gap-4 text-sm text-stone-500 mt-2 flex-wrap">
            {ejecutivoResp.data && (
              <span>Ejecutivo: <strong className="text-stone-700">{ejecutivoResp.data.nombre}</strong></span>
            )}
            {wpResp.data && (
              <span>WP: <strong className="text-stone-700">{wpResp.data.nombre}</strong></span>
            )}
            {c.vigencia_dias && (
              <span>Vigencia: <strong className="text-stone-700">{c.vigencia_dias} días</strong></span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-stone-500 mb-1">Total</div>
          <div className="font-serif text-3xl text-stone-900">
            ${totalCotizacion.toLocaleString('es-MX')}
          </div>
          {comisionWpPct > 0 && (
            <div className="text-xs text-stone-500 mt-1">
              Comisión WP {comisionWpPct}%: ${comisionWpMonto.toLocaleString('es-MX')}
            </div>
          )}
        </div>
      </div>

      {/* EVENTOS */}
      {(c.eventos || []).map((evento, idx) => {
        const zonaNombre = evento.zona_id ? zonasMap.get(evento.zona_id) : null
        const paqueteNombre = evento.paquete_id ? paquetesMap.get(evento.paquete_id) : null
        const pax = evento.pax || 0
        const subtotalPaqueteConFlete = (evento.subtotal_paquete || 0) + (evento.flete || 0)
        const fletePorPax = pax > 0 ? (evento.flete || 0) / pax : 0
        const precioPorPaxConFlete = (evento.precio_por_pax || 0) + fletePorPax

        return (
          <section
            key={evento.id || idx}
            className="bg-white rounded-2xl border border-stone-200 p-6 mb-6"
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-serif text-xl text-stone-900">
                Evento {(c.eventos || []).length > 1 ? idx + 1 : ''}
              </h2>
              <div className="text-right">
                <div className="text-xs text-stone-500">Total evento</div>
                <div className="font-medium text-stone-900">
                  ${(evento.total || 0).toLocaleString('es-MX')}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <div className="text-xs text-stone-500 mb-1">Fecha</div>
                <div className="text-stone-900">
                  {evento.fecha
                    ? new Date(evento.fecha).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-stone-500 mb-1">Locación</div>
                <div className="text-stone-900">{evento.locacion_texto || '—'}</div>
                {zonaNombre && (
                  <div className="text-xs text-stone-500">
                    Zona {evento.zona_id} · {zonaNombre}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-stone-500 mb-1">Pax</div>
                <div className="text-stone-900">{pax}</div>
              </div>
              <div>
                <div className="text-xs text-stone-500 mb-1">Paquete</div>
                <div className="text-stone-900">{paqueteNombre || '—'}</div>
              </div>
            </div>

            {/* Desglose de precios */}
            <div className="border-t border-stone-100 pt-4 space-y-2 text-sm">
              {/* Paquete con flete sumado */}
              <div className="flex justify-between">
                <span className="text-stone-700">
                  {paqueteNombre || 'Paquete'} · {pax} pax × ${precioPorPaxConFlete.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
                </span>
                <span className="font-medium text-stone-900">
                  ${subtotalPaqueteConFlete.toLocaleString('es-MX')}
                </span>
              </div>

              {/* Adicionales desglosados */}
              {(evento.adicionales || []).map((sel) => {
                const ad = adicionalesMap.get(sel.adicionalId)
                if (!ad) return null
                const subtotal = sel.cantidad * sel.precioUnitario
                const esCortesia = sel.precioUnitario === 0
                return (
                  <div key={sel.id} className="flex justify-between">
                    <span className="text-stone-700">
                      {ad.nombre} · {sel.cantidad} {ad.unidad || 'u'}
                      {!esCortesia && ` × $${sel.precioUnitario.toLocaleString('es-MX')}`}
                      {esCortesia && (
                        <span className="ml-2 text-xs text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">
                          🎁 Cortesía
                        </span>
                      )}
                    </span>
                    <span className="font-medium text-stone-900">
                      ${subtotal.toLocaleString('es-MX')}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {/* AJUSTES GLOBALES */}
      {(c.descuento_general || cargosExtra.length > 0) && (
        <section className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
          <h2 className="font-serif text-xl text-stone-900 mb-4">Ajustes</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-700">Subtotal eventos</span>
              <span className="font-medium text-stone-900">
                ${subtotalEventos.toLocaleString('es-MX')}
              </span>
            </div>

            {c.descuento_general && (
              <div className="flex justify-between text-emerald-700">
                <span>
                  Descuento {c.descuento_general.tipo === 'porcentaje' ? `${c.descuento_general.valor}%` : ''}
                  {c.descuento_general.concepto && ` (${c.descuento_general.concepto})`}
                </span>
                <span className="font-medium">
                  −${descuentoAplicado.toLocaleString('es-MX')}
                </span>
              </div>
            )}

            {cargosExtra.map((cargo) => (
              <div key={cargo.id} className="flex justify-between">
                <span className="text-stone-700">{cargo.concepto || 'Cargo extra'}</span>
                <span className="font-medium text-stone-900">
                  ${cargo.monto.toLocaleString('es-MX')}
                </span>
              </div>
            ))}

            <div className="border-t border-stone-200 pt-2 mt-2 flex justify-between text-lg">
              <span className="font-medium text-stone-900">Total final</span>
              <span className="font-serif text-stone-900">
                ${totalCotizacion.toLocaleString('es-MX')}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* NOTAS PARA CLIENTE */}
      {c.notas_cliente && (
        <section className="bg-stone-50 rounded-2xl border border-stone-200 p-6 mb-6">
          <h3 className="font-medium text-stone-900 mb-2">Notas</h3>
          <p className="text-sm text-stone-700 whitespace-pre-wrap">{c.notas_cliente}</p>
        </section>
      )}

      {/* NOTAS INTERNAS */}
      {c.notas_internas && (
        <section className="bg-amber-50 rounded-2xl border border-amber-200 p-6 mb-6">
          <h3 className="font-medium text-amber-900 mb-2">📝 Notas internas (no visibles al cliente)</h3>
          <p className="text-sm text-amber-900 whitespace-pre-wrap">{c.notas_internas}</p>
        </section>
      )}

      {/* AVISO MVP */}
      <section className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
        <h3 className="font-medium text-blue-900 mb-2">📋 Versión MVP</h3>
        <p className="text-sm text-blue-700">
          Esta cotización tiene la información completa. Próximamente podrás generar PDF y enviarla al cliente.
        </p>
      </section>
    </div>
  )
}
