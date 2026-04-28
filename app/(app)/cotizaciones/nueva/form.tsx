'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { generarEtiqueta } from '@/lib/etiqueta-cotizacion'
import Stepper from '../Stepper'
import ResumenVivo from '../ResumenVivo'
import Step1Datos, {
  type Step1Data,
  type EventoForm,
  type Paquete,
  type Zona,
  type Rango,
  type WeddingPlanner,
  type Usuario,
  eventoVacio,
} from './Step1Datos'
import Step2Adicionales from './Step2Adicionales'
import Step3Ajustes, { type Step3Data } from './Step3Ajustes'
import Step4Resumen from './Step4Resumen'

type Adicional = {
  id: string
  nombre: string
  categoria_id: string | null
  unidad: string | null
  precio: number
  precios_por_zona: Record<string, number> | null
  notas: string | null
  estado: string
}

type Categoria = {
  id: string
  nombre: string
  icono: string | null
  orden: number
}

type ClausulasGlobales = {
  anticipoPct: number
  vigenciaDiasDefault: number
  cambioFecha: string
  instalaciones: string
}

const COMISION_EJECUTIVO_DEFAULT: Record<string, number> = {}

export default function WizardCotizacionForm({
  usuario,
  paquetes,
  zonas,
  rangos,
  weddingPlanners,
  ejecutivos,
  adicionales,
  categorias,
  clausulasGlobales,
}: {
  usuario: Usuario
  paquetes: Paquete[]
  zonas: Zona[]
  rangos: Rango[]
  weddingPlanners: WeddingPlanner[]
  ejecutivos: Usuario[]
  adicionales: Adicional[]
  categorias: Categoria[]
  clausulasGlobales: ClausulasGlobales
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  const [data, setData] = useState<Step1Data>({
    clienteNombre: '',
    wpId: 'WP-DIRECTO',
    comisionOverride: null,
    ejecutivoId: usuario.rol === 'EJECUTIVO' ? usuario.id : '',
    notasInternas: '',
    eventos: [eventoVacio()],
  })

  const [ajustes, setAjustes] = useState<Step3Data>({
    descuentoGeneral: null,
    cargosExtra: [],
    comisionEjecutivoOverride: null,
    notasCliente: '',
    vigenciaDias: clausulasGlobales.vigenciaDiasDefault,
    anticipoPctOverride: null,
    aplicaIva: true,
  })

  function actualizarData(cambios: Partial<Step1Data>) {
    setData({ ...data, ...cambios })
  }

  function actualizarEventos(eventos: EventoForm[]) {
    setData({ ...data, eventos })
  }

  function actualizarAjustes(cambios: Partial<Step3Data>) {
    setAjustes({ ...ajustes, ...cambios })
  }

  // ─────────────────────────────────────────────────────────────────
  const todasLasLocaciones = useMemo(() => {
    const lista: Array<{ id: string; nombre: string; zonaId: string }> = []
    zonas.forEach((z) => {
      ;(z.locaciones || []).forEach((l) => {
        lista.push({ id: l.id, nombre: l.nombre, zonaId: z.id })
      })
    })
    return lista
  }, [zonas])

  function detectarZona(locacionTexto: string): Zona | null {
    if (!locacionTexto.trim()) return null
    const match = todasLasLocaciones.find(
      (l) => l.nombre.toLowerCase() === locacionTexto.toLowerCase()
    )
    if (!match) return null
    return zonas.find((z) => z.id === match.zonaId) || null
  }

  function rangoIndexPara(pax: number): number {
    if (pax <= 0) return -1
    for (let i = 0; i < rangos.length; i++) {
      const r = rangos[i]
      if (pax >= r.min_pax && (r.max_pax === null || pax <= r.max_pax)) {
        return i
      }
    }
    return -1
  }

  const eventosConCalculo = useMemo(() => {
    return data.eventos.map((evt) => {
      const zonaAuto = detectarZona(evt.locacionTexto)
      const zonaIdActiva = evt.zonaIdManual || zonaAuto?.id || ''
      const zonaActiva = zonas.find((z) => z.id === zonaIdActiva)
      const paqueteSel = paquetes.find((p) => p.id === evt.paqueteId)
      const rangoIdx = rangoIndexPara(evt.pax)

      let subtotalPaquete = 0
      let flete = 0
      let precioPorPax = 0

      if (paqueteSel && zonaActiva && evt.pax > 0 && rangoIdx !== -1) {
        precioPorPax = paqueteSel.precios[rangoIdx] || 0
        subtotalPaquete = precioPorPax * evt.pax
        flete = (zonaActiva.precios_flete[rangoIdx] || 0) * evt.pax
      }

      const subtotalAdicionales = (evt.adicionales || []).reduce(
        (sum, a) => sum + a.cantidad * a.precioUnitario,
        0
      )

      const total = subtotalPaquete + flete + subtotalAdicionales

      return {
        evt,
        zonaAuto,
        zonaActiva,
        paqueteSel,
        rangoIdx,
        precioPorPax,
        subtotalPaquete,
        flete,
        subtotalAdicionales,
        total,
        locacionEsNueva: evt.locacionTexto.trim().length > 0 && !zonaAuto,
      }
    })
  }, [data.eventos, zonas, paquetes, rangos])

  const wp = weddingPlanners.find((w) => w.id === data.wpId)
  const comisionPct = data.comisionOverride ?? wp?.comision_default ?? 0

  const subtotalEventos = eventosConCalculo.reduce((sum, e) => sum + e.total, 0)

  const descuentoAplicado = (() => {
    if (!ajustes.descuentoGeneral) return 0
    if (ajustes.descuentoGeneral.tipo === 'porcentaje') {
      return subtotalEventos * (ajustes.descuentoGeneral.valor / 100)
    }
    return ajustes.descuentoGeneral.valor
  })()

  const totalCargosExtra = ajustes.cargosExtra.reduce((s, c) => s + c.monto, 0)

  const subtotalAjustado = subtotalEventos - descuentoAplicado + totalCargosExtra
  const iva = ajustes.aplicaIva ? subtotalAjustado * 0.16 : 0
  const totalGeneral = subtotalAjustado + iva

  const ejecutivoSeleccionado = ejecutivos.find((e) => e.id === data.ejecutivoId)
  const ejecutivoNombre =
    ejecutivoSeleccionado?.nombre ||
    (usuario.rol === 'EJECUTIVO' ? usuario.nombre : null)
  const comisionEjecutivoDefault = COMISION_EJECUTIVO_DEFAULT[data.ejecutivoId] ?? 1

  const anticipoPct = ajustes.anticipoPctOverride ?? clausulasGlobales.anticipoPct
  const anticipoMonto = totalGeneral * (anticipoPct / 100)

  const etiqueta = useMemo(() => {
    return generarEtiqueta(
      data.eventos.map((e) => ({
        fecha: e.fecha,
        locacion_texto: e.locacionTexto,
        pax: e.pax,
      })),
      data.wpId,
      weddingPlanners
    )
  }, [data.eventos, data.wpId, weddingPlanners])

  function validarStep1(): string | null {
    if (!data.clienteNombre.trim()) {
      return 'El nombre del cliente o evento es obligatorio'
    }
    for (let i = 0; i < data.eventos.length; i++) {
      const evt = data.eventos[i]
      const ec = eventosConCalculo[i]
      const numEvento = data.eventos.length > 1 ? `Evento ${i + 1}: ` : ''

      if (!evt.fecha) return `${numEvento}La fecha es obligatoria`
      if (!evt.locacionTexto.trim()) return `${numEvento}Ingresa la locación`
      const zonaIdActiva = evt.zonaIdManual || ec.zonaAuto?.id
      if (!zonaIdActiva)
        return `${numEvento}La locación es nueva. Selecciona la zona.`
      if (!evt.paqueteId) return `${numEvento}Selecciona un paquete`
      if (evt.pax <= 0) return `${numEvento}Ingresa el número de invitados`
      if (ec.rangoIdx === -1)
        return `${numEvento}${evt.pax} pax fuera de los rangos`
    }
    return null
  }

  function irStep(n: number) {
    setError(null)
    if (n > 1) {
      const errVal = validarStep1()
      if (errVal) {
        setError(errVal)
        setStep(1)
        return
      }
    }
    setStep(n)
    window.scrollTo(0, 0)
  }

  async function generarFolio(supabase: ReturnType<typeof createClient>): Promise<string> {
    const año = new Date().getFull
