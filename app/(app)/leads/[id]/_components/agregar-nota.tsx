'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { agregarNotaLead } from '../actions'

type Props = {
  leadId: string
}

const PLANTILLAS = [
  { titulo: 'Saludo inicial', texto: 'Hola {nombre}, soy de Altaporta Catering. Recibí tu mensaje y me dará mucho gusto ayudarte con tu evento. ¿Cuándo te marco para platicar los detalles?' },
  { titulo: 'Pedir datos', texto: 'Hola {nombre}, para armar tu propuesta necesito: fecha tentativa, número aproximado de invitados y locación. ¿Me las puedes compartir?' },
  { titulo: 'Cotización lista', texto: 'Hola {nombre}, ya tengo lista tu cotización personalizada. Te la envío en un momento por este medio. Cualquier ajuste me dices.' },
  { titulo: 'Seguimiento', texto: 'Hola {nombre}, te escribo para dar seguimiento a la propuesta que te envié. ¿Tuviste oportunidad de revisarla? Quedo atenta a tus comentarios.' },
]

export default function AgregarNota({ leadId }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [texto, setTexto] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [exitoMsg, setExitoMsg] = useState<string | null>(null)

  function aplicarPlantilla(plantillaTexto: string) {
    setTexto(plantillaTexto)
  }

  function guardar() {
    setErrorMsg(null)
    setExitoMsg(null)
    if (!texto.trim()) {
      setErrorMsg('Escribe algo antes de guardar')
      return
    }
    startTransition(async () => {
      const res = await agregarNotaLead(leadId, texto)
      if (res.ok) {
        setTexto('')
        setExitoMsg('Nota agregada')
        router.refresh()
        setTimeout(() => setExitoMsg(null), 2500)
      } else {
        setErrorMsg(res.error || 'Error al guardar la nota')
      }
    })
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold mr-1 self-center">Plantillas:</span>
        {PLANTILLAS.map((p) => (
          <button
            key={p.titulo}
            type="button"
            onClick={() => aplicarPlantilla(p.texto)}
            disabled={pending}
            className="text-[11px] px-2.5 py-1 border border-stone-200 hover:border-amber-700 hover:bg-amber-50 hover:text-amber-800 rounded-full text-stone-600 transition disabled:opacity-50"
          >
            {p.titulo}
          </button>
        ))}
      </div>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Escribe una nota sobre este lead..."
        rows={3}
        maxLength={2000}
        disabled={pending}
        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm resize-none disabled:opacity-50"
      />

      <div className="flex items-center justify-between mt-2">
        <div className="text-[10px] text-stone-400">{texto.length} / 2000</div>
        <button
          type="button"
          onClick={guardar}
          disabled={pending || !texto.trim()}
          className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'Guardando...' : '+ Agregar nota'}
        </button>
      </div>

      {errorMsg ? (
        <div className="mt-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded p-2">{errorMsg}</div>
      ) : null}
      {exitoMsg ? (
        <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">✓ {exitoMsg}</div>
      ) : null}
    </div>
  )
}
