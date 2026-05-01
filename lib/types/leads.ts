// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE LEADS
// Tipos compartidos para el módulo de Leads (CRM/Bandeja)
// ─────────────────────────────────────────────────────────────────────────────

/** Canal por donde llegó el lead a la empresa */
export type CanalLead =
  | 'WHATSAPP'
  | 'INSTAGRAM'
  | 'FACEBOOK'
  | 'EMAIL'
  | 'WP'
  | 'MANUAL'
  | 'REFERIDO'

/** Estado del lead en el embudo de ventas */
export type EstadoLead =
  | 'NUEVO'
  | 'COTIZADO'
  | 'SEGUIMIENTO'
  | 'NEGOCIACION'
  | 'GANADO'
  | 'PERDIDO'

/** Tipo del evento que el lead quiere realizar */
export type TipoEvento = 'BODA' | 'CORPORATIVO' | 'SOCIAL' | 'OTRO'

/** Razón por la que un lead se cierra como PERDIDO */
export type RazonPerdida =
  | 'PRECIO'
  | 'FECHA_NO_DISPONIBLE'
  | 'NO_RESPONDE'
  | 'ELIGIO_OTRO'
  | 'OTRO'

/** Tipo de nota: manual del ejecutivo o automática del sistema */
export type TipoNota = 'MANUAL' | 'SISTEMA'

// ─────────────────────────────────────────────────────────────────────────────
// LABELS PARA UI
// ─────────────────────────────────────────────────────────────────────────────

export const CANAL_LABELS: Record<CanalLead, string> = {
  WHATSAPP: 'WhatsApp',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  EMAIL: 'Email',
  WP: 'Wedding Planner',
  MANUAL: 'Manual',
  REFERIDO: 'Referido',
}

export const ESTADO_LABELS: Record<EstadoLead, string> = {
  NUEVO: 'Nuevo',
  COTIZADO: 'Cotizado',
  SEGUIMIENTO: 'Seguimiento',
  NEGOCIACION: 'Negociación',
  GANADO: 'Ganado',
  PERDIDO: 'Perdido',
}

export const TIPO_EVENTO_LABELS: Record<TipoEvento, string> = {
  BODA: 'Boda',
  CORPORATIVO: 'Corporativo',
  SOCIAL: 'Social',
  OTRO: 'Otro',
}

export const RAZON_PERDIDA_LABELS: Record<RazonPerdida, string> = {
  PRECIO: 'Precio fuera de presupuesto',
  FECHA_NO_DISPONIBLE: 'Fecha no disponible',
  NO_RESPONDE: 'Cliente no responde',
  ELIGIO_OTRO: 'Eligió otro proveedor',
  OTRO: 'Otro',
}

/** Estados que cuentan como "lead activo" (para alerta de sobrecarga) */
export const ESTADOS_ACTIVOS: EstadoLead[] = [
  'NUEVO',
  'COTIZADO',
  'SEGUIMIENTO',
  'NEGOCIACION',
]

/** Orden de columnas en el Kanban (de izquierda a derecha) */
export const ORDEN_KANBAN: EstadoLead[] = [
  'NUEVO',
  'COTIZADO',
  'SEGUIMIENTO',
  'NEGOCIACION',
  'GANADO',
  'PERDIDO',
]

// ─────────────────────────────────────────────────────────────────────────────
// MODELOS DE DATOS (espejo de las tablas de Supabase)
// ─────────────────────────────────────────────────────────────────────────────

/** Un lead tal como viene de la tabla public.leads */
export type Lead = {
  id: string                              // L-001, L-002, etc.
  canal: CanalLead

  // Datos del cliente
  nombre: string
  telefono: string
  email: string | null
  mensaje_inicial: string | null

  // Datos del evento (todos opcionales en captura inicial)
  tipo_evento: TipoEvento | null
  pax: number | null
  fecha_evento: string | null             // YYYY-MM-DD
  locacion: string | null

  // Wedding Planner si aplica
  wp_id: string | null

  // Asignación y estado
  ejecutivo_id: string | null              // uuid de profile
  estado: EstadoLead

  // Cierre
  razon_perdida: RazonPerdida | null
  razon_perdida_detalle: string | null
  cliente_id: string | null                // uuid de cliente (si fue ganado)

  // Auditoría
  creado_por: string | null
  fecha_creacion: string
  fecha_actualizacion: string
  fecha_primer_contacto: string | null
  fecha_cierre: string | null
}

/** Un lead enriquecido con datos de tablas relacionadas (para mostrar en UI) */
export type LeadConRelaciones = Lead & {
  ejecutivo_nombre: string | null
  ejecutivo_color: string | null
  wp_nombre: string | null
  wp_verificado: boolean | null
  total_notas: number
}

/** Una nota del lead (de la tabla public.leads_notas) */
export type LeadNota = {
  id: string
  lead_id: string
  tipo: TipoNota
  texto: string
  estado_anterior: string | null
  estado_nuevo: string | null
  autor_id: string | null
  autor_nombre: string | null
  fecha_creacion: string
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE FORMATO
// ─────────────────────────────────────────────────────────────────────────────

/** Color del badge de canal según su tipo */
export function colorCanal(canal: CanalLead): { bg: string; text: string } {
  const colores: Record<CanalLead, { bg: string; text: string }> = {
    WHATSAPP: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
    INSTAGRAM: { bg: 'bg-pink-100', text: 'text-pink-800' },
    FACEBOOK: { bg: 'bg-blue-100', text: 'text-blue-800' },
    EMAIL: { bg: 'bg-purple-100', text: 'text-purple-800' },
    WP: { bg: 'bg-purple-100', text: 'text-purple-800' },
    MANUAL: { bg: 'bg-stone-100', text: 'text-stone-800' },
    REFERIDO: { bg: 'bg-amber-100', text: 'text-amber-800' },
  }
  return colores[canal]
}

/** Color del badge de estado */
export function colorEstado(estado: EstadoLead): { bg: string; text: string } {
  const colores: Record<EstadoLead, { bg: string; text: string }> = {
    NUEVO: { bg: 'bg-amber-100', text: 'text-amber-800' },
    COTIZADO: { bg: 'bg-purple-100', text: 'text-purple-800' },
    SEGUIMIENTO: { bg: 'bg-blue-100', text: 'text-blue-800' },
    NEGOCIACION: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
    GANADO: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
    PERDIDO: { bg: 'bg-rose-100', text: 'text-rose-800' },
  }
  return colores[estado]
}

/** Tiempo transcurrido desde una fecha en formato amigable */
export function tiempoTranscurrido(fechaISO: string): string {
  const ahora = Date.now()
  const fecha = new Date(fechaISO).getTime()
  const minutos = Math.floor((ahora - fecha) / (1000 * 60))

  if (minutos < 1) return 'ahora mismo'
  if (minutos < 60) return `hace ${minutos} min`

  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `hace ${horas} h`

  const dias = Math.floor(horas / 24)
  if (dias < 30) return `hace ${dias} d`

  const meses = Math.floor(dias / 30)
  if (meses < 12) return `hace ${meses} mes${meses === 1 ? '' : 'es'}`

  return new Date(fechaISO).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Es un lead urgente (NUEVO sin contactar hace más de 2 horas) */
export function esLeadUrgente(lead: Lead, slaHoras: number = 2): boolean {
  if (lead.estado !== 'NUEVO') return false
  const horas = (Date.now() - new Date(lead.fecha_creacion).getTime()) / (1000 * 60 * 60)
  return horas > slaHoras
}

/** Formatea fecha YYYY-MM-DD a "15 jun 2026" */
export function formatearFechaEvento(fecha: string | null): string {
  if (!fecha) return '—'
  const [y, m, d] = fecha.split('-')
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d} ${meses[parseInt(m) - 1]} ${y}`
}

/** Sanitiza un teléfono dejando solo dígitos (para wa.me) */
export function telefonoNumerico(tel: string): string {
  return tel.replace(/[^0-9]/g, '')
}
