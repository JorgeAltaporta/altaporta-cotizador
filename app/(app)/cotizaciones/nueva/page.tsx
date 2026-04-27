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

  // Cargar datos del catálogo necesarios
  const [paquetesResp, zonasResp, rangosResp] = await Promise.all([
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
          Llena los datos del cliente y del evento.
        </p>
      </div>

      <NuevaCotizacionForm
        usuario={profile!}
        paquetes={paquetesResp.data || []}
        zonas={zonasResp.data || []}
        rangos={rangosResp.data || []}
      />
    </div>
  )
}
