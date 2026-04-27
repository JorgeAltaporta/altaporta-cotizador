import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import NuevaCotizacionForm from './form'

export default async function NuevaCotizacionPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nombre, rol, puede_aprobar')
    .eq('id', user!.id)
    .single()

  // Cargar todo el catálogo necesario en paralelo
  const [paquetesResp, zonasResp, rangosResp, wpsResp, ejecutivosResp] = await Promise.all([
    supabase
      .from('paquetes')
      .select('*')
      .eq('estado', 'ACTIVO')
      .order('nombre'),
    supabase
      .from('zonas')
      .select('*')
      .eq('estado', 'ACTIVO')
      .order('id'),
    supabase
      .from('rangos')
      .select('*')
      .order('orden'),
    supabase
      .from('wedding_planners')
      .select('id, nombre, contacto, comision_default')
      .order('nombre'),
    supabase
      .from('profiles')
      .select('id, nombre, rol, puede_aprobar')
      .eq('rol', 'EJECUTIVO')
      .order('nombre'),
  ])

  return (
    <div className="p-12 max-w-4xl">
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
          Llena los datos generales y del primer evento.
        </p>
      </div>

      <NuevaCotizacionForm
        usuario={profile!}
        paquetes={paquetesResp.data || []}
        zonas={zonasResp.data || []}
        rangos={rangosResp.data || []}
        weddingPlanners={wpsResp.data || []}
        ejecutivos={ejecutivosResp.data || []}
      />
    </div>
  )
}
