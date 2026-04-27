'use client'

import { useState } from 'react'

export type Slot = {
  id: string
  porcentaje: number
  proteinasIncluidas: string[]
  proteinasPermitidas: string[]
}

type Proteina = {
  id: string
  nombre: string
  nivel_id: string | null
}

type Nivel = {
  id: string
  nombre: string
  color: string | null
}

export default function SlotsEditor({
  slots,
  proteinas,
  niveles,
  onChange,
}: {
  slots: Slot[]
  proteinas: Proteina[]
  niveles: Nivel[]
  onChange: (nuevos: Slot[]) => void
}) {
  const totalPct = slots.reduce((s, x) => s + (x.porcentaje || 0), 0)
  const sumaCorrecta = totalPct === 100

  function agregarSlot() {
    const nuevo: Slot = {
      id: `s_${Date.now()}`,
      porcentaje: slots.length === 0 ? 100 : 0,
      proteinasIncluidas: [],
      proteinasPermitidas: [],
    }
    onChange([...slots, nuevo])
  }

  function actualizarSlot(id: string, cambios: Partial<Slot>) {
    onChange(slots.map((s) => (s.id === id ? { ...s, ...cambios } : s)))
  }

  function eliminarSlot(id: string) {
    onChange(slots.filter((s) => s.id !== id))
  }

  return (
    <div className="space-y-3">
      {slots.length > 0 && (
        <div
          className={`text-sm px-3 py-2 rounded-lg ${
            sumaCorrecta
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {sumaCorrecta
            ? `✓ Suma correcta: 100%`
            : `⚠ Los porcentajes suman ${totalPct}%. Deben sumar 100%.`}
        </div>
      )}

      {slots.map((slot, idx) => (
        <SlotCard
          key={slot.id}
          slot={slot}
          numero={idx + 1}
          proteinas={proteinas}
          niveles={niveles}
          onUpdate={(cambios) => actualizarSlot(slot.id, cambios)}
          onDelete={() => eliminarSlot(slot.id)}
        />
      ))}

      <button
        type="button"
        onClick={agregarSlot}
        className="w-full text-amber-700 hover:bg-amber-50 py-3 rounded-lg border-2 border-dashed border-stone-300 hover:border-amber-300 transition text-sm"
      >
        + Agregar slot de proteína
      </button>
    </div>
  )
}

function SlotCard({
  slot,
  numero,
  proteinas,
  niveles,
  onUpdate,
  onDelete,
}: {
  slot: Slot
  numero: number
  proteinas: Proteina[]
  niveles: Nivel[]
  onUpdate: (cambios: Partial<Slot>) => void
  onDelete: () => void
}) {
  const [confirmarBorrar, setConfirmarBorrar] = useState(false)

  function togglePermitida(protId: string) {
    const yaEsta = slot.proteinasPermitidas.includes(protId)
    if (yaEsta) {
      onUpdate({
        proteinasPermitidas: slot.proteinasPermitidas.filter((p) => p !== protId),
        // Si la quito de permitidas, también de incluidas
        proteinasIncluidas: slot.proteinasIncluidas.filter((p) => p !== protId),
      })
    } else {
      onUpdate({
        proteinasPermitidas: [...slot.proteinasPermitidas, protId],
      })
    }
  }

  function toggleIncluida(protId: string) {
    const yaEsta = slot.proteinasIncluidas.includes(protId)
    if (yaEsta) {
      onUpdate({
        proteinasIncluidas: slot.proteinasIncluidas.filter((p) => p !== protId),
      })
    } else {
      // Si no está en permitidas, agregarla
      const permitidas = slot.proteinasPermitidas.includes(protId)
        ? slot.proteinasPermitidas
        : [...slot.proteinasPermitidas, protId]
      onUpdate({
        proteinasIncluidas: [...slot.proteinasIncluidas, protId],
        proteinasPermitidas: permitidas,
      })
    }
  }

  // Agrupar proteínas por nivel
  const proteinasPorNivel = niveles.map((nivel) => ({
    ...nivel,
    items: proteinas.filter((p) => p.nivel_id === nivel.id),
  }))

  return (
    <div className="bg-stone-50 rounded-xl border border-stone-200 p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-amber-700 text-white flex items-center justify-center font-medium">
          {numero}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            value={slot.porcentaje}
            onChange={(e) => onUpdate({ porcentaje: Number(e.target.value) })}
            min={0}
            max={100}
            className="w-20 px-2 py-1.5 border border-stone-300 rounded bg-white text-center font-medium focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
          <span className="text-stone-600">%</span>
        </div>

        <span className="text-sm text-stone-500">
          ({slot.proteinasIncluidas.length} incluidas, {slot.proteinasPermitidas.length} permitidas)
        </span>

        <div className="ml-auto">
          {confirmarBorrar ? (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={onDelete}
                className="text-xs text-rose-600 hover:text-rose-800 px-2"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setConfirmarBorrar(false)}
                className="text-xs text-stone-500 hover:text-stone-700 px-2"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmarBorrar(true)}
              className="p-1.5 text-rose-500 hover:text-rose-700"
              title="Eliminar slot"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 ml-11">
        <p className="text-xs text-stone-600">
          <strong>Incluidas</strong> = vienen por defecto en el paquete (azul).<br />
          <strong>Permitidas</strong> = el cliente puede elegirlas como upgrade (verde).
        </p>

        {proteinasPorNivel.map((nivel) => (
          <div key={nivel.id}>
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: nivel.color || '#A8A29E' }}
              />
              <span className="text-xs font-medium text-stone-700 uppercase tracking-wide">
                Nivel {nivel.nombre}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {nivel.items.map((prot) => {
                const incluida = slot.proteinasIncluidas.includes(prot.id)
                const permitida = slot.proteinasPermitidas.includes(prot.id)

                return (
                  <div key={prot.id} className="inline-flex items-center text-xs rounded-full overflow-hidden border border-stone-200">
                    <button
                      type="button"
                      onClick={() => togglePermitida(prot.id)}
                      className={`px-2 py-1 ${
                        permitida
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-white text-stone-400 hover:bg-stone-100'
                      }`}
                      title={permitida ? 'Permitida' : 'Click para permitir'}
                    >
                      {prot.nombre}
                    </button>
                    {permitida && (
                      <button
                        type="button"
                        onClick={() => toggleIncluida(prot.id)}
                        className={`px-1.5 py-1 border-l border-stone-200 ${
                          incluida
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-stone-300 hover:bg-stone-100'
                        }`}
                        title={incluida ? 'Incluida (click para quitar)' : 'Click para incluir'}
                      >
                        {incluida ? '✓' : '+'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
