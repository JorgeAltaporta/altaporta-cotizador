'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import {
  crearLead,
  buscarDuplicados,
  obtenerWPsParaCaptura,
  obtenerCargaEjecutivos,
  crearWPRapido,
  type DatosLead,
  type LeadDuplicado,
  type ClienteExistente,
  type WPParaCaptura,
  type CargaEjecutivo,
} from '../_actions/captura'
import {
  CANAL_LABELS,
  TIPO_EVENTO_LABELS,
  ESTADO_LABELS,
  type CanalLead,
  type TipoEvento,
} from '@/lib/types/leads'

type Props = {
  abierto: boolean
  onCerrar: () => void
}

type OrigenLead = 'directo' | 'wp'

const VALOR_CREAR_WP = '__CREAR_NUEVO__'

export default function CapturaModal({ abierto, onCerrar }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [pendingWP, startTransitionWP] = useTransition()

  const [paso, setPaso] = useState<1 | 2 | 3>(1)
  const [origen, setOrigen] = useState<OrigenLead>('directo')

  const [canal, setCanal] = useState<CanalLead>('WHATSAPP')
  const [wpId, setWpId] = useState<string>('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [tipoEvento, setTipoEvento] = useState<TipoEvento | ''>('')
  const [pax, setPax] = useState('')
  const [fechaEvento, setFechaEvento] = useState('')
  const [locacion, setLocacion] = useState('')

  const [duplicadosLeads, setDuplicadosLeads] = useState<LeadDuplicado[]>([])
  const [duplicadosClientes, setDuplicadosClientes] = useState<ClienteExistente[]>([])
  const [wpsDisponibles, setWpsDisponibles] = useState<WPParaCaptura[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [exitoMsg, setExitoMsg] = useState<string | null>(null)

  const [mostrarSobrecarga, setMostrarSobrecarga] = useState(false)
  const [datosSobrecarga, setDatosSobrecarga] = useState<{ carga: number; umbral: number } | null>(null)
  const [cargas, setCargas] = useState<CargaEjecutivo[]>([])

  // Mini-form de WP rápido
  const [creandoWP, setCreandoWP] = useState(false)
  const [errorWP, setErrorWP] = useState<string | null>(null)
  const [nuevoWP, setNuevoWP] = useState({
    nombre: '',
    contacto: '',
    telefono: '',
    email: '',
    comision: '10',
  })

  useEffect(() => {
    if (abierto) {
      obtenerWPsParaCaptura().then(setWpsDisponibles)
    }
  }, [abierto])

  useEffect(() => {
    if (!abierto || paso < 2) return
    const timer = setTimeout(() => {
      buscarDuplicados({
        telefono: telefono || undefined,
        email: email || undefined,
        nombre: nombre || undefined,
        fecha_evento: fechaEvento || undefined,
        locacion: locacion || undefined,
      }).then((res) => {
        setDuplicadosLeads(res.leads)
        setDuplicadosClientes(res.clientes)
      })
    }, 400)
    return () => clearTimeout(timer)
  }, [abierto, paso, telefono, email, nombre, fechaEvento, locacion])

  function reiniciar() {
    setPaso(1)
    setOrigen('directo')
    setCanal('WHATSAPP')
    setWpId('')
    setNombre('')
    setTelefono('')
    setEmail('')
    setMensaje('')
    setTipoEvento('')
    setPax('')
    setFechaEvento('')
    setLocacion('')
    setDuplicadosLeads([])
    setDuplicadosClientes([])
    setErrorMsg(null)
    setExitoMsg(null)
    setMostrarSobrecarga(false)
    setDatosSobrecarga(null)
    setCreandoWP(false)
    setErrorWP(null)
    setNuevoWP({ nombre: '', contacto: '', telefono: '', email: '', comision: '10' })
  }

  function cerrarTodo() {
    reiniciar()
    onCerrar()
  }

  function seleccionarOrigen(o: OrigenLead) {
    setOrigen(o)
    if (o === 'wp') setCanal('WP')
    else setCanal('WHATSAPP')
    // Si cambia origen, cerrar mini-form WP
    setCreandoWP(false)
  }

  function manejarCambioWP(valor: string) {
    if (valor === VALOR_CREAR_WP) {
      setCreandoWP(true)
      setWpId('')
      setErrorWP(null)
    } else {
      setCreandoWP(false)
      setWpId(valor)
    }
  }

  function cancelarCreacionWP() {
    setCreandoWP(false)
    setErrorWP(null)
    setNuevoWP({ nombre: '', contacto: '', telefono: '', email: '', comision: '10' })
  }

  function guardarWPRapido() {
    setErrorWP(null)

    const comisionNum = parseFloat(nuevoWP.comision)
    if (isNaN(comisionNum) || comisionNum < 0 || comisionNum > 50) {
      setErrorWP('La comisión debe ser un número entre 0 y 50')
      return
    }

    startTransitionWP(async () => {
      const res = await crearWPRapido({
        nombre: nuevoWP.nombre,
        contacto: nuevoWP.contacto || undefined,
        telefono: nuevoWP.telefono || undefined,
        email: nuevoWP.email || undefined,
        comision_default: comisionNum,
      })

      if (!res.ok || !res.wp) {
        setErrorWP(res.error || 'Error al crear el WP')
        return
      }

      // Agregar a la lista local y seleccionarlo
      setWpsDisponibles((prev) => [...prev, res.wp!].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setWpId(res.wp.id)
      setCreandoWP(false)
      setNuevoWP({ nombre: '', contacto: '', telefono: '', email: '', comision: '10' })
    })
  }

  function avanzar() {
    setErrorMsg(null)
    if (paso === 1) {
      if (origen === 'wp' && !wpId) {
        setErrorMsg(creandoWP ? 'Termina de crear el WP o cancela' : 'Selecciona el Wedding Planner que refiere')
        return
      }
      setPaso(2)
      return
    }
    if (paso === 2) {
      if (origen === 'directo' && !nombre.trim()) {
        setErrorMsg('El nombre es obligatorio para leads directos')
        return
      }
      if (origen === 'directo' && !telefono.trim()) {
        setErrorMsg('El teléfono es obligatorio')
        return
      }
      setPaso(3)
      return
    }
  }

  function retroceder() {
    setErrorMsg(null)
    if (paso > 1) setPaso((p) => (p - 1) as 1 | 2 | 3)
  }

  function construirDatos(): DatosLead {
    const wpSeleccionado = origen === 'wp' && wpId ? wpsDisponibles.find((w) => w.id === wpId) : null
    const telFinal = telefono.trim() || (wpSeleccionado?.telefono ?? '') || ''
    const emailFinal = email.trim() || (wpSeleccionado?.email ?? '') || undefined

    return {
      canal,
      nombre: nombre.trim(),
      telefono: telFinal,
      email: emailFinal,
      mensaje_inicial: mensaje.trim() || undefined,
      tipo_evento: (tipoEvento || undefined) as TipoEvento | undefined,
      pax: pax ? parseInt(pax, 10) : undefined,
      fecha_evento: fechaEvento || undefined,
      locacion: locacion.trim() || undefined,
      wp_id: origen === 'wp' ? wpId || undefined : undefined,
    }
  }

  function guardar(opciones?: { forzarEjecutivo?: string; confirmarSobrecarga?: boolean }) {
    setErrorMsg(null)
    setExitoMsg(null)
    startTransition(async () => {
      const res = await crearLead(construirDatos(), opciones)

      if (res.sobrecargaDetectada && res.cargaActual !== undefined && res.umbralActual !== undefined) {
        setDatosSobrecarga({ carga: res.cargaActual, umbral: res.umbralActual })
        const cargasActuales = await obtenerCargaEjecutivos()
        setCargas(cargasActuales)
        setMostrarSobrecarga(true)
        return
      }

      if (res.ok) {
        setExitoMsg(
          `Lead capturado · Asignado a ${res.ejecutivoNombre}${res.esRoundRobin ? ' (round-robin)' : ''}`
        )
        router.refresh()
        setTimeout(() => cerrarTodo(), 2000)
      } else {
        setErrorMsg(res.error || 'Error al crear el lead')
      }
    })
  }

  function quedarmeloAPesarSobrecarga() {
    setMostrarSobrecarga(false)
    guardar({ confirmarSobrecarga: true })
  }

  function pasarseloOtroEjecutivo(ejecId: string) {
    setMostrarSobrecarga(false)
    guardar({ forzarEjecutivo: ejecId })
  }

  if (!abierto) return null

  const wpSeleccionado = origen === 'wp' && wpId ? wpsDisponibles.find((w) => w.id === wpId) : null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-stone-900/50 flex items-start justify-center p-6 overflow-y-auto" onClick={cerrarTodo}>
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mt-8" onClick={(e) => e.stopPropagation()}>
          <div className="px-6 py-4 border-b border-stone-200 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl text-stone-900">Capturar nuevo lead</h2>
              <p className="text-xs text-stone-500 mt-1">
                {paso === 1 ? 'Origen del lead' : paso === 2 ? 'Datos del cliente' : 'Datos del evento'}
              </p>
            </div>
            <button onClick={cerrarTodo} className="text-stone-400 hover:text-stone-700 transition" disabled={pending}>
              <X size={20} />
            </button>
          </div>

          <div className="px-6 pt-4 flex gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className={`flex-1 h-1.5 rounded-full transition ${n <= paso ? 'bg-amber-700' : 'bg-stone-200'}`} />
            ))}
          </div>
          <div className="px-6 pt-2 pb-1 flex justify-between text-[11px] uppercase tracking-wider font-semibold text-stone-500">
            <span className={paso === 1 ? 'text-amber-700' : ''}>1. Origen</span>
            <span className={paso === 2 ? 'text-amber-700' : ''}>2. Cliente</span>
            <span className={paso === 3 ? 'text-amber-700' : ''}>3. Evento</span>
          </div>

          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
            {paso === 1 ? (
              <PasoOrigen
                origen={origen}
                setOrigen={seleccionarOrigen}
                canal={canal}
                setCanal={setCanal}
                wpId={wpId}
                onCambioWP={manejarCambioWP}
                wpsDisponibles={wpsDisponibles}
                disabled={pending}
                creandoWP={creandoWP}
                nuevoWP={nuevoWP}
                setNuevoWP={setNuevoWP}
                errorWP={errorWP}
                pendingWP={pendingWP}
                onGuardarWP={guardarWPRapido}
                onCancelarWP={cancelarCreacionWP}
              />
            ) : null}
            {paso === 2 ? (
              <PasoCliente origen={origen} wpSeleccionado={wpSeleccionado} nombre={nombre} setNombre={setNombre} telefono={telefono} setTelefono={setTelefono} email={email} setEmail={setEmail} mensaje={mensaje} setMensaje={setMensaje} duplicadosLeads={duplicadosLeads} duplicadosClientes={duplicadosClientes} disabled={pending} />
            ) : null}
            {paso === 3 ? (
              <PasoEvento origen={origen} tipoEvento={tipoEvento} setTipoEvento={setTipoEvento} pax={pax} setPax={setPax} fechaEvento={fechaEvento} setFechaEvento={setFechaEvento} locacion={locacion} setLocacion={setLocacion} duplicadosLeads={duplicadosLeads} duplicadosClientes={duplicadosClientes} disabled={pending} />
            ) : null}

            {errorMsg ? (
              <div className="mt-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded p-2">{errorMsg}</div>
            ) : null}
            {exitoMsg ? (
              <div className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-3">✓ {exitoMsg}</div>
            ) : null}
          </div>

          <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 rounded-b-2xl flex items-center justify-between">
            <button onClick={cerrarTodo} disabled={pending} className="text-sm text-stone-600 hover:text-stone-900 transition disabled:opacity-50">
              Cancelar
            </button>
            <div className="flex gap-2">
              {paso > 1 ? (
                <button onClick={retroceder} disabled={pending} className="px-4 py-2 text-sm border border-stone-300 hover:bg-stone-100 rounded-lg transition disabled:opacity-50">
                  ← Anterior
                </button>
              ) : null}
              {paso < 3 ? (
                <button onClick={avanzar} disabled={pending} className="px-4 py-2 text-sm bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-lg transition disabled:opacity-50">
                  Siguiente →
                </button>
              ) : (
                <button onClick={() => guardar()} disabled={pending} className="px-4 py-2 text-sm bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-lg transition disabled:opacity-50">
                  {pending ? 'Guardando...' : 'Guardar y asignar'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {mostrarSobrecarga && datosSobrecarga ? (
        <div className="fixed inset-0 z-50 bg-stone-900/70 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <div className="mb-4">
              <h3 className="font-serif text-xl text-stone-900 mb-1">⚠ Estás sobrecargado</h3>
              <p className="text-sm text-stone-600">
                Tienes <strong>{datosSobrecarga.carga}</strong> leads activos. El umbral configurado es <strong>{datosSobrecarga.umbral}</strong>.
              </p>
            </div>

            <div className="space-y-2 mb-4">
              {cargas.map((e) => (
                <button key={e.id} onClick={() => pasarseloOtroEjecutivo(e.id)} disabled={pending} className="w-full flex items-center justify-between p-3 border border-stone-200 hover:border-amber-700 hover:bg-amber-50 rounded-lg transition disabled:opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ backgroundColor: e.color ?? '#78716c' }}>
                      {e.nombre.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-stone-900">Pasárselo a {e.nombre}</span>
                  </div>
                  <span className={`text-xs ${e.carga >= datosSobrecarga.umbral ? 'text-rose-600 font-semibold' : 'text-stone-500'}`}>
                    {e.carga} activos
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setMostrarSobrecarga(false)} disabled={pending} className="flex-1 px-4 py-2 text-sm border border-stone-300 hover:bg-stone-100 rounded-lg transition disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={quedarmeloAPesarSobrecarga} disabled={pending} className="flex-1 px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition disabled:opacity-50">
                Quedármelo
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PASO 1: ORIGEN
// ─────────────────────────────────────────────────────────────────────────────

type PropsPasoOrigen = {
  origen: OrigenLead
  setOrigen: (o: OrigenLead) => void
  canal: CanalLead
  setCanal: (c: CanalLead) => void
  wpId: string
  onCambioWP: (valor: string) => void
  wpsDisponibles: WPParaCaptura[]
  disabled: boolean
  creandoWP: boolean
  nuevoWP: { nombre: string; contacto: string; telefono: string; email: string; comision: string }
  setNuevoWP: (v: { nombre: string; contacto: string; telefono: string; email: string; comision: string }) => void
  errorWP: string | null
  pendingWP: boolean
  onGuardarWP: () => void
  onCancelarWP: () => void
}

function PasoOrigen({ origen, setOrigen, canal, setCanal, wpId, onCambioWP, wpsDisponibles, disabled, creandoWP, nuevoWP, setNuevoWP, errorWP, pendingWP, onGuardarWP, onCancelarWP }: PropsPasoOrigen) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs uppercase tracking-wider text-stone-500 font-semibold mb-2">¿De dónde viene este lead?</label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setOrigen('directo')} disabled={disabled} className={`p-4 rounded-lg border-2 transition text-left ${origen === 'directo' ? 'border-amber-700 bg-amber-50' : 'border-stone-200 hover:border-stone-300'}`}>
            <div className="font-medium text-stone-900 mb-1">Cliente directo</div>
            <div className="text-xs text-stone-600">El cliente nos contactó por WhatsApp, redes o referido</div>
          </button>
          <button type="button" onClick={() => setOrigen('wp')} disabled={disabled} className={`p-4 rounded-lg border-2 transition text-left ${origen === 'wp' ? 'border-amber-700 bg-amber-50' : 'border-stone-200 hover:border-stone-300'}`}>
            <div className="font-medium text-stone-900 mb-1">Vía Wedding Planner</div>
            <div className="text-xs text-stone-600">Una WP nos refirió o pide en su nombre</div>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-stone-500 font-semibold mb-2">Canal por donde llegó</label>
        <select value={canal} onChange={(e) => setCanal(e.target.value as CanalLead)} disabled={disabled} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm">
          {(Object.keys(CANAL_LABELS) as CanalLead[]).map((c) => (
            <option key={c} value={c}>{CANAL_LABELS[c]}</option>
          ))}
        </select>
      </div>

      {origen === 'wp' ? (
        <div>
          <label className="block text-xs uppercase tracking-wider text-stone-500 font-semibold mb-2">¿Qué Wedding Planner refiere? *</label>
          <select
            value={creandoWP ? VALOR_CREAR_WP : wpId}
            onChange={(e) => onCambioWP(e.target.value)}
            disabled={disabled || pendingWP}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
          >
            <option value="">-- Selecciona --</option>
            {wpsDisponibles.map((w) => (
              <option key={w.id} value={w.id}>{w.nombre}{w.verificado ? '' : ' (sin verificar)'}</option>
            ))}
            <option value={VALOR_CREAR_WP}>+ Crear nuevo WP...</option>
          </select>

          {creandoWP ? (
            <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-xs uppercase tracking-wider text-purple-800 font-semibold mb-3">
                Nuevo Wedding Planner
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-1">
                    Nombre del WP *
                  </label>
                  <input
                    type="text"
                    value={nuevoWP.nombre}
                    onChange={(e) => setNuevoWP({ ...nuevoWP, nombre: e.target.value })}
                    placeholder="Ej: Bodas Mérida, FH Weddings..."
                    disabled={pendingWP}
                    className="w-full px-3 py-1.5 border border-stone-300 rounded text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-1">
                      Contacto
                    </label>
                    <input
                      type="text"
                      value={nuevoWP.contacto}
                      onChange={(e) => setNuevoWP({ ...nuevoWP, contacto: e.target.value })}
                      placeholder="Persona de contacto"
                      disabled={pendingWP}
                      className="w-full px-3 py-1.5 border border-stone-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-1">
                      Comisión %
                    </label>
                    <input
                      type="number"
                      value={nuevoWP.comision}
                      onChange={(e) => setNuevoWP({ ...nuevoWP, comision: e.target.value })}
                      min="0"
                      max="50"
                      step="0.5"
                      disabled={pendingWP}
                      className="w-full px-3 py-1.5 border border-stone-300 rounded text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={nuevoWP.telefono}
                      onChange={(e) => setNuevoWP({ ...nuevoWP, telefono: e.target.value })}
                      placeholder="999 123 4567"
                      disabled={pendingWP}
                      className="w-full px-3 py-1.5 border border-stone-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={nuevoWP.email}
                      onChange={(e) => setNuevoWP({ ...nuevoWP, email: e.target.value })}
                      placeholder="contacto@wp.com"
                      disabled={pendingWP}
                      className="w-full px-3 py-1.5 border border-stone-300 rounded text-sm"
                    />
                  </div>
                </div>

                {errorWP ? (
                  <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
                    {errorWP}
                  </div>
                ) : null}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onCancelarWP}
                    disabled={pendingWP}
                    className="flex-1 px-3 py-1.5 text-xs border border-stone-300 hover:bg-stone-100 rounded transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={onGuardarWP}
                    disabled={pendingWP || !nuevoWP.nombre.trim()}
                    className="flex-1 px-3 py-1.5 text-xs bg-purple-700 hover:bg-purple-800 text-white font-medium rounded transition disabled:opacity-50"
                  >
                    {pendingWP ? 'Guardando...' : 'Guardar WP'}
                  </button>
                </div>

                <p className="text-[10px] text-purple-700 italic">
                  El WP se creará como &ldquo;sin verificar&rdquo;. Jorge o Danna lo verificarán después en /wps.
                </p>
              </div>
            </div>
          ) : null}

          {wpsDisponibles.length === 0 && !creandoWP ? (
            <p className="text-xs text-stone-500 mt-2 italic">No hay WPs registrados todavía. Selecciona &ldquo;+ Crear nuevo WP...&rdquo; para empezar.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PASO 2: CLIENTE
// ─────────────────────────────────────────────────────────────────────────────

type PropsPasoCliente = {
  origen: OrigenLead
  wpSeleccionado: WPParaCaptura | null | undefined
  nombre: string
  setNombre: (s: string) => void
  telefono: string
  setTelefono: (s: string) => void
  email: string
  setEmail: (s: string) => void
  mensaje: string
  setMensaje: (s: string) => void
  duplicadosLeads: LeadDuplicado[]
  duplicadosClientes: ClienteExistente[]
  disabled: boolean
}

function PasoCliente({ origen, wpSeleccionado, nombre, setNombre, telefono, setTelefono, email, setEmail, mensaje, setMensaje, duplicadosLeads, duplicadosClientes, disabled }: PropsPasoCliente) {
  const labelNombre = origen === 'wp'
    ? 'Nombres del cliente final / novios (opcional, se autogenera con datos del evento)'
    : 'Nombre del cliente o novios *'

  const placeholder = origen === 'wp'
    ? 'Ej: López-Castro · Déjalo vacío si la WP no ha dado nombres'
    : 'Ej: María González · O "Renee López y Bryan Castro"'

  const labelTelefono = origen === 'wp' ? 'Teléfono del cliente final (opcional)' : 'Teléfono *'
  const labelEmail = origen === 'wp' ? 'Email del cliente final (opcional)' : 'Email'

  return (
    <div className="space-y-4">
      {origen === 'wp' && wpSeleccionado ? (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-xs uppercase tracking-wider text-purple-800 font-semibold mb-2">
            Datos del Wedding Planner (contacto principal)
          </div>
          <div className="text-sm text-stone-900 font-medium mb-1">{wpSeleccionado.nombre}</div>
          <div className="text-xs text-stone-700 space-y-0.5">
            {wpSeleccionado.telefono ? <div>Tel: {wpSeleccionado.telefono}</div> : null}
            {wpSeleccionado.email ? <div>Email: {wpSeleccionado.email}</div> : null}
            {!wpSeleccionado.telefono && !wpSeleccionado.email ? (
              <div className="italic text-stone-500">Sin datos de contacto registrados</div>
            ) : null}
          </div>
          <p className="text-[11px] text-purple-700 mt-2 italic">
            Si dejas vacíos los datos del cliente final, usaremos los del WP para contactar.
          </p>
        </div>
      ) : null}

      <div>
        <label className="block text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1">{labelNombre}</label>
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={disabled} placeholder={placeholder} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1">{labelTelefono}</label>
          <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} disabled={disabled} placeholder={origen === 'wp' ? 'Si lo tienes...' : '999 123 4567'} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1">{labelEmail}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={disabled} placeholder="opcional" className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1">Mensaje inicial (opcional)</label>
        <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} disabled={disabled} rows={3} placeholder="Hola, busco información para mi evento..." className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm resize-none" />
      </div>

      <AvisosClientesExistentes clientes={duplicadosClientes} />
      <AvisosDuplicadosLeads leads={duplicadosLeads} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PASO 3: EVENTO
// ─────────────────────────────────────────────────────────────────────────────

type PropsPasoEvento = {
  origen: OrigenLead
  tipoEvento: TipoEvento | ''
  setTipoEvento: (t: TipoEvento | '') => void
  pax: string
  setPax: (s: string) => void
  fechaEvento: string
  setFechaEvento: (s: string) => void
  locacion: string
  setLocacion: (s: string) => void
  duplicadosLeads: LeadDuplicado[]
  duplicadosClientes: ClienteExistente[]
  disabled: boolean
}

function PasoEvento({ origen, tipoEvento, setTipoEvento, pax, setPax, fechaEvento, setFechaEvento, locacion, setLocacion, duplicadosLeads, duplicadosClientes, disabled }: PropsPasoEvento) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-stone-500 italic">
        {origen === 'wp'
          ? 'Si la WP pidió cotización sin nombres, completa estos datos para que el lead tenga un título legible (ej: Boda 200pax · 15-jun · Sotuta).'
          : 'Estos campos son opcionales. Puedes dejarlos en blanco si todavía no tienes la información.'}
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1">Tipo de evento</label>
          <select value={tipoEvento} onChange={(e) => setTipoEvento(e.target.value as TipoEvento | '')} disabled={disabled} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm">
            <option value="">--</option>
            {(Object.keys(TIPO_EVENTO_LABELS) as TipoEvento[]).map((t) => (
              <option key={t} value={t}>{TIPO_EVENTO_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1">Pax</label>
          <input type="number" value={pax} onChange={(e) => setPax(e.target.value)} disabled={disabled} placeholder="150" min="1" className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1">Fecha evento</label>
          <input type="date" value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} disabled={disabled} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1">Locación</label>
        <input type="text" value={locacion} onChange={(e) => setLocacion(e.target.value)} disabled={disabled} placeholder="Hacienda Xcanatún, Quinta Montes Molina, etc." className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
      </div>

      <AvisosClientesExistentes clientes={duplicadosClientes} />
      <AvisosDuplicadosLeads leads={duplicadosLeads} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AVISOS DE CLIENTES EXISTENTES
// ─────────────────────────────────────────────────────────────────────────────

function AvisosClientesExistentes({ clientes }: { clientes: ClienteExistente[] }) {
  return clientes.length === 0 ? null : (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
      <div className="text-xs uppercase tracking-wider text-emerald-800 font-semibold mb-2">
        ✓ Cliente existente detectado ({clientes.length})
      </div>
      <div className="space-y-1.5">
        {clientes.map((c) => (
          <div key={c.id} className="p-2 bg-white border border-emerald-200 rounded text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-stone-900">{c.nombre}</span>
              <span className="text-emerald-700 text-[10px] uppercase font-semibold">{c.razon}</span>
            </div>
            <div className="text-stone-600 mt-0.5">
              {c.telefono}
              {c.email ? ` · ${c.email}` : ''}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-stone-600 mt-2 italic">
        Es un cliente recurrente. Al guardar este lead, se vinculará automáticamente al cliente existente.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AVISOS DE DUPLICADOS EN LEADS
// ─────────────────────────────────────────────────────────────────────────────

function AvisosDuplicadosLeads({ leads }: { leads: LeadDuplicado[] }) {
  return leads.length === 0 ? null : (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
      <div className="text-xs uppercase tracking-wider text-amber-800 font-semibold mb-2">
        ⚠ Posible duplicado en leads activos ({leads.length})
      </div>
      <div className="space-y-1.5">
        {leads.map((d) => (
          <a key={d.id} href={`/leads/${d.id}`} target="_blank" rel="noopener noreferrer" className="block p-2 bg-white border border-amber-200 rounded hover:border-amber-400 transition text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-stone-900">{d.nombre}</span>
              <span className="text-stone-500 font-mono">{d.id}</span>
            </div>
            <div className="text-stone-600 mt-0.5">
              {ESTADO_LABELS[d.estado]} · {d.razon}
            </div>
          </a>
        ))}
      </div>
      <p className="text-[11px] text-stone-600 mt-2 italic">
        Los enlaces abren en otra pestaña. Si es un duplicado real, cancela esta captura.
      </p>
    </div>
  )
}
