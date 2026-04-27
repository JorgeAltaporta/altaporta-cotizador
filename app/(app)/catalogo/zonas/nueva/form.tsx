'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const COLORES_SUGERIDOS = [
  '#10B981',
  '#F59E0B',
  '#F97316',
  '#EF4444',
  '#8B5CF6',
  '#3B82F6',
  '#EC4899',
  '#A8A29E',
]

export default function NuevaZonaForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [id, setId] = useState('')
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [color, setColor] = useState('#A8A29E')

  async function handleCrear() {
    setError(null)

    if (!id.trim()) {
      setError('El ID es obligatorio (ej: F, G, MERIDA-NORTE)')
      return
    }
    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { error: errSupabase } = await supabase.from('zonas').insert({
        id: id.trim().toUpperCase(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        color,
        locaciones: [],
        precios_flete: [0, 0, 0, 0, 0, 0, 0],
        estado: 'BORRADOR',
        creado_por: 'JORGE',
      })

      if (errSupabase) {
        if (errSupabase.code === '23505') {
          setError(`Ya existe una zona con ID "${id}". Elige otro.`)
        } else {
          setError(`Error: ${errSupabase.message}`)
        }
        return
      }

      router.push(`/catalogo/zonas/${id.trim().toUpperCase()}/editar`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <div>
          <label className="block text-sm text-stone-700 mb-1.5">
            ID interno <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={id}
onChange={(e) => setId(e.target.value.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9_-]/g, ''))}
            placeholder="Ej: F  o  MERIDA-ORIENTE"
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 font-mono text-sm"
          />
          <p className="text-xs text-stone-500 mt-1">
            Identificador corto (1 letra o palabra). Aparece en el círculo de color en la lista.
          </p>
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1.5">
            Nombre <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Mérida Oriente"
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1.5">Descripción</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            placeholder="Breve descripción de la zona"
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1.5">Color</label>
          <div className="flex items-center gap-2">
            <div
              className="w-12 h-12 rounded-lg border border-stone-200 flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: color }}
            >
              {id || '?'}
            </div>
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
      </section>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Link href="/catalogo/zonas" className="text-sm text-stone-600 hover:text-stone-900">
          Cancelar
        </Link>
        <button
          onClick={handleCrear}
          disabled={isPending || !id.trim() || !nombre.trim()}
          className="bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg transition"
        >
          {isPending ? 'Creando...' : 'Crear zona'}
        </button>
      </div>
    </div>
  )
}
