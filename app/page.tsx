import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from './logout-button'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Traer el perfil del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-start mb-12">
          <div>
            <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
              Altaporta Catering
            </div>
            <h1 className="font-serif text-4xl text-stone-900">
              Bienvenido{profile?.nombre ? `, ${profile.nombre}` : ''}
            </h1>
          </div>
          <LogoutButton />
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
          <h2 className="font-serif text-2xl text-stone-900 mb-6">Tu sesión</h2>

          <dl className="space-y-4">
            <div className="flex justify-between border-b border-stone-100 pb-3">
              <dt className="text-stone-600">Email</dt>
              <dd className="text-stone-900 font-medium">{user.email}</dd>
            </div>

            {profile && (
              <>
                <div className="flex justify-between border-b border-stone-100 pb-3">
                  <dt className="text-stone-600">Nombre</dt>
                  <dd className="text-stone-900 font-medium">{profile.nombre}</dd>
                </div>
                <div className="flex justify-between border-b border-stone-100 pb-3">
                  <dt className="text-stone-600">Rol</dt>
                  <dd className="text-stone-900 font-medium">{profile.rol}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-600">Puede aprobar</dt>
                  <dd className="text-stone-900 font-medium">
                    {profile.puede_aprobar ? 'Sí' : 'No'}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </div>

        <p className="text-xs text-stone-400 text-center mt-8">
          Módulo de Cotización · v0.1 · Prototipo
        </p>
      </div>
    </div>
  )
}
