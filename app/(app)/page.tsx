import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  return (
    <div className="p-12 max-w-5xl">
      <div className="mb-12">
        <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
          Inicio
        </div>
        <h1 className="font-serif text-5xl text-stone-900 mb-2">
          Bienvenido{profile?.nombre ? `, ${profile.nombre}` : ''}
        </h1>
        <p className="text-stone-600">
          Sistema de cotización Altaporta Catering
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-8">
          <div className="text-xs tracking-widest text-amber-700 uppercase mb-4">
            Tu sesión
          </div>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-stone-600">Email</dt>
              <dd className="text-stone-900 font-medium">{user!.email}</dd>
            </div>
            {profile && (
              <>
                <div className="flex justify-between">
                  <dt className="text-stone-600">Rol</dt>
                  <dd className="text-stone-900 font-medium">{profile.rol}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-600">Aprobador</dt>
                  <dd className="text-stone-900 font-medium">
                    {profile.puede_aprobar ? 'Sí' : 'No'}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-8">
          <div className="text-xs tracking-widest text-amber-700 uppercase mb-4">
            Atajos
          </div>
          <p className="text-stone-600 text-sm">
            Usa el menú lateral para navegar. Próximamente: tablero con métricas
            del período.
          </p>
        </div>
      </div>
    </div>
  )
}
