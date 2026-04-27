'use client'

import { useState } from 'react'

export type Atributo = {
  id: string
  nombre: string
  valor: string
}

export type Categoria = {
  id: string
  nombre: string
  icono: string
  atributos: Atributo[]
}

const ICONOS_SUGERIDOS = ['🍽️', '🥤', '🥂', '🪑', '👥', '🎁', '💐', '🎵', '📋']

export default function CategoriasEditor({
  categorias,
  onChange,
}: {
  categorias: Categoria[]
  onChange: (nuevas: Categoria[]) => void
}) {
  function agregarCategoria() {
    const nueva: Categoria = {
      id: `cat_${Date.now()}`,
      nombre: 'Nueva categoría',
      icono: '📋',
      atributos: [],
    }
    onChange([...categorias, nueva])
  }

  function actualizarCategoria(id: string, cambios: Partial<Categoria>) {
    onChange(categorias.map((c) => (c.id === id ? { ...c, ...cambios } : c)))
  }

  function eliminarCategoria(id: string) {
    onChange(categorias.filter((c) => c.id !== id))
  }

  function moverArriba(idx: number) {
    if (idx === 0) return
    const nuevas = [...categorias]
    ;[nuevas[idx - 1], nuevas[idx]] = [nuevas[idx], nuevas[idx - 1]]
    onChange(nuevas)
  }

  function moverAbajo(idx: number) {
    if (idx === categorias.length - 1) return
    const nuevas = [...categorias]
    ;[nuevas[idx], nuevas[idx + 1]] = [nuevas[idx + 1], nuevas[idx]]
    onChange(nuevas)
  }

  function agregarAtributo(catId: string) {
    const nuevo: Atributo = {
      id: `attr_${Date.now()}`,
      nombre: 'Nuevo atributo',
      valor: '',
    }
    const cat = categorias.find((c) => c.id === catId)
    if (!cat) return
    actualizarCategoria(catId, { atributos: [...cat.atributos, nuevo] })
  }

  function actualizarAtributo(catId: string, attrId: string, cambios: Partial<Atributo>) {
    const cat = categorias.find((c) => c.id === catId)
    if (!cat) return
    actualizarCategoria(catId, {
      atributos: cat.atributos.map((a) => (a.id === attrId ? { ...a, ...cambios } : a)),
    })
  }

  function eliminarAtributo(catId: string, attrId: string) {
    const cat = categorias.find((c) => c.id === catId)
    if (!cat) return
    actualizarCategoria(catId, {
      atributos: cat.atributos.filter((a) => a.id !== attrId),
    })
  }

  return (
    <div className="space-y-3">
      {categorias.map((cat, idx) => (
        <CategoriaCard
          key={cat.id}
          categoria={cat}
          esPrimera={idx === 0}
          esUltima={idx === categorias.length - 1}
          onUpdate={(cambios) => actualizarCategoria(cat.id, cambios)}
          onDelete={() => eliminarCategoria(cat.id)}
          onMoveUp={() => moverArriba(idx)}
          onMoveDown={() => moverAbajo(idx)}
          onAddAtributo={() => agregarAtributo(cat.id)}
          onUpdateAtributo={(attrId, cambios) => actualizarAtributo(cat.id, attrId, cambios)}
          onDeleteAtributo={(attrId) => eliminarAtributo(cat.id, attrId)}
        />
      ))}

      <button
        type="button"
        onClick={agregarCategoria}
        className="w-full text-amber-700 hover:bg-amber-50 py-3 rounded-lg border-2 border-dashed border-stone-300 hover:border-amber-300 transition text-sm"
      >
        + Agregar categoría
      </button>
    </div>
  )
}

function CategoriaCard({
  categoria,
  esPrimera,
  esUltima,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddAtributo,
  onUpdateAtributo,
  onDeleteAtributo,
}: {
  categoria: Categoria
  esPrimera: boolean
  esUltima: boolean
  onUpdate: (cambios: Partial<Categoria>) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onAddAtributo: () => void
  onUpdateAtributo: (attrId: string, cambios: Partial<Atributo>) => void
  onDeleteAtributo: (attrId: string) => void
}) {
  const [showIconos, setShowIconos] = useState(false)
  const [confirmarBorrar, setConfirmarBorrar] = useState(false)

  return (
    <div className="bg-stone-50 rounded-xl border border-stone-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowIconos(!showIconos)}
            className="w-10 h-10 rounded-lg bg-white border border-stone-300 hover:border-amber-400 flex items-center justify-center text-xl"
          >
            {categoria.icono}
          </button>
          {showIconos && (
            <div className="absolute top-12 left-0 z-10 bg-white border border-stone-200 rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1">
              {ICONOS_SUGERIDOS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => {
                    onUpdate({ icono: ic })
                    setShowIconos(false)
                  }}
                  className="w-9 h-9 hover:bg-stone-100 rounded flex items-center justify-center text-xl"
                >
                  {ic}
                </button>
              ))}
            </div>
          )}
        </div>

        <input
          type="text"
          value={categoria.nombre}
          onChange={(e) => onUpdate({ nombre: e.target.value })}
          className="flex-1 px-3 py-2 border border-stone-300 rounded-lg bg-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-600"
        />

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={esPrimera}
            className="p-1.5 text-stone-500 hover:text-stone-900 disabled:opacity-30"
            title="Subir"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={esUltima}
            className="p-1.5 text-stone-500 hover:text-stone-900 disabled:opacity-30"
            title="Bajar"
          >
            ↓
          </button>
          {confirmarBorrar ? (
            <>
              <button
                type="button"
                onClick={onDelete}
                className="text-xs text-rose-600 hover:text-rose-800 px-2"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setConfirmarBorrar(false)}
                className="text-xs text-stone-500 hover:text-stone-700 px-2"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmarBorrar(true)}
              className="p-1.5 text-rose-500 hover:text-rose-700"
              title="Eliminar"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 ml-12">
        {categoria.atributos.map((attr) => (
          <div key={attr.id} className="flex gap-2 items-start">
            <input
              type="text"
              value={attr.nombre}
              onChange={(e) => onUpdateAtributo(attr.id, { nombre: e.target.value })}
              placeholder="Nombre del atributo"
              className="w-48 px-2 py-1.5 border border-stone-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
            <input
              type="text"
              value={attr.valor}
              onChange={(e) => onUpdateAtributo(attr.id, { valor: e.target.value })}
              placeholder="Valor / descripción"
              className="flex-1 px-2 py-1.5 border border-stone-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
            <button
              type="button"
              onClick={() => onDeleteAtributo(attr.id)}
              className="p-1.5 text-rose-500 hover:text-rose-700 text-sm"
              title="Eliminar atributo"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={onAddAtributo}
          className="text-xs text-amber-700 hover:text-amber-900 py-1"
        >
          + Agregar atributo
        </button>
      </div>
    </div>
  )
}
