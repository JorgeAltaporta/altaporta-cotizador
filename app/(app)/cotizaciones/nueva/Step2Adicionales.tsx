'use client'

import { useState } from 'react'
import NumberInput from '@/app/components/NumberInput'
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
}: {
  eventos: EventoForm[]
  onChange: (eventos: EventoForm[]) => void
  adicionales: Adicional[]
  categorias: Categoria[]
  zonas: Zona[]
  paquetes: Paquete[]
}) {
  function actualizarAdicionales(idxEvento: number, nuevos: AdicionalSeleccionado[]) {
    onChange(
      eventos.map((e, i) =>
        i === idxEvento ? { ...e, adicionales: nuevos } : e
      )
    )
  }

  return (
    <div className="space-y-6">
      {eventos.map((evt, idx) => {
        const zona = zonas.find((z) => z.id === evt.zonaIdManual || z.id === '') ||
                     zonas.find((z) => (z.locaciones || []).some(
                       (l) => l.nombre.toLowerCase() === evt.locacionTexto.toLowerCase()
                     )) ||
                     zonas.find((z) => z.id === evt.zonaIdManual)

        const paquete = paquetes.find((p) => p.id === evt.paqueteId)

        return (
          <EventoAdicionales
            key={evt.id}
            evento={evt}
            idx={idx}
            total={eventos.length}
            zona={zona}
            paquete={paquete}
            adicionales={adicionales}
            categorias={categorias}
            onUpdate={(nuevos) => actualizarAdicionales(idx, nuevos)}
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
  onUpdate,
}: {
  evento: EventoForm
  idx: number
  total: number
  zona: Zona | undefined
  paquete: Paquete | undefined
  adicionales: Adicional[]
  categorias: Categoria[]
  onUpdate: (nuevos: AdicionalSeleccionado[]) => void
}) {
  const [busqueda, setBusqueda] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState<string | 'TODAS'>('TODAS')

  // Filtrar adicionales según permisos del paquete y búsqueda/categoría
  const adicionalesDisponibles = adicionales.filter((a) => {
    if (a.estado !== 'ACTIVO') return false
    // Si el paquete tiene restricción, filtrar
    if (paquete?.adicionales_permitidos && paquete.adicionales_permitidos.length > 0) {
      if (!paquete.adicionales_permitidos.includes(a.id)) return false
    }
    // Búsqueda
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      if (!a.nombre.toLowerCase().includes(q)) return false
    }
    // Categoría
    if (categoriaActiva !== 'TODAS' && a.categoria_id !== categoriaActiva) return false
    return true
  })

  function getPrecio(adicional: Adicional): number {
    // Si tiene precios por zona y hay zona seleccionada, usarlo
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
      // Incrementar cantidad
      onUpdate(
        evento.adicionales.map((a) =>
          a.adicionalId === adicional.id ? { ...a, cantidad: a.cantidad + 1 } : a
        )
      )
    } else {
      const precio = getPrecio(adicional)
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

  // Calcular totales
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
            const subtotal = sel.cantidad * sel.precioUnitario

            return (
              <div
                key={sel.id}
                className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-stone-900">
                    {ad.nombre}
                  </div>
                  <div className="text-xs text-stone-500">
                    ${sel.precioUnitario.toLocaleString('es-MX')} {ad.unidad ? `/ ${ad.unidad}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <NumberInput
                    value={sel.cantidad}
                    onChange={(v) => cambiarCantidad(sel.id, v)}
                    className="w-20 px-2 py-1 border border-stone-300 rounded text-sm text-center bg-white"
                  />
                  <span className="text-xs text-stone-500 w-8">{ad.unidad || 'u'}</span>
                </div>

                <div className="text-right w-24">
                  <div className="font-medium text-stone-900 text-sm">
                    ${subtotal.toLocaleString('es-MX')}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => quitar(sel.id)}
                  className="text-rose-500 hover:text-rose-700 text-sm w-6"
                  title="Quitar"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Buscador */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-stone-700">Agregar del catálogo</h4>

        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar adicional..."
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 text-sm"
        />

        {/* Filtro de categorías */}
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

        {/* Lista de adicionales disponibles */}
        <div className="max-h-96 overflow-y-auto space-y-1.5 mt-3 border border-stone-100 rounded-lg p-2">
          {adicionalesDisponibles.length === 0 ? (
            <div className="text-sm text-stone-400 italic text-center py-4">
              {busqueda
                ? 'No hay coincidencias'
                : 'No hay adicionales disponibles'}
            </div>
          ) : (
            adicionalesDisponibles.map((ad) => {
              const yaAgregado = evento.adicionales.some((s) => s.adicionalId === ad.id)
              const precio = getPrecio(ad)

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
    </section>
  )
}
