import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Settings } from 'lucide-react'
import {
  obtenerUmbralSobrecarga,
  obtenerSLAporEstado,
  obtenerRazonesPerdida,
  obtenerWPsParaVerificar,
} from './_actions/configuracion'
import VistaConfiguracion from './_components/vista-configuracion'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionLeadsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nombre, puede_aprobar')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.puede_aprobar) {
    redirect('/leads?aviso=sin-permisos-config')
  }

  const [umbral, sla, razones, wpsPendientes] = await Promise.all([
    obtenerUmbralSobrecarga(),
    obtenerSLAporEstado(),
    obtenerRazonesPerdida(),
    obtenerWPsParaVerificar(),
  ])

  return (
    <div className="p-12 max-w-4xl">
      <Link
        href="/leads"
        className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-amber-700 mb-4 transition"
      >
        <ArrowLeft size={16} />
        Volver a Leads
      </Link>

      <div className="mb-8">
        <div className="text-xs tracking-widest text-amber-700 uppercase mb-2 flex items-center gap-2">
          <Settings size={14} />
          Configuración · Leads
        </div>
        <h1 className="font-serif text-4xl text-stone-900">Configuración del módulo Leads</h1>
        <p className="text-stone-600 mt-2">
          Ajusta umbrales, SLAs, razones de pérdida y verifica wedding planners pendientes.
          Solo accesible para aprobadores.
        </p>
      </div>

      <VistaConfiguracion
        umbralInicial={umbral}
        slaInicial={sla}
        razonesIniciales={razones}
        wpsPendientesIniciales={wpsPendientes}
      />
    </div>
  )
}
