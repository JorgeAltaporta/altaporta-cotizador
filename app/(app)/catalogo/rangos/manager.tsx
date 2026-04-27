'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import NumberInput from '@/app/components/NumberInput'

type Rango = {
  id: string
  nombre: string
  min_pax: number
  max_pax: number | null
  orden: number
}

export default function RangosManager({
  rangosIniciales,
  puedeEditar,
}: {
  rangosIniciales: Rango[]
  puedeEditar: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [rangos, setRangos] = useState(rangosIniciales)

  function actualizarLocal(id: string, cambios: Partial<Rango>) {
    setRangos(rangos.map((r) => (r.id === id ? { ...r, ...cambios } : r)))
  }

  function validar(): string | null {
    // Validar que cada rango tenga nombre
    for (const r of rangos) {
      if (!r.nombre.trim()) return `El rango "${r.id}" no tiene nombre`
    }
    // Validar continuidad: max_pax de uno debe ser menor que min_pax del siguiente
    for (let i = 0; i < rangos.length - 1; i++) {
      const actual = rangos[i]
      const siguiente = rangos[i + 1]
      if (actual.max_pax === null) {
        return `Solo el último rango puede tener pax máximo abierto (sin límite)`
      }
      if (actual.max_pax >= siguiente.min_pax) {
        return `El rango "${actual.nombre}" termina en ${actual.max_pax} pero el siguiente empieza en ${siguiente.min_pax}. Deben ser consecutivos.`
      }
    }
    return null
  }

  async function handleGuardar() {
    setMensaje(null)
    const errorVal = validar()
    if (errorVal) {
      setMensaje({ tipo: 'error', texto: errorVal })
      return
    }

    startTransition(async () => {
      const supabase = createClient()

      // Actualizar uno por uno
      for (const r of rangos) {
        const { error } = await supabase
          .from('rangos')
          .update({
            nombre: r.nombre,
            min_pax: r.min_pax,
            max_pax: r.max_pax,
          })
          .eq('id', r.id)

        if (error) {
          setMensaje({ tipo: 'error', texto: `Error en ${r.nombre}: ${error.message}` })
          return
        }
      }

      setMensaje({ tipo: 'ok', texto: 'Cambios guardados.' })
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="space-y-3">
          {rangos.map((rango, idx) => {
            const esUltimo = idx === rangos.length - 1
            const sinLimite = rango.max_pax === null

            return (
              <div
                key={rango.id}
                className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg"
              >
                <div className="w-8 h-8 rounded-full bg-amber-700 text-white flex items-center justify-center text-sm font-medium">
                  {idx + 1}
                </div>

                <div className="flex-1 grid grid-cols-3 gap-3 items-center">
                  <div>
                    <label className="block text-xs text-stone-600 mb-1">Nombre visible</label>
                    <input
                      type="text"
                      value={rango.nombre}
                      onChange={(e) => actualizarLocal(rango.id, { nombre: e.target.value })}
                      disabled={!puedeEditar}
                      placeholder="50-79"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-stone-600 mb-1">Pax mínimo</label>
                    <NumberInput
                      value={rango.min_pax}
                      onChange={(v) => actualizarLocal(rango.id, { min_pax: v })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-stone-600 mb-1">
                      Pax máximo
                      {esUltimo && (
                        <span className="text-stone-400 ml-1">(opcional)</span>
                      )}
                    </label>
                    {esUltimo ? (
                      <div className="flex items-center gap-2">
                        {sinLimite ? (
                          <>
                            <div className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-100 text-stone-500 italic">
                              Sin límite
                            </div>
                            {puedeEditar && (
                              <button
                                onClick={() => actualizarLocal(rango.id, { max_pax: rango.min_pax + 50 })}
                                className="text-xs text-amber-700 hover:text-amber-900"
                              >
                                Definir
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <NumberInput
                              value={rango.max_pax || 0}
                              onChange={(v) => actualizarLocal(rango.id, { max_pax: v })}
                              className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white"
                            />
                            {puedeEditar && (
                              <button
                                onClick={() => actualizarLocal(rango.id, { max_pax: null })}
                                className="text-xs text-stone-500 hover:text-stone-700"
                                title="Quitar límite"
                              >
                                ✕
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <NumberInput
                        value={rango.max_pax || 0}
                        onChange={(v) => actualizarLocal(rango.id, { max_pax: v })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white"
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-stone-500 mt-4">
          ⚠️ Los rangos deben ser consecutivos (sin huecos). Solo el último puede tener pax máximo abierto.
        </p>
      </section>

      {puedeEditar && (
        <div className="flex items-center justify-between sticky bottom-4 bg-white rounded-2xl border border-stone-200 p-4 shadow-lg">
          <Link href="/catalogo" className="text-sm text-stone-600 hover:text-stone-900">
            Cancelar
          </Link>
          <button
            onClick={handleGuardar}
            disabled={isPending}
            className="bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg transition"
          >
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}

      {mensaje && (
        <div
          className={`fixed top-6 right-6 z-50 p-3 rounded-lg text-sm shadow-lg max-w-sm ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {mensaje.texto}
        </div>
      )}
    </div>
  )
}
