'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cambiarEstadoLead } from '../actions'
import { ESTADO_LABELS, RAZON_PERDIDA_LABELS, ORDEN_KANBAN, type EstadoLead, type RazonPerdida } from '@/lib/types/leads'

type Props = {
  leadId: string
  estadoActual: EstadoLead
  nombreLead: string
  tieneWP: boolean
  comisionWP: number | null
}

export default function CambiarEstado({ leadId, estadoActual, nombreLead, tieneWP, comisionWP }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [estadoPendiente, setEstadoPendiente] = useState<EstadoLead | null>(null)
  const [razonPerdida, setRazonPerdida] = useState<RazonPerdida | ''>('')
  const [razonDetalle, setRazonDetalle] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Estados disponibles (excluyendo el actual)
  const estadosDisponibles = ORDEN_KANBAN.filter((e) => e !== estadoActual)

  function handleClickEstado(nuevoEstado: EstadoLead) {
    setErrorMsg(null)
    if (nuevoEstado === 'PERDIDO' || nuevoEstado === 'GANADO') {
      setEstadoPendiente(nuevoEstado)
      setRazonPerdida('')
      setRazonDetalle('')
      return
    }
    aplicarCambio(nuevoEstado)
  }

  function aplicarCambio(nuevoEstado: EstadoLead, opciones?: { razonPerdida?: RazonPerdida; razonPerdidaDetalle?: string }) {
    startTransition(async () => {
      const res = await cambiarEstadoLead(leadId, nuevoEstado, opciones)
      if (res.ok) {
        setEstadoPendiente(null)
        router.refresh()
      } else {
        setErrorMsg(res.error || 'Error al cambiar estado')
      }
    })
  }

  function confirmarPerdido() {
    if (!razonPerdida) {
      setErrorMsg('Selecciona una razón')
      return
    }
    aplicarCambio('PERDIDO', { razonPerdida: razonPerdida as RazonPerdida, razonPerdidaDetalle: razonDetalle.trim() || undefined })
  }

  function confirmarGanado() {
    aplicarCambio('GANADO')
  }

  function cancelarModal() {
    setEstadoPendiente(null)
    setRazonPerdida('')
    setRazonDetalle('')
    setErrorMsg(null)
  }

  return (
    <div>
      <h2 className="text-xs uppercase tracking-wider text-stone-500 mb-3 font-semibold">Cambiar estatus</h2>

      <div className="space-y-2">
        {estadosDisponibles.map((estado) => {
          const esGanado = estado === 'GANADO'
          const esPerdido = estado === 'PERDIDO'
          const cls = esGanado
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
            : esPerdido
            ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
            : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'

          return (
            <button
              key={estado}
              onClick={() => handleClickEstado(estado)}
              disabled={pending}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium border transition disabled:opacity-50 disabled:cursor-not-allowed ${cls}`}
            >
              → {ESTADO_LABELS[estado]}
            </button>
          )
        })}
      </div>

      {errorMsg && !estadoPendiente ? (
        <div className="mt-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded p-2">
          {errorMsg}
        </div>
      ) : null}

      {/* Modal: confirmar PERDIDO */}
      {estadoPendiente === 'PERDIDO' ? (
        <ModalOverlay onClose={cancelarModal}>
          <h3 className="font-serif text-xl text-stone-900 mb-1">Marcar como perdido</h3>
          <p className="text-sm text-stone-600 mb-4">{nombreLead}</p>

          <label className="block text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1">
            Razón principal *
          </label>
          <select
            value={razonPerdida}
            onChange={(e) => setRazonPerdida(e.target.value as RazonPerdida)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm mb-3"
            disabled={pending}
          >
            <option value="">-- Selecciona --</option>
            {(Object.keys(RAZON_PERDIDA_LABELS) as RazonPerdida[]).map((r) => (
              <option key={r} value={r}>{RAZON_PERDIDA_LABELS[r]}</option>
            ))}
          </select>

          <label className="block text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1">
            Detalle (opcional)
          </label>
          <textarea
            value={razonDetalle}
            onChange={(e) => setRazonDetalle(e.target.value)}
            placeholder="Más contexto..."
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm mb-3 resize-none"
            disabled={pending}
          />

          {errorMsg ? (
            <div className="mb-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded p-2">
              {errorMsg}
            </div>
          ) : null}

          <div className="flex gap-2 justify-end">
            <button
              onClick={cancelarModal}
              disabled={pending}
              className="px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 rounded-lg transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarPerdido}
              disabled={pending}
              className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              {pending ? 'Guardando...' : 'Confirmar pérdida'}
            </button>
          </div>
        </ModalOverlay>
      ) : null}

      {/* Modal: confirmar GANADO */}
      {estadoPendiente === 'GANADO' ? (
        <ModalOverlay onClose={cancelarModal}>
          <h3 className="font-serif text-xl text-stone-900 mb-1">Marcar como ganado</h3>
          <p className="text-sm text-stone-600 mb-4">{nombreLead}</p>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-stone-700 mb-2 font-medium">Al confirmar:</p>
            <ul className="text-sm text-stone-700 space-y-1 list-disc list-inside">
              <li>Lead pasa a estado <strong>GANADO</strong></li>
              <li>Se registra fecha de cierre</li>
              {tieneWP && comisionWP !== null ? (
                <li>El WP recibirá comisión del <strong>{comisionWP}%</strong></li>
              ) : null}
              <li>El lead se archiva (queda trazabilidad completa)</li>
            </ul>
            <p className="text-xs text-stone-500 mt-3 italic">
              Nota: la conversión a Cliente se activará en una próxima fase.
            </p>
          </div>

          {errorMsg ? (
            <div className="mb-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded p-2">
              {errorMsg}
            </div>
          ) : null}

          <div className="flex gap-2 justify-end">
            <button
              onClick={cancelarModal}
              disabled={pending}
              className="px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 rounded-lg transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarGanado}
              disabled={pending}
              className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              {pending ? 'Guardando...' : 'Confirmar ganado'}
            </button>
          </div>
        </ModalOverlay>
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal genérico
// ─────────────────────────────────────────────────────────────────────────────

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-start justify-center p-6 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 mt-12" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
