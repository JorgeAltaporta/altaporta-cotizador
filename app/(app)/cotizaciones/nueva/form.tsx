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

  // Evento
  const [eventoNombre, setEventoNombre] = useState('Banquete')
  const [fecha, setFecha] = useState('')
  const [locacionTexto, setLocacionTexto] = useState('')
  const [zonaIdManual, setZonaIdManual] = useState<string | null>(null)
  const [pax, setPax] = useState(0)
  const [paqueteId, setPaqueteId] = useState('')

  // ─────────────────────────────────────────────────────────────────
  // Lógica de auto-detección de zona
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

  const zonaAutoDetectada = useMemo(() => {
    if (!locacionTexto.trim()) return null
    const match = todasLasLocaciones.find(
      (l) => l.nombre.toLowerCase() === locacionTexto.toLowerCase()
    )
    if (!match) return null
    return zonas.find((z) => z.id === match.zonaId) || null
  }, [locacionTexto, todasLasLocaciones, zonas])

  const zonaIdActiva = zonaIdManual || zonaAutoDetectada?.id || ''
  const zonaActiva = zonas.find((z) => z.id === zonaIdActiva)

  const locacionEsNueva = locacionTexto.trim().length > 0 && !zonaAutoDetectada

  const wp = weddingPlanners.find((w) => w.id === wpId)
  const comisionPct = comisionOverride ?? wp?.comision_default ?? 0

  const paquetesDisponibles = useMemo(() => {
    if (!zonaIdActiva) return paquetes
    return paquetes.filter((p) => {
      if (!p.zonas_permitidas || p.zonas_permitidas.length === 0) return true
      return p.zonas_permitidas.includes(zonaIdActiva)
    })
  }, [zonaIdActiva, paquetes])

  const rangoIndex = useMemo(() => {
    if (pax <= 0) return -1
    for (let i = 0; i < rangos.length; i++) {
      const r = rangos[i]
      if (pax >= r.min_pax && (r.max_pax === null || pax <= r.max_pax)) {
        return i
      }
    }
    return -1
  }, [pax, rangos])

  const paqueteSeleccionado = paquetes.find((p) => p.id === paqueteId)

  const calculos = useMemo(() => {
    if (!paqueteSeleccionado || !zonaActiva || pax <= 0 || rangoIndex === -1) {
      return null
    }
    const precioPorPax = paqueteSeleccionado.precios[rangoIndex] || 0
    const subtotalPaquete = precioPorPax * pax
    const flete = (zonaActiva.precios_flete[rangoIndex] || 0) * pax
    const total = subtotalPaquete + flete
    return { precioPorPax, subtotalPaquete, flete, total }
  }, [paqueteSeleccionado, zonaActiva, pax, rangoIndex])

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
    if (!ejecutivoId) {
      setError('Selecciona un ejecutivo')
      return
    }
    if (!fecha) {
      setError('La fecha del evento es obligatoria')
      return
    }
    if (!locacionTexto.trim()) {
      setError('Ingresa la locación')
      return
    }
    if (!zonaIdActiva) {
      setError('La locación es nueva. Selecciona la zona a la que pertenece.')
      return
    }
    if (!paqueteId) {
      setError('Selecciona un paquete')
      return
    }
    if (pax <= 0) {
      setError('Ingresa el número de invitados (pax)')
      return
    }
    if (rangoIndex === -1) {
      setError(`No hay un rango definido para ${pax} pax`)
      return
    }

    startTransition(async () => {
      const supabase = createClient()

      if (locacionEsNueva && zonaIdActiva) {
        const zonaActualizar = zonas.find((z) => z.id === zonaIdActiva)
        if (zonaActualizar) {
          const nuevaLocacion = {
            id: `loc_${Date.now()}`,
            nombre: locacionTexto.trim(),
            estado: usuario.puede_aprobar ? 'ACTIVA' : 'PENDIENTE',
            creado_por: usuario.id,
          }
          const locacionesActualizadas = [
            ...(zonaActualizar.locaciones || []),
            nuevaLocacion,
          ]
          await supabase
            .from('zonas')
            .update({ locaciones: locacionesActualizadas })
            .eq('id', zonaActualizar.id)
        }
      }

      const folio = await generarFolio(supabase)

      const locacionMatch = todasLasLocaciones.find(
        (l) => l.nombre.toLowerCase() === locacionTexto.toLowerCase()
      )

      const evento = {
        id: `evt_${Date.now()}`,
        nombre: eventoNombre,
        fecha,
        zona_id: zonaIdActiva,
        locacion_id: locacionMatch?.id || null,
        locacion_texto: locacionTexto.trim(),
        pax,
        paquete_id: paqueteId,
        rango_index: rangoIndex,
        precio_por_pax: calculos?.precioPorPax || 0,
        subtotal_paquete: calculos?.subtotalPaquete || 0,
        flete: calculos?.flete || 0,
        total: calculos?.total || 0,
        proteinas_seleccionadas: [],
        adicionales: [],
      }

      const { data, error: errSupabase } = await supabase
        .from('cotizaciones')
        .insert({
          folio,
          cliente_nombre: clienteNombre.trim(),
          estado: usuario.puede_aprobar ? 'BORRADOR' : 'PENDIENTE',
          ejecutivo_id: ejecutivoId,
          wp_id: wpId === 'WP-DIRECTO' ? null : wpId,
          comision_override: comisionOverride,
          eventos: [evento],
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

  const eventoResumen = calculos
    ? {
        nombre: eventoNombre,
        pax,
        paqueteNombre: paqueteSeleccionado?.nombre,
        zonaNombre: zonaActiva ? `Zona ${zonaActiva.id} · ${zonaActiva.nombre}` : undefined,
        subtotalPaquete: calculos.subtotalPaquete,
        flete: calculos.flete,
        total: calculos.total,
      }
    : undefined

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
                  Ejecutivo asignado <span className="text-rose-500">*</span>
                </label>
                {usuario.rol === 'EJECUTIVO' ? (
                  <div className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-700">
                    {usuario.nombre}{' '}
                    <span className="text-xs text-stone-500">(asignado automáticamente)</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
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
                    {ejecutivos.length === 0 && (
                      <div className="col-span-2 text-sm text-stone-500 italic px-3 py-2">
                        No hay ejecutivos registrados
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* EVENTO */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6">
            <div className="mb-4">
              <h2 className="font-serif text-xl text-stone-900">Evento</h2>
              <p className="text-sm text-stone-500">Datos del banquete principal</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-stone-700 mb-1.5">Nombre</label>
                  <input
                    type="text"
                    value={eventoNombre}
                    onChange={(e) => setEventoNombre(e.target.value)}
                    placeholder="Banquete, Welcome cocktail..."
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-stone-700 mb-1.5">
                    Fecha <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  />
                </div>
              </div>

              {/* Locación */}
              <div>
                <label className="block text-sm text-stone-700 mb-1.5">
                  Locación <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="locaciones-disponibles"
                  value={locacionTexto}
                  onChange={(e) => {
                    setLocacionTexto(e.target.value)
                    setZonaIdManual(null)
                  }}
                  placeholder="Ej: Hacienda Xcanatún, Casa Faller..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
                <datalist id="locaciones-disponibles">
                  {todasLasLocaciones.map((l) => (
                    <option key={l.id} value={l.nombre}>
                      {l.zonaNombre}
                    </option>
                  ))}
                </datalist>

                {zonaAutoDetectada && !zonaIdManual && (
                  <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
                    ✓ Zona auto-detectada: <strong>{zonaAutoDetectada.id} · {zonaAutoDetectada.nombre}</strong>
                  </div>
                )}

                {zonaIdManual && (
                  <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    ⚠️ Zona cambiada manualmente: <strong>{zonaActiva?.nombre}</strong>
                  </div>
                )}

                {locacionEsNueva && (
                  <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-3">
                    <div className="text-xs text-blue-900 font-medium mb-2">
                      📍 Locación nueva no registrada
                    </div>
                    <div className="text-xs text-blue-700 mb-2">
                      Selecciona la zona a la que pertenece. Se agregará al catálogo
                      {usuario.puede_aprobar ? ' como activa.' : ' como pendiente de aprobación.'}
                    </div>
                    <select
                      value={zonaIdManual || ''}
                      onChange={(e) => setZonaIdManual(e.target.value || null)}
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

                {zonaAutoDetectada && !zonaIdManual && (
                  <button
                    type="button"
                    onClick={() => setZonaIdManual(zonaAutoDetectada.id)}
                    className="text-xs text-stone-500 hover:text-stone-700 mt-2"
                  >
                    ¿Cambiar zona manualmente?
                  </button>
                )}

                {zonaIdManual && (
                  <div className="mt-2">
                    <label className="block text-xs text-stone-600 mb-1">Cambiar zona:</label>
                    <select
                      value={zonaIdManual}
                      onChange={(e) => setZonaIdManual(e.target.value)}
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
                      onClick={() => setZonaIdManual(null)}
                      className="text-xs text-stone-500 hover:text-stone-700 mt-1"
                    >
                      ↩ Volver a zona auto-detectada
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-stone-700 mb-1.5">
                    Pax <span className="text-rose-500">*</span>
                  </label>
                  <NumberInput
                    value={pax}
                    onChange={setPax}
                    placeholder="Ej: 150"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  />
                  {pax > 0 && rangoIndex === -1 && (
                    <p className="text-xs text-rose-600 mt-1">
                      ⚠️ {pax} pax fuera de rangos
                    </p>
                  )}
                  {rangoIndex !== -1 && (
                    <p className="text-xs text-stone-500 mt-1">
                      Rango: {rangos[rangoIndex].nombre}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-stone-700 mb-1.5">
                    Paquete <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={paqueteId}
                    onChange={(e) => setPaqueteId(e.target.value)}
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
            </div>
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
              evento={eventoResumen}
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
