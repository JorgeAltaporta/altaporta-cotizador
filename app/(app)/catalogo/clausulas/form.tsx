'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import NumberInput from '@/app/components/NumberInput'

type Clausulas = {
  anticipoPct: number
  vigenciaDiasDefault: number
  cambioFecha: string
  instalaciones: string
}

export default function ClausulasForm({
  clausulasIniciales,
  puedeEditar,
}: {
  clausulasIniciales: Clausulas
  puedeEditar: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<Clausulas>(clausulasIniciales)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  function handleGuardar() {
    setMensaje(null)
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from('clausulas_globales')
        .update({ contenido: data })
        .eq('id', 'global')

      if (error) {
        setMensaje({ tipo: 'error', texto: `Error: ${error.message}` })
        return
      }

      setMensaje({ tipo: 'ok', texto: '✓ Cláusulas guardadas' })
      setTimeout(() => setMensaje(null), 3000)
    })
  }

  function handleRestaurar() {
    setData(clausulasIniciales)
    setMensaje(null)
  }

  const haCambios = JSON.stringify(data) !== JSON.stringify(clausulasIniciales)

  return (
    <div className="space-y-6">
      {!puedeEditar && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
          🔒 Solo Jorge y Danna pueden editar estas cláusulas. Estás viendo en modo lectura.
        </div>
      )}

      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl text-stone-900 mb-4">Anticipo y vigencia</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-stone-700 mb-1.5">
              Porcentaje de anticipo default
            </label>
            <div className="flex items-center gap-2">
              <NumberInput
                value={data.anticipoPct}
                onChange={(v) => setData({ ...data, anticipoPct: v })}
                max={100}
                disabled={!puedeEditar}
                className="w-32 px-3 py-2 border border-stone-300 rounded-lg text-sm disabled:bg-stone-50 disabled:text-stone-500"
              />
              <span className="text-stone-500 text-sm">%</span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Porcentaje del total que se requiere como anticipo para apartar fecha. Cada cotización puede cambiarlo.
            </p>
          </div>

          <div>
            <label className="block text-sm text-stone-700 mb-1.5">
              Vigencia default (días)
            </label>
            <div className="flex items-center gap-2">
              <NumberInput
                value={data.vigenciaDiasDefault}
                onChange={(v) => setData({ ...data, vigenciaDiasDefault: v })}
                disabled={!puedeEditar}
                className="w-32 px-3 py-2 border border-stone-300 rounded-lg text-sm disabled:bg-stone-50 disabled:text-stone-500"
              />
              <span className="text-stone-500 text-sm">días</span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Cuántos días es válida una cotización desde su emisión. Cada cotización puede cambiarlo.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl text-stone-900 mb-4">Textos de los términos</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-stone-700 mb-1.5">
              Cambio de fecha o invitados
            </label>
            <input
              type="text"
              value={data.cambioFecha}
              onChange={(e) => setData({ ...data, cambioFecha: e.target.value })}
              disabled={!puedeEditar}
              placeholder="Ej: Se actualiza costo por persona"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm disabled:bg-stone-50 disabled:text-stone-500"
            />
            <p className="text-xs text-stone-500 mt-1">
              Aparece en el PDF: <em>"En caso de cambiar de fecha o reducir número de invitados, [este texto]."</em>
            </p>
          </div>

          <div>
            <label className="block text-sm text-stone-700 mb-1.5">
              Instalaciones del cliente
            </label>
            <input
              type="text"
              value={data.instalaciones}
              onChange={(e) => setData({ ...data, instalaciones: e.target.value })}
              disabled={!puedeEditar}
              placeholder="Ej: Las proporciona el cliente"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm disabled:bg-stone-50 disabled:text-stone-500"
            />
            <p className="text-xs text-stone-500 mt-1">
              Texto referente a quién proporciona las instalaciones para el manejo de alimentos.
            </p>
          </div>
        </div>
      </section>

      {/* PREVIEW DE CÓMO SE VEN EN EL PDF */}
      <section className="bg-stone-50 rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl text-stone-900 mb-4">Preview en cotización</h2>
        <p className="text-xs text-stone-500 mb-3">
          Así se verán los términos en cada cotización (los valores reales pueden cambiar por cotización).
        </p>
        <ul className="text-sm text-stone-700 space-y-2 list-disc pl-5 bg-white p-4 rounded-lg border border-stone-100">
          <li>El cliente proporcionará instalaciones adecuadas para el manejo de alimentos.</li>
          <li>
            El uso indebido o daños al mobiliario durante el evento generarán cargos adicionales,
            mismos que deberán ser cubiertos por el cliente.
          </li>
          <li>Presupuesto válido por <strong>{data.vigenciaDiasDefault}</strong> días a partir de su emisión.</li>
          <li>
            En caso de cambiar de fecha o reducir número de invitados,{' '}
            <strong>{data.cambioFecha.toLowerCase()}</strong>.
          </li>
          <li>
            Se requiere un anticipo del <strong>{data.anticipoPct}%</strong> del total para el apartado de fecha.
          </li>
          <li>Los costos presentados no incluyen propinas, las cuales quedan a consideración del cliente.</li>
        </ul>
      </section>

      {mensaje && (
        <div
          className={`p-3 rounded-lg text-sm ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border border-rose-200 text-rose-700'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {puedeEditar && (
        <div className="flex items-center justify-end gap-3">
          {haCambios && (
            <button
              onClick={handleRestaurar}
              className="px-4 py-2 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-sm transition"
            >
              Descartar cambios
            </button>
          )}
          <button
            onClick={handleGuardar}
            disabled={!haCambios || isPending}
            className="bg-amber-700 hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg transition font-medium"
          >
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  )
}
