import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ClausulasForm from './form'

const DEFAULT_CLAUSULAS = {
  anticipoPct: 30,
  vigenciaDiasDefault: 15,
  cambioFecha: 'Se actualiza costo por persona',
  instalaciones: 'Las proporciona el cliente',
}

export default async function ClausulasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nombre, rol, puede_aprobar')
    .eq('id', user!.id)
    .single()

  const { data: clausulasResp } = await supabase
    .from('clausulas_globales')
    .select('contenido')
    .eq('id', 'global')
    .single()

  const clausulas =
    (clausulasResp?.contenido as typeof DEFAULT_CLAUSULAS) || DEFAULT_CLAUSULAS

  return (
    <div className="p-12 max-w-3xl">
      <div className="mb-8">
        <Link href="/catalogo" className="text-sm text-amber-700 hover:underline">
          ← Volver al catálogo
        </Link>
      </div>

      <div className="mb-8">
        <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
          Catálogo
        </div>
        <h1 className="font-serif text-4xl text-stone-900">Cláusulas globales</h1>
        <p className="text-stone-600 mt-2">
          Estos valores se aplican como default en todas las cotizaciones nuevas.
          Cada cotización puede cambiar el anticipo y la vigencia individualmente.
        </p>
      </div>

      <ClausulasForm
        clausulasIniciales={clausulas}
        puedeEditar={profile?.puede_aprobar || false}
      />
    </div>
  )
}
