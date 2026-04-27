import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AdicionalesManager from './manager'

export default async function AdicionalesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('puede_aprobar')
    .eq('id', user!.id)
    .single()
  const puedeEditar = profile?.puede_aprobar || false

  const [adicionalesResp, categoriasResp, zonasResp] = await Promise.all([
    supabase.from('adicionales').select('*').order('nombre'),
    supabase.from('categorias_adicionales').select('*').order('orden'),
    supabase.from('zonas').select('id, nombre').order('id'),
  ])

  if (adicionalesResp.error) {
    return <div className="p-12 text-rose-700">Error: {adicionalesResp.error.message}</div>
  }

  return (
    <div className="p-12 max-w-6xl">
      <div className="mb-8">
        <Link href="/catalogo" className="text-sm text-amber-700 hover:underline">
          ← Volver al catálogo
        </Link>
      </div>

      <div className="mb-10 flex items-start justify-between">
        <div>
          <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
            Catálogo · Adicionales
          </div>
          <h1 className="font-serif text-4xl text-stone-900">
            Adicionales
          </h1>
        </div>

        {puedeEditar && (
          <Link
            href="/catalogo/adicionales/hora-extra"
            className="text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-lg transition"
          >
            ⏱️ Configurar Hora Extra
          </Link>
        )}
      </div>

      <AdicionalesManager
        adicionalesIniciales={adicionalesResp.data || []}
        categorias={categoriasResp.data || []}
        zonas={zonasResp.data || []}
        puedeEditar={puedeEditar}
      />
    </div>
  )
}
