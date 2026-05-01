import Link from 'next/link'
import { obtenerLeadsConRelaciones } from '@/lib/leads/queries'
import { createClient } from '@/lib/supabase/server'
import type { EstadoLead, LeadConRelaciones } from '@/lib/types/leads'
import BotonCapturar from './_components/boton-capturar'
import VistaLeads from './_components/vista-leads'

export const dynamic = 'force-dynamic'

export type StatEjecutivo = {
  id: string
  nombre: string
  color: string | null
  carga: number
}

export default async function LeadsPage() {
  const supabase = await createClient()
  const leads = await obtenerLeadsConRelaciones()

  // Stats rápidas (sin importar la vista)
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

  const total = leads.length
  const nuevos = leadsPorEstado.NUEVO.length
  const ganados = leadsPorEstado.GANADO.length
  const conversion = total > 0 ? Math.round((ganados / total) * 100) : 0
  const sinContactarUrgentes = leadsPorEstado.NUEVO.filter((l) => {
    const horas = (Date.now() - new Date(l.fecha_creacion).getTime()) / (1000 * 60 * 60)
    return horas > 2
  }).length

  // Stats por ejecutivo: carga = leads activos
  const ESTADOS_ACTIVOS: EstadoLead[] = ['NUEVO', 'COTIZADO', 'SEGUIMIENTO', 'NEGOCIACION']
  const { data: ejecutivos } = await supabase
    .from('profiles')
    .select('id, nombre, color, rol')
    .eq('rol', 'EJECUTIVO')
    .order('nombre')

  const statsEjecutivos: StatEjecutivo[] = (ejecutivos || []).map((e) => ({
    id: e.id,
    nombre: e.nombre,
    color: e.color ?? null,
    carga: leads.filter(
      (l) => l.ejecutivo_id === e.id && ESTADOS_ACTIVOS.includes(l.estado)
    ).length,
  }))

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

      {/* Vista (Kanban o Lista) con stats por ejecutivo */}
      <VistaLeads leads={leads} statsEjecutivos={statsEjecutivos} />

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
      <div className={`text-2xl font-semibold ${color ?? 'text-stone-900'}`}>{valor}</div>
      <div className="text-xs text-stone-500 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}
