'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  construirEntradaHistorial,
  type EntradaHistorial,
} from '@/lib/historial-cotizacion'

const ESTADOS_OPCIONES = [
  { value: 'BORRADOR', label: 'Borrador' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'ENVIADA', label: 'Enviada' },
  { value: 'APROBADA', label: 'Aprobada' },
  { value: 'CANCELADA', label: 'Cancelada' },
]

const COLORES_ESTADO: Record<string, string> = {
  BORRADOR: 'bg-stone-100 text-stone-700 border-stone-300',
  PENDIENTE: 'bg-amber-100 text-amber-700 border-amber-300',
  ENVIADA: 'bg-blue-100 text-blue-700 border-blue-300',
  APROBADA: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  CANCELADA: 'bg-rose-100 text-rose-700 border-rose-300',
}

type Usuario = {
  id: string
  nombre: string
}

export default function EstadoSelector({
  cotizacionId,
  estadoActual,
  historialActual,
  usuario,
  size = 'normal',
}: {
  cotizacionId: string
  estadoActual: string
  historialActual: EntradaHistorial[] | null
  usuario: Usuario
  size?: 'normal' | 'small'
}) {
  const router = useRouter()
  const [estado, setEstado] = useState(estadoActual)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleCambio(nuevoEstado: string) {
    if (nuevoEstado === estado) return

    const estadoAnterior = estado
    setEstado(nuevoEstado) // optimista
    setError(null)

    startTransition(async () => {
      const supabase = createClient()

      // Construir entrada de historial para el cambio de estado
      const entrada = construirEntradaHistorial({
        accion: 'ESTADO_CAMBIADO',
        usuario_id: usuario.id,
        usuario_nombre: usuario.nombre,
        cambios: [
          {
            campo: 'estado',
            etiqueta: 'Estado',
            antes: estadoAnterior,
            despues: nuevoEstado,
          },
        ],
      })

      const historialActualizado = [
        ...(historialActual || []),
        ...(entrada ? [entrada] : []),
      ]

      const { error: errSupabase } = await supabase
        .from('cotizaciones')
        .update({
          estado: nuevoEstado,
          historial: historialActualizado,
        })
        .eq('id', cotizacionId)

      if (errSupabase) {
        // Revertir UI si falla
        setEstado(estadoAnterior)
        setError(`Error: ${errSupabase.message}`)
        return
      }

      router.refresh()
    })
  }

  const colorClase = COLORES_ESTADO[estado] || COLORES_ESTADO.BORRADOR
  const sizeClase =
    size === 'small'
      ? 'text-xs px-2 py-1'
      : 'text-sm px-3 py-1.5'

  return (
    <div className="inline-block">
      <select
        value={estado}
        disabled={isPending}
        onChange={(e) => handleCambio(e.target.value)}
        className={`${sizeClase} ${colorClase} rounded font-medium border cursor-pointer disabled:opacity-50 disabled:cursor-wait focus:outline-none focus:ring-2 focus:ring-amber-500`}
      >
        {ESTADOS_OPCIONES.map((op) => (
          <option key={op.value} value={op.value} className="bg-white text-stone-900">
            {op.label}
          </option>
        ))}
      </select>
      {error && (
        <div className="text-xs text-rose-600 mt-1">{error}</div>
      )}
    </div>
  )
}
