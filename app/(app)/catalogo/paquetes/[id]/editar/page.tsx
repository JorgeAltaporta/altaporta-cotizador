import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import EditarPaqueteForm from './form'

export default async function EditarPaquetePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('puede_aprobar')
    .eq('id', user!.id)
    .single()

  if (!profile?.puede_aprobar) {
    redirect('/catalogo/paquetes')
  }

  const [paqueteResp, rangosResp, proteinasResp, nivelesResp, zonasResp, adicionalesResp, categoriasResp] = await Promise.all([
    supabase.from('paquetes').select('*').eq('id', id).single(),
    supabase.from('rangos').select('*').order('orden'),
    supabase.from('proteinas').select('id, nombre, nivel_id').eq('estado', 'ACTIVO').order('nombre'),
    supabase.from('niveles_proteina').select('*').order('orden'),
    supabase.from('zonas').select('id, nombre, color').eq('estado', 'ACTIVO').order('id'),
    supabase.from('adicionales').select('id, nombre, categoria_id').eq('estado', 'ACTIVO').order('nombre'),
    supabase.from('categorias_adicionales').select('*').order('orden'),
  ])

  if (paqueteResp.error || !paqueteResp.data) {
    notFound()
  }

  return (
    <div className="p-12 max-w-4xl">
      <div className="mb-8">
        <Link href="/catalogo/paquetes" className="text-sm text-amber-700 hover:underline">
          ← Volver a paquetes
        </Link>
      </div>

      <div className="mb-8">
        <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
          Editar paquete
        </div>
        <h1 className="font-serif text-4xl text-stone-900">
          {paqueteResp.data.nombre}
        </h1>
      </div>

      <EditarPaqueteForm
        paquete={paqueteResp.data}
        rangos={rangosResp.data || []}
        proteinas={proteinasResp.data || []}
        niveles={nivelesResp.data || []}
        zonas={zonasResp.data || []}
        adicionales={adicionalesResp.data || []}
        categorias={categoriasResp.data || []}
      />
    </div>
  )
}
