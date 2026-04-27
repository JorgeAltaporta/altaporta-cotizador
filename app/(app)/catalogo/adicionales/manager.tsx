'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import NumberInput from '@/app/components/NumberInput'

type Adicional = {
  id: string
  nombre: string
  descripcion: string | null
  categoria_id: string | null
  unidad: string | null
  precio: number
  precios_por_zona: Record<string, number> | null
  notas: string | null
  usa_tarifa_por_rango: boolean
  estado: string
}

type Categoria = {
  id: string
  nombre: string
  icono: string | null
  orden: number
}

type Zona = {
  id: string
  nombre: string
}

export default function AdicionalesManager({
  adicionalesIniciales,
  categorias,
  zonas,
  puedeEditar,
}: {
  adicionalesIniciales: Adicional[]
  categorias: Categoria[]
  zonas: Zona[]
  puedeEditar: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [adicionales, setAdicionales] = useState(adicionalesIniciales)
  const [creando, setCreando] = useState(false)

  function mostrarMensaje(tipo: 'ok' | 'error', texto: string) {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje(null), 3000)
  }

  async function actualizar(id: string, cambios: Partial<Adicional>) {
    const supabase = createClient()
    const { error } = await supabase.from('adicionales').update(cambios).eq('id', id)

    if (error) {
      mostrarMensaje('error', `Error: ${error.message}`)
      return false
    }

    setAdicionales(adicionales.map((a) => (a.id === id ? { ...a, ...cambios } : a)))
    mostrarMensaje('ok', 'Guardado')
    return true
  }

  async function crear(datos: { nombre: string; categoria_id: string; unidad: string; precio: number }) {
    const id = datos.nombre.toUpperCase()
      .replace(/\s+/g, '-')
      .replace(/[^A-Z0-9-]/g, '')
      .substring(0, 30) + '-' + Date.now().toString(36).slice(-4).toUpperCase()

    const supabase = createClient()
    const { data, error } = await supabase
      .from('adicionales')
      .insert({
        id,
        nombre: datos.nombre,
        categoria_id: datos.categoria_id,
        unidad: datos.unidad || null,
        precio: datos.precio,
        creado_por: 'JORGE',
      })
      .select()
      .single()

    if (error) {
      mostrarMensaje('error', `Error: ${error.message}`)
      return false
    }

    setAdicionales([...adicionales, data as Adicional])
    mostrarMensaje('ok', `"${datos.nombre}" agregado`)
    setCreando(false)
    router.refresh()
    return true
  }

  const activos = adicionales.filter((a) => a.estado === 'ACTIVO' && !a.usa_tarifa_por_rango)
  const archivados = adicionales.filter((a) => a.estado === 'ARCHIVADO')

  const adicionalesPorCategoria = categorias.map((cat) => ({
    ...cat,
    items: activos.filter((a) => a.categoria_id === cat.id),
  }))

  const sinCategoria = activos.filter(
    (a) => !a.categoria_id || !categorias.find((c) => c.id === a.categoria_id)
  )

  return (
    <div className="space-y-6">
      {mensaje && (
        <div
          className={`fixed top-6 right-6 z-50 p-3 rounded-lg text-sm shadow-lg ${
            mensaje.tipo === 'ok' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {puedeEditar && (
        <section className="bg-white rounded-2xl border border-stone-200 p-6">
          {!creando ? (
            <button
              onClick={() => setCreando(true)}
              className="w-full text-amber-700 hover:bg-amber-50 py-3 rounded-lg border-2 border-dashed border-stone-300 hover:border-amber-300 transition"
            >
              + Agregar adicional
            </button>
          ) : (
            <FormularioCrear
              categorias={categorias}
              onCrear={crear}
              onCancelar={() => setCreando(false)}
            />
          )}
        </section>
      )}

      <div className="space-y-8">
        {adicionalesPorCategoria.map((grupo) => (
          <div key={grupo.id}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xl">{grupo.icono}</span>
              <h2 className="font-serif text-2xl text-stone-900">{grupo.nombre}</h2>
              <span className="text-sm text-stone-500">({grupo.items.length})</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {grupo.items.map((ad) => (
                <AdicionalItem
                  key={ad.id}
                  adicional={ad}
                  categorias={categorias}
                  zonas={zonas}
                  puedeEditar={puedeEditar}
                  onActualizar={actualizar}
                />
              ))}

              {grupo.items.length === 0 && (
                <div className="col-span-full text-sm text-stone-400 py-3 italic">
                  Sin adicionales en esta categoría
                </div>
              )}
            </div>
          </div>
        ))}

        {sinCategoria.length > 0 && (
          <div>
            <h2 className="font-serif text-2xl text-stone-500 mb-4">Sin categoría</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sinCategoria.map((ad) => (
                <AdicionalItem
                  key={ad.id}
                  adicional={ad}
                  categorias={categorias}
                  zonas={zonas}
                  puedeEditar={puedeEditar}
                  onActualizar={actualizar}
                />
              ))}
            </div>
          </div>
        )}

        {archivados.length > 0 && (
          <div>
            <h2 className="font-serif text-2xl text-stone-500 mb-4">
              Archivados ({archivados.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {archivados.map((ad) => (
                <AdicionalItem
                  key={ad.id}
                  adicional={ad}
                  categorias={categorias}
                  zonas={zonas}
                  puedeEditar={puedeEditar}
                  onActualizar={actualizar}
                  archivado
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FormularioCrear({
  categorias,
  onCrear,
  onCancelar,
}: {
  categorias: Categoria[]
  onCrear: (datos: { nombre: string; categoria_id: string; unidad: string; precio: number }) => Promise<boolean>
  onCancelar: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id || '')
  const [unidad, setUnidad] = useState('pax')
  const [precio, setPrecio] = useState(0)
  const [guardando, setGuardando] = useState(false)

  async function submit() {
    if (!nombre.trim()) return
    setGuardando(true)
    const ok = await onCrear({ nombre: nombre.trim(), categoria_id: categoriaId, unidad, precio })
    setGuardando(false)
    if (ok) {
      setNombre('')
      setUnidad('pax')
      setPrecio(0)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="font-serif text-lg text-stone-900">Nuevo adicional</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
          className="px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
        />
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
        >
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icono} {c.nombre}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
          placeholder="Unidad (pax, c/u, mesa, etc.)"
          className="px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
        />
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
          <NumberInput
            value={precio}
            onChange={setPrecio}
            placeholder="Precio"
            className="w-full pl-7 pr-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={guardando || !nombre.trim()}
          className="bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
        >
          {guardando ? 'Guardando...' : 'Crear'}
        </button>
        <button
          onClick={onCancelar}
          className="border border-stone-300 hover:bg-stone-50 px-4 py-2 rounded-lg"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

function AdicionalItem({
  adicional,
  categorias,
  zonas,
  puedeEditar,
  onActualizar,
  archivado,
}: {
  adicional: Adicional
  categorias: Categoria[]
  zonas: Zona[]
  puedeEditar: boolean
  onActualizar: (id: string, cambios: Partial<Adicional>) => Promise<boolean>
  archivado?: boolean
}) {
  const [editando, setEditando] = useState(false)
  const [nombre, setNombre] = useState(adicional.nombre)
  const [categoriaId, setCategoriaId] = useState(adicional.categoria_id || '')
  const [unidad, setUnidad] = useState(adicional.unidad || '')
  const [precio, setPrecio] = useState(adicional.precio)
  const [notas, setNotas] = useState(adicional.notas || '')
  const [preciosPorZona, setPreciosPorZona] = useState<Record<string, number>>(
    adicional.precios_por_zona || {}
  )
  const [usarPreciosZona, setUsarPreciosZona] = useState(
    Object.keys(adicional.precios_por_zona || {}).length > 0
  )

  async function guardar() {
    const cambios: Partial<Adicional> = {
      nombre,
      categoria_id: categoriaId || null,
      unidad: unidad || null,
      precio,
      notas: notas || null,
      precios_por_zona: usarPreciosZona ? preciosPorZona : {},
    }
    const ok = await onActualizar(adicional.id, cambios)
    if (ok) setEditando(false)
  }

  async function archivarRestaurar() {
    await onActualizar(adicional.id, { estado: archivado ? 'ACTIVO' : 'ARCHIVADO' })
  }

  if (editando) {
    return (
      <div className="bg-white rounded-xl border border-amber-300 p-4 space-y-3 col-span-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-stone-600 mb-1">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-600 mb-1">Categoría</label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
            >
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icono} {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-stone-600 mb-1">Unidad</label>
            <input
              type="text"
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-600 mb-1">Precio base</label>
           <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
              <NumberInput
                value={precio}
                onChange={setPrecio}
                className="w-full pl-7 pr-3 py-2 border border-stone-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-stone-600 mb-1">Notas</label>
          <input
            type="text"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej: Desde $42,000 / No incluye Licor 43"
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
          />
        </div>

        <div className="border-t border-stone-100 pt-3">
          <label className="flex items-center gap-2 text-sm text-stone-700 mb-2">
            <input
              type="checkbox"
              checked={usarPreciosZona}
              onChange={(e) => setUsarPreciosZona(e.target.checked)}
              className="rounded"
            />
            <span>Usar precios distintos por zona (sobreescribe el precio base)</span>
          </label>

          {usarPreciosZona && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
              {zonas.map((z) => (
                <div key={z.id}>
                  <label className="block text-xs text-stone-600 mb-1">Zona {z.id}</label>
                 <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-xs">$</span>
                    <NumberInput
                      value={preciosPorZona[z.id] || 0}
                      onChange={(v) =>
                        setPreciosPorZona({
                          ...preciosPorZona,
                          [z.id]: v,
                        })
                      }
                      className="w-full pl-6 pr-2 py-1.5 border border-stone-300 rounded text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setEditando(false)}
            className="border border-stone-300 hover:bg-stone-50 px-4 py-2 rounded-lg text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg text-sm"
          >
            Guardar
          </button>
        </div>
      </div>
    )
  }

  const tienePreciosZona = Object.keys(adicional.precios_por_zona || {}).length > 0

  return (
    <div className={`rounded-xl border p-4 ${
      archivado
        ? 'bg-stone-50 border-stone-200 opacity-60'
        : 'bg-white border-stone-200'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="font-medium text-stone-900">{adicional.nombre}</div>
        <div className="text-right flex-shrink-0">
          {tienePreciosZona ? (
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
              precio por zona
            </span>
          ) : (
            <>
              <div className="font-medium text-stone-900">
                ${adicional.precio.toLocaleString('es-MX')}
              </div>
              {adicional.unidad && (
                <div className="text-xs text-stone-500">/ {adicional.unidad}</div>
              )}
            </>
          )}
        </div>
      </div>
      {adicional.notas && (
        <p className="text-xs text-stone-500 mt-1">{adicional.notas}</p>
      )}

      {puedeEditar && (
        <div className="flex gap-1 mt-3 pt-3 border-t border-stone-100">
          <button
            onClick={() => setEditando(true)}
            className="text-xs text-stone-600 hover:text-stone-900 px-2 py-1"
          >
            Editar
          </button>
          <button
            onClick={archivarRestaurar}
            className="text-xs text-stone-600 hover:text-stone-900 px-2 py-1"
          >
            {archivado ? 'Restaurar' : 'Archivar'}
          </button>
        </div>
      )}
    </div>
  )
}
