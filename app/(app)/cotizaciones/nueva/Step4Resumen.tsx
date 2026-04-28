'use client'

import { formatearFechaLarga } from '@/lib/fecha'
import type {
  EventoForm,
  Paquete,
  Zona,
  Rango,
} from './Step1Datos'
import type { Step3Data } from './Step3Ajustes'

const ID_HORA_EXTRA = '__HORA_EXTRA__'

type CategoriaPaquete = {
  id: string
  nombre: string
  icono: string | null
  atributos: Array<{ id: string; nombre: string; valor: string }>
}

type PaqueteConCategorias = Paquete & {
  categorias?: CategoriaPaquete[] | null
}

type Adicional = {
  id: string
  nombre: string
  unidad: string | null
}

type ClausulasGlobales = {
  anticipoPct: number
  vigenciaDiasDefault: number
  cambioFecha: string
  instalaciones: string
}

export default function Step4Resumen({
  clienteNombre,
  etiqueta,
  wpNombre,
  ejecutivoNombre,
  comisionPct,
  notasCliente,
  eventos,
  paquetes,
  zonas,
  rangos,
  adicionales,
  ajustes,
  subtotalEventos,
  descuentoAplicado,
  totalCargosExtra,
  iva,
  totalGeneral,
  anticipoPct,
  anticipoMonto,
  clausulas,
}: {
  clienteNombre: string
  etiqueta: string
  wpNombre?: string
  ejecutivoNombre: string | null
  comisionPct: number
  notasCliente: string
  eventos: EventoForm[]
  paquetes: PaqueteConCategorias[]
  zonas: Zona[]
  rangos: Rango[]
  adicionales: Adicional[]
  ajustes: Step3Data
  subtotalEventos: number
  descuentoAplicado: number
  totalCargosExtra: number
  iva: number
  totalGeneral: number
  anticipoPct: number
  anticipoMonto: number
  clausulas: ClausulasGlobales
}) {
  function getDatosAdicional(adicionalId: string) {
    if (adicionalId === ID_HORA_EXTRA) {
      return { nombre: 'Hora extra', unidad: 'hora' }
    }
    return adicionales.find((a) => a.id === adicionalId) || null
  }

  function rangoIndexPara(pax: number): number {
    if (pax <= 0) return -1
    for (let i = 0; i < rangos.length; i++) {
      const r = rangos[i]
      if (pax >= r.min_pax && (r.max_pax === null || pax <= r.max_pax)) {
        return i
      }
    }
    return -1
  }

  // Fecha de creación (hoy)
  const fechaCreacion = new Date().toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const eventosCalculados = eventos.map((evt) => {
    const paquete = paquetes.find((p) => p.id === evt.paqueteId)
    const zona =
      zonas.find((z) => z.id === evt.zonaIdManual) ||
      zonas.find((z) =>
        (z.locaciones || []).some(
          (l) => l.nombre.toLowerCase() === evt.locacionTexto.toLowerCase()
        )
      )
    const rangoIdx = rangoIndexPara(evt.pax)
    const precioPorPax =
      paquete && rangoIdx !== -1 ? paquete.precios[rangoIdx] || 0 : 0
    const fletePerPax =
      zona && rangoIdx !== -1 ? zona.precios_flete[rangoIdx] || 0 : 0
    const precioPorPaxConFlete = precioPorPax + fletePerPax
    const subtotalPaqueteConFlete = precioPorPaxConFlete * evt.pax

    return { evt, paquete, zona, precioPorPaxConFlete, subtotalPaqueteConFlete }
  })

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
        👁️ Esta es la vista previa de la cotización. Revisa los datos antes de crearla.
      </div>

      {/* HEADER */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
          Cotización
        </div>
        <h2 className="font-serif text-3xl text-stone-900">{clienteNombre}</h2>
        {etiqueta && (
          <div className="text-sm text-stone-500 font-mono mt-2">{etiqueta}</div>
        )}
        <div className="flex gap-4 text-sm text-stone-500 mt-3 flex-wrap">
          {ejecutivoNombre && (
            <span>
              Ejecutivo: <strong className="text-stone-700">{ejecutivoNombre}</strong>
            </span>
          )}
          {wpNombre && (
            <span>
              WP: <strong className="text-stone-700">{wpNombre}</strong>
            </span>
          )}
          <span>
            Vigencia:{' '}
            <strong className="text-stone-700">{ajustes.vigenciaDias} días</strong>
          </span>
          <span>
            Creada el <strong className="text-stone-700">{fechaCreacion}</strong>
          </span>
        </div>
      </section>

      {/* EVENTOS */}
      {eventosCalculados.map(({ evt, paquete, precioPorPaxConFlete }, idx) => (
        <section
          key={evt.id}
          className="bg-white rounded-2xl border border-stone-200 p-6"
        >
          <div className="flex items-start justify-between mb-1 flex-wrap gap-2">
            <h3 className="font-serif text-xl text-stone-900 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-amber-700 bg-amber-50 px-2 py-1 rounded">
                {evt.idAmigable}
              </span>
              Evento {eventos.length > 1 ? idx + 1 : ''}
              {paquete && ` · ${paquete.nombre}`}
            </h3>
          </div>
          <p className="text-sm text-stone-500 italic mb-4">
            {evt.fecha && formatearFechaLarga(evt.fecha)} · {evt.locacionTexto}
          </p>

          <div className="grid grid-cols-2 gap-4 text-sm bg-stone-50 rounded-lg p-4 mb-4">
            <div>
              <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                Invitados
              </div>
              <div className="text-stone-900 font-medium">{evt.pax} pax</div>
            </div>
            <div>
              <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                Servicio
              </div>
              <div className="text-stone-900 font-medium">
                {paquete?.horas_servicio ?? '—'} horas
              </div>
            </div>
          </div>

          {paquete?.categorias && paquete.categorias.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {paquete.categorias
                .filter((c) => c.atributos && c.atributos.length > 0)
                .map((cat) => (
                  <div key={cat.id} className="border-t border-amber-200 pt-3">
                    <div className="text-xs uppercase tracking-wider text-amber-700 mb-2 flex items-center gap-1">
                      <span>{cat.icono}</span>
                      <span>{cat.nombre}</span>
                    </div>
                    <div className="space-y-2">
                      {cat.atributos
                        .filter(
                          (a) =>
                            a.valor &&
                            a.valor !== 'No incluido' &&
                            a.valor !== 'No incluida'
                        )
                        .map((attr) => (
                          <div key={attr.id} className="text-sm">
                            <div className="text-xs text-stone-500">
                              {attr.nombre}
                            </div>
                            <div className="text-stone-900">{attr.valor}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {precioPorPaxConFlete > 0 && (
            <div className="bg-stone-900 text-stone-50 rounded-lg p-5 mt-4">
              <div className="flex justify-between items-baseline">
                <div className="text-xs tracking-widest text-amber-300 uppercase">
                  Inversión por persona
                </div>
                <div className="font-serif text-3xl">
                  ${precioPorPaxConFlete.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}
        </section>
      ))}

      {/* RESUMEN DE INVERSIÓN */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h3 className="font-serif text-xl text-stone-900 mb-4">
          Resumen de inversión
        </h3>

        <div className="space-y-5">
          {eventosCalculados.map((ec, idx) => (
            <div key={ec.evt.id}>
              <div className="border-b-2 border-stone-300 pb-2 mb-3">
                <div className="text-xs uppercase tracking-widest text-amber-700 flex items-center gap-2">
                  <span className="font-mono bg-amber-50 px-2 py-0.5 rounded">
                    {ec.evt.idAmigable}
                  </span>
                  <span>
                    {eventos.length > 1 ? `Evento ${idx + 1}` : 'Evento'} ·{' '}
                    {ec.evt.fecha && formatearFechaLarga(ec.evt.fecha)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-700">
                    {ec.paquete?.nombre || 'Paquete'} · {ec.evt.pax} pax × $
                    {ec.precioPorPaxConFlete.toLocaleString('es-MX', {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="font-medium text-stone-900">
                    ${ec.subtotalPaqueteConFlete.toLocaleString('es-MX')}
                  </span>
                </div>

                {ec.evt.adicionales.map((sel) => {
                  const ad = getDatosAdicional(sel.adicionalId)
                  if (!ad) return null
                  const subtotal = sel.cantidad * sel.precioUnitario
                  const esCortesia = sel.precioUnitario === 0
                  return (
                    <div key={sel.id} className="flex justify-between">
                      <span className="text-stone-700">
                        {ad.nombre} · {sel.cantidad} {ad.unidad || 'u'}
                        {!esCortesia &&
                          ` × $${sel.precioUnitario.toLocaleString('es-MX')}`}
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
            </div>
          ))}

          <div className="border-t-2 border-stone-900 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-700">Subtotal</span>
              <span className="font-medium text-stone-900">
                ${subtotalEventos.toLocaleString('es-MX')}
              </span>
            </div>

            {ajustes.descuentoGeneral && (
              <div className="flex justify-between text-emerald-700">
                <span>
                  Descuento{' '}
                  {ajustes.descuentoGeneral.tipo === 'porcentaje'
                    ? `${ajustes.descuentoGeneral.valor}%`
                    : ''}
                  {ajustes.descuentoGeneral.concepto &&
                    ` (${ajustes.descuentoGeneral.concepto})`}
                </span>
                <span className="font-medium">
                  −${descuentoAplicado.toLocaleString('es-MX')}
                </span>
              </div>
            )}

            {ajustes.cargosExtra.map((cargo) => (
              <div key={cargo.id} className="flex justify-between">
                <span className="text-stone-700">
                  {cargo.concepto || 'Cargo extra'}
                </span>
                <span className="font-medium text-stone-900">
                  ${cargo.monto.toLocaleString('es-MX')}
                </span>
              </div>
            ))}

            {ajustes.aplicaIva && (
              <div className="flex justify-between">
                <span className="text-stone-700">IVA 16%</span>
                <span className="font-medium text-stone-900">
                  ${iva.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="border-t border-stone-300 pt-2 mt-2 flex justify-between text-lg">
              <span className="font-medium text-stone-900 uppercase tracking-widest text-sm">
                Total
              </span>
              <span className="font-serif text-2xl text-stone-900">
                ${totalGeneral.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-stone-900 text-stone-50 rounded-lg p-5">
          <div className="flex justify-between items-baseline">
            <div>
              <div className="text-xs tracking-widest text-amber-300 uppercase mb-1">
                Anticipo para apartar fecha
              </div>
              <div className="text-xs text-amber-300/80">
                {anticipoPct}% del total
              </div>
            </div>
            <div className="font-serif text-2xl">
              ${anticipoMonto.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {comisionPct > 0 && (
          <div className="mt-3 text-xs text-stone-500 text-right">
            Comisión WP {comisionPct}%: $
            {(totalGeneral * (comisionPct / 100)).toLocaleString('es-MX', {
              maximumFractionDigits: 2,
            })}
          </div>
        )}
      </section>

      <section className="bg-stone-50 rounded-2xl border border-stone-200 p-6">
        <h3 className="font-serif text-xl text-stone-900 mb-4">
          Términos y condiciones
        </h3>
        <ul className="text-sm text-stone-700 space-y-2 list-disc pl-5">
          <li>
            El cliente proporcionará instalaciones adecuadas para el manejo de
            alimentos.
          </li>
          <li>
            El uso indebido o daños al mobiliario durante el evento generarán cargos
            adicionales, mismos que deberán ser cubiertos por el cliente.
          </li>
          <li>
            Presupuesto válido por <strong>{ajustes.vigenciaDias}</strong> días a
            partir de su emisión.
          </li>
          <li>
            En caso de cambiar de fecha o reducir número de invitados,{' '}
            <strong>{clausulas.cambioFecha.toLowerCase()}</strong>.
          </li>
          <li>
            Se requiere un anticipo del <strong>{anticipoPct}%</strong> del total
            para el apartado de fecha.
          </li>
          <li>
            Los costos presentados no incluyen propinas, las cuales quedan a
            consideración del cliente.
          </li>
        </ul>
      </section>

      {notasCliente && (
        <section className="bg-stone-50 rounded-2xl border border-stone-200 p-6">
          <h3 className="font-medium text-stone-900 mb-2">Notas para el cliente</h3>
          <p className="text-sm text-stone-700 whitespace-pre-wrap">{notasCliente}</p>
        </section>
      )}
    </div>
  )
}
