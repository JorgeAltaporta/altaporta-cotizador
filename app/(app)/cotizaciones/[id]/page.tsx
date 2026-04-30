import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatearFechaLarga } from '@/lib/fecha'
import {
  type CotizacionSnapshot,
  obtenerPaquete,
  obtenerZona,
  obtenerAdicional,
  obtenerClausulas,
  obtenerWP,
  obtenerEjecutivo,
  tieneSnapshot,
} from '@/lib/snapshot-cotizacion'
import { type EntradaHistorial } from '@/lib/historial-cotizacion'
import EstadoSelector from '../EstadoSelector'
import HistorialAcordeon from '../HistorialAcordeon'
import AccionesCotizacion from '../AccionesCotizacion'

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
  etiqueta: string | null
  cliente_nombre: string
  estado: string
  ejecutivo_id: string | null
  wp_id: string | null
  comision_override: number | null
  comision_ejecutivo_override: number | null
  descuento_general: DescuentoGeneral | null
  cargos_extra: CargoExtra[] | null
  vigencia_dias: number | null
  anticipo_pct_override: number | null
  aplica_iva: boolean | null
  eventos: Evento[] | null
  notas_cliente: string | null
  notas_internas: string | null
  fecha_creacion: string
  snapshot: unknown
  historial: EntradaHistorial[] | null
  token_publico: string
}

export default async function CotizacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Usuario actual (para registrar cambios de estado en historial)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profileActual } = await supabase
    .from('profiles')
    .select('id, nombre')
    .eq('id', user!.id)
    .single()

  const { data: cotizacion, error } = await supabase
    .from('cotizaciones')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !cotizacion) {
    notFound()
  }

  const c = cotizacion as Cotizacion

  // ── Snapshot vs catálogo actual ───────────────────────────────────────────
  // Si la cotización tiene snapshot (creada con Fase G+), leemos de ahí.
  // Si no, fallback al catálogo y banner de advertencia (cotización legacy).
  const snapshot: CotizacionSnapshot | null = tieneSnapshot(c.snapshot)
    ? c.snapshot
    : null

  const [paquetesResp, zonasResp, ejecutivoResp, wpResp, adicionalesResp, clausulasResp] =
    await Promise.all([
      supabase
        .from('paquetes')
        .select('id, nombre, color, descripcion, horas_servicio, categorias'),
      supabase.from('zonas').select('id, nombre, color'),
      c.ejecutivo_id
        ? supabase.from('profiles').select('id, nombre').eq('id', c.ejecutivo_id).single()
        : Promise.resolve({ data: null }),
      c.wp_id
        ? supabase
            .from('wedding_planners')
            .select('id, nombre, contacto, comision_default')
            .eq('id', c.wp_id)
            .single()
        : Promise.resolve({ data: null }),
      supabase.from('adicionales').select('id, nombre, unidad, notas'),
      supabase
        .from('clausulas_globales')
        .select('contenido')
        .eq('id', 'global')
        .single(),
    ])

  const paquetesCatalogo = paquetesResp.data || []
  const zonasCatalogo = zonasResp.data || []
  const adicionalesCatalogo = adicionalesResp.data || []

  const clausulasCatalogo = (clausulasResp.data?.contenido as {
    anticipoPct: number
    vigenciaDiasDefault: number
    cambioFecha: string
    instalaciones: string
  }) || {
    anticipoPct: 30,
    vigenciaDiasDefault: 15,
    cambioFecha: 'Se actualiza costo por persona',
    instalaciones: 'Las proporciona el cliente',
  }

  const clausulas = obtenerClausulas(snapshot, clausulasCatalogo)
  const wpDatos = obtenerWP(
    snapshot,
    wpResp.data
      ? { id: wpResp.data.id, nombre: wpResp.data.nombre, contacto: wpResp.data.contacto }
      : null
  )
  const ejecutivoDatos = obtenerEjecutivo(
    snapshot,
    ejecutivoResp.data
      ? { id: ejecutivoResp.data.id, nombre: ejecutivoResp.data.nombre }
      : null
  )

  const subtotalEventos = (c.eventos || []).reduce((sum, e) => sum + (e.total || 0), 0)

  const descuentoAplicado = (() => {
    if (!c.descuento_general) return 0
    if (c.descuento_general.tipo === 'porcentaje') {
      return subtotalEventos * (c.descuento_general.valor / 100)
    }
    return c.descuento_general.valor
  })()

  const cargosExtra = c.cargos_extra || []
  const totalCargosExtra = cargosExtra.reduce((s, ce) => s + ce.monto, 0)

  const subtotalAjustado = subtotalEventos - descuentoAplicado + totalCargosExtra
  const aplicaIva = c.aplica_iva !== false
  const iva = aplicaIva ? subtotalAjustado * 0.16 : 0
  const totalCotizacion = subtotalAjustado + iva

  const comisionWpPct =
    c.comision_override ?? (wpResp.data?.comision_default || 0)
  const comisionWpMonto = totalCotizacion * (comisionWpPct / 100)

  const anticipoPct = c.anticipo_pct_override ?? clausulas.anticipoPct
  const anticipoMonto = totalCotizacion * (anticipoPct / 100)

  const vigenciaDias = c.vigencia_dias ?? clausulas.vigenciaDiasDefault

  return (
    <div className="p-12 max-w-4xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/cotizaciones" className="text-sm text-amber-700 hover:underline">
          ← Volver a cotizaciones
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/cotizaciones/${c.id}/editar`}
            className="border border-stone-300 hover:bg-stone-50 text-stone-700 px-5 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2"
          >
            ✏️ Editar
          </Link>
          {profileActual && (
            <AccionesCotizacion
              cotizacionId={c.id}
              estadoActual={c.estado}
              clienteNombre={c.cliente_nombre}
              total={totalCotizacion}
              historialActual={c.historial}
              usuario={{ id: profileActual.id, nombre: profileActual.nombre }}
            />
          )}
        </div>
      </div>

      {/* Banner de cotización legacy */}
      {!snapshot && (
        <div className="mb-6 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <strong>⚠️ Cotización previa al sistema de snapshots.</strong> Los datos
          mostrados (paquete, zona, adicionales, cláusulas) son los actuales del
          catálogo y pueden no coincidir con los originales entregados al cliente.
        </div>
      )}

      {/* HEADER */}
      <div className="mb-8 flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            {profileActual && (
              <EstadoSelector
                cotizacionId={c.id}
                estadoActual={c.estado}
                historialActual={c.historial}
                usuario={{ id: profileActual.id, nombre: profileActual.nombre }}
                size="small"
              />
            )}
            {c.folio && (
              <span className="text-xs tracking-widest text-stone-500 uppercase">
                {c.folio}
              </span>
            )}
          </div>
          <h1 className="font-serif text-4xl text-stone-900">
            {c.cliente_nombre}
          </h1>
          {c.etiqueta && (
            <div className="text-sm text-stone-500 font-mono mt-2">
              {c.etiqueta}
            </div>
          )}
          <div className="flex gap-4 text-sm text-stone-500 mt-2 flex-wrap">
            {ejecutivoDatos && (
              <span>
                Ejecutivo: <strong className="text-stone-700">{ejecutivoDatos.nombre}</strong>
              </span>
            )}
            {wpDatos && (
              <span>
                WP: <strong className="text-stone-700">{wpDatos.nombre}</strong>
              </span>
            )}
            <span>
              Vigencia: <strong className="text-stone-700">{vigenciaDias} días</strong>
            </span>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-xs text-stone-500 mb-1">Total</div>
          <div className="font-serif text-3xl text-stone-900">
            ${totalCotizacion.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
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
        const zona = obtenerZona(evento.zona_id, snapshot, zonasCatalogo)
        const paquete = obtenerPaquete(evento.paquete_id, snapshot, paquetesCatalogo)
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
                  {evento.fecha ? formatearFechaLarga(evento.fecha) : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-stone-500 mb-1">Locación</div>
                <div className="text-stone-900">{evento.locacion_texto || '—'}</div>
                {zona && (
                  <div className="text-xs text-stone-500">
                    Zona {evento.zona_id} · {zona.nombre}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-stone-500 mb-1">Pax</div>
                <div className="text-stone-900">{pax}</div>
              </div>
              <div>
                <div className="text-xs text-stone-500 mb-1">Paquete</div>
                <div className="text-stone-900">{paquete?.nombre || '—'}</div>
              </div>
            </div>

            <div className="border-t border-stone-100 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-700">
                  {paquete?.nombre || 'Paquete'} · {pax} pax × ${precioPorPaxConFlete.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
                </span>
                <span className="font-medium text-stone-900">
                  ${subtotalPaqueteConFlete.toLocaleString('es-MX')}
                </span>
              </div>

              {(evento.adicionales || []).map((sel) => {
                const ad = obtenerAdicional(
                  sel.adicionalId,
                  snapshot,
                  adicionalesCatalogo
                )
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

      {/* AJUSTES + TOTAL */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
        <h2 className="font-serif text-xl text-stone-900 mb-4">Resumen de inversión</h2>

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
                Descuento{' '}
                {c.descuento_general.tipo === 'porcentaje' ? `${c.descuento_general.valor}%` : ''}
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

          {(c.descuento_general || cargosExtra.length > 0) && (
            <div className="flex justify-between border-t border-stone-100 pt-2">
              <span className="text-stone-700">Subtotal ajustado</span>
              <span className="font-medium text-stone-900">
                ${subtotalAjustado.toLocaleString('es-MX')}
              </span>
            </div>
          )}

          {aplicaIva && (
            <div className="flex justify-between">
              <span className="text-stone-700">IVA 16%</span>
              <span className="font-medium text-stone-900">
                ${iva.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="border-t-2 border-stone-300 pt-2 mt-2 flex justify-between text-lg">
            <span className="font-medium text-stone-900">Total</span>
            <span className="font-serif text-stone-900">
              ${totalCotizacion.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="mt-6 bg-stone-900 text-stone-50 rounded-lg p-5">
          <div className="flex justify-between items-baseline">
            <div>
              <div className="text-xs tracking-widest text-amber-300 uppercase mb-1">
                Anticipo para apartar fecha
              </div>
              <div className="text-xs text-amber-300/80">{anticipoPct}% del total</div>
            </div>
            <div className="font-serif text-2xl">
              ${anticipoMonto.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-stone-50 rounded-2xl border border-stone-200 p-6 mb-6">
        <h2 className="font-serif text-xl text-stone-900 mb-4">Términos y condiciones</h2>
        <ul className="text-sm text-stone-700 space-y-2 list-disc pl-5">
          <li>El cliente proporcionará instalaciones adecuadas para el manejo de alimentos.</li>
          <li>
            El uso indebido o daños al mobiliario durante el evento generarán cargos adicionales,
            mismos que deberán ser cubiertos por el cliente.
          </li>
          <li>Presupuesto válido por {vigenciaDias} días a partir de su emisión.</li>
          <li>
            En caso de cambiar de fecha o reducir número de invitados, {clausulas.cambioFecha.toLowerCase()}.
          </li>
          <li>Se requiere un anticipo del {anticipoPct}% del total para el apartado de fecha.</li>
          <li>Los costos presentados no incluyen propinas, las cuales quedan a consideración del cliente.</li>
        </ul>
      </section>

      {c.notas_cliente && (
        <section className="bg-stone-50 rounded-2xl border border-stone-200 p-6 mb-6">
          <h3 className="font-medium text-stone-900 mb-2">Notas para el cliente</h3>
          <p className="text-sm text-stone-700 whitespace-pre-wrap">{c.notas_cliente}</p>
        </section>
      )}

      {c.notas_internas && (
        <section className="bg-amber-50 rounded-2xl border border-amber-200 p-6 mb-6">
          <h3 className="font-medium text-amber-900 mb-2">📝 Notas internas (no visibles al cliente)</h3>
          <p className="text-sm text-amber-900 whitespace-pre-wrap">{c.notas_internas}</p>
        </section>
      )}

      {/* HISTORIAL DE CAMBIOS (acordeón plegable) */}
      <HistorialAcordeon historial={c.historial} />
    </div>
  )
}
