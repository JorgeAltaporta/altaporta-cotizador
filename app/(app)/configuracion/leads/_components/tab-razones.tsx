'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, RotateCcw, Plus, Trash2, GripVertical } from 'lucide-react'
import {
  guardarRazonesPerdida,
  type RazonPerdidaConfig,
} from '../_actions/configuracion'

type Props = {
  razonesIniciales: RazonPerdidaConfig[]
}

export default function TabRazones({ razonesIniciales }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [razones, setRazones] = useState<RazonPerdidaConfig[]>(razonesIniciales)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const hayCambios = JSON.stringify(razones) !== JSON.stringify(razonesIniciales)

  function actualizarRazon(idx: number, cambios: Partial<RazonPerdidaConfig>) {
    setRazones(razones.map((r, i) => (i === idx ? { ...r, ...cambios } : r)))
  }

  function agregarRazon() {
    setRazones([
      ...razones,
      { id: `RAZON_${Date.now()}`, label: '', activo: true },
    ])
  }

  function eliminarRazon(idx: number) {
    setRazones(razones.filter((_, i) => i !== idx))
  }

  function moverArriba(idx: number) {
    if (idx === 0) return
    const nueva = [...razones]
    ;[nueva[idx - 1], nueva[idx]] = [nueva[idx], nueva[idx - 1]]
    setRazones(nueva)
  }

  function moverAbajo(idx: number) {
    if (idx === razones.length - 1) return
    const nueva = [...razones]
    ;[nueva[idx], nueva[idx + 1]] = [nueva[idx + 1], nueva[idx]]
    setRazones(nueva)
  }

  function descartar() {
    setRazones(razonesIniciales)
    setMensaje(null)
  }

  function guardar() {
    setMensaje(null)

    // Normalizar IDs (uppercase, sin espacios)
    const razonesNorm = razones.map((r) => ({
      ...r,
      id: r.id.trim().toUpperCase().replace(/\s+/g, '_'),
      label: r.label.trim(),
    }))

    startTransition(async () => {
      const res = await guardarRazonesPerdida(razonesNorm)
      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: res.error || 'Error al guardar' })
        return
      }
      setMensaje({ tipo: 'ok', texto: 'Razones guardadas correctamente' })
      setRazones(razonesNorm)
      router.refresh()
      setTimeout(() => setMensaje(null), 3000)
    })
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl text-stone-900 mb-1">
          Razones de pérdida
        </h2>
        <p className="text-sm text-stone-600 mb-4">
          Lista de motivos que se muestran al ejecutivo cuando marca un lead como PERDIDO.
          Puedes activar, desactivar, renombrar, reordenar o agregar nuevas razones.
        </p>

        <div className="space-y-2">
          {razones.map((razon, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                razon.activo ? 'bg-white border-stone-200' : 'bg-stone-50 border-stone-200 opacity-60'
              }`}
            >
              {/* Reordenar */}
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                  onClick={() => moverArriba(idx)}
                  disabled={idx === 0 || pending}
                  className="text-stone-400 hover:text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Mover arriba"
                >
                  ▲
                </button>
                <button
                  onClick={() => moverAbajo(idx)}
                  disabled={idx === razones.length - 1 || pending}
                  className="text-stone-400 hover:text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Mover abajo"
                >
                  ▼
                </button>
              </div>

              {/* ID */}
              <input
                type="text"
                value={razon.id}
                onChange={(e) => actualizarRazon(idx, { id: e.target.value })}
                disabled={pending}
                placeholder="ID"
                className="w-40 px-3 py-1.5 border border-stone-300 rounded text-xs font-mono uppercase"
              />

              {/* Label */}
              <input
                type="text"
                value={razon.label}
                onChange={(e) => actualizarRazon(idx, { label: e.target.value })}
                disabled={pending}
                placeholder="Texto que verá el usuario"
                className="flex-1 px-3 py-1.5 border border-stone-300 rounded text-sm"
              />

              {/* Activo toggle */}
              <label className="flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={razon.activo}
                  onChange={(e) => actualizarRazon(idx, { activo: e.target.checked })}
                  disabled={pending}
                  className="w-4 h-4"
                />
                Activo
              </label>

              {/* Eliminar */}
              <button
                onClick={() => eliminarRazon(idx)}
                disabled={pending || razones.length === 1}
                className="text-stone-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                title="Eliminar razón"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={agregarRazon}
          disabled={pending}
          className="mt-4 flex items-center gap-1.5 px-3 py-1.5 text-sm border border-stone-300 hover:border-amber-700 hover:bg-amber-50 hover:text-amber-800 rounded-lg transition disabled:opacity-50"
        >
          <Plus size={14} />
          Agregar razón
        </button>

        <p className="text-[11px] text-stone-500 mt-4 italic">
          Las razones desactivadas no aparecen al perder un lead. Los IDs se convierten a MAYÚSCULAS automáticamente al guardar.
        </p>
      </section>

      {/* Acciones */}
      {hayCambios ? (
        <div className="sticky bottom-6 bg-white border border-stone-200 rounded-2xl p-4 shadow-lg flex items-center justify-between gap-3">
          <div className="text-sm text-stone-700">
            Tienes cambios sin guardar
          </div>
          <div className="flex gap-2">
            <button
              onClick={descartar}
              disabled={pending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm border border-stone-300 hover:bg-stone-50 rounded-lg transition disabled:opacity-50"
            >
              <RotateCcw size={14} />
              Descartar
            </button>
            <button
              onClick={guardar}
              disabled={pending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              <Save size={14} />
              {pending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      ) : null}

      {mensaje ? (
        <div
          className={`text-sm rounded-lg p-3 ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-700'
          }`}
        >
          {mensaje.tipo === 'ok' ? '✓' : '✕'} {mensaje.texto}
        </div>
      ) : null}
    </div>
  )
}
