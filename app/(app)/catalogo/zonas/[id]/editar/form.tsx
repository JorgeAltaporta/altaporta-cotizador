'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import NumberInput from '@/app/components/NumberInput'

type Rango = {
  id: string
  nombre: string
  min_pax: number
  max_pax: number | null
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
  locaciones: Locacion[]
  precios_flete: number[]
  precios_hora_extra: number[]
  estado: string
}

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
  const [fletes, setFletes] = useState<number[]>(
    rangos.map((_, i) => zona.precios_flete?.[i] || 0)
  )
  const [horaExtra, setHoraExtra] = useState<number[]>(
    rangos.map((_, i) => zona.precios_hora_extra?.[i] || 0)
  )
  const [confirmarArchivar, setConfirmarArchivar] = useState(false)

  function actualizarFlete(idx: number, valor: number) {
    const nuevos = [...fletes]
    nuevos[idx] = valor
    setFletes(nuevos)
  }

  function actualizarHoraExtra(idx: number, valor: number) {
    const nuevos = [...horaExtra]
    nuevos[idx] = valor
    setHoraExtra(nuevos)
  }

  function agregarLocacion() {
    const nueva: Locacion = {
      id: `loc_${Date.now()}`,
      nombre: 'Nueva locación',
    }
    setLocaciones([...locaciones, nueva])
  }

  function actualizarLocacion(id: string, nombre: string) {
    setLocaciones(locaciones.map((l) => (l.id === id ? { ...l, nombre } : l)))
  }

  function eliminarLocacion(id: string) {
    setLocaciones(locaciones.filter((l) => l.id !== id))
  }

  async function handleGuardar(estadoFinal?: string) {
    setMensaje(null)
    const estadoAGuardar = estadoFinal || estado
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from('zonas')
        .update({
          nombre,
          descripcion: descripcion || null,
          color,
          estado: estadoAGuardar,
          locaciones,
          precios_flete: fletes,
          precios_hora_extra: horaExtra,
        })
        .eq('id', zona.id)

      if (error) {
        setMensaje({ tipo: 'error', texto: `Error: ${error.message}` })
        return
      }

      setEstado(estadoAGuardar)
      setMensaje({ tipo: 'ok', texto: 'Cambios guardados.' })
      router.refresh()
    })
  }

  async function handleArchivar() {
    setConfirmarArchivar(false)
    await handleGuardar('ARCHIVADO')
  }

  async function handleRestaurar() {
    await handleGuardar('ACTIVO')
  }

  return (
    <div className="space-y-6">
      {/* Badge de estado actual */}
      {estado !== 'ACTIVO' && (
        <div
          className={`p-3 rounded-lg text-sm ${
            estado === 'ARCHIVADO'
              ? 'bg-stone-100 border border-stone-300 text-stone-700'
              : 'bg-amber-50 border border-amber-200 text-amber-700'
          }`}
        >
          {estado === 'ARCHIVADO' && '📦 Esta zona está archivada. No aparece en cotizaciones nuevas.'}
          {estado === 'BORRADOR' && '✏️ Esta zona está en borrador. No aparece en cotizaciones nuevas.'}
        </div>
      )}

      {/* INFORMACIÓN GENERAL */}
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
                className="w-12 h-12 rounded-lg border border-stone-200 flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: color }}
              >
                {zona.id}
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
        </div>
      </section>

      {/* LOCACIONES */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-serif text-xl text-stone-900">Locaciones</h2>
            <p className="text-sm text-stone-500">Lugares específicos dentro de esta zona</p>
          </div>
          <button
            type="button"
            onClick={agregarLocacion}
            className="text-sm text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-300"
          >
            + Agregar
          </button>
        </div>

        <div className="space-y-2">
          {locaciones.map((loc) => (
            <div key={loc.id} className="flex gap-2 items-center">
              <input
                type="text"
                value={loc.nombre}
                onChange={(e) => actualizarLocacion(loc.id, e.target.value)}
                className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
              <button
                type="button"
                onClick={() => eliminarLocacion(loc.id)}
                className="p-2 text-rose-500 hover:text-rose-700"
                title="Eliminar"
              >
                ✕
              </button>
            </div>
          ))}

          {locaciones.length === 0 && (
            <div className="text-sm text-stone-400 py-3 italic text-center">
              Sin locaciones. Agrega al menos una.
            </div>
          )}
        </div>
      </section>

      {/* FLETES POR RANGO */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl text-stone-900 mb-1">🚚 Flete</h2>
        <p className="text-sm text-stone-500 mb-4">Costo por persona (multiplicado por número de invitados)</p>

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

      {/* HORA EXTRA POR RANGO */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl text-stone-900 mb-1">⏱️ Hora extra</h2>
        <p className="text-sm text-stone-500 mb-4">Costo total de una hora extra de banquete (no por persona)</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {rangos.map((rango, idx) => (
            <div key={rango.id}>
              <label className="block text-xs text-stone-600 mb-1">{rango.nombre} pax</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
                <NumberInput
                  value={horaExtra[idx] || 0}
                  onChange={(v) => actualizarHoraExtra(idx, v)}
                  className="w-full pl-7 pr-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ZONA DE PELIGRO - ARCHIVAR */}
      <section className="bg-stone-50 rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-lg text-stone-700 mb-2">Acciones</h2>

        {estado === 'ACTIVO' || estado === 'BORRADOR' ? (
          <div>
            <p className="text-sm text-stone-600 mb-3">
              Archivar la zona la oculta de cotizaciones nuevas pero no la elimina. Las cotizaciones existentes que la usan no se ven afectadas.
            </p>
            {confirmarArchivar ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-700">¿Confirmar?</span>
                <button
                  type="button"
                  onClick={handleArchivar}
                  disabled={isPending}
                  className="text-sm bg-stone-700 hover:bg-stone-800 text-white px-4 py-1.5 rounded-lg"
                >
                  Sí, archivar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmarArchivar(false)}
                  className="text-sm text-stone-600 hover:text-stone-900 px-3 py-1.5"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmarArchivar(true)}
                className="text-sm border border-stone-300 hover:bg-stone-100 text-stone-700 px-4 py-2 rounded-lg"
              >
                📦 Archivar zona
              </button>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm text-stone-600 mb-3">
              Esta zona está archivada. Restáurala para que vuelva a aparecer en cotizaciones nuevas.
            </p>
            <button
              type="button"
              onClick={handleRestaurar}
              disabled={isPending}
              className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
            >
              ↩ Restaurar zona
            </button>
          </div>
        )}
      </section>

      {/* BOTONES */}
      <div className="flex items-center justify-between sticky bottom-4 bg-white rounded-2xl border border-stone-200 p-4 shadow-lg">
        <Link href="/catalogo/zonas" className="text-sm text-stone-600 hover:text-stone-900">
          Cancelar
        </Link>
        <button
          onClick={() => handleGuardar()}
          disabled={isPending}
          className="bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg transition"
        >
          {isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {mensaje && (
        <div
          className={`fixed top-6 right-6 z-50 p-3 rounded-lg text-sm shadow-lg ${
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
