import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NuevaZonaForm from './form'

export default async function NuevaZonaPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('puede_aprobar')
    .eq('id', user!.id)
    .single()

  if (!profile?.puede_aprobar) {
    redirect('/catalogo/zonas')
  }

  // Cargar IDs existentes para sugerir la siguiente letra libre
  const { data: zonasExistentes } = await supabase
    .from('zonas')
    .select('id')

  const idsTomados = (zonasExistentes || []).map((z) => z.id)

  return (
    <div className="p-12 max-w-2xl">
      <div className="mb-8">
        <Link href="/catalogo/zonas" className="text-sm text-amber-700 hover:underline">
          ← Volver a zonas
        </Link>
      </div>

      <div className="mb-8">
        <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
          Crear zona
        </div>
        <h1 className="font-serif text-4xl text-stone-900">Nueva zona</h1>
        <p className="text-stone-600 mt-2">
          Llena los datos básicos. Después podrás agregar locaciones, fletes y hora extra.
        </p>
      </div>

      <NuevaZonaForm idsTomados={idsTomados} />
    </div>
  )
}
