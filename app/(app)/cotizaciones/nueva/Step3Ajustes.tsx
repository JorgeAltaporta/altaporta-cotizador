'use client'

import NumberInput from '@/app/components/NumberInput'

export type DescuentoGeneral = {
  tipo: 'porcentaje' | 'monto'
  valor: number
  concepto: string
}

export type CargoExtra = {
  id: string
  concepto: string
  monto: number
}

export type Step3Data = {
  descuentoGeneral: DescuentoGeneral | null
  cargosExtra: CargoExtra[]
  comisionEjecutivoOverride: number | null
  notasCliente: string
  vigenciaDias: number
  anticipoPctOverride: number | null
  aplicaIva: boolean
}

export default function Step3Ajustes({
  data,
  onChange,
  subtotalEventos,
  comisionEjecutivoDefault,
  ejecutivoNombre,
  puedeAprobar,
  anticipoPctDefault,
}: {
  data: Step3Data
  onChange: (cambios: Partial<Step3Data>) => void
  subtotalEventos: number
  comisionEjecutivoDefault: number
  ejecutivoNombre: string | null
  puedeAprobar: boolean
  anticipoPctDefault: number
}) {
  const descuentoAplicado = (() => {
    if (!data.descuentoGeneral) return 0
    if (data.descuentoGeneral.tipo === 'porcentaje') {
      return subtotalEventos * (data.descuentoGeneral.valor / 100)
    }
    return data.descuentoGeneral.valor
  })()

  const totalCargosExtra = data.cargosExtra.reduce((s, c) => s + c.monto, 0)

  const subtotalAjustado = subtotalEventos - descuentoAplicado + totalCargosExtra
  const iva = data.aplicaIva ? subtotalAjustado * 0.16 : 0
  const totalFinal = subtotalAjustado + iva

  const comisionPct = data.comisionEjecutivoOverride ?? comisionEjecutivoDefault
  const comisionEjecutivoMonto = totalFinal * (comisionPct / 100)

  const anticipoPct = data.anticipoPctOverride ?? anticipoPctDefault
  const anticipoMonto = totalFinal * (anticipoPct / 100)

  function actualizarDescuento(cambios: Partial<DescuentoGeneral>) {
    onChange({
      descuentoGeneral: data.descuentoGeneral
        ? { ...data.descuentoGeneral, ...cambios }
        : { tipo: 'porcentaje', valor: 0, concepto: '', ...cambios },
    })
  }

  function quitarDescuento() {
    onChange({ descuentoGeneral: null })
  }

  function agregarCargoExtra() {
    onChange({
      cargosExtra: [
        ...data.cargosExtra,
        {
          id: `cargo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          concepto: '',
          monto: 0,
        },
      ],
    })
  }

  function actualizarCargo(id: string, cambios: Partial<CargoExtra>) {
    onChange({
      cargosExtra: data.cargosExtra.map((c) =>
        c.id === id ? { ...c, ...cambios } : c
      ),
    })
  }

  function quitarCargo(id: string) {
    onChange({ cargosExtra: data.cargosExtra.filter((c) => c.id !== id) })
  }

  return (
    <div className="space-y-6">
      {/* DESCUENTO GENERAL */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="mb-4">
          <h2 className="font-serif text-xl text-stone-900">Descuento general</h2>
          <p className="text-sm text-stone-500">
            Aplica al total antes de IVA
          </p>
        </div>

        {!data.descuentoGeneral ? (
          <button
            type="button"
            onClick={() =>
              onChange({
                descuentoGeneral: { tipo: 'porcentaje', valor: 0, concepto: '' },
              })
            }
            className="px-4 py-2 border-2 border-dashed border-stone-300 hover:border-amber-500 hover:bg-amber-50 text-stone-600 rounded-lg text-sm w-full transition"
          >
            + Aplicar descuento
          </button>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-emerald-900">
                Descuento aplicado
              </span>
              <button
                type="button"
                onClick={quitarDescuento}
                className="text-sm text-rose-500 hover:text-rose-700"
              >
                ✕ Quitar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-700 mb-1">Tipo</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => actualizarDescuento({ tipo: 'porcentaje' })}
                    className={`flex-1 px-3 py-2 rounded border-2 text-sm transition ${
                      data.descuentoGeneral.tipo === 'porcentaje'
                        ? 'border-amber-600 bg-amber-50 text-amber-900'
                        : 'border-stone-200 bg-white text-stone-600'
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => actualizarDescuento({ tipo: 'monto' })}
                    className={`flex-1 px-3 py-2 rounded border-2 text-sm transition ${
                      data.descuentoGeneral.tipo === 'monto'
                        ? 'border-amber-600 bg-amber-50 text-amber-900'
                        : 'border-stone-200 bg-white text-stone-600'
                    }`}
                  >
                    $
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-stone-700 mb-1">
                  {data.descuentoGeneral.tipo === 'porcentaje' ? 'Porcentaje' : 'Monto fijo'}
                </label>
                <NumberInput
                  value={data.descuentoGeneral.valor}
                  onChange={(v) => actualizarDescuento({ valor: v })}
                  max={data.descuentoGeneral.tipo === 'porcentaje' ? 100 : undefined}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-stone-700 mb-1">Concepto / razón</label>
              <input
                type="text"
                value={data.descuentoGeneral.concepto}
                onChange={(e) => actualizarDescuento({ concepto: e.target.value })}
                placeholder="Ej: Cliente recurrente, promo temporada baja"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white"
              />
            </div>

            <div className="text-sm text-emerald-900 pt-2 border-t border-emerald-200">
              Descuento: <strong>−${descuentoAplicado.toLocaleString('es-MX')}</strong>
            </div>
          </div>
        )}
      </section>

      {/* CARGOS EXTRA */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-serif text-xl text-stone-900">Cargos extra generales</h2>
            <p className="text-sm text-stone-500">
              Cargos no atados a un evento específico
            </p>
          </div>
          <button
            type="button"
            onClick={agregarCargoExtra}
            className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-sm hover:bg-stone-800"
          >
            + Agregar cargo
          </button>
        </div>

        {data.cargosExtra.length === 0 ? (
          <p className="text-sm text-stone-400 italic text-center py-3">
            No hay cargos extra
          </p>
        ) : (
          <div className="space-y-2">
            {data.cargosExtra.map((c) => (
              <div
                key={c.id}
                className="flex items-end gap-2 p-3 bg-stone-50 border border-stone-200 rounded-lg"
              >
                <div className="flex-1">
                  <label className="block text-xs text-stone-700 mb-1">Concepto</label>
                  <input
                    type="text"
                    value={c.concepto}
                    onChange={(e) => actualizarCargo(c.id, { concepto: e.target.value })}
                    placeholder="Ej: Coordinación adicional"
                    className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm bg-white"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs text-stone-700 mb-1">Monto</label>
                  <NumberInput
                    value={c.monto}
                    onChange={(v) => actualizarCargo(c.id, { monto: v })}
                    className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => quitarCargo(c.id)}
                  className="text-rose-500 hover:text-rose-700 text-sm pb-1.5"
                  title="Quitar"
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="text-right text-sm text-stone-700 pt-2">
              Total cargos extra:{' '}
              <strong>${totalCargosExtra.toLocaleString('es-MX')}</strong>
            </div>
          </div>
        )}
      </section>

      {/* IVA */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="mb-3">
          <h2 className="font-serif text-xl text-stone-900">IVA</h2>
          <p className="text-sm text-stone-500">
            Aplica IVA del 16% sobre el subtotal ajustado
          </p>
        </div>

        <label className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-lg cursor-pointer hover:bg-stone-100 transition">
          <input
            type="checkbox"
            checked={data.aplicaIva}
            onChange={(e) => onChange({ aplicaIva: e.target.checked })}
            className="w-4 h-4 accent-amber-600"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-stone-900">Aplicar IVA 16%</div>
            <div className="text-xs text-stone-500">
              {data.aplicaIva
                ? `IVA: $${iva.toLocaleString('es-MX', { maximumFractionDigits: 2 })}`
                : 'Sin IVA'}
            </div>
          </div>
        </label>
      </section>

      {/* ANTICIPO */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="mb-3">
          <h2 className="font-serif text-xl text-stone-900">Anticipo</h2>
          <p className="text-sm text-stone-500">
            Porcentaje requerido para apartar la fecha
          </p>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-700">Anticipo default:</span>
            <span className="text-stone-900">{anticipoPctDefault}%</span>
          </div>

          <div>
            <label className="block text-xs text-stone-700 mb-1">
              Override (opcional, solo si esta cotización tiene un % distinto)
            </label>
            <div className="flex gap-2 items-center">
              <NumberInput
                value={data.anticipoPctOverride ?? 0}
                onChange={(v) => onChange({ anticipoPctOverride: v === 0 ? null : v })}
                max={100}
                placeholder={`Default: ${anticipoPctDefault}%`}
                className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white"
              />
              <span className="text-stone-500 text-sm">%</span>
            </div>
          </div>

          <div className="flex justify-between text-sm pt-2 border-t border-stone-200">
            <span className="text-stone-700">Anticipo aplicado:</span>
            <strong className="text-stone-900">
              {anticipoPct}% = ${anticipoMonto.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
            </strong>
          </div>
        </div>
      </section>

      {/* COMISIÓN EJECUTIVO */}
      {ejecutivoNombre && (
        <section className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="mb-4">
            <h2 className="font-serif text-xl text-stone-900">
              Comisión del ejecutivo
              <span className="ml-2 text-sm text-stone-500 font-normal">(interno)</span>
            </h2>
            <p className="text-sm text-stone-500">
              No aparece en el PDF del cliente. Solo para reportes internos.
            </p>
          </div>

          <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-700">Ejecutivo:</span>
              <strong className="text-stone-900">{ejecutivoNombre}</strong>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-700">Comisión default:</span>
              <span className="text-stone-900">{comisionEjecutivoDefault}%</span>
            </div>

            {puedeAprobar && (
              <div>
                <label className="block text-xs text-stone-700 mb-1">
                  Override (opcional, solo aprobadores)
                </label>
                <div className="flex gap-2 items-center">
                  <NumberInput
                    value={data.comisionEjecutivoOverride ?? 0}
                    onChange={(v) =>
                      onChange({ comisionEjecutivoOverride: v === 0 ? null : v })
                    }
                    max={100}
                    placeholder={`Default: ${comisionEjecutivoDefault}%`}
                    className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white"
                  />
                  <span className="text-stone-500 text-sm">%</span>
                </div>
              </div>
            )}

            <div className="flex justify-between text-sm pt-2 border-t border-stone-200">
              <span className="text-stone-700">Comisión aplicada:</span>
              <strong className="text-stone-900">
                {comisionPct}% = ${comisionEjecutivoMonto.toLocaleString('es-MX', {
                  maximumFractionDigits: 2,
                })}
              </strong>
            </div>
          </div>
        </section>
      )}

      {/* NOTAS PARA EL CLIENTE */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="mb-3">
          <h2 className="font-serif text-xl text-stone-900">Notas para el cliente</h2>
          <p className="text-sm text-stone-500">
            Estas notas <strong>sí aparecen</strong> en el PDF que se envía al cliente.
          </p>
        </div>
        <textarea
          value={data.notasCliente}
          onChange={(e) => onChange({ notasCliente: e.target.value })}
          rows={4}
          placeholder="Ej: La cotización incluye montaje y desmontaje. El servicio se brinda durante 5 horas continuas."
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
        />
      </section>

      {/* VIGENCIA */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="mb-3">
          <h2 className="font-serif text-xl text-stone-900">Vigencia</h2>
          <p className="text-sm text-stone-500">
            Días que la cotización es válida desde su creación
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <NumberInput
            value={data.vigenciaDias}
            onChange={(v) => onChange({ vigenciaDias: v })}
            className="w-32 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
          <span className="text-stone-700 text-sm">días</span>
        </div>
      </section>
    </div>
  )
}
