'use client'

import Link from 'next/link'
import { CANAL_LABELS, TIPO_EVENTO_LABELS, colorCanal, esLeadUrgente, formatearFechaEvento, telefonoNumerico, tiempoTranscurrido, type LeadConRelaciones } from '@/lib/types/leads'
import { MessageSquare } from 'lucide-react'

type Props = { lead: LeadConRelaciones }

export default function LeadCard({ lead }: Props) {
  const urgente = esLeadUrgente(lead)
  const canalCol = colorCanal(lead.canal)
  const tel = telefonoNumerico(lead.telefono)
  const waUrl = `https://wa.me/52${tel}`

  const borderColor = urgente
    ? 'border-l-rose-500'
    : lead.estado === 'NUEVO'
    ? 'border-l-amber-500'
    : 'border-l-stone-300'

  const cardClass = `bg-white rounded-lg p-3 border-l-4 ${borderColor} border border-stone-200 shadow-sm hover:shadow-md transition cursor-pointer block`
  const canalBadgeClass = `text-[10px] font-semibold px-1.5 py-0.5 rounded ${canalCol.bg} ${canalCol.text} flex-shrink-0`
  const tiempoClass = `flex-shrink-0 ${urgente ? 'text-rose-600 font-semibold' : 'text-stone-500'}`
  const waLinkClass = 'inline-flex items-center justify-center w-7 h-7 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition text-[10px] font-bold'

  function detenerPropagacion(e: React.MouseEvent) {
    e.stopPropagation()
  }

  return (
    <Link href={`/leads/${lead.id}`} className={cardClass}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-stone-900 truncate">{lead.nombre}</div>
          {lead.wp_nombre ? (
            <div className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded mt-1 inline-block font-medium">
              vía {lead.wp_nombre}
              {lead.wp_verificado === false ? ' ⚠' : ''}
            </div>
          ) : null}
        </div>
        <span className={canalBadgeClass} title={CANAL_LABELS[lead.canal]}>
          {CANAL_LABELS[lead.canal].slice(0, 3).toUpperCase()}
        </span>
      </div>

      <div className="text-xs text-stone-600 leading-relaxed mb-2">
        {lead.tipo_evento ? (
          <span className="text-stone-900 font-medium">{TIPO_EVENTO_LABELS[lead.tipo_evento]}</span>
        ) : (
          <span className="text-stone-400">Sin tipo</span>
        )}
        {lead.pax ? <span> · {lead.pax} pax</span> : null}
        {lead.fecha_evento ? (
          <div className="text-stone-700">{formatearFechaEvento(lead.fecha_evento)}</div>
        ) : null}
        {lead.locacion ? (
          <div className="text-stone-500 truncate text-[11px]">{lead.locacion}</div>
        ) : null}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0">
          {lead.ejecutivo_nombre ? (
            <>
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0" style={{ backgroundColor: lead.ejecutivo_color ?? '#78716c' }}>
                {lead.ejecutivo_nombre.charAt(0)}
              </div>
              <span className="text-stone-600 truncate">{lead.ejecutivo_nombre}</span>
            </>
          ) : null}
        </div>
        <div className={tiempoClass}>{tiempoTranscurrido(lead.fecha_creacion)}</div>
      </div>

      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-stone-100">
        <a href={waUrl} target="_blank" rel="noopener noreferrer" onClick={detenerPropagacion} className={waLinkClass} title="Abrir WhatsApp">{'WA'}</a>
        {lead.total_notas > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-stone-200 text-stone-600 text-[10px]" title={`${lead.total_notas} nota(s)`}>
            <MessageSquare size={10} />
            {lead.total_notas}
          </span>
        ) : null}
      </div>
    </Link>
  )
}
