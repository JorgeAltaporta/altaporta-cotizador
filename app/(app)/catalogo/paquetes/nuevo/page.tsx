import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NuevoPaqueteForm from './form'

export default async function NuevoPaquetePage() {
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

  return (
    <div className="p-12 max-w-2xl">
      <div className="mb-8">
        <Link href="/catalogo/paquetes" className="text-sm text-amber-700 hover:underline">
          ← Volver a paquetes
        </Link>
      </div>

      <div className="mb-8">
        <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
          Crear paquete
        </div>
        <h1 className="font-serif text-4xl text-stone-900">Nuevo paquete</h1>
        <p className="text-stone-600 mt-2">
          Llena los datos básicos. Después podrás editar precios, categorías y todo lo demás.
        </p>
      </div>

      <NuevoPaqueteForm />
    </div>
  )
}
