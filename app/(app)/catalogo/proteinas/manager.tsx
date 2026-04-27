'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Proteina = {
  id: string
  nombre: string
  nivel_id: string | null
  estado: string
}

type Nivel = {
  id: string
  nombre: string
  orden: number
  color: string | null
}

export default function ProteinasManager({
  proteinasIniciales,
  niveles,
  puedeEditar,
}: {
  proteinasIniciales: Proteina[]
  niveles: Nivel[]
  puedeEditar: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const [proteinas, setProteinas] = useState(proteinasIniciales)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoNivelId, setNuevoNivelId] = useState(niveles[0]?.id || '')

  function mostrarMensaje(tipo: 'ok' | 'error', texto: string) {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje(null), 3000)
  }

  async function actualizarProteina(id: string, cambios: Partial<Proteina>) {
    const supabase = createClient()
    const { error } = await supabase
      .from('proteinas')
      .update(cambios)
      .eq('id', id)

    if (error) {
      mostrarMensaje('error', `Error: ${error.message}`)
      return false
    }

    setProteinas(proteinas.map((p) => (p.id === id ? { ...p, ...cambios } : p)))
    mostrarMensaje('ok', 'Guardado')
    return true
  }

  async function crearProteina() {
    const nombre = nuevoNombre.trim()
    if (!nombre || !nuevoNivelId) return

    startTransition(async () => {
      const id = nombre.toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .substring(0, 30) + '_' + Date.now().toString(36).slice(-4)

      const supabase = createClient()
      const { data, error } = await supabase
        .from('proteinas')
        .insert({
          id,
          nombre,
          nivel_id: nuevoNivelId,
          creado_por: 'JORGE',
        })
        .select()
        .single()

      if (error) {
        mostrarMensaje('error', `Error: ${error.message}`)
        return
      }

      setProteinas([...proteinas, data as Proteina])
      setNuevoNombre('')
      mostrarMensaje('ok', `"${nombre}" agregada`)
      router.refresh()
    })
  }

  // Agrupar proteínas por nivel
  const proteinasPorNivel = niveles.map((nivel) => ({
    ...nivel,
    proteinas: proteinas.filter((p) => p.nivel_id === nivel.id && p.estado === 'ACTIVO'),
  }))

  const archivadas = proteinas.filter((p) => p.estado === 'ARCHIVADO')

  return (
    <div className="space-y-6">
      {/* Mensaje */}
      {mensaje && (
        <div
          className={`fixed top-6 right-6 z-50 p-3 rounded-lg text-sm shadow-lg ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {/* Crear nueva */}
      {puedeEditar && (
        <section className="bg-white rounded-2xl border border-stone-200 p-6">
          <h2 className="font-serif text-lg text-stone-900 mb-4">Agregar proteína</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), crearProteina())}
              placeholder="Nombre (ej: Pulpo a la parrilla)"
              className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
            <select
              value={nuevoNivelId}
              onChange={(e) => setNuevoNivelId(e.target.value)}
              className="px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            >
              {niveles.map((n) => (
                <option key={n.id} value={n.id}>
                  Nivel {n.nombre}
                </option>
              ))}
            </select>
            <button
              onClick={crearProteina}
              disabled={isPending || !nuevoNombre.trim()}
              className="bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition"
            >
              Agregar
            </button>
          </div>
        </section>
      )}

      {/* Proteínas por nivel */}
      <div className="space-y-8">
        {proteinasPorNivel.map((grupo) => (
          <div key={grupo.id}>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: grupo.color || '#A8A29E' }}
              />
              <h2 className="font-serif text-2xl text-stone-900">
                Nivel {grupo.nombre}
              </h2>
              <span className="text-sm text-stone-500">
                ({grupo.proteinas.length})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {grupo.proteinas.map((p) => (
                <ProteinaItem
                  key={p.id}
                  proteina={p}
                  niveles={niveles}
                  color={grupo.color}
                  puedeEditar={puedeEditar}
                  onActualizar={actualizarProteina}
                />
              ))}

              {grupo.proteinas.length === 0 && (
                <div className="col-span-full text-sm text-stone-400 py-3">
                  Sin proteínas en este nivel
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Archivadas */}
        {archivadas.length > 0 && (
          <div>
            <h2 className="font-serif text-2xl text-stone-500 mb-4">
              Archivadas ({archivadas.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {archivadas.map((p) => (
                <ProteinaItem
                  key={p.id}
                  proteina={p}
                  niveles={niveles}
                  color={null}
                  puedeEditar={puedeEditar}
                  onActualizar={actualizarProteina}
                  archivada
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ProteinaItem({
  proteina,
  niveles,
  color,
  puedeEditar,
  onActualizar,
  archivada,
}: {
  proteina: Proteina
  niveles: Nivel[]
  color: string | null
  puedeEditar: boolean
  onActualizar: (id: string, cambios: Partial<Proteina>) => Promise<boolean>
  archivada?: boolean
}) {
  const [editando, setEditando] = useState(false)
  const [nombre, setNombre] = useState(proteina.nombre)
  const [nivelId, setNivelId] = useState(proteina.nivel_id || '')

  async function guardar() {
    const ok = await onActualizar(proteina.id, { nombre, nivel_id: nivelId })
    if (ok) setEditando(false)
  }

  async function archivarRestaurar() {
    const nuevoEstado = archivada ? 'ACTIVO' : 'ARCHIVADO'
    await onActualizar(proteina.id, { estado: nuevoEstado })
  }

  if (editando) {
    return (
      <div className="bg-white rounded-xl border border-amber-300 p-3 space-y-2">
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full px-2 py-1 border border-stone-300 rounded text-sm"
        />
        <select
          value={nivelId}
          onChange={(e) => setNivelId(e.target.value)}
          className="w-full px-2 py-1 border border-stone-300 rounded text-sm"
        >
          {niveles.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nombre}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            onClick={guardar}
            className="flex-1 bg-amber-700 hover:bg-amber-800 text-white px-3 py-1 rounded text-sm"
          >
            Guardar
          </button>
          <button
            onClick={() => {
              setNombre(proteina.nombre)
              setNivelId(proteina.nivel_id || '')
              setEditando(false)
            }}
            className="px-3 py-1 border border-stone-300 rounded text-sm hover:bg-stone-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${
      archivada
        ? 'bg-stone-50 border-stone-200 opacity-60'
        : 'bg-white border-stone-200'
    }`}>
      <div
        className="w-2 h-8 rounded-full flex-shrink-0"
        style={{ backgroundColor: color || '#A8A29E' }}
      />
      <span className="flex-1 text-stone-900">{proteina.nombre}</span>
      {puedeEditar && (
        <div className="flex gap-1">
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
            {archivada ? 'Restaurar' : 'Archivar'}
          </button>
        </div>
      )}
    </div>
  )
}
