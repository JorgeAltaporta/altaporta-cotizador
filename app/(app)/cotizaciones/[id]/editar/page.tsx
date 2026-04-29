import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EditorCotizacionForm from './form'

export default async function EditarCotizacionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Cargar usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nombre, rol, puede_aprobar')
    .eq('id', user!.id)
    .single()

  // Cargar cotización a editar + catálogos en paralelo
  const [
    cotizacionResp,
    paquetesResp,
    zonasResp,
    rangosResp,
    wpsResp,
    ejecutivosResp,
    adicionalesResp,
    categoriasResp,
    clausulasResp,
  ] = await Promise.all([
    supabase.from('cotizaciones').select('*').eq('id', id).single(),
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

  if (cotizacionResp.error || !cotizacionResp.data) {
    notFound()
  }

  const cotizacion = cotizacionResp.data

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
        <Link href={`/cotizaciones/${id}`} className="text-sm text-amber-700 hover:underline">
          ← Volver a la cotización
        </Link>
      </div>

      <div className="mb-8">
        <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
          Editar cotización
        </div>
        <h1 className="font-serif text-4xl text-stone-900">
          {cotizacion.cliente_nombre}
        </h1>
        {cotizacion.folio && (
          <p className="text-stone-500 text-sm mt-1 font-mono">{cotizacion.folio}</p>
        )}
        <p className="text-stone-600 mt-2">
          Modifica los datos. Solo se guardarán cambios reales.
        </p>
      </div>

      <EditorCotizacionForm
        cotizacion={cotizacion}
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
