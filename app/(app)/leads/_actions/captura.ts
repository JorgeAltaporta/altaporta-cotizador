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

export type WPParaCaptura = {
  id: string
  nombre: string
  verificado: boolean
}

export type CargaEjecutivo = {
  id: string
  nombre: string
  color: string | null
  carga: number
}

const ESTADOS_ACTIVOS: EstadoLead[] = ['NUEVO', 'COTIZADO', 'SEGUIMIENTO', 'NEGOCIACION']

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS (no exportados)
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

  if (!datos.nombre.trim()) {
    return { ok: false, error: 'El nombre es obligatorio' }
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

export async function buscarDuplicados(criterios: CriteriosDuplicados): Promise<LeadDuplicado[]> {
  const supabase = await createClient()
  const duplicados = new Map<string, LeadDuplicado>()

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

export async function obtenerWPsParaCaptura(): Promise<WPParaCaptura[]> {
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
