'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import NumberInput from '@/app/components/NumberInput'

type Rango = {
  id: string
  nombre: string
}

type Locacion = {
  id: string
  nombre: string
}

type Zona = {
  id: string
  nombre: string
  descripcion: string | null
  color: string | null
  locaciones: Locacion[] | null
  precios_flete: number[] | null
  estado: string
}

const COLORES_SUGERIDOS = [
  '#10B981', // verde
  '#F59E0B', // ámbar
  '#F97316', // naranja
  '#EF4444', // rojo
  '#8B5CF6', // morado
  '#3B82F6', // azul
  '#EC4899', // rosa
  '#A8A29E', // gris
]

export default function EditarZonaForm({
  zona,
  rangos,
}: {
  zona: Zona
  rangos: Rango[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const [nombre, setNombre] = useState(zona.nombre)
  const [descripcion, setDescripcion] = useState(zona.descripcion || '')
  const [color, setColor] = useState(zona.color || '#A8A29E')
  const [estado, setEstado] = useState(zona.estado)
  const [locaciones, setLocaciones] = useState<Locacion[]>(zona.locaciones || [])
  const [nuevaLocacion, setNuevaLocacion] = useState('')
  const [fletes, setFletes] = useState<number[]>(
    rangos.map((_, i) => zona.precios_flete?.[i] || 0)
  )

  function agregarLocacion() {
    const nombre = nuevaLocacion.trim()
    if (!nombre) return
    const nuevoId = `loc_${Date.now()}`
    setLocaciones([...locaciones, { id: nuevoId, nombre }])
    setNuevaLocacion('')
  }

  function quitarLocacion(id: string) {
    setLocaciones(locaciones.filter((l) => l.id !== id))
  }

  function actualizarFlete(idx: number, valor: number) {
    const nuevos = [...fletes]
    nuevos[idx] = valor
    setFletes(nuevos)
  }

  async function handleGuardar() {
    setMensaje(null)
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from('zonas')
        .update({
          nombre,
          descripcion: descripcion || null,
          color,
          estado,
          locaciones,
          precios_flete: fletes,
        })
        .eq('id', zona.id)

      if (error) {
        setMensaje({ tipo: 'error', texto: `Error: ${error.message}` })
        return
      }

      setMensaje({ tipo: 'ok', texto: 'Cambios guardados.' })
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl text-stone-900 mb-4">Información general</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-stone-700 mb-1.5">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-700 mb-1.5">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
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
                  title={c}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-stone-700 mb-1.5">Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            >
              <option value="ACTIVO">Activo</option>
              <option value="ARCHIVADO">Archivado</option>
              <option value="BORRADOR">Borrador</option>
            </select>
          </div>
        </div>
      </section>

      {/* Locaciones */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl text-stone-900 mb-1">Locaciones</h2>
        <p className="text-sm text-stone-500 mb-4">
          Lugares específicos que pertenecen a esta zona
        </p>

        <div className="space-y-2 mb-4">
          {locaciones.map((loc) => (
            <div
              key={loc.id}
              className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-lg"
            >
              <span className="flex-1 text-stone-900">{loc.nombre}</span>
              <button
                type="button"
                onClick={() => quitarLocacion(loc.id)}
                className="text-rose-600 hover:text-rose-800 text-sm"
              >
                Quitar
              </button>
            </div>
          ))}
          {locaciones.length === 0 && (
            <p className="text-sm text-stone-400 italic">Sin locaciones aún</p>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={nuevaLocacion}
            onChange={(e) => setNuevaLocacion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarLocacion())}
            placeholder="Nombre de la locación"
            className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
          <button
            type="button"
            onClick={agregarLocacion}
            className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-lg transition"
          >
            Agregar
          </button>
        </div>
      </section>

      {/* Precios de flete */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl text-stone-900 mb-1">Precios de flete por rango</h2>
        <p className="text-sm text-stone-500 mb-4">Costo por persona</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {rangos.map((rango, idx) => (
            <div key={rango.id}>
              <label className="block text-xs text-stone-600 mb-1">{rango.nombre} pax</label>
             <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
                <NumberInput
                  value={fletes[idx] || 0}
                  onChange={(v) => actualizarFlete(idx, v)}
                  className="w-full pl-7 pr-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between">
        <Link href="/catalogo/zonas" className="text-sm text-stone-600 hover:text-stone-900">
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
