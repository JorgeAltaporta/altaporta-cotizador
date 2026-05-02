'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  construirEntradaHistorial,
  type EntradaHistorial,
} from '@/lib/historial-cotizacion'

// PENDIENTE quitado: ya no es un estado válido en el flujo nuevo.
// El estado de la cotización solo cambia por acciones reales:
// - BORRADOR (al crear)
// - ENVIADA (al confirmar envío por WhatsApp/PDF)
// - APROBADA (al ganar lead vinculado, o manual por aprobador)
// - CANCELADA (al perder lead vinculado, o manual por aprobador)
const ESTADOS_OPCIONES = [
  { value: 'BORRADOR', label: 'Borrador' },
  { value: 'ENVIADA', label: 'Enviada' },
  { value: 'APROBADA', label: 'Aprobada' },
  { value: 'CANCELADA', label: 'Cancelada' },
]

const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE: 'Pendiente',
  ENVIADA: 'Enviada',
  APROBADA: 'Aprobada',
  CANCELADA: 'Cancelada',
}

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
  puede_aprobar?: boolean
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

  const puedeAprobar = !!usuario.puede_aprobar

  function handleCambio(nuevoEstado: string) {
    if (nuevoEstado === estado) return
    if (!puedeAprobar) return // doble protección

    const estadoAnterior = estado
    setEstado(nuevoEstado) // optimista
    setError(null)

    startTransition(async () => {
      const supabase = createClient()

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
        setEstado(estadoAnterior)
        setError(`Error: ${errSupabase.message}`)
        return
      }

      router.refresh()
    })
  }

  const colorClase = COLORES_ESTADO[estado] || COLORES_ESTADO.BORRADOR
  const sizeClase =
    size === 'small' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5'

  // ─── Si el usuario NO puede aprobar: badge de solo lectura ───
  if (!puedeAprobar) {
    return (
      <div className="inline-block">
        <span
          className={`${sizeClase} ${colorClase} rounded font-medium border inline-block`}
          title="Solo Jorge o Danna pueden cambiar el estado de una cotización manualmente."
        >
          {ESTADO_LABELS[estado] ?? estado}
        </span>
      </div>
    )
  }

  // ─── Si SÍ puede aprobar: dropdown editable ───
  return (
    <div className="inline-block">
      <select
        value={estado}
        disabled={isPending}
        onChange={(e) => handleCambio(e.target.value)}
        className={`${sizeClase} ${colorClase} rounded font-medium border cursor-pointer disabled:opacity-50 disabled:cursor-wait focus:outline-none focus:ring-2 focus:ring-amber-500`}
      >
        {/* Si el estado actual es PENDIENTE (legacy), lo mostramos para que se vea */}
        {estado === 'PENDIENTE' && (
          <option value="PENDIENTE" className="bg-white text-stone-900">
            Pendiente (legacy)
          </option>
        )}
        {ESTADOS_OPCIONES.map((op) => (
          <option key={op.value} value={op.value} className="bg-white text-stone-900">
            {op.label}
          </option>
        ))}
      </select>
      {error && <div className="text-xs text-rose-600 mt-1">{error}</div>}
    </div>
  )
}
