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

  // Verificar permiso para editar
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('puede_aprobar')
    .eq('id', user!.id)
    .single()

  if (!profile?.puede_aprobar) {
    redirect('/catalogo/paquetes')
  }

  // Cargar el paquete
  const { data: paquete, error } = await supabase
    .from('paquetes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !paquete) {
    notFound()
  }

  // Cargar rangos para mostrar precios
  const { data: rangos } = await supabase
    .from('rangos')
    .select('*')
    .order('orden')

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
          {paquete.nombre}
        </h1>
      </div>

      <EditarPaqueteForm paquete={paquete} rangos={rangos || []} />
    </div>
  )
}
