'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import NumberInput from '@/app/components/NumberInput'
import Stepper from '../Stepper'
import ResumenVivo from '../ResumenVivo'

type Locacion = { id: string; nombre: string }

type Zona = {
  id: string
  nombre: string
  color: string | null
  locaciones: Locacion[]
  precios_flete: number[]
  precios_hora_extra: number[]
}

type Paquete = {
  id: string
  nombre: string
  color: string | null
  descripcion: string | null
  horas_servicio: number
  base_min_pax: number
  precios: number[]
  zonas_permitidas: string[] | null
  es_personalizado: boolean
}

type Rango = {
  id: string
  nombre: string
  min_pax: number
  max_pax: number | null
  orden: number
}

type WeddingPlanner = {
  id: string
  nombre: string
  contacto: string | null
  comision_default: number
}

type Usuario = {
  id: string
  nombre: string
  rol: string
  puede_aprobar: boolean
}

type EventoForm = {
  id: string
  fecha: string
  locacionTexto: string
  zonaIdManual: string | null
  pax: number
  paqueteId: string
}

function eventoVacio(): EventoForm {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    fecha: '',
    locacionTexto: '',
    zonaIdManual: null,
    pax: 0,
    paqueteId: '',
  }
}

export default function NuevaCotizacionForm({
  usuario,
  paquetes,
  zonas,
  rangos,
  weddingPlanners,
  ejecutivos,
}: {
  usuario: Usuario
  paquetes: Paquete[]
  zonas: Zona[]
  rangos: Rango[]
  weddingPlanners: WeddingPlanner[]
  ejecutivos: Usuario[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [step] = useState(1)

  // Datos generales
  const [clienteNombre, setClienteNombre] = useState('')
  const [wpId, setWpId] = useState('WP-DIRECTO')
  const [comisionOverride, setComisionOverride] = useState<number | null>(null)
  const [ejecutivoId, setEjecutivoId] = useState(
    usuario.rol === 'EJECUTIVO' ? usuario.id : ''
  )
  const [notasInternas, setNotasInternas] = useState('')

  // Eventos (array)
  const [eventos, setEventos] = useState<EventoForm[]>([eventoVacio()])

  function actualizarEvento(idx: number, cambios: Partial<EventoForm>) {
    setEventos(eventos.map((e, i) => (i === idx ? { ...e, ...cambios } : e)))
  }

  function agregarEvento() {
    setEventos([...eventos, eventoVacio()])
  }

  function eliminarEvento(idx: number) {
    if (eventos.length === 1) return
    setEventos(eventos.filter((_, i) => i !== idx))
  }

  // ─────────────────────────────────────────────────────────────────
  // Lógica de auto-detección de zona (compartida)
  // ─────────────────────────────────────────────────────────────────
  const todasLasLocaciones = useMemo(() => {
    const lista: Array<{ id: string; nombre: string; zonaId: string; zonaNombre: string }> = []
    zonas.forEach((z) => {
      ;(z.locaciones || []).forEach((l) => {
        lista.push({
          id: l.id,
          nombre: l.nombre,
          zonaId: z.id,
          zonaNombre: z.nombre,
        })
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

  // Calcular cada evento
  const eventosConCalculo = useMemo(() => {
    return eventos.map((evt) => {
      const zonaAuto = detectarZona(evt.locacionTexto)
      const zonaIdActiva = evt.zonaIdManual || zonaAuto?.id || ''
      const zonaActiva = zonas.find((z) => z.id === zonaIdActiva)
      const paqueteSel = paquetes.find((p) => p.id === evt.paqueteId)
      const rangoIdx = rangoIndexPara(evt.pax)

      let calculo = null
      if (paqueteSel && zonaActiva && evt.pax > 0 && rangoIdx !== -1) {
        const precioPorPax = paqueteSel.precios[rangoIdx] || 0
        const subtotalPaquete = precioPorPax * evt.pax
        const flete = (zonaActiva.precios_flete[rangoIdx] || 0) * evt.pax
        const total = subtotalPaquete + flete
        calculo = { precioPorPax, subtotalPaquete, flete, total }
      }

      return {
        evt,
        zonaAuto,
        zonaActiva,
        paqueteSel,
        rangoIdx,
        calculo,
        locacionEsNueva: evt.locacionTexto.trim().length > 0 && !zonaAuto,
      }
    })
  }, [eventos, zonas, paquetes, rangos])

  const wp = weddingPlanners.find((w) => w.id === wpId)
  const comisionPct = comisionOverride ?? wp?.comision_default ?? 0

  // Total general (suma de todos los eventos)
  const totalGeneral = eventosConCalculo.reduce(
    (sum, e) => sum + (e.calculo?.total || 0),
    0
  )

  // Resumen para sidebar (solo mostrar primer evento si solo hay uno, o resumen multiple)
  const resumenEvento = useMemo(() => {
    if (eventos.length === 1 && eventosConCalculo[0].calculo) {
      const e = eventosConCalculo[0]
      return {
        nombre: 'Evento',
        pax: e.evt.pax,
        paqueteNombre: e.paqueteSel?.nombre,
        zonaNombre: e.zonaActiva
          ? `Zona ${e.zonaActiva.id} · ${e.zonaActiva.nombre}`
          : undefined,
        subtotalPaquete: e.calculo?.subtotalPaquete,
        flete: e.calculo?.flete,
        total: e.calculo?.total,
      }
    }
    if (totalGeneral > 0) {
      return {
        nombre: `${eventos.length} eventos`,
        pax: eventos.reduce((s, e) => s + (e.pax || 0), 0),
        paqueteNombre: 'Múltiples',
        total: totalGeneral,
      }
    }
    return undefined
  }, [eventos, eventosConCalculo, totalGeneral])

  async function generarFolio(supabase: ReturnType<typeof createClient>): Promise<string> {
    const año = new Date().getFullYear()
    const prefijo = `AP-${año}-`
    const { data } = await supabase
      .from('cotizaciones')
      .select('folio')
      .like('folio', `${prefijo}%`)
      .order('folio', { ascending: false })
      .limit(1)
    let siguiente = 1
    if (data && data.length > 0 && data[0].folio) {
      const ultimoNumero = parseInt(data[0].folio.split('-')[2])
      if (!isNaN(ultimoNumero)) siguiente = ultimoNumero + 1
    }
    return `${prefijo}${String(siguiente).padStart(3, '0')}`
  }

  async function handleCrear() {
    setError(null)

    if (!clienteNombre.trim()) {
      setError('El nombre del cliente o evento es obligatorio')
      return
    }

    // Validar cada evento
    for (let i = 0; i < eventos.length; i++) {
      const evt = eventos[i]
      const eventoCalc = eventosConCalculo[i]
      const numEvento = eventos.length > 1 ? `Evento ${i + 1}: ` : ''

      if (!evt.fecha) {
        setError(`${numEvento}La fecha es obligatoria`)
        return
      }
      if (!evt.locacionTexto.trim()) {
        setError(`${numEvento}Ingresa la locación`)
        return
      }
      const zonaIdActiva = evt.zonaIdManual || eventoCalc.zonaAuto?.id
      if (!zonaIdActiva) {
        setError(`${numEvento}La locación es nueva. Selecciona la zona.`)
        return
      }
      if (!evt.paqueteId) {
        setError(`${numEvento}Selecciona un paquete`)
        return
      }
      if (evt.pax <= 0) {
        setError(`${numEvento}Ingresa el número de invitados (pax)`)
        return
      }
      if (eventoCalc.rangoIdx === -1) {
        setError(`${numEvento}${evt.pax} pax fuera de los rangos`)
        return
      }
    }

    startTransition(async () => {
      const supabase = createClient()

      // Procesar locaciones nuevas (agregar al catálogo de zonas)
      for (let i = 0; i < eventos.length; i++) {
        const evt = eventos[i]
        const eventoCalc = eventosConCalculo[i]
        if (eventoCalc.locacionEsNueva && (evt.zonaIdManual || eventoCalc.zonaAuto?.id)) {
          const zonaIdDestino = evt.zonaIdManual || eventoCalc.zonaAuto?.id
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

      const eventosParaGuardar = eventos.map((evt, i) => {
        const eventoCalc = eventosConCalculo[i]
        const zonaIdFinal = evt.zonaIdManual || eventoCalc.zonaAuto?.id || ''
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
          rango_index: eventoCalc.rangoIdx,
          precio_por_pax: eventoCalc.calculo?.precioPorPax || 0,
          subtotal_paquete: eventoCalc.calculo?.subtotalPaquete || 0,
          flete: eventoCalc.calculo?.flete || 0,
          total: eventoCalc.calculo?.total || 0,
          proteinas_seleccionadas: [],
          adicionales: [],
        }
      })

      const { data, error: errSupabase } = await supabase
        .from('cotizaciones')
        .insert({
          folio,
          cliente_nombre: clienteNombre.trim(),
          notas_internas: notasInternas.trim() || null,
          estado: usuario.puede_aprobar ? 'BORRADOR' : 'PENDIENTE',
          ejecutivo_id: ejecutivoId || null,
          wp_id: wpId === 'WP-DIRECTO' ? null : wpId,
          comision_override: comisionOverride,
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

      router.push(`/cotizaciones/${data.id}`)
      router.refresh()
    })
  }

  return (
    <div>
      {/* STEPPER */}
      <div className="mb-8">
        <Stepper step={step} enabledSteps={[1]} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUMNA IZQUIERDA — FORMULARIO */}
        <div className="lg:col-span-2 space-y-6">
          {/* DATOS GENERALES */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6">
            <div className="mb-4">
              <h2 className="font-serif text-xl text-stone-900">Datos generales</h2>
              <p className="text-sm text-stone-500">Información del cliente y quién atiende</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-stone-700 mb-1.5">
                  Nombre del cliente o evento <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Ej: Boda Renee & Bryan"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div>
                <label className="block text-sm text-stone-700 mb-1.5">Wedding Planner / Agencia</label>
                <select
                  value={wpId}
                  onChange={(e) => {
                    setWpId(e.target.value)
                    setComisionOverride(null)
                  }}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                >
                  {weddingPlanners.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nombre}
                    </option>
                  ))}
                </select>
                {wp && wp.id !== 'WP-DIRECTO' && (
                  <div className="mt-2 text-xs text-stone-500">
                    {wp.contacto && <>Contacto: {wp.contacto} · </>}
                    Comisión: {wp.comision_default}%
                  </div>
                )}
              </div>

              {wp && wp.id !== 'WP-DIRECTO' && (
                <div>
                  <label className="block text-sm text-stone-700 mb-1.5">
                    Override de comisión WP (opcional)
                  </label>
                  <div className="flex gap-2 items-center">
                    <NumberInput
                      value={comisionOverride ?? 0}
                      onChange={(v) => setComisionOverride(v === 0 ? null : v)}
                      max={100}
                      placeholder={`Default: ${wp.comision_default}%`}
                      className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                    <span className="text-stone-500">%</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-stone-700 mb-1.5">
                  Ejecutivo asignado <span className="text-stone-400 text-xs">(opcional)</span>
                </label>
                {usuario.rol === 'EJECUTIVO' ? (
                  <div className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-700">
                    {usuario.nombre}{' '}
                    <span className="text-xs text-stone-500">(asignado automáticamente)</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEjecutivoId('')}
                      className={`px-4 py-2.5 rounded-lg border-2 text-sm transition ${
                        ejecutivoId === ''
                          ? 'border-amber-600 bg-amber-50 text-amber-900'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      Sin asignar
                    </button>
                    {ejecutivos.map((ej) => (
                      <button
                        key={ej.id}
                        type="button"
                        onClick={() => setEjecutivoId(ej.id)}
                        className={`px-4 py-2.5 rounded-lg border-2 text-sm transition ${
                          ejecutivoId === ej.id
                            ? 'border-amber-600 bg-amber-50 text-amber-900'
                            : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                        }`}
                      >
                        {ej.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* EVENTOS */}
          <div>
            <div className="flex items-center justify-between mb-3 px-2">
              <div>
                <h3 className="font-serif text-lg text-stone-900">Eventos</h3>
                <p className="text-xs text-stone-500">
                  {eventos.length === 1
                    ? 'Datos del evento'
                    : `${eventos.length} eventos en esta cotización`}
                </p>
              </div>
              <button
                type="button"
                onClick={agregarEvento}
                className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-sm hover:bg-stone-800"
              >
                + Agregar evento
              </button>
            </div>

            <div className="space-y-4">
              {eventos.map((evt, idx) => (
                <EventoCard
                  key={evt.id}
                  evento={evt}
                  idx={idx}
                  total={eventos.length}
                  zonas={zonas}
                  paquetes={paquetes}
                  rangos={rangos}
                  todasLasLocaciones={todasLasLocaciones}
                  zonaAuto={eventosConCalculo[idx].zonaAuto}
                  zonaActiva={eventosConCalculo[idx].zonaActiva}
                  rangoIdx={eventosConCalculo[idx].rangoIdx}
                  calculo={eventosConCalculo[idx].calculo}
                  locacionEsNueva={eventosConCalculo[idx].locacionEsNueva}
                  puedeEditarLocaciones={usuario.puede_aprobar}
                  onUpdate={(cambios) => actualizarEvento(idx, cambios)}
                  onEliminar={eventos.length > 1 ? () => eliminarEvento(idx) : null}
                />
              ))}
            </div>
          </div>

          {/* COMENTARIOS INTERNOS */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6">
            <div className="mb-3">
              <h2 className="font-serif text-xl text-stone-900">Comentarios internos</h2>
              <p className="text-sm text-stone-500">
                Notas privadas del equipo. No aparecen en la cotización del cliente.
              </p>
            </div>
            <textarea
              value={notasInternas}
              onChange={(e) => setNotasInternas(e.target.value)}
              rows={4}
              placeholder="Ej: Cliente referido por Patricia. Pidió descuento por ser cliente recurrente. Ya se discutió con Jorge."
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </section>

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
              clienteNombre={clienteNombre || undefined}
              wpNombre={wp?.nombre}
              comisionPct={comisionPct}
              evento={resumenEvento}
            />

            <button
              onClick={handleCrear}
              disabled={isPending}
              className="w-full bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg transition font-medium"
            >
              {isPending ? 'Creando...' : 'Crear cotización'}
            </button>

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

// ─────────────────────────────────────────────────────────────────────────
// Sub-componente: tarjeta de un evento
// ─────────────────────────────────────────────────────────────────────────
function EventoCard({
  evento,
  idx,
  total,
  zonas,
  paquetes,
  rangos,
  todasLasLocaciones,
  zonaAuto,
  zonaActiva,
  rangoIdx,
  calculo,
  locacionEsNueva,
  puedeEditarLocaciones,
  onUpdate,
  onEliminar,
}: {
  evento: EventoForm
  idx: number
  total: number
  zonas: Zona[]
  paquetes: Paquete[]
  rangos: Rango[]
  todasLasLocaciones: Array<{ id: string; nombre: string; zonaId: string; zonaNombre: string }>
  zonaAuto: Zona | null
  zonaActiva: Zona | undefined
  rangoIdx: number
  calculo: { precioPorPax: number; subtotalPaquete: number; flete: number; total: number } | null
  locacionEsNueva: boolean
  puedeEditarLocaciones: boolean
  onUpdate: (cambios: Partial<EventoForm>) => void
  onEliminar: (() => void) | null
}) {
  const zonaIdActiva = evento.zonaIdManual || zonaAuto?.id || ''

  const paquetesDisponibles = useMemo(() => {
    if (!zonaIdActiva) return paquetes
    return paquetes.filter((p) => {
      if (!p.zonas_permitidas || p.zonas_permitidas.length === 0) return true
      return p.zonas_permitidas.includes(zonaIdActiva)
    })
  }, [zonaIdActiva, paquetes])

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-lg text-stone-900">
          Evento {total > 1 ? idx + 1 : ''}
          {calculo && (
            <span className="ml-3 text-sm text-stone-500 font-normal">
              ${calculo.total.toLocaleString('es-MX')}
            </span>
          )}
        </h3>
        {onEliminar && (
          <button
            type="button"
            onClick={onEliminar}
            className="text-sm text-rose-500 hover:text-rose-700"
            title="Eliminar este evento"
          >
            ✕ Quitar
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-stone-700 mb-1.5">
              Fecha <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={evento.fecha}
              onChange={(e) => onUpdate({ fecha: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-700 mb-1.5">
              Pax <span className="text-rose-500">*</span>
            </label>
            <NumberInput
              value={evento.pax}
              onChange={(v) => onUpdate({ pax: v })}
              placeholder="Ej: 150"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
            {evento.pax > 0 && rangoIdx === -1 && (
              <p className="text-xs text-rose-600 mt-1">
                ⚠️ {evento.pax} pax fuera de rangos
              </p>
            )}
            {rangoIdx !== -1 && (
              <p className="text-xs text-stone-500 mt-1">
                Rango: {rangos[rangoIdx].nombre}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1.5">
            Locación <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            list={`locaciones-${evento.id}`}
            value={evento.locacionTexto}
            onChange={(e) => onUpdate({ locacionTexto: e.target.value, zonaIdManual: null })}
            placeholder="Ej: Hacienda Xcanatún, Casa Faller..."
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
          <datalist id={`locaciones-${evento.id}`}>
            {todasLasLocaciones.map((l) => (
              <option key={l.id} value={l.nombre}>
                {l.zonaNombre}
              </option>
            ))}
          </datalist>

          {zonaAuto && !evento.zonaIdManual && (
            <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
              ✓ Zona auto-detectada: <strong>{zonaAuto.id} · {zonaAuto.nombre}</strong>
            </div>
          )}

          {evento.zonaIdManual && (
            <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              ⚠️ Zona manual: <strong>{zonaActiva?.nombre}</strong>
            </div>
          )}

          {locacionEsNueva && (
            <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-3">
              <div className="text-xs text-blue-900 font-medium mb-2">
                📍 Locación nueva no registrada
              </div>
              <div className="text-xs text-blue-700 mb-2">
                Selecciona la zona. Se agregará al catálogo
                {puedeEditarLocaciones ? ' como activa.' : ' como pendiente.'}
              </div>
              <select
                value={evento.zonaIdManual || ''}
                onChange={(e) => onUpdate({ zonaIdManual: e.target.value || null })}
                className="w-full px-3 py-2 border border-blue-300 rounded text-sm bg-white"
              >
                <option value="">— Selecciona zona —</option>
                {zonas.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.id} · {z.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {zonaAuto && !evento.zonaIdManual && (
            <button
              type="button"
              onClick={() => onUpdate({ zonaIdManual: zonaAuto.id })}
              className="text-xs text-stone-500 hover:text-stone-700 mt-2"
            >
              ¿Cambiar zona manualmente?
            </button>
          )}

          {evento.zonaIdManual && !locacionEsNueva && (
            <div className="mt-2">
              <select
                value={evento.zonaIdManual}
                onChange={(e) => onUpdate({ zonaIdManual: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded text-sm"
              >
                {zonas.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.id} · {z.nombre}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onUpdate({ zonaIdManual: null })}
                className="text-xs text-stone-500 hover:text-stone-700 mt-1"
              >
                ↩ Volver a zona auto-detectada
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1.5">
            Paquete <span className="text-rose-500">*</span>
          </label>
          <select
            value={evento.paqueteId}
            onChange={(e) => onUpdate({ paqueteId: e.target.value })}
            disabled={!zonaIdActiva}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 disabled:bg-stone-50 disabled:text-stone-400"
          >
            <option value="">— Selecciona —</option>
            {paquetesDisponibles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  )
}
