'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  construirEntradaHistorial,
  type EntradaHistorial,
} from '@/lib/historial-cotizacion'

type Usuario = {
  id: string
  nombre: string
}

const ESTADOS_PRE_ENVIO = ['BORRADOR', 'PENDIENTE']

export default function AccionesCotizacion({
  cotizacionId,
  estadoActual,
  clienteNombre,
  total,
  historialActual,
  usuario,
}: {
  cotizacionId: string
  estadoActual: string
  clienteNombre: string
  total: number
  historialActual: EntradaHistorial[] | null
  usuario: Usuario
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [modal, setModal] = useState<null | 'pdf' | 'whatsapp'>(null)

  const urlPDFInterno = `/cotizaciones/${cotizacionId}/pdf`

  const totalFormateado = total.toLocaleString('es-MX', {
    maximumFractionDigits: 2,
  })
  const mensajeWhatsApp = `Hola ${clienteNombre}, te comparto la cotizacion por $${totalFormateado}`
  const urlWhatsApp = `https://wa.me/?text=${encodeURIComponent(mensajeWhatsApp)}`

  const debePreguntar = ESTADOS_PRE_ENVIO.includes(estadoActual)

  async function marcarComoEnviada(accionLog: 'DESCARGADA' | 'ENVIADA') {
    const supabase = createClient()

    const entrada = construirEntradaHistorial({
      accion: accionLog,
      usuario_id: usuario.id,
      usuario_nombre: usuario.nombre,
      cambios: [
        {
          campo: 'estado',
          etiqueta: 'Estado',
          antes: estadoActual,
          despues: 'ENVIADA',
        },
      ],
      detalle:
        accionLog === 'DESCARGADA'
          ? 'Descargo el PDF y marco como enviada'
          : 'Compartio por WhatsApp',
    })

    const historialActualizado = [
      ...(historialActual || []),
      ...(entrada ? [entrada] : []),
    ]

    await supabase
      .from('cotizaciones')
      .update({
        estado: 'ENVIADA',
        historial: historialActualizado,
      })
      .eq('id', cotizacionId)

    router.refresh()
  }

  async function registrarAccion(accionLog: 'DESCARGADA' | 'ENVIADA') {
    const supabase = createClient()

    const entrada = construirEntradaHistorial({
      accion: accionLog,
      usuario_id: usuario.id,
      usuario_nombre: usuario.nombre,
      detalle:
        accionLog === 'DESCARGADA'
          ? 'Descargo el PDF'
          : 'Compartio por WhatsApp',
    })

    if (!entrada) return

    const historialActualizado = [...(historialActual || []), entrada]

    await supabase
      .from('cotizaciones')
      .update({
        historial: historialActualizado,
      })
      .eq('id', cotizacionId)

    router.refresh()
  }

  // ── Helper: abrir PDF + WhatsApp en una sola accion ──────────────────────
  // ORDEN IMPORTANTE: WhatsApp PRIMERO porque debe ser respuesta directa al
  // click del usuario para que el browser no bloquee el popup. El PDF lo
  // abrimos despues en otra pestana.
  function abrirPDFYWhatsApp() {
    window.open(urlWhatsApp, '_blank')
    window.open(urlPDFInterno, '_blank')
  }

  function handleClickPDF() {
    if (debePreguntar) {
      setModal('pdf')
    } else {
      // No preguntar — abrir pestana PRIMERO, BD update en background
      window.open(urlPDFInterno, '_blank')
      startTransition(async () => {
        await registrarAccion('DESCARGADA')
      })
    }
  }

  function handleClickWhatsApp() {
    if (debePreguntar) {
      setModal('whatsapp')
    } else {
      // No preguntar — abrir pestanas PRIMERO (parte del user gesture),
      // BD update va en background.
      abrirPDFYWhatsApp()
      startTransition(async () => {
        await registrarAccion('ENVIADA')
      })
    }
  }

  function modalConfirmar() {
    const intencion = modal
    setModal(null)
    // Abrir pestanas PRIMERO (parte del user gesture del click en el boton del modal)
    if (intencion === 'pdf') {
      window.open(urlPDFInterno, '_blank')
    } else {
      abrirPDFYWhatsApp()
    }
    // BD update en background
    startTransition(async () => {
      await marcarComoEnviada(intencion === 'pdf' ? 'DESCARGADA' : 'ENVIADA')
    })
  }

  function modalRechazar() {
    const intencion = modal
    setModal(null)
    // Abrir pestanas PRIMERO
    if (intencion === 'pdf') {
      window.open(urlPDFInterno, '_blank')
    } else {
      abrirPDFYWhatsApp()
    }
    // BD update en background (solo registrar, sin cambiar estado)
    startTransition(async () => {
      await registrarAccion(intencion === 'pdf' ? 'DESCARGADA' : 'ENVIADA')
    })
  }

  function modalCancelar() {
    setModal(null)
  }

  const tituloModal =
    modal === 'pdf'
      ? 'Vas a enviar el PDF al cliente?'
      : 'Vas a enviarlo por WhatsApp?'

  const descripcionModal =
    modal === 'pdf'
      ? 'Si lo vas a enviar al cliente, marcamos la cotizacion como ENVIADA. Si solo quieres revisarlo, deja el estado como esta.'
      : 'Vamos a abrir el PDF y WhatsApp en pestanas separadas para que adjuntes el PDF manualmente al chat. Al confirmar tambien marcamos la cotizacion como ENVIADA.'

  const labelConfirmar =
    modal === 'pdf'
      ? 'Si, descargar y marcar como ENVIADA'
      : 'Si, abrir PDF + WhatsApp y marcar como ENVIADA'

  const labelRechazar =
    modal === 'pdf'
      ? 'Solo revisar (no cambiar estado)'
      : 'Abrir PDF + WhatsApp sin marcar como ENVIADA'

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleClickWhatsApp}
          disabled={isPending}
          className="border border-emerald-300 hover:bg-emerald-50 text-emerald-700 px-5 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 disabled:opacity-50"
        >
          WhatsApp
        </button>
        <button
          onClick={handleClickPDF}
          disabled={isPending}
          className="bg-amber-700 hover:bg-amber-800 text-white px-5 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 disabled:opacity-50"
        >
          Ver PDF
        </button>
      </div>

      {modal !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={modalCancelar}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-2xl text-stone-900 mb-2">
              {tituloModal}
            </h2>
            <p className="text-sm text-stone-600 mb-5">
              {descripcionModal}
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={modalConfirmar}
                disabled={isPending}
                className="w-full bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition"
              >
                {labelConfirmar}
              </button>
              <button
                onClick={modalRechazar}
                disabled={isPending}
                className="w-full border border-stone-300 hover:bg-stone-50 disabled:opacity-50 text-stone-700 px-5 py-2.5 rounded-lg font-medium text-sm transition"
              >
                {labelRechazar}
              </button>
              <button
                onClick={modalCancelar}
                disabled={isPending}
                className="w-full text-stone-500 hover:text-stone-700 text-sm pt-1 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
