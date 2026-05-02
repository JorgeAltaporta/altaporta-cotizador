'use client'

import { useState } from 'react'
import { Sliders, AlertCircle, Users } from 'lucide-react'
import type {
  SLAporEstado,
  RazonPerdidaConfig,
  WPParaVerificar,
} from '../_actions/configuracion'
import TabUmbrales from './tab-umbrales'
import TabRazones from './tab-razones'
import TabWps from './tab-wps'

type Props = {
  umbralInicial: number
  slaInicial: SLAporEstado
  razonesIniciales: RazonPerdidaConfig[]
  wpsPendientesIniciales: WPParaVerificar[]
}

type TabId = 'umbrales' | 'razones' | 'wps'

export default function VistaConfiguracion({
  umbralInicial,
  slaInicial,
  razonesIniciales,
  wpsPendientesIniciales,
}: Props) {
  const [tab, setTab] = useState<TabId>('umbrales')

  return (
    <div>
      <div className="border-b border-stone-200 mb-6 flex gap-1">
        <BotonTab
          activo={tab === 'umbrales'}
          onClick={() => setTab('umbrales')}
          icono={<Sliders size={14} />}
          label="Umbrales y SLAs"
        />
        <BotonTab
          activo={tab === 'razones'}
          onClick={() => setTab('razones')}
          icono={<AlertCircle size={14} />}
          label="Razones de pérdida"
        />
        <BotonTab
          activo={tab === 'wps'}
          onClick={() => setTab('wps')}
          icono={<Users size={14} />}
          label="WPs por verificar"
          badge={wpsPendientesIniciales.length || undefined}
        />
      </div>

      {tab === 'umbrales' ? (
        <TabUmbrales
          umbralInicial={umbralInicial}
          slaInicial={slaInicial}
        />
      ) : null}
      {tab === 'razones' ? (
        <TabRazones razonesIniciales={razonesIniciales} />
      ) : null}
      {tab === 'wps' ? (
        <TabWps wpsIniciales={wpsPendientesIniciales} />
      ) : null}
    </div>
  )
}

function BotonTab({
  activo,
  onClick,
  icono,
  label,
  badge,
}: {
  activo: boolean
  onClick: () => void
  icono: React.ReactNode
  label: string
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
        activo
          ? 'border-amber-700 text-amber-900'
          : 'border-transparent text-stone-600 hover:text-stone-900'
      }`}
    >
      {icono}
      {label}
      {badge !== undefined && badge > 0 ? (
        <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-semibold bg-rose-100 text-rose-800 rounded-full">
          {badge}
        </span>
      ) : null}
    </button>
  )
}
