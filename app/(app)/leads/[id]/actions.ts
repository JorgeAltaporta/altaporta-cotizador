'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { EstadoLead, RazonPerdida } from '@/lib/types/leads'

// ─────────────────────────────────────────────────────────────────────────────
// SERVER ACTIONS para detalle de lead
// Estas funciones se ejecutan en el servidor cuando el cliente las llama.
// Modifican la base de datos y revalidan la página para reflejar cambios.
// ─────────────────────────────────────────────────────────────────────────────

type ResultadoAccion = {
  ok: boolean
  error?: string
}

/**
 * Cambia el estatus de un lead.
 * - Si el nuevo estado es PERDIDO, requiere razón.
 * - Si el nuevo estado es GANADO, marca fecha_cierre.
 * - Registra automáticamente una nota tipo SISTEMA con el cambio.
 */
export async function cambiarEstadoLead(
  leadId: string,
  nuevoEstado: EstadoLead,
  opciones?: {
    razonPerdida?: RazonPerdida
    razonPerdidaDetalle?: string
  }
): Promise<ResultadoAccion> {
  const supabase = await createClient()

  // Obtener usuario actual (para registrar autor de la nota)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'No hay usuario autenticado' }
  }

  // Obtener nombre del profile actual
  const { data: profile } = await supabase
    .from('profiles')
    .select('nombre')
    .eq('id', user.id)
    .maybeSingle()

  const autorNombre = profile?.nombre ?? 'Sistema'

  // Obtener estado actual del lead
  const { data: leadActual, error: errLead } = await supabase
    .from('leads')
    .select('estado')
    .eq('id', leadId)
    .maybeSingle()

  if (errLead || !leadActual) {
    return { ok: false, error: 'Lead no encontrado' }
  }

  if (leadActual.estado === nuevoEstado) {
    return { ok: false, error: 'El lead ya está en ese estado' }
  }

  // Validar razón si pasa a PERDIDO
  if (nuevoEstado === 'PERDIDO' && !opciones?.razonPerdida) {
    return { ok: false, error: 'Razón de pérdida obligatoria' }
  }

  // Construir el update
  const updates: Record<string, unknown> = {
    estado: nuevoEstado,
  }

  if (nuevoEstado === 'PERDIDO') {
    updates.razon_perdida = opciones?.razonPerdida ?? null
    updates.razon_perdida_detalle = opciones?.razonPerdidaDetalle ?? null
    updates.fecha_cierre = new Date().toISOString()
  }

  if (nuevoEstado === 'GANADO') {
    updates.fecha_cierre = new Date().toISOString()
  }

  // Marcar fecha_primer_contacto si pasa de NUEVO a otro estado
  if (leadActual.estado === 'NUEVO' && nuevoEstado !== 'NUEVO') {
    updates.fecha_primer_contacto = new Date().toISOString()
  }

  // Aplicar update
  const { error: errUpdate } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', leadId)

  if (errUpdate) {
    console.error('[cambiarEstadoLead] error update:', errUpdate)
    return { ok: false, error: 'Error al actualizar el lead' }
  }

  // Crear nota automática del cambio
  const { error: errNota } = await supabase.from('leads_notas').insert({
    lead_id: leadId,
    tipo: 'SISTEMA',
    texto: `Estatus cambió de ${leadActual.estado} a ${nuevoEstado}${
      opciones?.razonPerdida ? ` · Razón: ${opciones.razonPerdida}` : ''
    }`,
    estado_anterior: leadActual.estado,
    estado_nuevo: nuevoEstado,
    autor_id: user.id,
    autor_nombre: autorNombre,
  })

  if (errNota) {
    console.error('[cambiarEstadoLead] error nota:', errNota)
    // No fallamos por la nota; el cambio de estado ya se aplicó
  }

  // Revalidar las páginas afectadas para que se actualicen
  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)

  return { ok: true }
}

/**
 * Agrega una nota manual a un lead.
 */
export async function agregarNotaLead(
  leadId: string,
  texto: string
): Promise<ResultadoAccion> {
  const supabase = await createClient()

  const textoLimpio = texto.trim()
  if (!textoLimpio) {
    return { ok: false, error: 'La nota no puede estar vacía' }
  }
  if (textoLimpio.length > 2000) {
    return { ok: false, error: 'La nota es demasiado larga (máx 2000 caracteres)' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'No hay usuario autenticado' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nombre')
    .eq('id', user.id)
    .maybeSingle()

  const { error } = await supabase.from('leads_notas').insert({
    lead_id: leadId,
    tipo: 'MANUAL',
    texto: textoLimpio,
    autor_id: user.id,
    autor_nombre: profile?.nombre ?? null,
  })

  if (error) {
    console.error('[agregarNotaLead] error:', error)
    return { ok: false, error: 'Error al guardar la nota' }
  }

  revalidatePath(`/leads/${leadId}`)
  return { ok: true }
}
