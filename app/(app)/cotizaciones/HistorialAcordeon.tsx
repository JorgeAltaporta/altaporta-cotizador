'use client'

import { useState } from 'react'
import {
  type EntradaHistorial,
  formatearCambio,
} from '@/lib/historial-cotizacion'

// ── Helpers de formato ──────────────────────────────────────────────────────

const ETIQUETAS_ACCION: Record<EntradaHistorial['accion'], string> = {
  CREADA: 'Creó la cotización',
  EDITADA: 'Editó la cotización',
  ESTADO_CAMBIADO: 'Cambió el estado',
  ENVIADA: 'Marcó como enviada',
  DESCARGADA: 'Descargó el PDF',
}

const ICONOS_ACCION: Record<EntradaHistorial['accion'], string> = {
  CREADA: '✨',
  EDITADA: '✏️',
  ESTADO_CAMBIADO: '🔄',
  ENVIADA: '📤',
  DESCARGADA: '📥',
}

const COLORES_ACCION: Record<EntradaHistorial['accion'], string> = {
  CREADA: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  EDITADA: 'bg-amber-100 text-amber-700 border-amber-200',
  ESTADO_CAMBIADO: 'bg-blue-100 text-blue-700 border-blue-200',
  ENVIADA: 'bg-blue-100 text-blue-700 border-blue-200',
  DESCARGADA: 'bg-stone-100 text-stone-700 border-stone-200',
}

function formatearFecha(iso: string): string {
  const d = new Date(iso)
  const fecha = d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const hora = d.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
  return `${fecha} · ${hora}`
}

// ── Componente principal ────────────────────────────────────────────────────

export default function HistorialAcordeon({
  historial,
}: {
  historial: EntradaHistorial[] | null
}) {
  const [abierto, setAbierto] = useState(false)

  // Ordenar de más reciente a más antiguo
  const entradas = (historial || []).slice().reverse()

  if (entradas.length === 0) {
    return null
  }

  return (
    <section className="bg-white rounded-2xl border border-stone-200 overflow-hidden mb-6">
      <button
        onClick={() => setAbierto(!abierto)}
        className="w-full p-5 flex items-center justify-between hover:bg-stone-50 transition text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📋</span>
          <div>
            <h2 className="font-serif text-xl text-stone-900">Historial de cambios</h2>
            <p className="text-sm text-stone-500">
              {entradas.length} {entradas.length === 1 ? 'entrada' : 'entradas'}
            </p>
          </div>
        </div>
        <span className="text-stone-400 text-2xl leading-none">
          {abierto ? '−' : '+'}
        </span>
      </button>

      {abierto && (
        <div className="border-t border-stone-100 divide-y divide-stone-100">
          {entradas.map((entrada, idx) => (
            <div key={idx} className="p-5">
              <div className="flex items-start gap-3">
                <div
                  className={`flex-shrink-0 w-9 h-9 rounded-full border flex items-center justify-center text-base ${
                    COLORES_ACCION[entrada.accion] || COLORES_ACCION.EDITADA
                  }`}
                >
                  {ICONOS_ACCION[entrada.accion] || '•'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="text-sm">
                      <strong className="text-stone-900">{entrada.usuario_nombre}</strong>
                      <span className="text-stone-600">
                        {' '}
                        {ETIQUETAS_ACCION[entrada.accion] || entrada.accion.toLowerCase()}
                      </span>
                    </div>
                    <span className="text-xs text-stone-500 font-mono whitespace-nowrap">
                      {formatearFecha(entrada.fecha)}
                    </span>
                  </div>

                  {entrada.detalle && (
                    <p className="text-sm text-stone-600 mt-1">{entrada.detalle}</p>
                  )}

                  {entrada.cambios && entrada.cambios.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {entrada.cambios.map((cambio, i) => (
                        <li
                          key={i}
                          className="text-xs text-stone-700 bg-stone-50 px-3 py-1.5 rounded font-mono"
                        >
                          {formatearCambio(cambio)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
