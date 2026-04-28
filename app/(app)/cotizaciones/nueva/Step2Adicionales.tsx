'use client'

import { useState } from 'react'
import NumberInput from '@/app/components/NumberInput'
import { createClient } from '@/lib/supabase/client'
import type { EventoForm, AdicionalSeleccionado, Zona } from './Step1Datos'

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

type Paquete = {
  id: string
  nombre: string
  adicionales_permitidos: string[] | null
}

export default function Step2Adicionales({
  eventos,
  onChange,
  adicionales,
  categorias,
  zonas,
  paquetes,
  usuarioId,
}: {
  eventos: EventoForm[]
  onChange: (eventos: EventoForm[]) => void
  adicionales: Adicional[]
  categorias: Categoria[]
  zonas: Zona[]
  paquetes: Paquete[]
  usuarioId: string
}) {
  const [adicionalesLocal, setAdicionalesLocal] = useState<Adicional[]>(adicionales)

  function actualizarAdicionales(idxEvento: number, nuevos: AdicionalSeleccionado[]) {
    onChange(
      eventos.map((e, i) =>
        i === idxEvento ? { ...e, adicionales: nuevos } : e
      )
    )
  }

  function agregarAdicionalAlCatalogo(nuevo: Adicional) {
    setAdicionalesLocal([...adicionalesLocal, nuevo])
  }

  return (
    <div className="space-y-6">
      {eventos.map((evt, idx) => {
        const zona =
          zonas.find((z) => z.id === evt.zonaIdManual) ||
          zonas.find((z) =>
            (z.locaciones || []).some(
              (l) => l.nombre.toLowerCase() === evt.locacionTexto.toLowerCase()
            )
          )

        const paquete = paquetes.find((p) => p.id === evt.paqueteId)

        return (
          <EventoAdicionales
            key={evt.id}
            evento={evt}
            idx={idx}
            total={eventos.length}
            zona={zona}
            paquete={paquete}
            adicionales={adicionalesLocal}
            categorias={categorias}
            usuarioId={usuarioId}
            onUpdate={(nuevos) => actualizarAdicionales(idx, nuevos)}
            onAdicionalCreado={agregarAdicionalAlCatalogo}
          />
        )
      })}
    </div>
  )
}

function EventoAdicionales({
  evento,
  idx,
  total,
  zona,
  paquete,
  adicionales,
  categorias,
  usuarioId,
  onUpdate,
  onAdicionalCreado,
}: {
  evento: EventoForm
  idx: number
  total: number
  zona: Zona | undefined
  paquete: Paquete | undefined
  adicionales: Adicional[]
  categorias: Categoria[]
  usuarioId: string
  onUpdate: (nuevos: AdicionalSeleccionado[]) => void
  onAdicionalCreado: (nuevo: Adicional) => void
}) {
  const [busqueda, setBusqueda] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState<string | 'TODAS'>('TODAS')
  const [catalogoAbierto, setCatalogoAbierto] = useState(false)
  const [crearOpen, setCrearOpen] = useState(false)

  const adicionalesDisponibles = adicionales.filter((a) => {
    if (a.estado !== 'ACTIVO' && a.estado !== 'PENDIENTE') return false
    if (paquete?.adicionales_permitidos && paquete.adicionales_permitidos.length > 0) {
      if (a.estado !== 'PENDIENTE' && !paquete.adicionales_permitidos.includes(a.id)) return false
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      if (!a.nombre.toLowerCase().includes(q)) return false
    }
    if (categoriaActiva !== 'TODAS' && a.categoria_id !== categoriaActiva) return false
    return true
  })

  function getPrecioSugerido(adicional: Adicional): number {
    if (
      zona &&
      adicional.precios_por_zona &&
      adicional.precios_por_zona[zona.id] !== undefined
    ) {
      return adicional.precios_por_zona[zona.id]
    }
    return adicional.precio
  }

  function agregar(adicional: Adicional) {
    const yaEsta = evento.adicionales.find((a) => a.adicionalId === adicional.id)
    if (yaEsta) {
      onUpdate(
        evento.adicionales.map((a) =>
          a.adicionalId === adicional.id ? { ...a, cantidad: a.cantidad + 1 } : a
        )
      )
    } else {
      const precio = getPrecioSugerido(adicional)
      const cantidadInicial = adicional.unidad === 'pax' ? evento.pax : 1
      const nuevo: AdicionalSeleccionado = {
        id: `add_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        adicionalId: adicional.id,
        cantidad: cantidadInicial,
        precioUnitario: precio,
      }
      onUpdate([...evento.adicionales, nuevo])
    }
  }

  function quitar(idAdic: string) {
    onUpdate(evento.adicionales.filter((a) => a.id !== idAdic))
  }

  function cambiarCantidad(idAdic: string, cantidad: number) {
    onUpdate(
      evento.adicionales.map((a) =>
        a.id === idAdic ? { ...a, cantidad } : a
      )
    )
  }

  function cambiarPrecio(idAdic: string, precioUnitario: number) {
    onUpdate(
      evento.adicionales.map((a) =>
        a.id === idAdic ? { ...a, precioUnitario } : a
      )
    )
  }

  const totalAdicionales = evento.adicionales.reduce(
    (sum, a) => sum + a.cantidad * a.precioUnitario,
    0
  )

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-6">
      {/* Header del evento */}
      <div className="flex items-start justify-between mb-4 pb-4 border-b border-stone-100">
        <div>
          <h3 className="font-serif text-lg text-stone-900">
            Evento {total > 1 ? idx + 1 : ''} · {evento.locacionTexto || 'Sin locación'}
          </h3>
          <div className="text-xs text-stone-500 mt-1">
            {evento.pax} pax · {paquete?.nombre || 'Sin paquete'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-stone-500">Adicionales</div>
          <div className="font-medium text-stone-900">
            ${totalAdicionales.toLocaleString('es-MX')}
          </div>
        </div>
      </div>

      {/* Adicionales agregados */}
      {evento.adicionales.length > 0 && (
        <div className="space-y-2 mb-6">
          <h4 className="text-sm font-medium text-stone-700">Agregados</h4>
          {evento.adicionales.map((sel) => {
            const ad = adicionales.find((a) => a.id === sel.adicionalId)
            if (!ad) return null
            const precioSugerido = getPrecioSugerido(ad)
            const subtotal = sel.cantidad * sel.precioUnitario
            const esCortesia = sel.precioUnitario === 0
            const esDescuento =
              !esCortesia && sel.precioUnitario < precioSugerido
            const esIncremento = sel.precioUnitario > precioSugerido
            const diferencia = sel.precioUnitario - precioSugerido

            return (
              <div
                key={sel.id}
                className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2"
              >
                {/* Línea 1: nombre, tags, eliminar */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-stone-900 flex items-center flex-wrap gap-2">
                      {ad.nombre}
                      {ad.estado === 'PENDIENTE' && (
                        <span className="text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          Pendiente aprobación
                        </span>
                      )}
                      {esCortesia && (
                        <span className="text-xs text-yellow-700 bg-yellow-100 border border-yellow-300 px-1.5 py-0.5 rounded font-medium">
                          🎁 Cortesía
                        </span>
                      )}
                      {esDescuento && (
                        <span className="text-xs text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          -${(precioSugerido - sel.precioUnitario).toLocaleString('es-MX')}
                        </span>
                      )}
                      {esIncremento && (
                        <span className="text-xs text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                          +${diferencia.toLocaleString('es-MX')}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-500">
                      Precio sugerido: ${precioSugerido.toLocaleString('es-MX')}
                      {ad.unidad ? ` / ${ad.unidad}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => quitar(sel.id)}
                    className="text-rose-500 hover:text-rose-700 text-sm flex-shrink-0"
                    title="Quitar"
                  >
                    ✕
                  </button>
                </div>

                {/* Línea 2: precio editable, cantidad, subtotal */}
                <div className="flex items-end gap-2 flex-wrap">
                  <div className="flex-1 min-w-[100px]">
                    <label className="block text-xs text-stone-600 mb-0.5">
                      Precio aplicado
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-stone-500 text-sm">$</span>
                      <NumberInput
                        value={sel.precioUnitario}
                        onChange={(v) => cambiarPrecio(sel.id, v)}
                        className="w-full px-2 py-1 border border-stone-300 rounded text-sm bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-[80px]">
                    <label className="block text-xs text-stone-600 mb-0.5">Cantidad</label>
                    <div className="flex items-center gap-1">
                      <NumberInput
                        value={sel.cantidad}
                        onChange={(v) => cambiarCantidad(sel.id, v)}
                        className="w-full px-2 py-1 border border-stone-300 rounded text-sm bg-white"
                      />
                      <span className="text-xs text-stone-500">{ad.unidad || 'u'}</span>
                    </div>
                  </div>

                  <div className="text-right min-w-[80px]">
                    <div className="text-xs text-stone-500">Subtotal</div>
                    <div className="font-medium text-stone-900 text-sm">
                      ${subtotal.toLocaleString('es-MX')}
                    </div>
                  </div>

                  {sel.precioUnitario > 0 && (
                    <button
                      type="button"
                      onClick={() => cambiarPrecio(sel.id, 0)}
                      className="text-xs text-yellow-700 hover:text-yellow-900 underline"
                      title="Marcar como cortesía"
                    >
                      Cortesía
                    </button>
                  )}
                  {sel.precioUnitario !== precioSugerido && (
                    <button
                      type="button"
                      onClick={() => cambiarPrecio(sel.id, precioSugerido)}
                      className="text-xs text-stone-500 hover:text-stone-700 underline"
                      title="Restaurar precio sugerido"
                    >
                      ↩ Restaurar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setCatalogoAbierto(!catalogoAbierto)}
          className="flex-1 px-4 py-2 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-sm transition flex items-center justify-center gap-2"
        >
          {catalogoAbierto ? '▲ Ocultar catálogo' : '▼ Ver catálogo de adicionales'}
        </button>
        <button
          type="button"
          onClick={() => setCrearOpen(!crearOpen)}
          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm transition"
        >
          {crearOpen ? '✕ Cancelar' : '+ Crear nuevo'}
        </button>
      </div>

      {/* Mini-form crear adicional rápido */}
      {crearOpen && (
        <FormCrearRapido
          categorias={categorias}
          usuarioId={usuarioId}
          paqueteId={paquete?.id}
          onCreado={(nuevo) => {
            onAdicionalCreado(nuevo)
            agregar(nuevo)
            setCrearOpen(false)
          }}
        />
      )}

      {/* Catálogo (colapsable) */}
      {catalogoAbierto && (
        <div className="space-y-3 mt-4 border-t border-stone-100 pt-4">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar adicional..."
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 text-sm"
          />

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategoriaActiva('TODAS')}
              className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                categoriaActiva === 'TODAS'
                  ? 'border-amber-600 bg-amber-50 text-amber-900'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
              }`}
            >
              Todas
            </button>
            {categorias.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoriaActiva(cat.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition flex items-center gap-1 ${
                  categoriaActiva === cat.id
                    ? 'border-amber-600 bg-amber-50 text-amber-900'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                }`}
              >
                <span>{cat.icono}</span>
                <span>{cat.nombre}</span>
              </button>
            ))}
          </div>

          <div className="max-h-96 overflow-y-auto space-y-1.5 mt-3 border border-stone-100 rounded-lg p-2">
            {adicionalesDisponibles.length === 0 ? (
              <div className="text-sm text-stone-400 italic text-center py-4">
                {busqueda ? 'No hay coincidencias' : 'No hay adicionales disponibles'}
              </div>
            ) : (
              adicionalesDisponibles.map((ad) => {
                const yaAgregado = evento.adicionales.some((s) => s.adicionalId === ad.id)
                const precio = getPrecioSugerido(ad)

                return (
                  <button
                    key={ad.id}
                    type="button"
                    onClick={() => agregar(ad)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-stone-50 transition text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-stone-900">
                        {ad.nombre}
                        {yaAgregado && (
                          <span className="ml-2 text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            ✓ Agregado
                          </span>
                        )}
                      </div>
                      {ad.notas && (
                        <div className="text-xs text-stone-500 truncate">{ad.notas}</div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-medium text-stone-900">
                        ${precio.toLocaleString('es-MX')}
                      </div>
                      {ad.unidad && (
                        <div className="text-xs text-stone-500">/ {ad.unidad}</div>
                      )}
                    </div>
                    <span className="text-amber-700 text-lg">+</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </section>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Mini-form para crear adicional rápido (queda como PENDIENTE)
// ────────────────────────────────────────────────────────────────────────
function FormCrearRapido({
  categorias,
  usuarioId,
  paqueteId,
  onCreado,
}: {
  categorias: Categoria[]
  usuarioId: string
  paqueteId: string | undefined
  onCreado: (a: Adicional) => void
}) {
  const [nombre, setNombre] = useState('')
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id || '')
  const [unidad, setUnidad] = useState<'pax' | 'unidad' | 'hora'>('unidad')
  const [precio, setPrecio] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGuardar() {
    setError(null)
    if (!nombre.trim()) {
      setError('Ingresa un nombre')
      return
    }
    if (!categoriaId) {
      setError('Selecciona una categoría')
      return
    }
    if (precio <= 0) {
      setError('Ingresa un precio mayor a 0')
      return
    }

    setGuardando(true)
    const supabase = createClient()
    const id = `ad_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    const { data, error: errSb } = await supabase
      .from('adicionales')
      .insert({
        id,
        nombre: nombre.trim(),
        categoria_id: categoriaId,
        unidad,
        precio,
        precios_por_zona: null,
        notas: null,
        estado: 'PENDIENTE',
        creado_por: usuarioId,
      })
      .select()
      .single()

    setGuardando(false)

    if (errSb) {
      setError(`Error: ${errSb.message}`)
      return
    }

    onCreado(data as Adicional)
  }

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 mb-3">
      <div className="text-sm font-medium text-stone-900 mb-3">
        Crear adicional rápido
        <span className="ml-2 text-xs text-stone-500 font-normal">
          (queda como PENDIENTE de aprobación)
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-stone-700 mb-1">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Mesa de quesos artesanales"
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-stone-700 mb-1">Categoría</label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 bg-white"
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icono} {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-stone-700 mb-1">Unidad</label>
            <select
              value={unidad}
              onChange={(e) => setUnidad(e.target.value as 'pax' | 'unidad' | 'hora')}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 bg-white"
            >
              <option value="unidad">Por unidad</option>
              <option value="pax">Por pax</option>
              <option value="hora">Por hora</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-stone-700 mb-1">
            Precio {unidad === 'pax' ? 'por pax' : unidad === 'hora' ? 'por hora' : 'por unidad'}
          </label>
          <NumberInput
            value={precio}
            onChange={setPrecio}
            placeholder="Ej: 1500"
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
        </div>

        {error && (
          <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded p-2">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGuardar}
          disabled={guardando}
          className="w-full bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition"
        >
          {guardando ? 'Guardando...' : 'Guardar y agregar a este evento'}
        </button>
      </div>
    </div>
  )
}
