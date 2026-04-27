import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import HoraExtraForm from './form'

export default async function HoraExtraPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('puede_aprobar')
    .eq('id', user!.id)
    .single()

  if (!profile?.puede_aprobar) {
    redirect('/catalogo/adicionales')
  }

  const [horaExtraResp, zonasResp, rangosResp] = await Promise.all([
    supabase.from('adicionales').select('*').eq('id', 'HORA-EXTRA').single(),
    supabase.from('zonas').select('id, nombre').eq('estado', 'ACTIVO').order('id'),
    supabase.from('rangos').select('*').order('orden'),
  ])

  if (horaExtraResp.error || !horaExtraResp.data) {
    return (
      <div className="p-12 text-rose-700">
        No se encontró el adicional HORA-EXTRA. Avisa al administrador.
      </div>
    )
  }

  return (
    <div className="p-12 max-w-5xl">
      <div className="mb-8">
        <Link href="/catalogo/adicionales" className="text-sm text-amber-700 hover:underline">
          ← Volver a adicionales
        </Link>
      </div>

      <div className="mb-8">
        <div className="text-xs tracking-widest text-purple-700 uppercase mb-2">
          Adicional especial
        </div>
        <h1 className="font-serif text-4xl text-stone-900">⏱️ Hora Extra</h1>
        <p className="text-stone-600 mt-2">
          La hora extra tiene tarifa diferente según la zona del evento y el número de invitados.
        </p>
      </div>

      <HoraExtraForm
        horaExtra={horaExtraResp.data}
        zonas={zonasResp.data || []}
        rangos={rangosResp.data || []}
      />
    </div>
  )
}
