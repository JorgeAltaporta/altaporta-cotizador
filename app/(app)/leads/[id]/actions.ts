'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { EstadoLead, RazonPerdida } from '@/lib/types/leads'

// ─────────────────────────────────────────────────────────────────────────────
// SERVER ACTIONS para detalle de lead
// ─────────────────────────────────────────────────────────────────────────────

export type ResultadoAccion = {
  ok: boolean
  error?: string
  clienteCreado?: boolean
  clienteReutilizado?: boolean
  cotizacionesActualizadas?: number
}

/**
 * Convierte un lead GANADO en un Cliente.
 * - Si el lead ya tiene cliente_id, no hace nada (idempotente)
 * - Si ya existe un cliente con mismo email o teléfono, lo reutiliza
 * - Si no, crea cliente nuevo
 * - Vincula lead.cliente_id
 */
async function convertirLeadACliente(leadId: string): Promise<{
  ok: boolean
  clienteId?: string
  reutilizado?: boolean
  error?: string
}> {
  const supabase = await createClient()

  const { data: lead, error: errLead } = await supabase
    .from('leads')
    .select('id, nombre, telefono, email, wp_id, ejecutivo_id, cliente_id, creado_por')
    .eq('id', leadId)
    .maybeSingle()

  if (errLead || !lead) {
    return { ok: false, error: 'Lead no encontrado' }
  }

  // Idempotencia
  if (lead.cliente_id) {
    return { ok: true, clienteId: lead.cliente_id, reutilizado: true }
  }

  // Detectar cliente existente por email o teléfono
  const telLimpio = lead.telefono.replace(/[^0-9]/g, '').slice(-10)
  let clienteExistenteId: string | null = null

  if (lead.email) {
    const { data: porEmail } = await supabase
      .from('clientes')
      .select('id')
      .eq('email', lead.email.toLowerCase())
      .limit(1)
      .maybeSingle()
    if (porEmail) clienteExistenteId = porEmail.id
  }

  if (!clienteExistenteId && telLimpio.length >= 7) {
    const { data: porTel } = await supabase
      .from('clientes')
      .select('id, telefono')

    const match = (porTel || []).find((c) =>
      c.telefono.replace(/[^0-9]/g, '').slice(-10) === telLimpio
    )
    if (match) clienteExistenteId = match.id
  }

  let clienteId: string
  let reutilizado = false

  if (clienteExistenteId) {
    clienteId = clienteExistenteId
    reutilizado = true
  } else {
    const { data: nuevoCliente, error: errCliente } = await supabase
      .from('clientes')
      .insert({
        nombre: lead.nombre,
        telefono: lead.telefono,
        email: lead.email,
        lead_origen_id: lead.id,
        wp_id: lead.wp_id,
        ejecutivo_id: lead.ejecutivo_id,
        estado: 'ACTIVO',
        creado_por: lead.creado_por,
      })
      .select('id')
      .single()

    if (errCliente || !nuevoCliente) {
      console.error('[convertirLeadACliente] error:', errCliente)
      return { ok: false, error: 'Error al crear cliente' }
    }
    clienteId = nuevoCliente.id
  }

  await supabase.from('leads').update({ cliente_id: clienteId }).eq('id', leadId)

  return { ok: true, clienteId, reutilizado }
}

/**
 * Sincroniza el estado de las cotizaciones vinculadas al lead.
 * - lead → GANADO: cotizaciones (no canceladas) → APROBADA + vincular cliente_id
 * - lead → PERDIDO: TODAS las cotizaciones (no canceladas) → CANCELADA
 */
async function sincronizarCotizaciones(
  leadId: string,
  nuevoEstadoLead: EstadoLead,
  clienteId: string | null
): Promise<number> {
  const supabase = await createClient()

  if (nuevoEstadoLead !== 'GANADO' && nuevoEstadoLead !== 'PERDIDO') {
    return 0
  }

  const { data: cotizaciones } = await supabase
    .from('cotizaciones')
    .select('id, estado, folio')
    .eq('lead_id', leadId)

  if (!cotizaciones || cotizaciones.length === 0) {
    return 0
  }

  let actualizadas = 0

  for (const c of cotizaciones) {
    let nuevoEstadoCot: string | null = null

    if (nuevoEstadoLead === 'GANADO') {
      if (c.estado !== 'CANCELADA' && c.estado !== 'APROBADA') {
        nuevoEstadoCot = 'APROBADA'
      }
    }

    if (nuevoEstadoLead === 'PERDIDO') {
      if (c.estado !== 'CANCELADA') {
        nuevoEstadoCot = 'CANCELADA'
      }
    }

    if (nuevoEstadoCot) {
      const updates: Record<string, unknown> = { estado: nuevoEstadoCot }
      if (clienteId && nuevoEstadoLead === 'GANADO') {
        updates.cliente_id = clienteId
      }
      await supabase.from('cotizaciones').update(updates).eq('id', c.id)
      actualizadas++
    }
  }

  return actualizadas
}

/**
 * Cambia el estatus de un lead.
 * - PERDIDO: requiere razón, archiva todas sus cotizaciones
 * - GANADO: marca fecha_cierre, crea/reutiliza Cliente, aprueba sus cotizaciones
 * - Registra automáticamente una nota tipo SISTEMA con el cambio
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

  const autorNombre = profile?.nombre ?? 'Sistema'

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

  if (nuevoEstado === 'PERDIDO' && !opciones?.razonPerdida) {
    return { ok: false, error: 'Razón de pérdida obligatoria' }
  }

  // Construir update del lead
  const updates: Record<string, unknown> = { estado: nuevoEstado }

  if (nuevoEstado === 'PERDIDO') {
    updates.razon_perdida = opciones?.razonPerdida ?? null
    updates.razon_perdida_detalle = opciones?.razonPerdidaDetalle ?? null
    updates.fecha_cierre = new Date().toISOString()
  }

  if (nuevoEstado === 'GANADO') {
    updates.fecha_cierre = new Date().toISOString()
  }

  if (leadActual.estado === 'NUEVO' && nuevoEstado !== 'NUEVO') {
    updates.fecha_primer_contacto = new Date().toISOString()
  }

  const { error: errUpdate } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', leadId)

  if (errUpdate) {
    console.error('[cambiarEstadoLead] error update:', errUpdate)
    return { ok: false, error: 'Error al actualizar el lead' }
  }

  // ─── Convertir a Cliente si pasa a GANADO ───
  let clienteCreado = false
  let clienteReutilizado = false
  let clienteId: string | null = null

  if (nuevoEstado === 'GANADO') {
    const conversion = await convertirLeadACliente(leadId)
    if (conversion.ok && conversion.clienteId) {
      clienteId = conversion.clienteId
      clienteCreado = !conversion.reutilizado
      clienteReutilizado = !!conversion.reutilizado
    }
  }

  // ─── Sincronizar cotizaciones vinculadas ───
  const cotizacionesActualizadas = await sincronizarCotizaciones(
    leadId,
    nuevoEstado,
    clienteId
  )

  // ─── Crear nota automática ───
  let textoExtra = ''
  if (nuevoEstado === 'GANADO') {
    if (clienteCreado) textoExtra += ' · Cliente creado'
    if (clienteReutilizado) textoExtra += ' · Cliente existente reutilizado'
  }
  if (cotizacionesActualizadas > 0) {
    textoExtra += ` · ${cotizacionesActualizadas} cotización(es) sincronizada(s)`
  }
  if (opciones?.razonPerdida) {
    textoExtra += ` · Razón: ${opciones.razonPerdida}`
  }

  await supabase.from('leads_notas').insert({
    lead_id: leadId,
    tipo: 'SISTEMA',
    texto: `Estatus cambió de ${leadActual.estado} a ${nuevoEstado}${textoExtra}`,
    estado_anterior: leadActual.estado,
    estado_nuevo: nuevoEstado,
    autor_id: user.id,
    autor_nombre: autorNombre,
  })

  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/cotizaciones')

  return {
    ok: true,
    clienteCreado,
    clienteReutilizado,
    cotizacionesActualizadas,
  }
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
