'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
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

export default function WizardCotizacionForm({
  usuario,
  paquetes,
  zonas,
  rangos,
  weddingPlanners,
  ejecutivos,
  adicionales,
  categorias,
}: {
  usuario: Usuario
  paquetes: Paquete[]
  zonas: Zona[]
  rangos: Rango[]
  weddingPlanners: WeddingPlanner[]
  ejecutivos: Usuario[]
  adicionales: Adicional[]
  categorias: Categoria[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  // Estado del wizard
  const [data, setData] = useState<Step1Data>({
    clienteNombre: '',
    wpId: 'WP-DIRECTO',
    comisionOverride: null,
    ejecutivoId: usuario.rol === 'EJECUTIVO' ? usuario.id : '',
    notasInternas: '',
    eventos: [eventoVacio()],
  })

  function actualizarData(cambios: Partial<Step1Data>) {
    setData({ ...data, ...cambios })
  }

  function actualizarEventos(eventos: EventoForm[]) {
    setData({ ...data, eventos })
  }

  // ─────────────────────────────────────────────────────────────────
  // Cálculos derivados
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

  // Calcular cada evento (paquete + flete + adicionales)
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

  const totalGeneral = eventosConCalculo.reduce((sum, e) => sum + e.total, 0)

  // Validar Step 1
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

  function handleSiguiente() {
    setError(null)
    const errVal = validarStep1()
    if (errVal) {
      setError(errVal)
      return
    }
    setStep(2)
    window.scrollTo(0, 0)
  }

  function handleAnterior() {
    setStep(1)
    window.scrollTo(0, 0)
  }

  async function generarFolio(supabase: ReturnType<typeof createClient>): Promise<string> {
    const año = new Date().getFullYear()
    const prefijo = `AP-${año}-`
    const { data: rows } = await supabase
      .from('cotizaciones')
      .select('folio')
      .like('folio', `${prefijo}%`)
      .order('folio', { ascending: false })
      .limit(1)
    let siguiente = 1
    if (rows && rows.length > 0 && rows[0].folio) {
      const ultimoNumero = parseInt(rows[0].folio.split('-')[2])
      if (!isNaN(ultimoNumero)) siguiente = ultimoNumero + 1
    }
    return `${prefijo}${String(siguiente).padStart(3, '0')}`
  }

  async function handleCrear() {
    setError(null)
    const errVal = validarStep1()
    if (errVal) {
      setError(errVal)
      setStep(1)
      return
    }

    startTransition(async () => {
      const supabase = createClient()

      // Procesar locaciones nuevas
      for (let i = 0; i < data.eventos.length; i++) {
        const evt = data.eventos[i]
        const ec = eventosConCalculo[i]
        if (ec.locacionEsNueva && (evt.zonaIdManual || ec.zonaAuto?.id)) {
          const zonaIdDestino = evt.zonaIdManual || ec.zonaAuto?.id
          const zonaActualizar = zonas.find((z) => z.id === zonaIdDestino)
          if (zonaActualizar) {
            const yaExiste = (zonaActualizar.locaciones || []).some(
              (l) => l.nombre.toLowerCase() === evt.locacionTexto.trim().toLowerCase()
            )
            if (!yaExiste) {
              const nuevaLocacion = {
                id: `loc_${Date.now()}_${i}`,
                nombre: evt.locacionTexto.trim(),
                estado: usuario.puede_aprobar ? 'ACTIVA' : 'PENDIENTE',
                creado_por: usuario.id,
              }
              await supabase
                .from('zonas')
                .update({
                  locaciones: [...(zonaActualizar.locaciones || []), nuevaLocacion],
                })
                .eq('id', zonaActualizar.id)
            }
          }
        }
      }

      const folio = await generarFolio(supabase)

      const eventosParaGuardar = data.eventos.map((evt, i) => {
        const ec = eventosConCalculo[i]
        const zonaIdFinal = evt.zonaIdManual || ec.zonaAuto?.id || ''
        const locacionMatch = todasLasLocaciones.find(
          (l) => l.nombre.toLowerCase() === evt.locacionTexto.toLowerCase()
        )

        return {
          id: evt.id,
          fecha: evt.fecha,
          zona_id: zonaIdFinal,
          locacion_id: locacionMatch?.id || null,
          locacion_texto: evt.locacionTexto.trim(),
          pax: evt.pax,
          paquete_id: evt.paqueteId,
          rango_index: ec.rangoIdx,
          precio_por_pax: ec.precioPorPax,
          subtotal_paquete: ec.subtotalPaquete,
          flete: ec.flete,
          adicionales: evt.adicionales || [],
          subtotal_adicionales: ec.subtotalAdicionales,
          total: ec.total,
          proteinas_seleccionadas: [],
        }
      })

      const { data: insertData, error: errSupabase } = await supabase
        .from('cotizaciones')
        .insert({
          folio,
          cliente_nombre: data.clienteNombre.trim(),
          notas_internas: data.notasInternas.trim() || null,
          estado: usuario.puede_aprobar ? 'BORRADOR' : 'PENDIENTE',
          ejecutivo_id: data.ejecutivoId || null,
          wp_id: data.wpId === 'WP-DIRECTO' ? null : data.wpId,
          comision_override: data.comisionOverride,
          eventos: eventosParaGuardar,
          adicionales_globales: [],
          historial: [
            {
              accion: 'CREADA',
              usuario_id: usuario.id,
              usuario_nombre: usuario.nombre,
              fecha: new Date().toISOString(),
            },
          ],
        })
        .select()
        .single()

      if (errSupabase) {
        setError(`Error: ${errSupabase.message}`)
        return
      }

      router.push(`/cotizaciones/${insertData.id}`)
      router.refresh()
    })
  }

  // Resumen para sidebar
  const resumenEvento = useMemo(() => {
    if (totalGeneral === 0) return undefined
    if (data.eventos.length === 1) {
      const e = eventosConCalculo[0]
      return {
        nombre: 'Evento',
        pax: e.evt.pax,
        paqueteNombre: e.paqueteSel?.nombre,
        zonaNombre: e.zonaActiva
          ? `Zona ${e.zonaActiva.id} · ${e.zonaActiva.nombre}`
          : undefined,
        subtotalPaquete: e.subtotalPaquete + e.subtotalAdicionales,
        flete: e.flete,
        total: e.total,
      }
    }
    return {
      nombre: `${data.eventos.length} eventos`,
      pax: data.eventos.reduce((s, e) => s + e.pax, 0),
      paqueteNombre: 'Múltiples',
      total: totalGeneral,
    }
  }, [data.eventos, eventosConCalculo, totalGeneral])

  return (
    <div>
      {/* STEPPER */}
      <div className="mb-8">
        <Stepper
          step={step}
          enabledSteps={[1, 2]}
          onStepChange={(n) => {
            if (n === 1) setStep(1)
            if (n === 2) handleSiguiente()
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUMNA IZQUIERDA — CONTENIDO DEL STEP */}
        <div className="lg:col-span-2 space-y-6">
          {step === 1 && (
            <Step1Datos
              data={data}
              onChange={actualizarData}
              usuario={usuario}
              paquetes={paquetes}
              zonas={zonas}
              rangos={rangos}
              weddingPlanners={weddingPlanners}
              ejecutivos={ejecutivos}
            />
          )}

          {step === 2 && (
            <Step2Adicionales
              eventos={data.eventos}
              onChange={actualizarEventos}
              adicionales={adicionales}
              categorias={categorias}
              zonas={zonas}
              paquetes={paquetes}
            />
          )}

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA — RESUMEN VIVO */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 space-y-4">
            <ResumenVivo
              clienteNombre={data.clienteNombre || undefined}
              wpNombre={wp?.nombre}
              comisionPct={comisionPct}
              evento={resumenEvento}
            />

            {step === 1 ? (
              <button
                onClick={handleSiguiente}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white px-6 py-2.5 rounded-lg transition font-medium"
              >
                Siguiente: Adicionales →
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleCrear}
                  disabled={isPending}
                  className="w-full bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg transition font-medium"
                >
                  {isPending ? 'Creando...' : 'Crear cotización'}
                </button>
                <button
                  onClick={handleAnterior}
                  className="w-full border border-stone-300 hover:bg-stone-50 text-stone-700 px-6 py-2 rounded-lg transition text-sm"
                >
                  ← Anterior
                </button>
              </div>
            )}

            <Link
              href="/cotizaciones"
              className="block text-center text-sm text-stone-600 hover:text-stone-900"
            >
              Cancelar
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
