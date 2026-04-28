import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import WizardCotizacionForm from './form'

export default async function NuevaCotizacionPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nombre, rol, puede_aprobar')
    .eq('id', user!.id)
    .single()

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

  // Cláusulas globales con defaults por si fallan
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
      />
    </div>
  )
}
