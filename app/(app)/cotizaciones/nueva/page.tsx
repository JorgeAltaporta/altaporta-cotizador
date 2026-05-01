import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Target, AlertTriangle } from 'lucide-react'
import WizardCotizacionForm, { type LeadOrigen } from './form'

type SearchParams = {
  lead_id?: string
}

type Props = {
  searchParams: Promise<SearchParams>
}

export default async function NuevaCotizacionPage({ searchParams }: Props) {
  const supabase = await createClient()
  const params = await searchParams
  const leadIdSolicitado = params.lead_id?.trim() || null

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nombre, rol, puede_aprobar')
    .eq('id', user!.id)
    .single()

  // ─── REGLA: ejecutivos requieren lead_id; aprobadores pueden cotizar libre ───
  const esAprobador = !!profile?.puede_aprobar
  if (!leadIdSolicitado && !esAprobador) {
    redirect('/leads?aviso=requiere-lead')
  }

  // ─── Si hay lead_id, traer datos del lead para banner Y para pre-llenar ───
  let leadOrigen: LeadOrigen | null = null
  let leadInvalido = false

  if (leadIdSolicitado) {
    const { data: leadData } = await supabase
      .from('leads')
      .select('id, nombre, estado, telefono, email, pax, fecha_evento, locacion, wp_id')
      .eq('id', leadIdSolicitado)
      .maybeSingle()

    if (!leadData) {
      leadInvalido = true
    } else {
      leadOrigen = {
        id: leadData.id,
        nombre: leadData.nombre,
        telefono: leadData.telefono,
        email: leadData.email,
        pax: leadData.pax,
        fecha_evento: leadData.fecha_evento,
        locacion: leadData.locacion,
        wp_id: leadData.wp_id,
      }
    }
  }

  const [
    paquetesResp,
    zonasResp,
    rangosResp,
    wpsResp,
    ejecutivosResp,
    adicionalesResp,
    categoriasResp,
    clausulasResp,
  ] = await Promise.all([
    supabase.from('paquetes').select('*').eq('estado', 'ACTIVO').order('nombre'),
    supabase.from('zonas').select('*').eq('estado', 'ACTIVO').order('id'),
    supabase.from('rangos').select('*').order('orden'),
    supabase
      .from('wedding_planners')
      .select('id, nombre, contacto, comision_default')
      .order('nombre'),
    supabase
      .from('profiles')
      .select('id, nombre, rol, puede_aprobar')
      .eq('rol', 'EJECUTIVO')
      .order('nombre'),
    supabase.from('adicionales').select('*').eq('estado', 'ACTIVO').order('nombre'),
    supabase.from('categorias_adicionales').select('*').order('orden'),
    supabase.from('clausulas_globales').select('contenido').eq('id', 'global').single(),
  ])

  const clausulasGlobales = (clausulasResp.data?.contenido as {
    anticipoPct: number
    vigenciaDiasDefault: number
    cambioFecha: string
    instalaciones: string
  }) || {
    anticipoPct: 30,
    vigenciaDiasDefault: 15,
    cambioFecha: 'Se actualiza costo por persona',
    instalaciones: 'Las proporciona el cliente',
  }

  return (
    <div className="p-12 max-w-6xl">
      <div className="mb-8">
        <Link href="/cotizaciones" className="text-sm text-amber-700 hover:underline">
          ← Volver a cotizaciones
        </Link>
      </div>

      <div className="mb-8">
        <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
          Nueva cotización
        </div>
        <h1 className="font-serif text-4xl text-stone-900">Crear cotización</h1>
        <p className="text-stone-600 mt-2">
          Llena los datos generales, eventos, adicionales y ajustes.
        </p>
      </div>

      {/* Banner contextual */}
      {leadOrigen ? (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <Target size={20} className="text-emerald-700 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-emerald-800 font-semibold mb-1">
              Cotizando para Lead {leadOrigen.id}
            </div>
            <div className="font-medium text-stone-900">{leadOrigen.nombre}</div>
            <div className="text-xs text-stone-600 mt-1">
              {leadOrigen.pax ? `${leadOrigen.pax} pax · ` : ''}
              {leadOrigen.fecha_evento ? `${leadOrigen.fecha_evento} · ` : ''}
              {leadOrigen.locacion || 'Sin locación definida'}
            </div>
            <p className="text-[11px] text-emerald-700 italic mt-2">
              Datos pre-llenados desde el lead. Puedes editarlos si necesitas ajustar algo.
            </p>
            <Link
              href={`/leads/${leadOrigen.id}`}
              className="text-xs text-emerald-700 hover:underline mt-2 inline-block"
            >
              ← Volver al lead
            </Link>
          </div>
        </div>
      ) : leadInvalido ? (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-rose-700 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-rose-800 font-semibold mb-1">
              Lead no encontrado
            </div>
            <p className="text-sm text-stone-700">
              El lead <span className="font-mono">{leadIdSolicitado}</span> no existe.
              Esta cotización se creará sin vincular a un lead.
            </p>
            <Link href="/leads" className="text-xs text-rose-700 hover:underline mt-2 inline-block">
              ← Ir a leads
            </Link>
          </div>
        </div>
      ) : esAprobador ? (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-700 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-amber-800 font-semibold mb-1">
              Cotización sin lead vinculado
            </div>
            <p className="text-sm text-stone-700">
              Esta cotización no proviene de un lead. Considera capturar primero el lead
              para mantener el flujo de ventas ordenado.
            </p>
            <Link href="/leads" className="text-xs text-amber-700 hover:underline mt-2 inline-block">
              Ir a leads →
            </Link>
          </div>
        </div>
      ) : null}

      <WizardCotizacionForm
        usuario={profile!}
        paquetes={paquetesResp.data || []}
        zonas={zonasResp.data || []}
        rangos={rangosResp.data || []}
        weddingPlanners={wpsResp.data || []}
        ejecutivos={ejecutivosResp.data || []}
        adicionales={adicionalesResp.data || []}
        categorias={categoriasResp.data || []}
        clausulasGlobales={clausulasGlobales}
        leadOrigen={leadOrigen}
      />
    </div>
  )
}
