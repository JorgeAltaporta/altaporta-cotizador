import Link from 'next/link'
import { obtenerLeadsConRelaciones } from '@/lib/leads/queries'
import {
  ESTADO_LABELS,
  ORDEN_KANBAN,
  type EstadoLead,
  type LeadConRelaciones,
} from '@/lib/types/leads'
import LeadCard from './_components/lead-card'
import BotonCapturar from './_components/boton-capturar'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const leads = await obtenerLeadsConRelaciones()

  // Agrupar leads por estado para el Kanban
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

  // Estadísticas rápidas
  const total = leads.length
  const nuevos = leadsPorEstado.NUEVO.length
  const ganados = leadsPorEstado.GANADO.length
  const conversion = total > 0 ? Math.round((ganados / total) * 100) : 0
  const sinContactarUrgentes = leadsPorEstado.NUEVO.filter((l) => {
    const horas =
      (Date.now() - new Date(l.fecha_creacion).getTime()) / (1000 * 60 * 60)
    return horas > 2
  }).length

  return (
    <div className="p-12 max-w-[1600px]">
      {/* Encabezado */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
            Ventas · Leads
          </div>
          <h1 className="font-serif text-4xl text-stone-900">Leads</h1>
          <p className="text-stone-600 mt-2">
            {total === 0
              ? 'Aún no hay leads capturados.'
              : `${total} lead${total === 1 ? '' : 's'} en total · ${conversion}% de conversión`}
          </p>
        </div>
        <BotonCapturar />
      </div>

      {/* Stats rápidas */}
      {total > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 px-6 py-4 mb-6 flex gap-8 flex-wrap">
          <Stat label="Total" valor={total} />
          <Stat label="Nuevos" valor={nuevos} />
          <Stat
            label="Sin contactar +2h"
            valor={sinContactarUrgentes}
            color={sinContactarUrgentes > 0 ? 'text-rose-600' : undefined}
          />
          <Stat label="En cotización" valor={leadsPorEstado.COTIZADO.length} />
          <Stat label="Ganados" valor={ganados} />
          <Stat label="Conversión" valor={`${conversion}%`} />
        </div>
      )}

      {/* Kanban o estado vacío */}
      {total === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <div className="text-4xl mb-3">🎯</div>
          <h2 className="font-serif text-2xl text-stone-900 mb-2">
            Sin leads todavía
          </h2>
          <p className="text-stone-600 mb-6">
            Cuando un cliente potencial te contacte, captúralo aquí.
            Esta es la antesala del flujo de ventas.
          </p>
          <p className="text-xs text-stone-500">
            Usa el botón &ldquo;+ Capturar lead&rdquo; arriba a la derecha.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-4">
          {ORDEN_KANBAN.map((estado) => (
            <ColumnaKanban
              key={estado}
              estado={estado}
              leads={leadsPorEstado[estado]}
            />
          ))}
        </div>
      )}

      {/* Footer informativo */}
      <div className="mt-8 text-xs text-stone-500">
        <Link href="/cotizaciones" className="hover:text-amber-700 hover:underline">
          ← Volver a cotizaciones
        </Link>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────────────────────────────────

function Stat({
  label,
  valor,
  color,
}: {
  label: string
  valor: string | number
  color?: string
}) {
  return (
    <div>
      <div className={`text-2xl font-semibold ${color ?? 'text-stone-900'}`}>
        {valor}
      </div>
      <div className="text-xs text-stone-500 uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  )
}

function ColumnaKanban({
  estado,
  leads,
}: {
  estado: EstadoLead
  leads: LeadConRelaciones[]
}) {
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
          <div className="text-xs text-stone-400 text-center py-6">
            Sin leads
          </div>
        ) : (
          leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
        )}
      </div>
    </div>
  )
}
