'use client'

import { useState } from 'react'
import { LayoutGrid, List } from 'lucide-react'
import {
  ESTADO_LABELS,
  ORDEN_KANBAN,
  type EstadoLead,
  type LeadConRelaciones,
} from '@/lib/types/leads'
import LeadCard from './lead-card'
import VistaLista from './vista-lista'

type Props = {
  leads: LeadConRelaciones[]
}

type ModoVista = 'kanban' | 'lista'

export default function VistaLeads({ leads }: Props) {
  const [modo, setModo] = useState<ModoVista>('kanban')

  // Agrupar por estado para el Kanban
  const leadsPorEstado: Record<EstadoLead, LeadConRelaciones[]> = {
    NUEVO: [],
    COTIZADO: [],
    SEGUIMIENTO: [],
    NEGOCIACION: [],
    GANADO: [],
    PERDIDO: [],
  }
  for (const lead of leads) {
    leadsPorEstado[lead.estado].push(lead)
  }

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

  return (
    <div>
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
          {leads.length} lead{leads.length === 1 ? '' : 's'}
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
        <VistaLista leads={leads} />
      )}
    </div>
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
