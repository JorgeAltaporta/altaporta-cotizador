'use client'

import { useState } from 'react'
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
  color: string | null
  orden: number
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
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [proteinas, setProteinas] = useState(proteinasIniciales)
  const [creando, setCreando] = useState(false)
  const [mostrarArchivadas, setMostrarArchivadas] = useState(false)

  function mostrarMensaje(tipo: 'ok' | 'error', texto: string) {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje(null), 3000)
  }

  async function actualizar(id: string, cambios: Partial<Proteina>) {
    const supabase = createClient()
    const { error } = await supabase.from('proteinas').update(cambios).eq('id', id)

    if (error) {
      mostrarMensaje('error', `Error: ${error.message}`)
      return false
    }

    setProteinas(proteinas.map((p) => (p.id === id ? { ...p, ...cambios } : p)))
    mostrarMensaje('ok', 'Guardado')
    return true
  }

  async function crear(nombre: string, nivelId: string) {
    const id = nombre.toUpperCase()
      .replace(/\s+/g, '-')
      .replace(/[^A-Z0-9-]/g, '')
      .substring(0, 30) + '-' + Date.now().toString(36).slice(-4).toUpperCase()

    const supabase = createClient()
    const { data, error } = await supabase
      .from('proteinas')
      .insert({
        id,
        nombre,
        nivel_id: nivelId,
        creado_por: 'JORGE',
      })
      .select()
      .single()

    if (error) {
      mostrarMensaje('error', `Error: ${error.message}`)
      return false
    }

    setProteinas([...proteinas, data as Proteina])
    mostrarMensaje('ok', `"${nombre}" agregada`)
    setCreando(false)
    router.refresh()
    return true
  }

  const activas = proteinas.filter((p) => p.estado === 'ACTIVO')
  const archivadas = proteinas.filter((p) => p.estado === 'ARCHIVADO')

  const proteinasPorNivel = niveles.map((nivel) => ({
    ...nivel,
    items: activas.filter((p) => p.nivel_id === nivel.id),
  }))

  const sinNivel = activas.filter((p) => !p.nivel_id || !niveles.find((n) => n.id === p.nivel_id))

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
              + Agregar proteína
            </button>
          ) : (
            <FormularioCrear
              niveles={niveles}
              onCrear={crear}
              onCancelar={() => setCreando(false)}
            />
          )}
        </section>
      )}

      <div className="space-y-8">
        {proteinasPorNivel.map((nivel) => (
          <div key={nivel.id}>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: nivel.color || '#A8A29E' }}
              />
              <h2 className="font-serif text-2xl text-stone-900">Nivel {nivel.nombre}</h2>
              <span className="text-sm text-stone-500">({nivel.items.length})</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {nivel.items.map((p) => (
                <ProteinaItem
                  key={p.id}
                  proteina={p}
                  niveles={niveles}
                  puedeEditar={puedeEditar}
                  onActualizar={actualizar}
                />
              ))}

              {nivel.items.length === 0 && (
                <div className="col-span-full text-sm text-stone-400 py-3 italic">
                  Sin proteínas en este nivel
                </div>
              )}
            </div>
          </div>
        ))}

        {sinNivel.length > 0 && (
          <div>
            <h2 className="font-serif text-2xl text-stone-500 mb-4">Sin nivel</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {sinNivel.map((p) => (
                <ProteinaItem
                  key={p.id}
                  proteina={p}
                  niveles={niveles}
                  puedeEditar={puedeEditar}
                  onActualizar={actualizar}
                />
              ))}
            </div>
          </div>
        )}

        {archivadas.length > 0 && (
          <div className="mt-12">
            <button
              onClick={() => setMostrarArchivadas(!mostrarArchivadas)}
              className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 mb-4"
            >
              <span>{mostrarArchivadas ? '▼' : '▶'}</span>
              <span>Archivadas ({archivadas.length})</span>
            </button>
            {mostrarArchivadas && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {archivadas.map((p) => (
                  <ProteinaItem
                    key={p.id}
                    proteina={p}
                    niveles={niveles}
                    puedeEditar={puedeEditar}
                    onActualizar={actualizar}
                    archivada
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function FormularioCrear({
  niveles,
  onCrear,
  onCancelar,
}: {
  niveles: Nivel[]
  onCrear: (nombre: string, nivelId: string) => Promise<boolean>
  onCancelar: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [nivelId, setNivelId] = useState(niveles[0]?.id || '')
  const [guardando, setGuardando] = useState(false)

  async function submit() {
    if (!nombre.trim()) return
    setGuardando(true)
    const ok = await onCrear(nombre.trim(), nivelId)
    setGuardando(false)
    if (ok) setNombre('')
  }

  return (
    <div className="space-y-3">
      <h3 className="font-serif text-lg text-stone-900">Nueva proteína</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre (ej: Atún sellado)"
          className="px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
        />
        <select
          value={nivelId}
          onChange={(e) => setNivelId(e.target.value)}
          className="px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
        >
          {niveles.map((n) => (
            <option key={n.id} value={n.id}>
              Nivel {n.nombre}
            </option>
          ))}
        </select>
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

function ProteinaItem({
  proteina,
  niveles,
  puedeEditar,
  onActualizar,
  archivada,
}: {
  proteina: Proteina
  niveles: Nivel[]
  puedeEditar: boolean
  onActualizar: (id: string, cambios: Partial<Proteina>) => Promise<boolean>
  archivada?: boolean
}) {
  const [editando, setEditando] = useState(false)
  const [nombre, setNombre] = useState(proteina.nombre)
  const [nivelId, setNivelId] = useState(proteina.nivel_id || '')

  async function guardar() {
    const ok = await onActualizar(proteina.id, { nombre, nivel_id: nivelId || null })
    if (ok) setEditando(false)
  }

  async function archivarRestaurar() {
    await onActualizar(proteina.id, { estado: archivada ? 'ACTIVO' : 'ARCHIVADO' })
  }

  if (editando) {
    return (
      <div className="bg-white rounded-xl border border-amber-300 p-4 space-y-3">
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
        />
        <select
          value={nivelId}
          onChange={(e) => setNivelId(e.target.value)}
          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
        >
          <option value="">Sin nivel</option>
          {niveles.map((n) => (
            <option key={n.id} value={n.id}>
              Nivel {n.nombre}
            </option>
          ))}
        </select>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setEditando(false)}
            className="border border-stone-300 hover:bg-stone-50 px-3 py-1.5 rounded text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            className="bg-amber-700 hover:bg-amber-800 text-white px-3 py-1.5 rounded text-sm"
          >
            Guardar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border p-4 ${
        archivada ? 'bg-stone-50 border-stone-200 opacity-60' : 'bg-white border-stone-200'
      }`}
    >
      <div className="font-medium text-stone-900">{proteina.nombre}</div>

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
            {archivada ? 'Restaurar' : 'Archivar'}
          </button>
        </div>
      )}
    </div>
  )
}
