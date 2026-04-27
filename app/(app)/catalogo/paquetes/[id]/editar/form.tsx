'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import CategoriasEditor, { type Categoria } from './CategoriasEditor'
import SlotsEditor, { type Slot } from './SlotsEditor'
import PermisosEditor from './PermisosEditor'
import NumberInput from '@/app/components/NumberInput'

type Rango = {
  id: string
  nombre: string
  min_pax: number
  max_pax: number | null
}

type Paquete = {
  id: string
  nombre: string
  descripcion: string | null
  color: string | null
  horas_servicio: number
  base_min_pax: number
  anticipo_pct: number
  precios: number[]
  categorias: Categoria[] | null
  proteina_slots: Slot[] | null
  zonas_permitidas: string[] | null
  adicionales_permitidos: string[] | null
  estado: string
}

type Proteina = { id: string; nombre: string; nivel_id: string | null }
type Nivel = { id: string; nombre: string; color: string | null; orden: number }
type Zona = { id: string; nombre: string; color: string | null }
type Adicional = { id: string; nombre: string; categoria_id: string | null }
type CatAd = { id: string; nombre: string; icono: string | null; orden: number }

const COLORES_SUGERIDOS = [
  '#F4A78F',
  '#FDE68A',
  '#BBF7D0',
  '#BFDBFE',
  '#E7E5E4',
  '#FECACA',
  '#DDD6FE',
  '#FED7AA',
]

export default function EditarPaqueteForm({
  paquete,
  rangos,
  proteinas,
  niveles,
  zonas,
  adicionales,
  categorias: categoriasAdicionales,
}: {
  paquete: Paquete
  rangos: Rango[]
  proteinas: Proteina[]
  niveles: Nivel[]
  zonas: Zona[]
  adicionales: Adicional[]
  categorias: CatAd[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const [nombre, setNombre] = useState(paquete.nombre)
  const [descripcion, setDescripcion] = useState(paquete.descripcion || '')
  const [color, setColor] = useState(paquete.color || '#E7E5E4')
  const [horas, setHoras] = useState(paquete.horas_servicio)
  const [pax, setPax] = useState(paquete.base_min_pax)
  const [anticipo, setAnticipo] = useState(paquete.anticipo_pct)
  const [estado, setEstado] = useState(paquete.estado)
  const [confirmarArchivar, setConfirmarArchivar] = useState(false)

  const [precios, setPrecios] = useState<number[]>(
    rangos.map((_, i) => paquete.precios?.[i] || 0)
  )

  const [categorias, setCategorias] = useState<Categoria[]>(paquete.categorias || [])
  const [slots, setSlots] = useState<Slot[]>(paquete.proteina_slots || [])
  const [zonasPermitidas, setZonasPermitidas] = useState<string[]>(paquete.zonas_permitidas || [])
  const [adicionalesPermitidos, setAdicionalesPermitidos] = useState<string[]>(
    paquete.adicionales_permitidos || []
  )

  function actualizarPrecio(idx: number, valor: number) {
    const nuevos = [...precios]
    nuevos[idx] = valor
    setPrecios(nuevos)
  }

  async function handleGuardar(estadoFinal?: string) {
    setMensaje(null)
    const estadoAGuardar = estadoFinal || estado
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from('paquetes')
        .update({
          nombre,
          descripcion: descripcion || null,
          color,
          horas_servicio: horas,
          base_min_pax: pax,
          anticipo_pct: anticipo,
          precios,
          categorias,
          proteina_slots: slots,
          zonas_permitidas: zonasPermitidas,
          adicionales_permitidos: adicionalesPermitidos,
          estado: estadoAGuardar,
        })
        .eq('id', paquete.id)

      if (error) {
        setMensaje({ tipo: 'error', texto: `Error: ${error.message}` })
        return
      }

      setEstado(estadoAGuardar)
      setMensaje({ tipo: 'ok', texto: 'Cambios guardados.' })
      router.refresh()
    })
  }

  async function handleArchivar() {
    setConfirmarArchivar(false)
    await handleGuardar('ARCHIVADO')
  }

  async function handleRestaurar() {
    await handleGuardar('ACTIVO')
  }

  return (
    <div className="space-y-6">
      {/* Badge de estado actual */}
      {estado !== 'ACTIVO' && (
        <div
          className={`p-3 rounded-lg text-sm ${
            estado === 'ARCHIVADO'
              ? 'bg-stone-100 border border-stone-300 text-stone-700'
              : 'bg-amber-50 border border-amber-200 text-amber-700'
          }`}
        >
          {estado === 'ARCHIVADO' && '📦 Este paquete está archivado. No aparece en cotizaciones nuevas.'}
          {estado === 'BORRADOR' && '✏️ Este paquete está en borrador. No aparece en cotizaciones nuevas.'}
        </div>
      )}

      {/* INFORMACIÓN GENERAL */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl text-stone-900 mb-4">Información general</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-stone-700 mb-1.5">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-700 mb-1.5">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-700 mb-1.5">Color</label>
            <div className="flex items-center gap-2">
              <div
                className="w-12 h-12 rounded-lg border border-stone-200"
                style={{ backgroundColor: color }}
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 font-mono text-sm"
              />
            </div>
            <div className="flex gap-2 mt-2">
              {COLORES_SUGERIDOS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded border border-stone-200 hover:scale-110 transition"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-stone-700 mb-1.5">Horas servicio</label>
              <NumberInput
                value={horas}
                onChange={setHoras}
                min={1}
                max={24}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-700 mb-1.5">Pax mínimo</label>
              <NumberInput
                value={pax}
                onChange={setPax}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-700 mb-1.5">Anticipo (%)</label>
              <NumberInput
                value={anticipo}
                onChange={setAnticipo}
                max={100}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>
          </div>
        </div>
      </section>

      {/* PRECIOS */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl text-stone-900 mb-1">Precios por rango de pax</h2>
        <p className="text-sm text-stone-500 mb-4">Costo por persona</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {rangos.map((rango, idx) => (
            <div key={rango.id}>
              <label className="block text-xs text-stone-600 mb-1">{rango.nombre} pax</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
                <NumberInput
                  value={precios[idx] || 0}
                  onChange={(v) => actualizarPrecio(idx, v)}
                  className="w-full pl-7 pr-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORÍAS Y ATRIBUTOS */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl text-stone-900 mb-1">Contenido del paquete</h2>
        <p className="text-sm text-stone-500 mb-4">
          Categorías y atributos que aparecen en el PDF de la cotización
        </p>
        <CategoriasEditor categorias={categorias} onChange={setCategorias} />
      </section>

      {/* SLOTS DE PROTEÍNA */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl text-stone-900 mb-1">Slots de proteína</h2>
        <p className="text-sm text-stone-500 mb-4">
          Cómo se reparten las proteínas en el menú (deben sumar 100%)
        </p>
        <SlotsEditor
          slots={slots}
          proteinas={proteinas}
          niveles={niveles}
          onChange={setSlots}
        />
      </section>

      {/* PERMISOS */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl text-stone-900 mb-1">Restricciones</h2>
        <p className="text-sm text-stone-500 mb-4">
          ¿En qué zonas y con qué adicionales se puede usar este paquete?
        </p>
        <PermisosEditor
          zonasPermitidas={zonasPermitidas}
          adicionalesPermitidos={adicionalesPermitidos}
          todasLasZonas={zonas}
          todosLosAdicionales={adicionales}
          categorias={categoriasAdicionales}
          onChangeZonas={setZonasPermitidas}
          onChangeAdicionales={setAdicionalesPermitidos}
        />
      </section>

      {/* ZONA DE PELIGRO - ARCHIVAR */}
      <section className="bg-stone-50 rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-lg text-stone-700 mb-2">Acciones</h2>

        {estado === 'ACTIVO' || estado === 'BORRADOR' ? (
          <div>
            <p className="text-sm text-stone-600 mb-3">
              Archivar el paquete lo oculta de cotizaciones nuevas pero no lo elimina. Las cotizaciones existentes que lo usan no se ven afectadas.
            </p>
            {confirmarArchivar ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-700">¿Confirmar?</span>
                <button
                  type="button"
                  onClick={handleArchivar}
                  disabled={isPending}
                  className="text-sm bg-stone-700 hover:bg-stone-800 text-white px-4 py-1.5 rounded-lg"
                >
                  Sí, archivar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmarArchivar(false)}
                  className="text-sm text-stone-600 hover:text-stone-900 px-3 py-1.5"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmarArchivar(true)}
                className="text-sm border border-stone-300 hover:bg-stone-100 text-stone-700 px-4 py-2 rounded-lg"
              >
                📦 Archivar paquete
              </button>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm text-stone-600 mb-3">
              Este paquete está archivado. Restáuralo para que vuelva a aparecer en cotizaciones nuevas.
            </p>
            <button
              type="button"
              onClick={handleRestaurar}
              disabled={isPending}
              className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
            >
              ↩ Restaurar paquete
            </button>
          </div>
        )}
      </section>

      {/* BOTONES */}
      <div className="flex items-center justify-between sticky bottom-4 bg-white rounded-2xl border border-stone-200 p-4 shadow-lg">
        <Link href="/catalogo/paquetes" className="text-sm text-stone-600 hover:text-stone-900">
          Cancelar
        </Link>
        <button
          onClick={() => handleGuardar()}
          disabled={isPending}
          className="bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg transition"
        >
          {isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

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
    </div>
  )
}
