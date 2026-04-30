import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ProteinasManager from './manager'

export default async function ProteinasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('puede_aprobar')
    .eq('id', user!.id)
    .single()
  const puedeEditar = profile?.puede_aprobar || false

  const [proteinasResp, nivelesResp] = await Promise.all([
    supabase.from('proteinas').select('*').order('nombre'),
    supabase.from('niveles_proteina').select('*').order('orden'),
  ])

  if (proteinasResp.error) {
    return <div className="p-12 text-rose-700">Error: {proteinasResp.error.message}</div>
  }

  return (
    <div className="p-12 max-w-6xl">
      <div className="mb-8">
        <Link href="/catalogo" className="text-sm text-amber-700 hover:underline">
          ← Volver a configuración
        </Link>
      </div>

      <div className="mb-10">
        <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
          Configuración · Proteínas
        </div>
        <h1 className="font-serif text-4xl text-stone-900">
          Proteínas
        </h1>
      </div>

      <ProteinasManager
        proteinasIniciales={proteinasResp.data || []}
        niveles={nivelesResp.data || []}
        puedeEditar={puedeEditar}
      />
    </div>
  )
}
