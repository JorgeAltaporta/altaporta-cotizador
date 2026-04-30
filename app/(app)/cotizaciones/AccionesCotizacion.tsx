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

  // Estado del modal: null = cerrado, 'pdf' o 'whatsapp' = abierto con esa intención
  const [modal, setModal] = useState<null | 'pdf' | 'whatsapp'>(null)

  // ── URLs ───────────────────────────────────────────────────────────────────
  // PDF interno (con login) — el ejecutivo ve el PDF aquí, lo descarga, y lo
  // adjunta manualmente al chat de WhatsApp.
  const urlPDFInterno = `/cotizaciones/${cotizacionId}/pdf`

  // Texto preformateado para WhatsApp (sin link — el ejecutivo adjunta el PDF manualmente)
  const totalFormateado = total.toLocaleString('es-MX', {
    maximumFractionDigits: 2,
  })
  const mensajeWhatsApp = `Hola ${clienteNombre}, te comparto la cotización por $${totalFormateado}`
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

  // ── Helper: abrir PDF + WhatsApp en una sola acción ──────────────────────
  // El PDF se abre en una pestaña nueva (el browser decide descargar o mostrar).
  // El usuario adjunta manualmente el PDF al chat de WhatsApp.
  function abrirPDFYWhatsApp() {
    // Pequeño retraso para que ambas pestañas se abran sin que el browser bloquee popups
    window.open(urlPDFInterno, '_blank')
    setTimeout(() => {
      window.open(urlWhatsApp, '_blank')
    }, 100)
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
      // No preguntar — registrar, descargar PDF + abrir WhatsApp
      startTransition(async () => {
        await registrarAccion('ENVIADA')
        abrirPDFYWhatsApp()
      })
    }
  }

  // ── Decisión del modal ────────────────────────────────────────────────────

  function modalConfirmar() {
    const intencion = modal // 'pdf' o 'whatsapp'
    setModal(null)
    startTransition(async () => {
      await marcarComoEnviada(intencion === 'pdf' ? 'DESCARGADA' : 'ENVIADA')
      if (intencion === 'pdf') {
        window.open(urlPDFInterno, '_blank')
      } else {
        abrirPDFYWhatsApp()
      }
    })
  }

  function modalRechazar() {
    const intencion = modal
    setModal(null)
    startTransition(async () => {
      await registrarAccion(intencion === 'pdf' ? 'DESCARGADA' : 'ENVIADA')
      if (intencion === 'pdf') {
        window.open(urlPDFInterno, '_blank')
      } else {
        abrirPDFYWhatsApp()
      }
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
                : 'Vamos a abrir el PDF y WhatsApp en pestañas separadas para que adjuntes el PDF manualmente al ch
