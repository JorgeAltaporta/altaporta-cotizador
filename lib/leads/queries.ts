import { createClient } from '@/lib/supabase/server'
import type { Lead, LeadConRelaciones, LeadNota } from '@/lib/types/leads'

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES DE LEADS
// Funciones que leen leads desde Supabase para uso en server components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tipo crudo: cómo Supabase devuelve un lead con sus relaciones embebidas.
 * Para FKs uno-a-uno (con !nombre_constraint), Supabase devuelve OBJETO.
 * Para relaciones inversas (count), devuelve array.
 */
type LeadCrudo = Lead & {
  ejecutivo: { nombre: string; color: string | null } | null
  wp: { nombre: string; verificado: boolean | null } | null
  notas: { count: number }[] | null
}

/** Aplana un lead crudo de Supabase a la forma plana que usan los componentes */
function aplanarLead(l: LeadCrudo): LeadConRelaciones {
  return {
    id: l.id,
    canal: l.canal,
    nombre: l.nombre,
    telefono: l.telefono,
    email: l.email,
    mensaje_inicial: l.mensaje_inicial,
    tipo_evento: l.tipo_evento,
    pax: l.pax,
    fecha_evento: l.fecha_evento,
    locacion: l.locacion,
    wp_id: l.wp_id,
    ejecutivo_id: l.ejecutivo_id,
    estado: l.estado,
    razon_perdida: l.razon_perdida,
    razon_perdida_detalle: l.razon_perdida_detalle,
    cliente_id: l.cliente_id,
    creado_por: l.creado_por,
    fecha_creacion: l.fecha_creacion,
    fecha_actualizacion: l.fecha_actualizacion,
    fecha_primer_contacto: l.fecha_primer_contacto,
    fecha_cierre: l.fecha_cierre,
    ejecutivo_nombre: l.ejecutivo?.nombre ?? null,
    ejecutivo_color: l.ejecutivo?.color ?? null,
    wp_nombre: l.wp?.nombre ?? null,
    wp_verificado: l.wp?.verificado ?? null,
    total_notas: l.notas?.[0]?.count ?? 0,
  }
}

/** Selección común de columnas para queries que devuelven lead con relaciones */
const SELECT_LEAD_CON_RELACIONES = `
  id, canal, nombre, telefono, email, mensaje_inicial,
  tipo_evento, pax, fecha_evento, locacion,
  wp_id, ejecutivo_id, estado,
  razon_perdida, razon_perdida_detalle, cliente_id,
  creado_por, fecha_creacion, fecha_actualizacion,
  fecha_primer_contacto, fecha_cierre,
  ejecutivo:profiles!leads_ejecutivo_id_fkey ( nombre, color ),
  wp:wedding_planners!leads_wp_id_fkey ( nombre, verificado ),
  notas:leads_notas ( count )
`

/**
 * Obtiene TODOS los leads, enriquecidos con datos del ejecutivo asignado,
 * el WP referenciado y conteo de notas.
 */
export async function obtenerLeadsConRelaciones(): Promise<LeadConRelaciones[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leads')
    .select(SELECT_LEAD_CON_RELACIONES)
    .order('fecha_creacion', { ascending: false })

  if (error) {
    console.error('[obtenerLeadsConRelaciones] error:', error)
    return []
  }

  return ((data ?? []) as unknown as LeadCrudo[]).map(aplanarLead)
}

/**
 * Obtiene un lead individual por su ID, con todas sus relaciones.
 */
export async function obtenerLeadPorId(
  id: string
): Promise<LeadConRelaciones | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leads')
    .select(SELECT_LEAD_CON_RELACIONES)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[obtenerLeadPorId] error:', error)
    return null
  }
  if (!data) return null

  return aplanarLead(data as unknown as LeadCrudo)
}

/**
 * Obtiene las notas de un lead específico, ordenadas de más reciente a más antigua.
 */
export async function obtenerNotasDeLead(leadId: string): Promise<LeadNota[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leads_notas')
    .select('*')
    .eq('lead_id', leadId)
    .order('fecha_creacion', { ascending: false })

  if (error) {
    console.error('[obtenerNotasDeLead] error:', error)
    return []
  }
  return (data as LeadNota[]) ?? []
}

/**
 * Cuenta cuántos leads activos tiene un ejecutivo.
 * Activos = NUEVO + COTIZADO + SEGUIMIENTO + NEGOCIACION (no GANADO ni PERDIDO).
 */
export async function contarLeadsActivosDeEjecutivo(
  ejecutivoId: string
): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('ejecutivo_id', ejecutivoId)
    .in('estado', ['NUEVO', 'COTIZADO', 'SEGUIMIENTO', 'NEGOCIACION'])

  if (error) {
    console.error('[contarLeadsActivosDeEjecutivo] error:', error)
    return 0
  }
  return count ?? 0
}

/**
 * Lee un valor de la tabla config_global por su clave.
 * Devuelve `defaultValue` si la clave no existe o falla la consulta.
 */
export async function obtenerConfigGlobal<T>(
  clave: string,
  defaultValue: T
): Promise<T> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('config_global')
    .select('valor')
    .eq('clave', clave)
    .maybeSingle()

  if (error || !data) return defaultValue
  return (data.valor as T) ?? defaultValue
}
