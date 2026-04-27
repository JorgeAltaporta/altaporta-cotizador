'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import NumberInput from '@/app/components/NumberInput'

const COLORES_SUGERIDOS = [
  '#F4A78F',
  '#FDE68A',
  '#BBF7D0',
  '#BFDBFE',
  '#E7E5E4',
  '#FECACA',
  '#DDD6FE',
  '#FED7AA',
]

export default function NuevoPaqueteForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [id, setId] = useState('')
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [color, setColor] = useState('#E7E5E4')
  const [horas, setHoras] = useState(8)
  const [pax, setPax] = useState(50)
  const [anticipo, setAnticipo] = useState(30)
  const [esPersonalizado, setEsPersonalizado] = useState(false)

  function generarIdDesdeNombre() {
    const sugerido = nombre.toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .substring(0, 30)
    setId(sugerido)
  }

  async function handleCrear() {
    setError(null)

    if (!id.trim()) {
      setError('El ID es obligatorio')
      return
    }
    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { error: errSupabase } = await supabase.from('paquetes').insert({
        id: id.trim(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        color,
        horas_servicio: horas,
        base_min_pax: pax,
        anticipo_pct: anticipo,
        es_personalizado: esPersonalizado,
        precios: [0, 0, 0, 0, 0, 0, 0],
        categorias: [],
        proteina_slots: [],
        adicionales_permitidos: [],
        zonas_permitidas: [],
        estado: 'BORRADOR',
        creado_por: 'JORGE',
      })

      if (errSupabase) {
        if (errSupabase.code === '23505') {
          setError(`Ya existe un paquete con ID "${id}". Elige otro.`)
        } else {
          setError(`Error: ${errSupabase.message}`)
        }
        return
      }

      router.push(`/catalogo/paquetes/${id.trim()}/editar`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <div>
          <label className="block text-sm text-stone-700 mb-1.5">
            Nombre <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={() => !id && generarIdDesdeNombre()}
            placeholder="Ej: Premium Plus"
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1.5">
            ID interno <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
            placeholder="Ej: PREMIUM_PLUS"
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 font-mono text-sm"
          />
          <p className="text-xs text-stone-500 mt-1">
            Solo mayúsculas, números y guiones bajos. No se puede cambiar después.
          </p>
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1.5">Descripción</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            placeholder="Breve descripción del paquete"
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1.5">Color</label>
          <div className="flex items-center gap-2">
            <div
              className="w-12 h-12 rounded-lg border border-stone-200"
              style={{ backgroundColor: color }}
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 font-mono text-sm"
            />
          </div>
          <div className="flex gap-2 mt-2">
            {COLORES_SUGERIDOS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-8 h-8 rounded border border-stone-200 hover:scale-110 transition"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-stone-700 mb-1.5">Horas servicio</label>
            <NumberInput
              value={horas}
              onChange={setHoras}
              min={1}
              max={24}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-700 mb-1.5">Pax mínimo</label>
            <NumberInput
              value={pax}
              onChange={setPax}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-700 mb-1.5">Anticipo (%)</label>
            <NumberInput
              value={anticipo}
              onChange={setAnticipo}
              max={100}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={esPersonalizado}
            onChange={(e) => setEsPersonalizado(e.target.checked)}
            className="rounded"
          />
          <span>Es plantilla personalizada (el ejecutivo llena precio y contenido al cotizar)</span>
        </label>
      </section>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Link href="/catalogo/paquetes" className="text-sm text-stone-600 hover:text-stone-900">
          Cancelar
        </Link>
        <button
          onClick={handleCrear}
          disabled={isPending || !id.trim() || !nombre.trim()}
          className="bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg transition"
        >
          {isPending ? 'Creando...' : 'Crear paquete'}
        </button>
      </div>
    </div>
  )
}
