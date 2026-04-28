'use client'

import type {
  EventoForm,
  AdicionalSeleccionado,
  Paquete,
  Zona,
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
              Ejecutivo:{' '}
              <strong className="text-stone-700">{ejecutivoNombre}</strong>
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
        </div>
      </section>

      {/* EVENTOS */}
      {eventos.map((evt, idx) => {
        const paquete = paquetes.find((p) => p.id === evt.paqueteId)
        const zona =
          zonas.find((z) => z.id === evt.zonaIdManual) ||
          zonas.find((z) =>
            (z.locaciones || []).some(
              (l) => l.nombre.toLowerCase() === evt.locacionTexto.toLowerCase()
            )
          )

        const subtotalAdicionales = evt.adicionales.reduce(
          (s, a) => s + a.cantidad * a.precioUnitario,
          0
        )

        return (
          <section
            key={evt.id}
            className="bg-white rounded-2xl border border-stone-200 p-6"
          >
            <h3 className="font-serif text-xl text-stone-900 mb-1">
              Evento {eventos.length > 1 ? idx + 1 : ''}
              {paquete && ` · ${paquete.nombre}`}
            </h3>
            <p className="text-sm text-stone-500 italic mb-4">
              {evt.fecha &&
                new Date(evt.fecha).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
              · {evt.locacionTexto}
            </p>

            <div className="grid grid-cols-3 gap-4 text-sm bg-stone-50 rounded-lg p-4 mb-4">
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
              <div>
                <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                  Zona
                </div>
                <div className="text-stone-900 font-medium">
                  {zona ? `${zona.id} · ${zona.nombre}` : '—'}
                </div>
              </div>
            </div>

            {/* Contenido del paquete por categorías */}
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

            {/* Adicionales agregados */}
            {evt.adicionales.length > 0 && (
              <div className="border-t border-stone-100 pt-4 mt-4">
                <div className="text-xs uppercase tracking-wider text-stone-700 mb-2">
                  Adicionales
                </div>
                <div className="space-y-1.5 text-sm">
                  {evt.adicionales.map((sel) => {
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
            )}

            {/* Total del evento */}
            <div className="bg-stone-900 text-stone-50 rounded-lg p-4 mt-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-amber-300 mb-1">
                    Subtotal del evento
                  </div>
                  <div className="text-xs text-amber-300/70">
                    {evt.pax} pax × ${(evt.pax > 0
                      ? ((paquete?.precios[
                          paquete.precios.findIndex((_, i) => {
                            return i === 0 // approximation, actual rangoIdx ya viene calculado afuera
                          })
                        ] || 0) +
                          (subtotalAdicionales / evt.pax))
                      : 0
                    ).toLocaleString('es-MX', { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-serif text-2xl">
                    $
                    {(
                      // calcular el total real del evento (paquete + flete + adicionales)
                      0
                    ).toLocaleString('es-MX')}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )
      })}

      {/* RESUMEN DE INVERSIÓN */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h3 className="font-serif text-xl text-stone-900 mb-4">
          Resumen de inversión
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-700">Subtotal eventos</span>
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

          {(ajustes.descuentoGeneral || ajustes.cargosExtra.length > 0) && (
            <div className="flex justify-between border-t border-stone-100 pt-2">
              <span className="text-stone-700">Subtotal ajustado</span>
              <span className="font-medium text-stone-900">
                $
                {(subtotalEventos - descuentoAplicado + totalCargosExtra).toLocaleString(
                  'es-MX'
                )}
              </span>
            </div>
          )}

          {ajustes.aplicaIva && (
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
              ${totalGeneral.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Anticipo */}
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

        {/* Comisión interna (solo si hay) */}
        {comisionPct > 0 && (
          <div className="mt-3 text-xs text-stone-500 text-right">
            Comisión WP {comisionPct}%: $
            {(totalGeneral * (comisionPct / 100)).toLocaleString('es-MX', {
              maximumFractionDigits: 2,
            })}
          </div>
        )}
      </section>

      {/* TÉRMINOS Y CONDICIONES */}
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

      {/* NOTAS PARA EL CLIENTE */}
      {notasCliente && (
        <section className="bg-stone-50 rounded-2xl border border-stone-200 p-6">
          <h3 className="font-medium text-stone-900 mb-2">Notas para el cliente</h3>
          <p className="text-sm text-stone-700 whitespace-pre-wrap">{notasCliente}</p>
        </section>
      )}
    </div>
  )
}
