'use client'

import { useState, useMemo } from 'react'
import { LayoutGrid, List, X } from 'lucide-react'
import {
  ESTADO_LABELS,
  ORDEN_KANBAN,
  type EstadoLead,
  type LeadConRelaciones,
} from '@/lib/types/leads'
import LeadCard from './lead-card'
import VistaLista from './vista-lista'
import type { StatEjecutivo } from '../page'

type Props = {
  leads: LeadConRelaciones[]
  statsEjecutivos: StatEjecutivo[]
}

type ModoVista = 'kanban' | 'lista'

const UMBRAL_CARGA_BAJA = 10
const UMBRAL_CARGA_ALTA = 20

export default function VistaLeads({ leads, statsEjecutivos }: Props) {
  const [modo, setModo] = useState<ModoVista>('kanban')
  const [ejecutivoFiltrado, setEjecutivoFiltrado] = useState<string | null>(null)

  // Aplicar filtro de ejecutivo si está activo
  const leadsFiltrados = useMemo(() => {
    if (!ejecutivoFiltrado) return leads
    if (ejecutivoFiltrado === 'SIN_ASIGNAR') {
      return leads.filter((l) => !l.ejecutivo_id)
    }
    return leads.filter((l) => l.ejecutivo_id === ejecutivoFiltrado)
  }, [leads, ejecutivoFiltrado])

  // Agrupar por estado para el Kanban (sobre los filtrados)
  const leadsPorEstado: Record<EstadoLead, LeadConRelaciones[]> = {
    NUEVO: [],
    COTIZADO: [],
    SEGUIMIENTO: [],
    NEGOCIACION: [],
    GANADO: [],
    PERDIDO: [],
  }
  for (const lead of leadsFiltrados) {
    leadsPorEstado[lead.estado].push(lead)
  }

  // Nombre del ejecutivo seleccionado para el banner
  const ejecutivoSeleccionadoNombre =
    ejecutivoFiltrado === 'SIN_ASIGNAR'
      ? 'Sin asignar'
      : statsEjecutivos.find((e) => e.id === ejecutivoFiltrado)?.nombre

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
        <div className="text-4xl mb-3">🎯</div>
        <h2 className="font-serif text-2xl text-stone-900 mb-2">Sin leads todavía</h2>
        <p className="text-stone-600 mb-6">
          Cuando un cliente potencial te contacte, captúralo aquí. Esta es la antesala del flujo de ventas.
        </p>
        <p className="text-xs text-stone-500">Usa el botón &ldquo;+ Capturar lead&rdquo; arriba a la derecha.</p>
      </div>
    )
  }

  const sinAsignarCount = leads.filter((l) => !l.ejecutivo_id && (
    l.estado === 'NUEVO' || l.estado === 'COTIZADO' || l.estado === 'SEGUIMIENTO' || l.estado === 'NEGOCIACION'
  )).length

  return (
    <div>
      {/* Stats por ejecutivo */}
      {statsEjecutivos.length > 0 ? (
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-2 px-1">
            Carga por ejecutivo
          </div>
          <div className="flex flex-wrap gap-2">
            {statsEjecutivos.map((e) => (
              <TarjetaEjecutivo
                key={e.id}
                ejecutivo={e}
                seleccionado={ejecutivoFiltrado === e.id}
                onClick={() =>
                  setEjecutivoFiltrado(ejecutivoFiltrado === e.id ? null : e.id)
                }
              />
            ))}
            {sinAsignarCount > 0 ? (
              <TarjetaSinAsignar
                count={sinAsignarCount}
                seleccionado={ejecutivoFiltrado === 'SIN_ASIGNAR'}
                onClick={() =>
                  setEjecutivoFiltrado(ejecutivoFiltrado === 'SIN_ASIGNAR' ? null : 'SIN_ASIGNAR')
                }
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Banner de filtro activo */}
      {ejecutivoFiltrado ? (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between">
          <div className="text-sm text-amber-900">
            Mostrando solo leads de <strong>{ejecutivoSeleccionadoNombre}</strong> ·{' '}
            {leadsFiltrados.length} lead{leadsFiltrados.length === 1 ? '' : 's'}
          </div>
          <button
            onClick={() => setEjecutivoFiltrado(null)}
            className="text-xs text-amber-700 hover:text-amber-900 flex items-center gap-1 transition"
          >
            <X size={12} />
            Quitar filtro
          </button>
        </div>
      ) : null}

      {/* Toggle de vista */}
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex bg-stone-100 rounded-lg p-1">
          <button
            onClick={() => setModo('kanban')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2 ${
              modo === 'kanban' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <LayoutGrid size={14} />
            Kanban
          </button>
          <button
            onClick={() => setModo('lista')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2 ${
              modo === 'lista' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <List size={14} />
            Lista
          </button>
        </div>
        <div className="text-xs text-stone-500">
          {leadsFiltrados.length} lead{leadsFiltrados.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Vista activa */}
      {modo === 'kanban' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-4">
          {ORDEN_KANBAN.map((estado) => (
            <ColumnaKanban key={estado} estado={estado} leads={leadsPorEstado[estado]} />
          ))}
        </div>
      ) : (
        <VistaLista
          leads={leadsFiltrados}
          ejecutivoNombrePreseleccionado={ejecutivoSeleccionadoNombre ?? null}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tarjeta de ejecutivo
// ─────────────────────────────────────────────────────────────────────────────

function TarjetaEjecutivo({
  ejecutivo,
  seleccionado,
  onClick,
}: {
  ejecutivo: StatEjecutivo
  seleccionado: boolean
  onClick: () => void
}) {
  const colorCarga =
    ejecutivo.carga >= UMBRAL_CARGA_ALTA
      ? 'bg-rose-100 text-rose-800 border-rose-300'
      : ejecutivo.carga >= UMBRAL_CARGA_BAJA
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : 'bg-emerald-100 text-emerald-800 border-emerald-300'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition ${
        seleccionado
          ? 'border-amber-700 bg-amber-50 shadow-sm'
          : 'border-stone-200 bg-white hover:border-stone-300'
      }`}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
        style={{ backgroundColor: ejecutivo.color ?? '#78716c' }}
      >
        {ejecutivo.nombre.charAt(0)}
      </div>
      <div className="text-left">
        <div className="text-sm font-medium text-stone-900 leading-tight">{ejecutivo.nombre}</div>
        <div className={`text-[11px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded border mt-0.5 ${colorCarga}`}>
          {ejecutivo.carga} activo{ejecutivo.carga === 1 ? '' : 's'}
        </div>
      </div>
    </button>
  )
}

function TarjetaSinAsignar({
  count,
  seleccionado,
  onClick,
}: {
  count: number
  seleccionado: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed transition ${
        seleccionado
          ? 'border-amber-700 bg-amber-50'
          : 'border-stone-300 bg-white hover:border-stone-400'
      }`}
    >
      <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0">
        <span className="text-stone-500 text-xs">?</span>
      </div>
      <div className="text-left">
        <div className="text-sm font-medium text-stone-700 leading-tight">Sin asignar</div>
        <div className="text-[11px] inline-flex items-center px-1.5 py-0.5 rounded border bg-stone-100 text-stone-700 border-stone-300 mt-0.5">
          {count} activo{count === 1 ? '' : 's'}
        </div>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: columna del Kanban
// ─────────────────────────────────────────────────────────────────────────────

function ColumnaKanban({ estado, leads }: { estado: EstadoLead; leads: LeadConRelaciones[] }) {
  return (
    <div className="bg-stone-100 rounded-xl p-3 min-w-[240px]">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
          {ESTADO_LABELS[estado]}
        </h3>
        <span className="text-xs font-semibold bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full">
          {leads.length}
        </span>
      </div>

      <div className="space-y-2">
        {leads.length === 0 ? (
          <div className="text-xs text-stone-400 text-center py-6">Sin leads</div>
        ) : (
          leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
        )}
      </div>
    </div>
  )
}
