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

// Estados que disparan la pregunta "¿marcar como ENVIADA?"
const ESTADOS_PRE_ENVIO = ['BORRADOR', 'PENDIENTE']

export default function AccionesCotizacion({
  cotizacionId,
  tokenPublico,
  estadoActual,
  clienteNombre,
  total,
  historialActual,
  usuario,
}: {
  cotizacionId: string
  tokenPublico: string
  estadoActual: string
  clienteNombre: string
  total: number
  historialActual: EntradaHistorial[] | null
  usuario: Usuario
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Estado del modal: null = cerrado, 'pdf' o 'whatsapp' = abierto con esa intención
  const [modal, setModal] = useState<null | 'pdf' | 'whatsapp'>(null)

  // ── URLs ───────────────────────────────────────────────────────────────────
  // PDF interno (con login) — para que los ejecutivos lo vean en navegador
  const urlPDFInterno = `/cotizaciones/${cotizacionId}/pdf`
  // PDF público (con token) — para compartir con el cliente por WhatsApp
  const urlPDFPublico = `/p/${tokenPublico}/pdf`
  const urlPDFPublicoAbsoluta =
    typeof window !== 'undefined'
      ? `${window.location.origin}${urlPDFPublico}`
      : urlPDFPublico

  // Texto preformateado para WhatsApp
  const totalFormateado = total.toLocaleString('es-MX', {
    maximumFractionDigits: 2,
  })
  const mensajeWhatsApp = `Hola ${clienteNombre}, te comparto la cotización por $${totalFormateado}: ${urlPDFPublicoAbsoluta}`
  const urlWhatsApp = `https://wa.me/?text=${encodeURIComponent(mensajeWhatsApp)}`

  // ── Decidir si la acción debe preguntar o no ──────────────────────────────
  const debePreguntar = ESTADOS_PRE_ENVIO.includes(estadoActual)

  // ── Marcar como ENVIADA en BD ─────────────────────────────────────────────
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
          ? 'Descargó el PDF y marcó la cotización como enviada'
          : 'Compartió la cotización por WhatsApp',
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

  // ── Solo registrar acción sin cambiar estado ──────────────────────────────
  async function registrarAccion(accionLog: 'DESCARGADA' | 'ENVIADA') {
    const supabase = createClient()

    const entrada = construirEntradaHistorial({
      accion: accionLog,
      usuario_id: usuario.id,
      usuario_nombre: usuario.nombre,
      detalle:
        accionLog === 'DESCARGADA'
          ? 'Descargó el PDF'
          : 'Compartió la cotización por WhatsApp',
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

  // ── Click en "Ver PDF" ────────────────────────────────────────────────────
  function handleClickPDF() {
    if (debePreguntar) {
      setModal('pdf')
    } else {
      // No preguntar — registrar y abrir
      startTransition(async () => {
        await registrarAccion('DESCARGADA')
        window.open(urlPDFInterno, '_blank')
      })
    }
  }

  // ── Click en "WhatsApp" ───────────────────────────────────────────────────
  function handleClickWhatsApp() {
    if (debePreguntar) {
      setModal('whatsapp')
    } else {
      // No preguntar — registrar y abrir
      startTransition(async () => {
        await registrarAccion('ENVIADA')
        window.open(urlWhatsApp, '_blank')
      })
    }
  }

  // ── Decisión del modal ────────────────────────────────────────────────────

  function modalConfirmar() {
    const intencion = modal // 'pdf' o 'whatsapp'
    setModal(null)
    startTransition(async () => {
      await marcarComoEnviada(intencion === 'pdf' ? 'DESCARGADA' : 'ENVIADA')
      window.open(intencion === 'pdf' ? urlPDFInterno : urlWhatsApp, '_blank')
    })
  }

  function modalRechazar() {
    const intencion = modal
    setModal(null)
    startTransition(async () => {
      await registrarAccion(intencion === 'pdf' ? 'DESCARGADA' : 'ENVIADA')
      window.open(intencion === 'pdf' ? urlPDFInterno : urlWhatsApp, '_blank')
    })
  }

  function modalCancelar() {
    setModal(null)
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleClickWhatsApp}
          disabled={isPending}
          className="border border-emerald-300 hover:bg-emerald-50 text-emerald-700 px-5 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 disabled:opacity-50"
        >
          💬 WhatsApp
        </button>
        <button
          onClick={handleClickPDF}
          disabled={isPending}
          className="bg-amber-700 hover:bg-amber-800 text-white px-5 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 disabled:opacity-50"
        >
          📄 Ver PDF
        </button>
      </div>

      {/* MODAL ───────────────────────────────────────────────────────────── */}
      {modal !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={modalCancelar}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-3xl mb-3">
              {modal === 'pdf' ? '📄' : '💬'}
            </div>
            <h2 className="font-serif text-2xl text-stone-900 mb-2">
              {modal === 'pdf'
                ? '¿Vas a enviar el PDF al cliente?'
                : '¿Vas a enviarlo por WhatsApp?'}
            </h2>
            <p className="text-sm text-stone-600 mb-5">
              {modal === 'pdf'
                ? 'Si lo vas a enviar al cliente, marcamos la cotización como ENVIADA. Si solo quieres revisarlo tú, deja el estado como está.'
                : 'Al confirmar, se marca la cotización como ENVIADA y se registra en el historial.'}
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={modalConfirmar}
                disabled={isPending}
                className="w-full bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition"
              >
                {modal === 'pdf'
                  ? 'Sí, descargar y marcar como ENVIADA'
                  : 'Sí, abrir WhatsApp y marcar como ENVIADA'}
              </button>
              <button
                onClick={modalRechazar}
                disabled={isPending}
                className="w-full border border-stone-300 hover:bg-stone-50 disabled:opacity-50 text-stone-700 px-5 py-2.5 rounded-lg font-medium text-sm transition"
              >
                {modal === 'pdf'
                  ? 'Solo revisar (no cambiar estado)'
                  : 'Abrir sin marcar como ENVIADA'}
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
