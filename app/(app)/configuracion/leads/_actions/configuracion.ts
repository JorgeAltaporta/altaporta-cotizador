'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { EstadoLead } from '@/lib/types/leads'

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICACIÓN DE PERMISOS
// ─────────────────────────────────────────────────────────────────────────────

async function verificarAprobador(): Promise<{ ok: boolean; userId?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('puede_aprobar')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.puede_aprobar) {
    return { ok: false, error: 'Solo Jorge o Danna pueden modificar configuración' }
  }
  return { ok: true, userId: user.id }
}

// ─────────────────────────────────────────────────────────────────────────────
// UMBRAL DE SOBRECARGA
// ─────────────────────────────────────────────────────────────────────────────

export async function obtenerUmbralSobrecarga(): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('config_global')
    .select('valor')
    .eq('clave', 'leads_umbral_sobrecarga')
    .maybeSingle()

  if (!data?.valor) return 20
  return typeof data.valor === 'number' ? data.valor : 20
}

export async function guardarUmbralSobrecarga(
  umbral: number
): Promise<{ ok: boolean; error?: string }> {
  const auth = await verificarAprobador()
  if (!auth.ok) return { ok: false, error: auth.error }

  if (umbral < 1 || umbral > 100) {
    return { ok: false, error: 'El umbral debe estar entre 1 y 100' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('config_global')
    .upsert({
      clave: 'leads_umbral_sobrecarga',
      valor: umbral,
      categoria: 'leads',
      descripcion: 'Número máximo de leads activos antes de mostrar modal de sobrecarga',
    })

  if (error) {
    console.error('[guardarUmbralSobrecarga] error:', error)
    return { ok: false, error: 'Error al guardar' }
  }

  revalidatePath('/configuracion/leads')
  revalidatePath('/leads')
  return { ok: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// SLA POR ESTADO
// ─────────────────────────────────────────────────────────────────────────────

export type SLAporEstado = Record<EstadoLead, number>

const SLA_DEFAULT: SLAporEstado = {
  NUEVO: 2,
  COTIZADO: 72,
  SEGUIMIENTO: 120,
  NEGOCIACION: 168,
  GANADO: 0,
  PERDIDO: 0,
}

export async function obtenerSLAporEstado(): Promise<SLAporEstado> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('config_global')
    .select('valor')
    .eq('clave', 'leads_sla_horas_por_estado')
    .maybeSingle()

  if (!data?.valor || typeof data.valor !== 'object') return SLA_DEFAULT
  return { ...SLA_DEFAULT, ...(data.valor as Partial<SLAporEstado>) }
}

export async function guardarSLAporEstado(
  sla: SLAporEstado
): Promise<{ ok: boolean; error?: string }> {
  const auth = await verificarAprobador()
  if (!auth.ok) return { ok: false, error: auth.error }

  for (const estado of ['NUEVO', 'COTIZADO', 'SEGUIMIENTO', 'NEGOCIACION'] as EstadoLead[]) {
    const horas = sla[estado]
    if (typeof horas !== 'number' || horas < 0 || horas > 720) {
      return { ok: false, error: `SLA para ${estado} debe estar entre 0 y 720 horas (30 días)` }
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('config_global')
    .upsert({
      clave: 'leads_sla_horas_por_estado',
      valor: sla,
      categoria: 'leads',
      descripcion: 'SLA en horas por estado del lead. Si lleva más tiempo sin actualización, se marca urgente',
    })

  if (error) {
    console.error('[guardarSLAporEstado] error:', error)
    return { ok: false, error: 'Error al guardar' }
  }

  revalidatePath('/configuracion/leads')
  revalidatePath('/leads')
  return { ok: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// RAZONES DE PÉRDIDA
// ─────────────────────────────────────────────────────────────────────────────

export type RazonPerdidaConfig = {
  id: string
  label: string
  activo: boolean
}

const RAZONES_DEFAULT: RazonPerdidaConfig[] = [
  { id: 'PRECIO', label: 'Precio fuera de presupuesto', activo: true },
  { id: 'FECHA_NO_DISPONIBLE', label: 'Fecha no disponible', activo: true },
  { id: 'NO_RESPONDIO', label: 'No respondió', activo: true },
  { id: 'COMPETENCIA', label: 'Eligió otra opción', activo: true },
  { id: 'CAMBIO_PLANES', label: 'Cambió de planes', activo: true },
  { id: 'OTRO', label: 'Otro', activo: true },
]

export async function obtenerRazonesPerdida(): Promise<RazonPerdidaConfig[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('config_global')
    .select('valor')
    .eq('clave', 'leads_razones_perdida')
    .maybeSingle()

  if (!data?.valor || !Array.isArray(data.valor)) return RAZONES_DEFAULT
  return data.valor as RazonPerdidaConfig[]
}

export async function guardarRazonesPerdida(
  razones: RazonPerdidaConfig[]
): Promise<{ ok: boolean; error?: string }> {
  const auth = await verificarAprobador()
  if (!auth.ok) return { ok: false, error: auth.error }

  if (razones.length === 0) {
    return { ok: false, error: 'Debe haber al menos una razón' }
  }
  for (const r of razones) {
    if (!r.id?.trim() || !r.label?.trim()) {
      return { ok: false, error: 'Todas las razones deben tener id y label' }
    }
  }
  const ids = razones.map((r) => r.id.toUpperCase())
  if (new Set(ids).size !== ids.length) {
    return { ok: false, error: 'Los IDs de razones deben ser únicos' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('config_global')
    .upsert({
      clave: 'leads_razones_perdida',
      valor: razones,
      categoria: 'leads',
      descripcion: 'Razones disponibles al marcar un lead como PERDIDO',
    })

  if (error) {
    console.error('[guardarRazonesPerdida] error:', error)
    return { ok: false, error: 'Error al guardar' }
  }

  revalidatePath('/configuracion/leads')
  revalidatePath('/leads')
  return { ok: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICACIÓN DE WPs
// ─────────────────────────────────────────────────────────────────────────────

export type WPParaVerificar = {
  id: string
  nombre: string
  contacto: string | null
  telefono: string | null
  email: string | null
  comision_default: number | null
  fecha_creacion: string
}

export async function obtenerWPsParaVerificar(): Promise<WPParaVerificar[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('wedding_planners')
    .select('id, nombre, contacto, telefono, email, comision_default, fecha_creacion')
    .eq('verificado', false)
    .order('fecha_creacion', { ascending: false })

  return (data ?? []) as WPParaVerificar[]
}

export async function verificarWP(
  wpId: string
): Promise<{ ok: boolean; error?: string }> {
  const auth = await verificarAprobador()
  if (!auth.ok) return { ok: false, error: auth.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('wedding_planners')
    .update({
      verificado: true,
      verificado_por: auth.userId,
      fecha_verificacion: new Date().toISOString(),
    })
    .eq('id', wpId)

  if (error) {
    console.error('[verificarWP] error:', error)
    return { ok: false, error: 'Error al verificar WP' }
  }

  revalidatePath('/configuracion/leads')
  revalidatePath('/wps')
  return { ok: true }
}

export async function rechazarWP(
  wpId: string
): Promise<{ ok: boolean; error?: string }> {
  const auth = await verificarAprobador()
  if (!auth.ok) return { ok: false, error: auth.error }

  const supabase = await createClient()
  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('wp_id', wpId)

  if (count && count > 0) {
    return {
      ok: false,
      error: `Este WP tiene ${count} lead(s) vinculados. No se puede eliminar.`,
    }
  }

  const { error } = await supabase
    .from('wedding_planners')
    .delete()
    .eq('id', wpId)

  if (error) {
    console.error('[rechazarWP] error:', error)
    return { ok: false, error: 'Error al rechazar WP' }
  }

  revalidatePath('/configuracion/leads')
  revalidatePath('/wps')
  return { ok: true }
}
