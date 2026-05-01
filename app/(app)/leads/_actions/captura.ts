'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { obtenerConfigGlobal } from '@/lib/leads/queries'
import type { CanalLead, EstadoLead, TipoEvento } from '@/lib/types/leads'

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS PÚBLICOS
// ─────────────────────────────────────────────────────────────────────────────

export type ResultadoCrear = {
  ok: boolean
  error?: string
  leadId?: string
  ejecutivoNombre?: string
  esRoundRobin?: boolean
  sobrecargaDetectada?: boolean
  cargaActual?: number
  umbralActual?: number
}

export type DatosLead = {
  canal: CanalLead
  nombre: string
  telefono: string
  email?: string
  mensaje_inicial?: string
  tipo_evento?: TipoEvento
  pax?: number
  fecha_evento?: string
  locacion?: string
  wp_id?: string
}

export type OpcionesCrear = {
  forzarEjecutivo?: string
  confirmarSobrecarga?: boolean
}

export type CriteriosDuplicados = {
  telefono?: string
  email?: string
  nombre?: string
  fecha_evento?: string
  locacion?: string
}

export type LeadDuplicado = {
  id: string
  nombre: string
  estado: EstadoLead
  razon: string
}

export type ClienteExistente = {
  id: string
  nombre: string
  telefono: string
  email: string | null
  razon: string
}

export type ResultadoBusquedaDuplicados = {
  leads: LeadDuplicado[]
  clientes: ClienteExistente[]
}

export type DatosNombreAuto = {
  pax?: number
  fecha_evento?: string
  locacion?: string
  tipo_evento?: TipoEvento
  wp_nombre?: string
}

export type WPParaCaptura = {
  id: string
  nombre: string
  verificado: boolean
  telefono: string | null
  email: string | null
}

export type CargaEjecutivo = {
  id: string
  nombre: string
  color: string | null
  carga: number
}

const ESTADOS_ACTIVOS: EstadoLead[] = ['NUEVO', 'COTIZADO', 'SEGUIMIENTO', 'NEGOCIACION']

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

async function generarSiguienteId(): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('leads')
    .select('id')
    .like('id', 'L-%')
    .order('id', { ascending: false })
    .limit(1)

  if (!data || data.length === 0) return 'L-001'
  const ultimo = data[0].id
  const num = parseInt(ultimo.replace('L-', ''), 10) + 1
  return `L-${String(num).padStart(3, '0')}`
}

async function determinarEjecutivo(
  capturadorId: string,
  forzarEjecutivo?: string
): Promise<{ ejecutivoId: string; metodo: 'self' | 'round-robin' | 'manual' } | null> {
  const supabase = await createClient()

  if (forzarEjecutivo) {
    return { ejecutivoId: forzarEjecutivo, metodo: 'manual' }
  }

  const { data: capturador } = await supabase
    .from('profiles')
    .select('id, rol, puede_aprobar')
    .eq('id', capturadorId)
    .maybeSingle()

  if (!capturador) return null

  if (capturador.puede_aprobar) {
    const { data: ejecutivos } = await supabase
      .from('profiles')
      .select('id, nombre')
      .eq('rol', 'EJECUTIVO')

    if (!ejecutivos || ejecutivos.length === 0) {
      return { ejecutivoId: capturador.id, metodo: 'self' }
    }

    const cargas = await Promise.all(
      ejecutivos.map(async (e) => {
        const { count } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('ejecutivo_id', e.id)
          .in('estado', ESTADOS_ACTIVOS)
        return { id: e.id, carga: count ?? 0 }
      })
    )

    cargas.sort((a, b) => a.carga - b.carga)
    return { ejecutivoId: cargas[0].id, metodo: 'round-robin' }
  }

  return { ejecutivoId: capturador.id, metodo: 'self' }
}

/**
 * Genera un nombre legible para leads de WP que vienen sin nombres reales.
 * Ej: "Boda 200pax · 15-jun-2026 · Sotuta de Peón (vía Carolina)"
 */
function autogenerarNombreLead(datos: DatosNombreAuto): string {
  const partes: string[] = []

  // Tipo de evento + pax
  if (datos.tipo_evento && datos.pax) {
    const tipoMap: Record<TipoEvento, string> = {
      BODA: 'Boda',
      CORPORATIVO: 'Evento corporativo',
      SOCIAL: 'Evento social',
      OTRO: 'Evento',
    }
    partes.push(`${tipoMap[datos.tipo_evento]} ${datos.pax}pax`)
  } else if (datos.pax) {
    partes.push(`Evento ${datos.pax}pax`)
  } else if (datos.tipo_evento) {
    const tipoMap: Record<TipoEvento, string> = {
      BODA: 'Boda',
      CORPORATIVO: 'Evento corporativo',
      SOCIAL: 'Evento social',
      OTRO: 'Evento',
    }
    partes.push(tipoMap[datos.tipo_evento])
  }

  // Fecha
  if (datos.fecha_evento) {
    const [y, m, d] = datos.fecha_evento.split('-')
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    partes.push(`${parseInt(d)}-${meses[parseInt(m) - 1]}-${y}`)
  }

  // Locación (cortada si es muy larga)
  if (datos.locacion) {
    const loc = datos.locacion.length > 30 ? datos.locacion.slice(0, 30) + '...' : datos.locacion
    partes.push(loc)
  }

  let resultado = partes.length > 0 ? partes.join(' · ') : 'Lead sin datos'

  if (datos.wp_nombre) {
    resultado += ` (vía ${datos.wp_nombre})`
  }

  return resultado
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER ACTIONS (exportadas)
// ─────────────────────────────────────────────────────────────────────────────

export async function crearLead(
  datos: DatosLead,
  opciones?: OpcionesCrear
): Promise<ResultadoCrear> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'No hay usuario autenticado' }
  }

  // Si nombre está vacío y origen es WP, autogenerar
  let nombreFinal = datos.nombre.trim()
  if (!nombreFinal && datos.wp_id) {
    const { data: wp } = await supabase
      .from('wedding_planners')
      .select('nombre')
      .eq('id', datos.wp_id)
      .maybeSingle()

    nombreFinal = autogenerarNombreLead({
      pax: datos.pax,
      fecha_evento: datos.fecha_evento,
      locacion: datos.locacion,
      tipo_evento: datos.tipo_evento,
      wp_nombre: wp?.nombre,
    })
  }

  if (!nombreFinal) {
    return { ok: false, error: 'El nombre es obligatorio (o algún dato del evento si es vía WP)' }
  }
  if (!datos.telefono.trim()) {
    return { ok: false, error: 'El teléfono es obligatorio' }
  }

  const asignacion = await determinarEjecutivo(user.id, opciones?.forzarEjecutivo)
  if (!asignacion) {
    return { ok: false, error: 'No se pudo determinar el ejecutivo' }
  }

  if (asignacion.metodo === 'self' && !opciones?.confirmarSobrecarga && !opciones?.forzarEjecutivo) {
    const umbral = await obtenerConfigGlobal<number>('leads_umbral_sobrecarga', 20)
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('ejecutivo_id', asignacion.ejecutivoId)
      .in('estado', ESTADOS_ACTIVOS)

    const cargaActual = count ?? 0
    if (cargaActual >= umbral) {
      return {
        ok: false,
        sobrecargaDetectada: true,
        cargaActual,
        umbralActual: umbral,
      }
    }
  }

  const { data: ejecProfile } = await supabase
    .from('profiles')
    .select('nombre')
    .eq('id', asignacion.ejecutivoId)
    .maybeSingle()

  const { data: capturadorProfile } = await supabase
    .from('profiles')
    .select('nombre')
    .eq('id', user.id)
    .maybeSingle()

  const id = await generarSiguienteId()

  const { error: errInsert } = await supabase.from('leads').insert({
    id,
    canal: datos.canal,
    nombre: nombreFinal,
    telefono: datos.telefono.trim(),
    email: datos.email?.trim() || null,
    mensaje_inicial: datos.mensaje_inicial?.trim() || null,
    tipo_evento: datos.tipo_evento || null,
    pax: datos.pax || null,
    fecha_evento: datos.fecha_evento || null,
    locacion: datos.locacion?.trim() || null,
    wp_id: datos.wp_id || null,
    ejecutivo_id: asignacion.ejecutivoId,
    estado: 'NUEVO',
    creado_por: user.id,
  })

  if (errInsert) {
    console.error('[crearLead] error insert:', errInsert)
    return { ok: false, error: 'Error al crear el lead' }
  }

  const motivo =
    asignacion.metodo === 'round-robin'
      ? '(round-robin)'
      : asignacion.metodo === 'manual'
      ? '(asignación manual)'
      : '(captura propia)'

  await supabase.from('leads_notas').insert({
    lead_id: id,
    tipo: 'SISTEMA',
    texto: `Lead capturado por ${capturadorProfile?.nombre ?? 'usuario'} y asignado a ${
      ejecProfile?.nombre ?? 'ejecutivo'
    } ${motivo}`,
    autor_id: user.id,
    autor_nombre: capturadorProfile?.nombre ?? null,
  })

  revalidatePath('/leads')

  return {
    ok: true,
    leadId: id,
    ejecutivoNombre: ejecProfile?.nombre ?? 'ejecutivo',
    esRoundRobin: asignacion.metodo === 'round-robin',
  }
}

export async function buscarDuplicados(criterios: CriteriosDuplicados): Promise<ResultadoBusquedaDuplicados> {
  const supabase = await createClient()
  const leadsDup = new Map<string, LeadDuplicado>()
  const clientesDup = new Map<string, ClienteExistente>()

  // ─── BÚSQUEDA EN LEADS ACTIVOS ───
  if (criterios.telefono) {
    const telLimpio = criterios.telefono.replace(/[^0-9]/g, '')
    if (telLimpio.length >= 7) {
      const { data } = await supabase
        .from('leads')
        .select('id, nombre, estado, telefono')
        .in('estado', ESTADOS_ACTIVOS)

      const candidatos = (data || []).filter((l) =>
        l.telefono.replace(/[^0-9]/g, '').includes(telLimpio.slice(-7))
      )

      for (const c of candidatos) {
        leadsDup.set(c.id, {
          id: c.id,
          nombre: c.nombre,
          estado: c.estado as EstadoLead,
          razon: 'Mismo teléfono',
        })
      }
    }
  }

  if (criterios.email && criterios.email.includes('@')) {
    const { data } = await supabase
      .from('leads')
      .select('id, nombre, estado')
      .in('estado', ESTADOS_ACTIVOS)
      .eq('email', criterios.email.trim().toLowerCase())

    for (const c of data || []) {
      if (!leadsDup.has(c.id)) {
        leadsDup.set(c.id, {
          id: c.id,
          nombre: c.nombre,
          estado: c.estado as EstadoLead,
          razon: 'Mismo email',
        })
      }
    }
  }

  if (criterios.fecha_evento && criterios.locacion) {
    const { data } = await supabase
      .from('leads')
      .select('id, nombre, estado, locacion')
      .in('estado', ESTADOS_ACTIVOS)
      .eq('fecha_evento', criterios.fecha_evento)

    const locacionBuscada = criterios.locacion.trim().toLowerCase()
    const candidatos = (data || []).filter(
      (l) => (l.locacion ?? '').trim().toLowerCase() === locacionBuscada
    )

    for (const c of candidatos) {
      if (!leadsDup.has(c.id)) {
        leadsDup.set(c.id, {
          id: c.id,
          nombre: c.nombre,
          estado: c.estado as EstadoLead,
          razon: 'Misma fecha y locación',
        })
      }
    }
  }

  if (criterios.nombre && criterios.nombre.length > 3 && criterios.fecha_evento) {
    const primeraPalabra = criterios.nombre.trim().split(/\s+/)[0].toLowerCase()
    const { data } = await supabase
      .from('leads')
      .select('id, nombre, estado, fecha_evento')
      .in('estado', ESTADOS_ACTIVOS)
      .eq('fecha_evento', criterios.fecha_evento)

    const candidatos = (data || []).filter((l) =>
      l.nombre.toLowerCase().includes(primeraPalabra)
    )

    for (const c of candidatos) {
      if (!leadsDup.has(c.id)) {
        leadsDup.set(c.id, {
          id: c.id,
          nombre: c.nombre,
          estado: c.estado as EstadoLead,
          razon: 'Nombre similar y misma fecha',
        })
      }
    }
  }

  // ─── BÚSQUEDA EN CLIENTES EXISTENTES ───
  if (criterios.telefono) {
    const telLimpio = criterios.telefono.replace(/[^0-9]/g, '')
    if (telLimpio.length >= 7) {
      const { data } = await supabase
        .from('clientes')
        .select('id, nombre, telefono, email')
        .eq('estado', 'ACTIVO')

      const candidatos = (data || []).filter((c) =>
        c.telefono.replace(/[^0-9]/g, '').includes(telLimpio.slice(-7))
      )

      for (const c of candidatos) {
        clientesDup.set(c.id, {
          id: c.id,
          nombre: c.nombre,
          telefono: c.telefono,
          email: c.email,
          razon: 'Mismo teléfono',
        })
      }
    }
  }

  if (criterios.email && criterios.email.includes('@')) {
    const { data } = await supabase
      .from('clientes')
      .select('id, nombre, telefono, email')
      .eq('estado', 'ACTIVO')
      .eq('email', criterios.email.trim().toLowerCase())

    for (const c of data || []) {
      if (!clientesDup.has(c.id)) {
        clientesDup.set(c.id, {
          id: c.id,
          nombre: c.nombre,
          telefono: c.telefono,
          email: c.email,
          razon: 'Mismo email',
        })
      }
    }
  }

  return {
    leads: Array.from(leadsDup.values()),
    clientes: Array.from(clientesDup.values()),
  }
}

export async function obtenerWPsParaCaptura(): Promise<WPParaCaptura[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('wedding_planners')
    .select('id, nombre, verificado, telefono, email')
    .order('nombre', { ascending: true })

  return (data || []).map((w) => ({
    id: w.id,
    nombre: w.nombre,
    verificado: !!w.verificado,
    telefono: w.telefono ?? null,
    email: w.email ?? null,
  }))
}

export async function obtenerCargaEjecutivos(): Promise<CargaEjecutivo[]> {
  const supabase = await createClient()

  const { data: ejecutivos } = await supabase
    .from('profiles')
    .select('id, nombre, color, rol')
    .eq('rol', 'EJECUTIVO')
    .order('nombre')

  if (!ejecutivos) return []

  const resultado = await Promise.all(
    ejecutivos.map(async (e) => {
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('ejecutivo_id', e.id)
        .in('estado', ESTADOS_ACTIVOS)
      return {
        id: e.id,
        nombre: e.nombre,
        color: e.color ?? null,
        carga: count ?? 0,
      }
    })
  )

  return resultado
}
// ─────────────────────────────────────────────────────────────────────────────
// CREACIÓN RÁPIDA DE WP (Fase 6)
// ─────────────────────────────────────────────────────────────────────────────

export type DatosWPRapido = {
  nombre: string
  contacto?: string
  telefono?: string
  email?: string
  comision_default?: number
}

export type ResultadoCrearWP = {
  ok: boolean
  error?: string
  wp?: WPParaCaptura
}

/**
 * Crea un Wedding Planner desde el modal de captura de lead.
 * Se crea con verificado=false para que Jorge/Danna lo verifiquen después en /wps.
 */
export async function crearWPRapido(datos: DatosWPRapido): Promise<ResultadoCrearWP> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'No hay usuario autenticado' }
  }

  const nombre = datos.nombre.trim()
  if (!nombre) {
    return { ok: false, error: 'El nombre del WP es obligatorio' }
  }
  if (nombre.length < 3) {
    return { ok: false, error: 'El nombre debe tener al menos 3 caracteres' }
  }

  // Validar comisión (rango 0-50 razonable)
  const comision =
    datos.comision_default !== undefined && datos.comision_default !== null
      ? datos.comision_default
      : 10
  if (comision < 0 || comision > 50) {
    return { ok: false, error: 'La comisión debe estar entre 0% y 50%' }
  }

  // Detectar duplicado por nombre (case-insensitive)
  const { data: existentes } = await supabase
    .from('wedding_planners')
    .select('id, nombre')

  const duplicado = (existentes || []).find(
    (w) => w.nombre.trim().toLowerCase() === nombre.toLowerCase()
  )
  if (duplicado) {
    return {
      ok: false,
      error: `Ya existe un WP con ese nombre (${duplicado.nombre}). Selecciónalo en la lista.`,
    }
  }

  // Generar ID tipo WP-NNN
  const { data: ultimosWPs } = await supabase
    .from('wedding_planners')
    .select('id')
    .like('id', 'WP-%')
    .order('id', { ascending: false })
    .limit(1)

  let nuevoId = 'WP-001'
  if (ultimosWPs && ultimosWPs.length > 0) {
    const ultimo = ultimosWPs[0].id
    const num = parseInt(ultimo.replace('WP-', ''), 10)
    if (!isNaN(num)) {
      nuevoId = `WP-${String(num + 1).padStart(3, '0')}`
    }
  }

  const { error: errInsert } = await supabase.from('wedding_planners').insert({
    id: nuevoId,
    nombre,
    contacto: datos.contacto?.trim() || null,
    telefono: datos.telefono?.trim() || null,
    email: datos.email?.trim().toLowerCase() || null,
    comision_default: comision,
    verificado: false,
  })

  if (errInsert) {
    console.error('[crearWPRapido] error insert:', errInsert)
    return { ok: false, error: 'Error al crear el WP' }
  }

  revalidatePath('/leads')
  revalidatePath('/wps')

  return {
    ok: true,
    wp: {
      id: nuevoId,
      nombre,
      verificado: false,
      telefono: datos.telefono?.trim() || null,
      email: datos.email?.trim() || null,
    },
  }
}
