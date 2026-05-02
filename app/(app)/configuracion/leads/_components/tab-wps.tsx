'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Phone, Mail, Calendar } from 'lucide-react'
import {
  verificarWP,
  rechazarWP,
  type WPParaVerificar,
} from '../_actions/configuracion'

type Props = {
  wpsIniciales: WPParaVerificar[]
}

export default function TabWps({ wpsIniciales }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [wps, setWps] = useState<WPParaVerificar[]>(wpsIniciales)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [confirmarRechazo, setConfirmarRechazo] = useState<string | null>(null)

  function handleVerificar(wpId: string, nombre: string) {
    setMensaje(null)
    startTransition(async () => {
      const res = await verificarWP(wpId)
      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: res.error || 'Error al verificar' })
        return
      }
      setWps(wps.filter((w) => w.id !== wpId))
      setMensaje({ tipo: 'ok', texto: `${nombre} verificado correctamente` })
      router.refresh()
      setTimeout(() => setMensaje(null), 3000)
    })
  }

  function handleRechazar(wpId: string, nombre: string) {
    setMensaje(null)
    setConfirmarRechazo(null)
    startTransition(async () => {
      const res = await rechazarWP(wpId)
      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: res.error || 'Error al rechazar' })
        return
      }
      setWps(wps.filter((w) => w.id !== wpId))
      setMensaje({ tipo: 'ok', texto: `${nombre} eliminado` })
      router.refresh()
      setTimeout(() => setMensaje(null), 3000)
    })
  }

  function formatearFecha(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl text-stone-900 mb-1">
          Wedding Planners por verificar
        </h2>
        <p className="text-sm text-stone-600 mb-4">
          Estos WPs fueron creados rápidamente desde la captura de un lead. Revísalos:
          si son legítimos verifica, si fueron creados por error puedes eliminarlos.
        </p>

        {wps.length === 0 ? (
          <div className="bg-stone-50 rounded-lg p-8 text-center">
            <div className="text-2xl mb-2">✓</div>
            <div className="text-sm text-stone-700 font-medium">
              No hay WPs pendientes de verificación
            </div>
            <div className="text-xs text-stone-500 mt-1">
              Todos los wedding planners están verificados.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {wps.map((wp) => (
              <div
                key={wp.id}
                className="bg-amber-50 border border-amber-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <div className="text-xs font-mono text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        {wp.id}
                      </div>
                      <div className="font-medium text-stone-900">{wp.nombre}</div>
                      <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded">
                        sin verificar
                      </span>
                    </div>

                    <div className="text-xs text-stone-700 space-y-1 mt-2">
                      {wp.contacto ? (
                        <div>Contacto: <span className="font-medium">{wp.contacto}</span></div>
                      ) : null}
                      {wp.telefono ? (
                        <div className="flex items-center gap-1.5">
                          <Phone size={11} className="text-stone-400" />
                          {wp.telefono}
                        </div>
                      ) : null}
                      {wp.email ? (
                        <div className="flex items-center gap-1.5">
                          <Mail size={11} className="text-stone-400" />
                          {wp.email}
                        </div>
                      ) : null}
                      <div className="flex items-center gap-1.5 text-stone-500">
                        <Calendar size={11} className="text-stone-400" />
                        Creado el {formatearFecha(wp.fecha_creacion)}
                      </div>
                      {wp.comision_default !== null ? (
                        <div className="text-stone-500">
                          Comisión default: {wp.comision_default}%
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleVerificar(wp.id, wp.nombre)}
                      disabled={pending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                    >
                      <Check size={12} />
                      Verificar
                    </button>
                    <button
                      onClick={() => setConfirmarRechazo(wp.id)}
                      disabled={pending}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-300 hover:bg-rose-50 text-rose-700 text-xs font-medium rounded-lg transition disabled:opacity-50"
                    >
                      <X size={12} />
                      Rechazar
                    </button>
                  </div>
                </div>

                {/* Confirmación de rechazo */}
                {confirmarRechazo === wp.id ? (
                  <div className="mt-3 pt-3 border-t border-amber-200 bg-rose-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
                    <p className="text-sm text-rose-900 font-medium mb-2">
                      ¿Eliminar definitivamente "{wp.nombre}"?
                    </p>
                    <p className="text-xs text-rose-700 mb-3">
                      Solo se puede eliminar si no tiene leads vinculados. Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmarRechazo(null)}
                        disabled={pending}
                        className="px-3 py-1.5 text-xs border border-stone-300 hover:bg-white rounded transition disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleRechazar(wp.id, wp.nombre)}
                        disabled={pending}
                        className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium rounded transition disabled:opacity-50"
                      >
                        {pending ? 'Eliminando...' : 'Sí, eliminar'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

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
