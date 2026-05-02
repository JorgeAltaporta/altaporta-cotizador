'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, RotateCcw } from 'lucide-react'
import {
  guardarUmbralSobrecarga,
  guardarSLAporEstado,
  type SLAporEstado,
} from '../_actions/configuracion'
import { ESTADO_LABELS, type EstadoLead } from '@/lib/types/leads'

type Props = {
  umbralInicial: number
  slaInicial: SLAporEstado
}

const ESTADOS_CON_SLA: EstadoLead[] = ['NUEVO', 'COTIZADO', 'SEGUIMIENTO', 'NEGOCIACION']

export default function TabUmbrales({ umbralInicial, slaInicial }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [umbral, setUmbral] = useState(umbralInicial)
  const [sla, setSla] = useState<SLAporEstado>(slaInicial)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const umbralCambio = umbral !== umbralInicial
  const slaCambio = ESTADOS_CON_SLA.some((e) => sla[e] !== slaInicial[e])
  const hayCambios = umbralCambio || slaCambio

  function actualizarSLA(estado: EstadoLead, horas: number) {
    setSla({ ...sla, [estado]: horas })
  }

  function descartar() {
    setUmbral(umbralInicial)
    setSla(slaInicial)
    setMensaje(null)
  }

  function guardar() {
    setMensaje(null)
    startTransition(async () => {
      const errores: string[] = []

      if (umbralCambio) {
        const res = await guardarUmbralSobrecarga(umbral)
        if (!res.ok) errores.push(res.error || 'Error al guardar umbral')
      }

      if (slaCambio) {
        const res = await guardarSLAporEstado(sla)
        if (!res.ok) errores.push(res.error || 'Error al guardar SLA')
      }

      if (errores.length > 0) {
        setMensaje({ tipo: 'error', texto: errores.join(' · ') })
        return
      }

      setMensaje({ tipo: 'ok', texto: 'Cambios guardados correctamente' })
      router.refresh()
      setTimeout(() => setMensaje(null), 3000)
    })
  }

  function formatearHoras(horas: number): string {
    if (horas < 24) return `${horas} hora${horas === 1 ? '' : 's'}`
    const dias = Math.floor(horas / 24)
    const restanteHoras = horas % 24
    if (restanteHoras === 0) return `${dias} día${dias === 1 ? '' : 's'}`
    return `${dias}d ${restanteHoras}h`
  }

  return (
    <div className="space-y-8">
      {/* Umbral de sobrecarga */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl text-stone-900 mb-1">
          Umbral de sobrecarga
        </h2>
        <p className="text-sm text-stone-600 mb-4">
          Cuando un ejecutivo tiene más de este número de leads activos, al capturar uno nuevo
          se mostrará un aviso para reasignarlo a otro ejecutivo.
        </p>

        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={100}
            value={umbral}
            onChange={(e) => setUmbral(parseInt(e.target.value, 10) || 1)}
            disabled={pending}
            className="w-24 px-3 py-2 border border-stone-300 rounded-lg text-sm"
          />
          <span className="text-sm text-stone-600">leads activos por ejecutivo</span>
        </div>
      </section>

      {/* SLA por estado */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl text-stone-900 mb-1">
          SLAs por estado del lead
        </h2>
        <p className="text-sm text-stone-600 mb-4">
          Si un lead lleva más tiempo en un estado sin actividad (notas, cambios), se marcará
          como urgente con un badge rojo en la tarjeta. Define cuánto tiempo es aceptable para cada estado.
        </p>

        <div className="space-y-3">
          {ESTADOS_CON_SLA.map((estado) => (
            <div key={estado} className="flex items-center gap-4">
              <div className="w-32 text-sm font-medium text-stone-700">
                {ESTADO_LABELS[estado]}
              </div>
              <input
                type="number"
                min={0}
                max={720}
                value={sla[estado]}
                onChange={(e) => actualizarSLA(estado, parseInt(e.target.value, 10) || 0)}
                disabled={pending}
                className="w-20 px-3 py-1.5 border border-stone-300 rounded text-sm"
              />
              <span className="text-xs text-stone-500">horas</span>
              <span className="text-xs text-stone-400 italic">
                ({formatearHoras(sla[estado])})
              </span>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-stone-500 mt-4 italic">
          Pon 0 para desactivar el badge de urgencia para ese estado. Máximo 720 horas (30 días).
        </p>
      </section>

      {/* Acciones */}
      {hayCambios ? (
        <div className="sticky bottom-6 bg-white border border-stone-200 rounded-2xl p-4 shadow-lg flex items-center justify-between gap-3">
          <div className="text-sm text-stone-700">
            Tienes cambios sin guardar
          </div>
          <div className="flex gap-2">
            <button
              onClick={descartar}
              disabled={pending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm border border-stone-300 hover:bg-stone-50 rounded-lg transition disabled:opacity-50"
            >
              <RotateCcw size={14} />
              Descartar
            </button>
            <button
              onClick={guardar}
              disabled={pending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              <Save size={14} />
              {pending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      ) : null}

      {mensaje ? (
        <div
          className={`text-sm rounded-lg p-3 ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-700'
          }`}
        >
          {mensaje.tipo === 'ok' ? '✓' : '✕'} {mensaje.texto}
        </div>
      ) : null}
    </div>
  )
}
