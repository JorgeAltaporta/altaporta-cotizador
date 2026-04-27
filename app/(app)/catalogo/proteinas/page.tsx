import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type Proteina = {
  id: string
  nombre: string
  nivel_id: string | null
  estado: string
}

type Nivel = {
  id: string
  nombre: string
  orden: number
  color: string | null
}

export default async function ProteinasPage() {
  const supabase = await createClient()

  const [proteinasResp, nivelesResp] = await Promise.all([
    supabase.from('proteinas').select('*').order('nombre'),
    supabase.from('niveles_proteina').select('*').order('orden'),
  ])

  if (proteinasResp.error) {
    return <div className="p-12 text-rose-700">Error: {proteinasResp.error.message}</div>
  }

  const proteinas = (proteinasResp.data || []) as Proteina[]
  const niveles = (nivelesResp.data || []) as Nivel[]

  // Agrupar proteínas por nivel
  const proteinasPorNivel = niveles.map((nivel) => ({
    ...nivel,
    proteinas: proteinas.filter((p) => p.nivel_id === nivel.id),
  }))

  return (
    <div className="p-12 max-w-6xl">
      <div className="mb-8">
        <Link href="/catalogo" className="text-sm text-amber-700 hover:underline">
          ← Volver al catálogo
        </Link>
      </div>

      <div className="mb-10">
        <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
          Catálogo · Proteínas
        </div>
        <h1 className="font-serif text-4xl text-stone-900">
          Proteínas
        </h1>
        <p className="text-stone-600 mt-2">
          {proteinas.length} proteínas en {niveles.length} niveles
        </p>
      </div>

      <div className="space-y-8">
        {proteinasPorNivel.map((grupo) => (
          <div key={grupo.id}>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: grupo.color || '#A8A29E' }}
              />
              <h2 className="font-serif text-2xl text-stone-900">
                Nivel {grupo.nombre}
              </h2>
              <span className="text-sm text-stone-500">
                ({grupo.proteinas.length})
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {grupo.proteinas.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-stone-200 px-4 py-3 flex items-center gap-3"
                >
                  <div
                    className="w-2 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: grupo.color || '#A8A29E' }}
                  />
                  <span className="text-stone-900">{p.nombre}</span>
                </div>
              ))}

              {grupo.proteinas.length === 0 && (
                <div className="col-span-full text-sm text-stone-400 py-3">
                  Sin proteínas en este nivel
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
