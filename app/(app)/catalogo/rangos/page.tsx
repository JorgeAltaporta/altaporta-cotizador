import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import RangosManager from './manager'

export default async function RangosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('puede_aprobar')
    .eq('id', user!.id)
    .single()
  const puedeEditar = profile?.puede_aprobar || false

  const { data: rangos, error } = await supabase
    .from('rangos')
    .select('*')
    .order('orden')

  if (error) {
    return <div className="p-12 text-rose-700">Error: {error.message}</div>
  }

  return (
    <div className="p-12 max-w-4xl">
      <div className="mb-8">
        <Link href="/catalogo" className="text-sm text-amber-700 hover:underline">
          ← Volver al catálogo
        </Link>
      </div>

      <div className="mb-10">
        <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
          Catálogo · Configuración
        </div>
        <h1 className="font-serif text-4xl text-stone-900">Rangos de pax</h1>
        <p className="text-stone-600 mt-2">
          Los rangos definen los escalones de precio en paquetes, fletes y hora extra.
          Hay 7 rangos fijos. Puedes editar los nombres y límites pero no agregar ni eliminar.
        </p>
      </div>

      <RangosManager
        rangosIniciales={rangos || []}
        puedeEditar={puedeEditar}
      />
    </div>
  )
}
