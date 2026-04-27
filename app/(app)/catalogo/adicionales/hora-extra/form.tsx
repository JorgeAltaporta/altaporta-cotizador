'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import NumberInput from '@/app/components/NumberInput'

type Zona = { id: string; nombre: string }

type Rango = {
  id: string
  nombre: string
  min_pax: number
  max_pax: number | null
}

type HoraExtra = {
  id: string
  tarifas_por_rango: Record<string, number[]> | null
  notas: string | null
}

export default function HoraExtraForm({
  horaExtra,
  zonas,
  rangos,
}: {
  horaExtra: HoraExtra
  zonas: Zona[]
  rangos: Rango[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  // Inicializar la matriz: { A: [...], B: [...], ... }
  const inicial: Record<string, number[]> = {}
  zonas.forEach((z) => {
    inicial[z.id] = horaExtra.tarifas_por_rango?.[z.id]
      ? [...horaExtra.tarifas_por_rango[z.id]]
      : new Array(rangos.length).fill(0)
  })

  const [tarifas, setTarifas] = useState<Record<string, number[]>>(inicial)
  const [notas, setNotas] = useState(horaExtra.notas || '')

  function actualizarTarifa(zonaId: string, idxRango: number, valor: number) {
    const nuevasZona = [...(tarifas[zonaId] || new Array(rangos.length).fill(0))]
    nuevasZona[idxRango] = valor
    setTarifas({ ...tarifas, [zonaId]: nuevasZona })
  }

  async function handleGuardar() {
    setMensaje(null)
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from('adicionales')
        .update({
          tarifas_por_rango: tarifas,
          notas: notas || null,
        })
        .eq('id', horaExtra.id)

      if (error) {
        setMensaje({ tipo: 'error', texto: `Error: ${error.message}` })
        return
      }

      setMensaje({ tipo: 'ok', texto: 'Tarifas guardadas.' })
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl text-stone-900 mb-1">Tarifas por zona y rango</h2>
        <p className="text-sm text-stone-500 mb-4">
          Costo por hora extra de banquete. Las filas son zonas, las columnas son rangos de pax.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-2 pr-3 font-medium text-stone-600 sticky left-0 bg-white">
                  Zona
                </th>
                {rangos.map((r) => (
                  <th key={r.id} className="text-center py-2 px-2 font-medium text-stone-600 min-w-[80px]">
                    {r.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zonas.map((zona) => (
                <tr key={zona.id} className="border-t border-stone-100">
                  <td className="py-2 pr-3 sticky left-0 bg-white">
                    <div className="font-medium text-stone-900">Zona {zona.id}</div>
                    <div className="text-xs text-stone-500">{zona.nombre}</div>
                  </td>
                  {rangos.map((rango, idx) => (
                    <td key={rango.id} className="py-2 px-1">
                     <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 text-xs">
                          $
                        </span>
                        <NumberInput
                          value={tarifas[zona.id]?.[idx] || 0}
                          onChange={(v) => actualizarTarifa(zona.id, idx, v)}
                          className="w-full pl-5 pr-1 py-1.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <label className="block text-sm text-stone-700 mb-1.5">Notas (opcional)</label>
        <input
          type="text"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Ej: La primera hora extra incluye servicio completo"
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
        />
      </section>

      <div className="flex items-center justify-between">
        <Link href="/catalogo/adicionales" className="text-sm text-stone-600 hover:text-stone-900">
          Cancelar
        </Link>
        <button
          onClick={handleGuardar}
          disabled={isPending}
          className="bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg transition"
        >
          {isPending ? 'Guardando...' : 'Guardar tarifas'}
        </button>
      </div>

      {mensaje && (
        <div
          className={`p-3 rounded-lg text-sm ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border border-rose-200 text-rose-700'
          }`}
        >
          {mensaje.texto}
        </div>
      )}
    </div>
  )
}
