import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import EditarZonaForm from './form'

export default async function EditarZonaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Verificar permiso
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('puede_aprobar')
    .eq('id', user!.id)
    .single()

  if (!profile?.puede_aprobar) {
    redirect('/catalogo/zonas')
  }

  const { data: zona, error } = await supabase
    .from('zonas')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !zona) {
    notFound()
  }

  const { data: rangos } = await supabase
    .from('rangos')
    .select('*')
    .order('orden')

  return (
    <div className="p-12 max-w-4xl">
      <div className="mb-8">
        <Link href="/catalogo/zonas" className="text-sm text-amber-700 hover:underline">
          ← Volver a zonas
        </Link>
      </div>

      <div className="mb-8">
        <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
          Editar zona
        </div>
        <h1 className="font-serif text-4xl text-stone-900">
          Zona {zona.id} · {zona.nombre}
        </h1>
      </div>

      <EditarZonaForm zona={zona} rangos={rangos || []} />
    </div>
  )
}
