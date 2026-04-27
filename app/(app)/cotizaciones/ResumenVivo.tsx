'use client'

type EventoResumen = {
  nombre?: string
  pax?: number
  paqueteNombre?: string
  zonaNombre?: string
  subtotalPaquete?: number
  flete?: number
  total?: number
}

export default function ResumenVivo({
  clienteNombre,
  wpNombre,
  comisionPct,
  evento,
}: {
  clienteNombre?: string
  wpNombre?: string
  comisionPct?: number
  evento?: EventoResumen
}) {
  const total = evento?.total || 0
  const comision = total * ((comisionPct || 0) / 100)

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="bg-stone-900 text-white p-5">
        <div className="text-xs tracking-widest uppercase text-stone-400 mb-1">
          Resumen vivo
        </div>
        <div className="font-serif text-lg">
          {clienteNombre || 'Sin nombre'}
        </div>
        {wpNombre && (
          <div className="text-xs text-stone-400 mt-1">
            {wpNombre}
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {evento && evento.total && evento.total > 0 ? (
          <>
            <div>
              <div className="text-xs text-stone-500 mb-1">{evento.nombre || 'Evento'}</div>
              <div className="text-sm text-stone-900">
                {evento.paqueteNombre} · {evento.pax} pax
              </div>
              {evento.zonaNombre && (
                <div className="text-xs text-stone-500">{evento.zonaNombre}</div>
              )}
            </div>

            <div className="space-y-1.5 text-sm border-t border-stone-100 pt-3">
              <div className="flex justify-between">
                <span className="text-stone-600">Paquete</span>
                <span className="text-stone-900">
                  ${(evento.subtotalPaquete || 0).toLocaleString('es-MX')}
                </span>
              </div>
              {(evento.flete || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-600">Flete</span>
                  <span className="text-stone-900">
                    ${(evento.flete || 0).toLocaleString('es-MX')}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-stone-100 pt-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-stone-700">Total</span>
                <span className="font-serif text-2xl text-stone-900">
                  ${total.toLocaleString('es-MX')}
                </span>
              </div>
              {comisionPct && comisionPct > 0 && (
                <div className="text-xs text-stone-500 mt-1 text-right">
                  Comisión {comisionPct}%: ${comision.toLocaleString('es-MX')}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-sm text-stone-400 italic">
            Llena los datos del evento para ver el cálculo
          </div>
        )}
      </div>
    </div>
  )
}
