'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import NumberInput from '@/app/components/NumberInput'

type Locacion = { id: string; nombre: string }

type Zona = {
  id: string
  nombre: string
  color: string | null
  locaciones: Locacion[]
  precios_flete: number[]
  precios_hora_extra: number[]
}

type Paquete = {
  id: string
  nombre: string
  color: string | null
  descripcion: string | null
  horas_servicio: number
  base_min_pax: number
  precios: number[]
  zonas_permitidas: string[] | null
  es_personalizado: boolean
}

type Rango = {
  id: string
  nombre: string
  min_pax: number
  max_pax: number | null
  orden: number
}

type Usuario = {
  id: string
  nombre: string
  rol: string
  puede_aprobar: boolean
}

export default function NuevaCotizacionForm({
  usuario,
  paquetes,
  zonas,
  rangos,
}: {
  usuario: Usuario
  paquetes: Paquete[]
  zonas: Zona[]
  rangos: Rango[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Cliente
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteEmail, setClienteEmail] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')

  // Evento
  const [eventoNombre, setEventoNombre] = useState('Banquete')
  const [fecha, setFecha] = useState('')
  const [zonaId, setZonaId] = useState('')
  const [locacionId, setLocacionId] = useState('')
  const [pax, setPax] = useState(0)
  const [paqueteId, setPaqueteId] = useState('')

  // Datos derivados
  const zonaSeleccionada = zonas.find((z) => z.id === zonaId)
  const paqueteSeleccionado = paquetes.find((p) => p.id === paqueteId)

  // Filtrar paquetes según zona
  const paquetesDisponibles = useMemo(() => {
    if (!zonaId) return paquetes
    return paquetes.filter((p) => {
      // Si zonas_permitidas es vacío o null, todas las zonas son permitidas
      if (!p.zonas_permitidas || p.zonas_permitidas.length === 0) return true
      return p.zonas_permitidas.includes(zonaId)
    })
  }, [zonaId, paquetes])

  // Encontrar el rango correspondiente al pax
  const rangoIndex = useMemo(() => {
    if (pax <= 0) return -1
    for (let i = 0; i < rangos.length; i++) {
      const r = rangos[i]
      if (pax >= r.min_pax && (r.max_pax === null || pax <= r.max_pax)) {
        return i
      }
    }
    return -1
  }, [pax, rangos])

  // Cálculos
  const calculos = useMemo(() => {
    if (!paqueteSeleccionado || !zonaSeleccionada || pax <= 0 || rangoIndex === -1) {
      return null
    }

    const precioPorPax = paqueteSeleccionado.precios[rangoIndex] || 0
    const subtotalPaquete = precioPorPax * pax

    const flete = (zonaSeleccionada.precios_flete[rangoIndex] || 0) * pax

    const total = subtotalPaquete + flete

    return {
      precioPorPax,
      subtotalPaquete,
      flete,
      total,
      rangoNombre: rangos[rangoIndex].nombre,
    }
  }, [paqueteSeleccionado, zonaSeleccionada, pax, rangoIndex, rangos])

  async function generarFolio(supabase: ReturnType<typeof createClient>): Promise<string> {
    const año = new Date().getFullYear()
    const prefijo = `AP-${año}-`

    // Buscar el folio más alto del año
    const { data } = await supabase
      .from('cotizaciones')
      .select('folio')
      .like('folio', `${prefijo}%`)
      .order('folio', { ascending: false })
      .limit(1)

    let siguiente = 1
    if (data && data.length > 0 && data[0].folio) {
      const ultimoNumero = parseInt(data[0].folio.split('-')[2])
      if (!isNaN(ultimoNumero)) siguiente = ultimoNumero + 1
    }

    return `${prefijo}${String(siguiente).padStart(3, '0')}`
  }

  async function handleCrear() {
    setError(null)

    if (!clienteNombre.trim()) {
      setError('El nombre del cliente es obligatorio')
      return
    }
    if (!fecha) {
      setError('La fecha del evento es obligatoria')
      return
    }
    if (!zonaId) {
      setError('Selecciona una zona')
      return
    }
    if (!paqueteId) {
      setError('Selecciona un paquete')
      return
    }
    if (pax <= 0) {
      setError('Ingresa el número de invitados (pax)')
      return
    }
    if (rangoIndex === -1) {
      setError(`No hay un rango definido para ${pax} pax`)
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const folio = await generarFolio(supabase)

      const evento = {
        id: `evt_${Date.now()}`,
        nombre: eventoNombre,
        fecha,
        zona_id: zonaId,
        locacion_id: locacionId || null,
        pax,
        paquete_id: paqueteId,
        rango_index: rangoIndex,
        precio_por_pax: calculos?.precioPorPax || 0,
        subtotal_paquete: calculos?.subtotalPaquete || 0,
        flete: calculos?.flete || 0,
        total: calculos?.total || 0,
        proteinas_seleccionadas: [],
        adicionales: [],
      }

      const { data, error: errSupabase } = await supabase
        .from('cotizaciones')
        .insert({
          folio,
          cliente_nombre: clienteNombre.trim(),
          cliente_email: clienteEmail.trim() || null,
          cliente_telefono: clienteTelefono.trim() || null,
          estado: usuario.puede_aprobar ? 'BORRADOR' : 'PENDIENTE',
          ejecutivo_id: usuario.id,
          eventos: [evento],
          adicionales_globales: [],
          historial: [
            {
              accion: 'CREADA',
              usuario_id: usuario.id,
              usuario_nombre: usuario.nombre,
              fecha: new Date().toISOString(),
            },
          ],
        })
        .select()
        .single()

      if (errSupabase) {
        setError(`Error: ${errSupabase.message}`)
        return
      }

      router.push(`/cotizaciones/${data.id}`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* CLIENTE */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl text-stone-900 mb-4">Cliente</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-stone-700 mb-1.5">
              Nombre <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              placeholder="Ej: María García"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-700 mb-1.5">Email</label>
              <input
                type="email"
                value={clienteEmail}
                onChange={(e) => setClienteEmail(e.target.value)}
                placeholder="cliente@ejemplo.com"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-700 mb-1.5">Teléfono</label>
              <input
                type="tel"
                value={clienteTelefono}
                onChange={(e) => setClienteTelefono(e.target.value)}
                placeholder="999 123 4567"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>
          </div>
        </div>
      </section>

      {/* EVENTO */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-serif text-xl text-stone-900 mb-4">Evento</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-700 mb-1.5">Nombre</label>
              <input
                type="text"
                value={eventoNombre}
                onChange={(e) => setEventoNombre(e.target.value)}
                placeholder="Banquete"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-700 mb-1.5">
                Fecha <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-700 mb-1.5">
                Zona <span className="text-rose-500">*</span>
              </label>
              <select
                value={zonaId}
                onChange={(e) => {
                  setZonaId(e.target.value)
                  setLocacionId('')
                  // Si el paquete actual ya no es compatible, limpiarlo
                  if (paqueteId) {
                    const p = paquetes.find((p) => p.id === paqueteId)
                    if (p?.zonas_permitidas && p.zonas_permitidas.length > 0 && !p.zonas_permitidas.includes(e.target.value)) {
                      setPaqueteId('')
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              >
                <option value="">— Selecciona zona —</option>
                {zonas.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.id} · {z.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-stone-700 mb-1.5">Locación</label>
              <select
                value={locacionId}
                onChange={(e) => setLocacionId(e.target.value)}
                disabled={!zonaSeleccionada}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 disabled:bg-stone-50 disabled:text-stone-400"
              >
                <option value="">— Selecciona locación —</option>
                {zonaSeleccionada?.locaciones.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-stone-700 mb-1.5">
              Número de invitados (pax) <span className="text-rose-500">*</span>
            </label>
            <NumberInput
              value={pax}
              onChange={setPax}
              placeholder="Ej: 150"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
            {pax > 0 && rangoIndex === -1 && (
              <p className="text-xs text-rose-600 mt-1">
                ⚠️ {pax} pax está fuera de los rangos definidos
              </p>
            )}
            {rangoIndex !== -1 && (
              <p className="text-xs text-stone-500 mt-1">
                Rango: {rangos[rangoIndex].nombre} pax
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-stone-700 mb-1.5">
              Paquete <span className="text-rose-500">*</span>
            </label>
            <select
              value={paqueteId}
              onChange={(e) => setPaqueteId(e.target.value)}
              disabled={!zonaId}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 disabled:bg-stone-50 disabled:text-stone-400"
            >
              <option value="">— Selecciona paquete —</option>
              {paquetesDisponibles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            {!zonaId && (
              <p className="text-xs text-stone-500 mt-1">
                Selecciona una zona primero
              </p>
            )}
            {zonaId && paquetesDisponibles.length === 0 && (
              <p className="text-xs text-rose-600 mt-1">
                ⚠️ No hay paquetes disponibles para esta zona
              </p>
            )}
          </div>
        </div>
      </section>

      {/* RESUMEN DE CÁLCULO */}
      {calculos && (
        <section className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
          <h2 className="font-serif text-xl text-stone-900 mb-4">Resumen</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-700">
                {paqueteSeleccionado?.nombre} · {pax} pax · ${calculos.precioPorPax.toLocaleString('es-MX')} c/u
              </span>
              <span className="font-medium text-stone-900">
                ${calculos.subtotalPaquete.toLocaleString('es-MX')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-700">
                Flete (Zona {zonaSeleccionada?.id}) · ${calculos.flete / pax} × {pax} pax
              </span>
              <span className="font-medium text-stone-900">
                ${calculos.flete.toLocaleString('es-MX')}
              </span>
            </div>
            <div className="border-t border-amber-300 pt-2 mt-2 flex justify-between">
              <span className="font-medium text-stone-900">Total</span>
              <span className="font-serif text-2xl text-amber-900">
                ${calculos.total.toLocaleString('es-MX')}
              </span>
            </div>
          </div>

          <p className="text-xs text-stone-600 mt-4">
            ℹ️ Este es el cálculo base. Después podrás agregar proteínas, adicionales y otros conceptos.
          </p>
        </section>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Link href="/cotizaciones" className="text-sm text-stone-600 hover:text-stone-900">
          Cancelar
        </Link>
        <button
          onClick={handleCrear}
          disabled={isPending}
          className="bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg transition"
        >
          {isPending ? 'Creando...' : 'Crear cotización'}
        </button>
      </div>
    </div>
  )
}
