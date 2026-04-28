'use client'

import { useMemo } from 'react'
import NumberInput from '@/app/components/NumberInput'

type Locacion = { id: string; nombre: string }

export type Zona = {
  id: string
  nombre: string
  color: string | null
  locaciones: Locacion[]
  precios_flete: number[]
  precios_hora_extra: number[]
}

export type Paquete = {
  id: string
  nombre: string
  color: string | null
  descripcion: string | null
  horas_servicio: number
  base_min_pax: number
  precios: number[]
  zonas_permitidas: string[] | null
  adicionales_permitidos: string[] | null
  es_personalizado: boolean
}

export type Rango = {
  id: string
  nombre: string
  min_pax: number
  max_pax: number | null
  orden: number
}

export type WeddingPlanner = {
  id: string
  nombre: string
  contacto: string | null
  comision_default: number
}

export type Usuario = {
  id: string
  nombre: string
  rol: string
  puede_aprobar: boolean
}

export type EventoForm = {
  id: string
  idAmigable: string
  fecha: string
  locacionTexto: string
  zonaIdManual: string | null
  pax: number
  paqueteId: string
  adicionales: AdicionalSeleccionado[]
}

export type AdicionalSeleccionado = {
  id: string
  adicionalId: string
  cantidad: number
  precioUnitario: number
}

export function eventoVacio(idAmigable: string = 'EV-001'): EventoForm {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    idAmigable,
    fecha: '',
    locacionTexto: '',
    zonaIdManual: null,
    pax: 0,
    paqueteId: '',
    adicionales: [],
  }
}

// Genera el siguiente ID amigable basado en los IDs ya usados
export function siguienteIdAmigable(eventos: EventoForm[]): string {
  const numerosUsados = eventos
    .map((e) => {
      const match = e.idAmigable?.match(/^EV-(\d+)$/)
      return match ? parseInt(match[1]) : 0
    })
    .filter((n) => n > 0)
  const max = numerosUsados.length > 0 ? Math.max(...numerosUsados) : 0
  return `EV-${String(max + 1).padStart(3, '0')}`
}

export type Step1Data = {
  clienteNombre: string
  wpId: string
  comisionOverride: number | null
  ejecutivoId: string
  notasInternas: string
  eventos: EventoForm[]
}

export default function Step1Datos({
  data,
  onChange,
  usuario,
  paquetes,
  zonas,
  rangos,
  weddingPlanners,
  ejecutivos,
}: {
  data: Step1Data
  onChange: (cambios: Partial<Step1Data>) => void
  usuario: Usuario
  paquetes: Paquete[]
  zonas: Zona[]
  rangos: Rango[]
  weddingPlanners: WeddingPlanner[]
  ejecutivos: Usuario[]
}) {
  function actualizarEvento(idx: number, cambios: Partial<EventoForm>) {
    onChange({
      eventos: data.eventos.map((e, i) => (i === idx ? { ...e, ...cambios } : e)),
    })
  }

  function agregarEvento() {
    const nuevoId = siguienteIdAmigable(data.eventos)
    onChange({ eventos: [...data.eventos, eventoVacio(nuevoId)] })
  }

  function eliminarEvento(idx: number) {
    if (data.eventos.length === 1) return
    onChange({ eventos: data.eventos.filter((_, i) => i !== idx) })
  }

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

  const wp = weddingPlanners.find((w) => w.id === data.wpId)

  return (
    <div className="space-y-6">
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
              value={data.clienteNombre}
              onChange={(e) => onChange({ clienteNombre: e.target.value })}
              placeholder="Ej: Boda Renee & Bryan"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-700 mb-1.5">Wedding Planner / Agencia</label>
            <select
              value={data.wpId}
              onChange={(e) => onChange({ wpId: e.target.value, comisionOverride: null })}
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
                  value={data.comisionOverride ?? 0}
                  onChange={(v) => onChange({ comisionOverride: v === 0 ? null : v })}
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
                  onClick={() => onChange({ ejecutivoId: '' })}
                  className={`px-4 py-2.5 rounded-lg border-2 text-sm transition ${
                    data.ejecutivoId === ''
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
                    onClick={() => onChange({ ejecutivoId: ej.id })}
                    className={`px-4 py-2.5 rounded-lg border-2 text-sm transition ${
                      data.ejecutivoId === ej.id
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
              {data.eventos.length === 1
                ? 'Datos del evento'
                : `${data.eventos.length} eventos en esta cotización`}
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
          {data.eventos.map((evt, idx) => {
            const zonaAuto = detectarZona(evt.locacionTexto)
            const zonaIdActiva = evt.zonaIdManual || zonaAuto?.id || ''
            const zonaActiva = zonas.find((z) => z.id === zonaIdActiva)
            const rangoIdx = rangoIndexPara(evt.pax)
            const locacionEsNueva = evt.locacionTexto.trim().length > 0 && !zonaAuto

            const paquetesDisponibles = paquetes.filter((p) => {
              if (!zonaIdActiva) return true
              if (!p.zonas_permitidas || p.zonas_permitidas.length === 0) return true
              return p.zonas_permitidas.includes(zonaIdActiva)
            })

            const paqueteSel = paquetes.find((p) => p.id === evt.paqueteId)
            const calculoTotal =
              paqueteSel && zonaActiva && evt.pax > 0 && rangoIdx !== -1
                ? (paqueteSel.precios[rangoIdx] || 0) * evt.pax +
                  (zonaActiva.precios_flete[rangoIdx] || 0) * evt.pax
                : 0

            return (
              <section key={evt.id} className="bg-white rounded-2xl border border-stone-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif text-lg text-stone-900 flex items-center gap-2">
                    <span className="text-xs font-mono text-amber-700 bg-amber-50 px-2 py-1 rounded">
                      {evt.idAmigable}
                    </span>
                    Evento {data.eventos.length > 1 ? idx + 1 : ''}
                    {calculoTotal > 0 && (
                      <span className="ml-2 text-sm text-stone-500 font-normal">
                        ${calculoTotal.toLocaleString('es-MX')}
                      </span>
                    )}
                  </h3>
                  {data.eventos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => eliminarEvento(idx)}
                      className="text-sm text-rose-500 hover:text-rose-700"
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
                        value={evt.fecha}
                        onChange={(e) => actualizarEvento(idx, { fecha: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-stone-700 mb-1.5">
                        Pax <span className="text-rose-500">*</span>
                      </label>
                      <NumberInput
                        value={evt.pax}
                        onChange={(v) => actualizarEvento(idx, { pax: v })}
                        placeholder="Ej: 150"
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                      />
                      {evt.pax > 0 && rangoIdx === -1 && (
                        <p className="text-xs text-rose-600 mt-1">
                          ⚠️ {evt.pax} pax fuera de rangos
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
                      list={`locaciones-${evt.id}`}
                      value={evt.locacionTexto}
                      onChange={(e) =>
                        actualizarEvento(idx, {
                          locacionTexto: e.target.value,
                          zonaIdManual: null,
                        })
                      }
                      placeholder="Ej: Hacienda Xcanatún, Casa Faller..."
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                    <datalist id={`locaciones-${evt.id}`}>
                      {todasLasLocaciones.map((l) => (
                        <option key={l.id} value={l.nombre}>
                          {l.zonaNombre}
                        </option>
                      ))}
                    </datalist>

                    {zonaAuto && !evt.zonaIdManual && (
                      <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
                        ✓ Zona auto-detectada: <strong>{zonaAuto.id} · {zonaAuto.nombre}</strong>
                      </div>
                    )}

                    {evt.zonaIdManual && (
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
                          {usuario.puede_aprobar ? ' como activa.' : ' como pendiente.'}
                        </div>
                        <select
                          value={evt.zonaIdManual || ''}
                          onChange={(e) =>
                            actualizarEvento(idx, { zonaIdManual: e.target.value || null })
                          }
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

                    {zonaAuto && !evt.zonaIdManual && (
                      <button
                        type="button"
                        onClick={() => actualizarEvento(idx, { zonaIdManual: zonaAuto.id })}
                        className="text-xs text-stone-500 hover:text-stone-700 mt-2"
                      >
                        ¿Cambiar zona manualmente?
                      </button>
                    )}

                    {evt.zonaIdManual && !locacionEsNueva && (
                      <div className="mt-2">
                        <select
                          value={evt.zonaIdManual}
                          onChange={(e) => actualizarEvento(idx, { zonaIdManual: e.target.value })}
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
                          onClick={() => actualizarEvento(idx, { zonaIdManual: null })}
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
                      value={evt.paqueteId}
                      onChange={(e) => actualizarEvento(idx, { paqueteId: e.target.value })}
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
          })}
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
          value={data.notasInternas}
          onChange={(e) => onChange({ notasInternas: e.target.value })}
          rows={4}
          placeholder="Ej: Cliente referido por Patricia. Pidió descuento por ser cliente recurrente."
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
        />
      </section>
    </div>
  )
}
