'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

  // Agrupar
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

      {/* Crear nuevo */}
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

      {/* Adicionales por categoría */}
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

// ─────────────────────────────────────────────────────────────────────────
// Formulario para crear adicional nuevo
// ────────────────
