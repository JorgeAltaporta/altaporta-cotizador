'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { obtenerConfigGlobal } from '@/lib/leads/queries'
import type { CanalLead, EstadoLead, TipoEvento } from '@/lib/types/leads'

// ─────────────────────────────────────────────────────────────────────────────
// SERVER ACTIONS para captura de leads
// ─────────────────────────────────────────────────────────────────────────────

const ESTADOS_ACTIVOS: EstadoLead[] = ['NUEVO', 'COTIZADO', 'SEGUIMIENTO', 'NEGOCIACION']

type ResultadoCrear = {
  ok: boolean
  error?: string
  leadId?: string
  ejecutivoNombre?: string
  esRoundRobin?: boolean
  sobrecargaDetectada?: boolean
  cargaActual?: number
  umbralActual?: number
}

type DatosLead = {
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

/**
 * Genera el siguiente ID de lead disponible (formato L-NNN)
 */
async function generarSiguienteId(): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('leads')
    .select('id')
    .like('id', 'L-%')
    .order('id', { ascending: false })
    .limit(1)

  if (!data || data.length === 0) return 'L-001'

  const ultimo = data[0].id // ej: "L-042"
  const num = parseInt(ultimo.replace('L-', ''), 10) + 1
  return `L-${String(num).padStart(3, '0')}`
}

/**
 * Determina qué ejecutivo debe quedarse el lead según las reglas:
 * - Si captura JORGE/DANNA (puede_aprobar=true) → round-robin entre ejecutivos
 * - Si captura un ejecutivo → se queda el lead él mismo
 */
async function determinarEjecutivo(
  capturadorId: string,
  forzarEjecutivo?: string
): Promise<{ ejecutivoId: string; metodo: 'self' | 'round-robin' | 'manual' } | null> {
  const supabase = await createClient()

  // Si quien captura forzó manualmente el ejecutivo (modal de sobrecarga)
  if (forzarEjecutivo) {
    return { ejecutivoId: forzarEjecutivo, metodo: 'manual' }
  }

  // Obtener perfil del que captura
  const { data: capturador } = await supabase
    .from('profiles')
    .select('id, rol, puede_aprobar')
    .eq('id', capturadorId)
    .maybeSingle()

  if (!capturador) return null

  // Si es aprobador (Jorge/Danna) → round-robin entre ejecutivos
  if (capturador.puede_aprobar) {
    const { data: ejecutivos } = await supabase
      .from('profiles')
      .select('id, nombre')
      .eq('rol', 'EJECUTIVO')

    if (!ejecutivos || ejecutivos.length === 0) {
      // Si no hay ejecutivos, asignar al mismo capturador
      return { ejecutivoId: capturador.id, metodo: 'self' }
    }

    // Round-robin: contar leads por ejecutivo y elegir el de menor carga
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

  // Si es ejecutivo → se queda el lead él
  return { ejecutivoId: capturador.id, metodo: 'self' }
}

/**
 * Crea un lead nuevo con todas las validaciones y reglas de asignación.
 */
export async function crearLead(
  datos: DatosLead,
  opciones?: {
    forzarEjecutivo?: string  // Si el ejecutivo decidió pasarle el lead a otro tras alerta
    confirmarSobrecarga?: boolean  // True si el ejecutivo aceptó quedárselo a pesar de sobrecarga
  }
): Promise<ResultadoCrear> {
  const supabase = await createClient()

  // Usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'No hay usuario autenticado' }
  }

  // Validaciones básicas
  if (!datos.nombre.trim()) {
    return { ok: false, error: 'El nombre es obligatorio' }
  }
  if (!datos.telefono.trim()) {
    return { ok: false, error: 'El teléfono es obligatorio' }
  }

  // Determinar ejecutivo
  const asignacion = await determinarEjecutivo(user.id, opciones?.forzarEjecutivo)
  if (!asignacion) {
    return { ok: false, error: 'No se pudo determinar el ejecutivo' }
  }

  // Si el ejecutivo va a quedarse el lead (método self) y NO ha confirmado sobrecarga,
  // verificar si está sobrecargado
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

  // Obtener nombre del ejecutivo asignado
  const { data: ejecProfile } = await supabase
    .from('profiles')
    .select('nombre')
    .eq('id', asignacion.ejecutivoId)
    .maybeSingle()

  // Obtener nombre del capturador (para la nota)
  const { data: capturadorProfile } = await supabase
    .from('profiles')
    .select('nombre')
    .eq('id', user.id)
    .maybeSingle()

  // Generar ID único
  const id = await generarSiguienteId()

  // Crear lead
  const { error: errInsert } = await supabase.from('leads').insert({
    id,
    canal: datos.canal,
    nombre: datos.nombre.trim(),
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

  // Crear nota inicial del sistema
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

  // Refrescar el cache
  revalidatePath('/leads')

  return {
    ok: true,
    leadId: id,
    ejecutivoNombre: ejecProfile?.nombre ?? 'ejecutivo',
    esRoundRobin: asignacion.metodo === 'round-robin',
  }
}

/**
 * Busca posibles leads duplicados según los criterios:
 * 1. Mismo teléfono o email (alta probabilidad)
 * 2. Misma fecha + locación (probable mismo evento)
 * 3. Mismo nombre + fecha (revisar)
 *
 * Solo busca entre leads ACTIVOS (no GANADO ni PERDIDO).
 */
export async function buscarDuplicados(criterios: {
  telefono?: string
  email?: string
  nombre?: string
  fecha_evento?: string
  locacion?: string
}): Promise
  Array<{
    id: string
    nombre: string
    estado: EstadoLead
    razon: string
  }>
> {
  const supabase = await createClient()
  const duplicados: Map<string, { id: string; nombre: string; estado: EstadoLead; razon: string }> = new Map()

  // 1. Por teléfono (normalizamos quitando no-dígitos)
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
        duplicados.set(c.id, {
          id: c.id,
          nombre: c.nombre,
          estado: c.estado as EstadoLead,
          razon: 'Mismo teléfono',
        })
      }
    }
  }

  // 2. Por email
  if (criterios.email && criterios.email.includes('@')) {
    const { data } = await supabase
      .from('leads')
      .select('id, nombre, estado')
      .in('estado', ESTADOS_ACTIVOS)
      .eq('email', criterios.email.trim().toLowerCase())

    for (const c of data || []) {
      if (!duplicados.has(c.id)) {
        duplicados.set(c.id, {
          id: c.id,
          nombre: c.nombre,
          estado: c.estado as EstadoLead,
          razon: 'Mismo email',
        })
      }
    }
  }

  // 3. Por fecha + locación (casi seguro mismo evento)
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
      if (!duplicados.has(c.id)) {
        duplicados.set(c.id, {
          id: c.id,
          nombre: c.nombre,
          estado: c.estado as EstadoLead,
          razon: 'Misma fecha y locación',
        })
      }
    }
  }

  // 4. Por nombre + fecha (sin locación)
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
      if (!duplicados.has(c.id)) {
        duplicados.set(c.id, {
          id: c.id,
          nombre: c.nombre,
          estado: c.estado as EstadoLead,
          razon: 'Nombre similar y misma fecha',
        })
      }
    }
  }

  return Array.from(duplicados.values())
}

/**
 * Obtiene la lista de WPs verificados/no verificados para mostrar en el dropdown.
 */
export async function obtenerWPsParaCaptura(): Promise
  Array<{ id: string; nombre: string; verificado: boolean }>
> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('wedding_planners')
    .select('id, nombre, verificado')
    .order('nombre', { ascending: true })

  return (data || []).map((w) => ({
    id: w.id,
    nombre: w.nombre,
    verificado: !!w.verificado,
  }))
}

/**
 * Obtiene la carga actual de cada ejecutivo (para mostrar en modal de sobrecarga).
 */
export async function obtenerCargaEjecutivos(): Promise
  Array<{ id: string; nombre: string; color: string | null; carga: number }>
> {
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
