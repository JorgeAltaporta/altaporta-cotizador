// ════════════════════════════════════════════════════════════════════════════
// HISTORIAL DE COTIZACIÓN
//
// Detecta qué cambió entre dos versiones de una cotización y genera entradas
// detalladas para el historial. Reglas:
// - Si no hay cambios reales, NO se agrega entrada (el editor lo respeta)
// - Cada cambio detectado se guarda con el campo, valor antes y valor después
// - Los nombres legibles (paquete: "Premium" en vez de "PREM-001") se calculan
//   con los catálogos actuales pasados al helper
// ════════════════════════════════════════════════════════════════════════════

// ── Tipos ───────────────────────────────────────────────────────────────────

export type CambioCampo = {
  campo: string // ej: "pax", "paquete", "fecha"
  etiqueta: string // ej: "Pax del evento 1", "Paquete del evento 1"
  antes: string | number | null
  despues: string | number | null
}

export type EntradaHistorial = {
  accion: 'CREADA' | 'EDITADA' | 'ESTADO_CAMBIADO' | 'ENVIADA' | 'DESCARGADA'
  usuario_id: string
  usuario_nombre: string
  fecha: string // ISO
  cambios?: CambioCampo[] // solo en EDITADA
  detalle?: string // descripción libre opcional
}

// ── Tipos auxiliares para comparación ──────────────────────────────────────

type AdicionalCotizacion = {
  id: string
  adicionalId: string
  cantidad: number
  precioUnitario: number
}

type EventoCotizacion = {
  id?: string
  fecha?: string
  zona_id?: string
  locacion_texto?: string | null
  pax?: number
  paquete_id?: string
  adicionales?: AdicionalCotizacion[]
}

type DescuentoGeneral = {
  tipo: 'porcentaje' | 'monto'
  valor: number
  concepto: string
} | null

type CargoExtra = {
  id: string
  concepto: string
  monto: number
}

export type CotizacionParaComparar = {
  cliente_nombre: string
  estado: string
  ejecutivo_id: string | null
  wp_id: string | null
  comision_override: number | null
  descuento_general: DescuentoGeneral
  cargos_extra: CargoExtra[] | null
  vigencia_dias: number | null
  anticipo_pct_override: number | null
  aplica_iva: boolean | null
  notas_cliente: string | null
  notas_internas: string | null
  eventos: EventoCotizacion[] | null
}

// Diccionarios para nombres legibles
type Catalogos = {
  paquetes?: Array<{ id: string; nombre: string }>
  zonas?: Array<{ id: string; nombre: string }>
  adicionales?: Array<{ id: string; nombre: string }>
  weddingPlanners?: Array<{ id: string; nombre: string }>
  ejecutivos?: Array<{ id: string; nombre: string }>
}

// ── Helper para resolver nombres legibles ──────────────────────────────────

function nombreDe(
  id: string | null | undefined,
  lista: Array<{ id: string; nombre: string }> | undefined
): string {
  if (!id) return '—'
  const item = lista?.find((x) => x.id === id)
  return item?.nombre || id
}

// ── Comparación principal ──────────────────────────────────────────────────

/**
 * Compara dos versiones de una cotización y devuelve la lista de cambios.
 * Si no hay cambios, devuelve array vacío.
 */
export function compararCotizaciones(
  antes: CotizacionParaComparar,
  despues: CotizacionParaComparar,
  catalogos: Catalogos = {}
): CambioCampo[] {
  const cambios: CambioCampo[] = []

  // ── Campos simples del nivel raíz ────────────────────────────────────────

  if (antes.cliente_nombre !== despues.cliente_nombre) {
    cambios.push({
      campo: 'cliente_nombre',
      etiqueta: 'Cliente',
      antes: antes.cliente_nombre,
      despues: despues.cliente_nombre,
    })
  }

  if (antes.estado !== despues.estado) {
    cambios.push({
      campo: 'estado',
      etiqueta: 'Estado',
      antes: antes.estado,
      despues: despues.estado,
    })
  }

  if (antes.ejecutivo_id !== despues.ejecutivo_id) {
    cambios.push({
      campo: 'ejecutivo_id',
      etiqueta: 'Ejecutivo',
      antes: nombreDe(antes.ejecutivo_id, catalogos.ejecutivos),
      despues: nombreDe(despues.ejecutivo_id, catalogos.ejecutivos),
    })
  }

  if (antes.wp_id !== despues.wp_id) {
    cambios.push({
      campo: 'wp_id',
      etiqueta: 'Wedding Planner',
      antes: nombreDe(antes.wp_id, catalogos.weddingPlanners),
      despues: nombreDe(despues.wp_id, catalogos.weddingPlanners),
    })
  }

  if (antes.comision_override !== despues.comision_override) {
    cambios.push({
      campo: 'comision_override',
      etiqueta: 'Comisión WP override',
      antes: antes.comision_override,
      despues: despues.comision_override,
    })
  }

  if (antes.vigencia_dias !== despues.vigencia_dias) {
    cambios.push({
      campo: 'vigencia_dias',
      etiqueta: 'Vigencia (días)',
      antes: antes.vigencia_dias,
      despues: despues.vigencia_dias,
    })
  }

  if (antes.anticipo_pct_override !== despues.anticipo_pct_override) {
    cambios.push({
      campo: 'anticipo_pct_override',
      etiqueta: 'Anticipo % override',
      antes: antes.anticipo_pct_override,
      despues: despues.anticipo_pct_override,
    })
  }

  if (antes.aplica_iva !== despues.aplica_iva) {
    cambios.push({
      campo: 'aplica_iva',
      etiqueta: 'Aplica IVA',
      antes: antes.aplica_iva ? 'Sí' : 'No',
      despues: despues.aplica_iva ? 'Sí' : 'No',
    })
  }

  if ((antes.notas_cliente || '') !== (despues.notas_cliente || '')) {
    cambios.push({
      campo: 'notas_cliente',
      etiqueta: 'Notas para el cliente',
      antes: resumirTexto(antes.notas_cliente),
      despues: resumirTexto(despues.notas_cliente),
    })
  }

  if ((antes.notas_internas || '') !== (despues.notas_internas || '')) {
    cambios.push({
      campo: 'notas_internas',
      etiqueta: 'Notas internas',
      antes: resumirTexto(antes.notas_internas),
      despues: resumirTexto(despues.notas_internas),
    })
  }

  // ── Descuento general ────────────────────────────────────────────────────

  const descAntes = JSON.stringify(antes.descuento_general || null)
  const descDespues = JSON.stringify(despues.descuento_general || null)
  if (descAntes !== descDespues) {
    cambios.push({
      campo: 'descuento_general',
      etiqueta: 'Descuento general',
      antes: formatearDescuento(antes.descuento_general),
      despues: formatearDescuento(despues.descuento_general),
    })
  }

  // ── Cargos extra (comparación por total y cantidad) ──────────────────────

  const cargosAntes = antes.cargos_extra || []
  const cargosDespues = despues.cargos_extra || []
  const totalCargosAntes = cargosAntes.reduce((s, c) => s + c.monto, 0)
  const totalCargosDespues = cargosDespues.reduce((s, c) => s + c.monto, 0)

  if (
    cargosAntes.length !== cargosDespues.length ||
    totalCargosAntes !== totalCargosDespues
  ) {
    cambios.push({
      campo: 'cargos_extra',
      etiqueta: 'Cargos extra',
      antes: `${cargosAntes.length} cargo(s) — $${totalCargosAntes.toLocaleString('es-MX')}`,
      despues: `${cargosDespues.length} cargo(s) — $${totalCargosDespues.toLocaleString('es-MX')}`,
    })
  }

  // ── Eventos ──────────────────────────────────────────────────────────────

  const eventosAntes = antes.eventos || []
  const eventosDespues = despues.eventos || []

  if (eventosAntes.length !== eventosDespues.length) {
    cambios.push({
      campo: 'eventos.length',
      etiqueta: 'Cantidad de eventos',
      antes: eventosAntes.length,
      despues: eventosDespues.length,
    })
  }

  // Comparar evento por evento (los que están en ambas listas)
  const maxEventos = Math.max(eventosAntes.length, eventosDespues.length)
  for (let i = 0; i < maxEventos; i++) {
    const evtAntes = eventosAntes[i]
    const evtDespues = eventosDespues[i]
    if (!evtAntes || !evtDespues) continue // ya se contó arriba
    const prefijo = eventosDespues.length > 1 ? `Evento ${i + 1}: ` : ''
    cambios.push(...compararEvento(evtAntes, evtDespues, prefijo, catalogos))
  }

  return cambios
}

// ── Comparar un evento individual ──────────────────────────────────────────

function compararEvento(
  antes: EventoCotizacion,
  despues: EventoCotizacion,
  prefijo: string,
  catalogos: Catalogos
): CambioCampo[] {
  const cambios: CambioCampo[] = []

  if (antes.fecha !== despues.fecha) {
    cambios.push({
      campo: 'fecha',
      etiqueta: `${prefijo}Fecha`,
      antes: antes.fecha || null,
      despues: despues.fecha || null,
    })
  }

  if ((antes.locacion_texto || '') !== (despues.locacion_texto || '')) {
    cambios.push({
      campo: 'locacion_texto',
      etiqueta: `${prefijo}Locación`,
      antes: antes.locacion_texto || null,
      despues: despues.locacion_texto || null,
    })
  }

  if (antes.zona_id !== despues.zona_id) {
    cambios.push({
      campo: 'zona_id',
      etiqueta: `${prefijo}Zona`,
      antes: nombreDe(antes.zona_id, catalogos.zonas),
      despues: nombreDe(despues.zona_id, catalogos.zonas),
    })
  }

  if (antes.pax !== despues.pax) {
    cambios.push({
      campo: 'pax',
      etiqueta: `${prefijo}Pax`,
      antes: antes.pax ?? null,
      despues: despues.pax ?? null,
    })
  }

  if (antes.paquete_id !== despues.paquete_id) {
    cambios.push({
      campo: 'paquete_id',
      etiqueta: `${prefijo}Paquete`,
      antes: nombreDe(antes.paquete_id, catalogos.paquetes),
      despues: nombreDe(despues.paquete_id, catalogos.paquetes),
    })
  }

  // Adicionales: comparar por cantidad de items y suma total
  const adAntes = antes.adicionales || []
  const adDespues = despues.adicionales || []
  const totalAntes = adAntes.reduce((s, a) => s + a.cantidad * a.precioUnitario, 0)
  const totalDespues = adDespues.reduce((s, a) => s + a.cantidad * a.precioUnitario, 0)

  if (adAntes.length !== adDespues.length || totalAntes !== totalDespues) {
    cambios.push({
      campo: 'adicionales',
      etiqueta: `${prefijo}Adicionales`,
      antes: `${adAntes.length} item(s) — $${totalAntes.toLocaleString('es-MX')}`,
      despues: `${adDespues.length} item(s) — $${totalDespues.toLocaleString('es-MX')}`,
    })
  }

  return cambios
}

// ── Helpers internos ───────────────────────────────────────────────────────

function resumirTexto(texto: string | null): string {
  if (!texto) return '—'
  const limpio = texto.trim()
  if (limpio.length === 0) return '—'
  if (limpio.length <= 40) return limpio
  return limpio.slice(0, 37) + '...'
}

function formatearDescuento(d: DescuentoGeneral): string {
  if (!d) return '—'
  if (d.tipo === 'porcentaje') return `${d.valor}%${d.concepto ? ` (${d.concepto})` : ''}`
  return `$${d.valor.toLocaleString('es-MX')}${d.concepto ? ` (${d.concepto})` : ''}`
}

// ── Generar entrada de historial ───────────────────────────────────────────

/**
 * Construye una entrada de historial. Si la acción es EDITADA y no hay
 * cambios, devuelve null (señal para no agregar nada al historial).
 */
export function construirEntradaHistorial(args: {
  accion: EntradaHistorial['accion']
  usuario_id: string
  usuario_nombre: string
  cambios?: CambioCampo[]
  detalle?: string
}): EntradaHistorial | null {
  // Si es edición sin cambios reales, no generamos entrada
  if (args.accion === 'EDITADA' && (!args.cambios || args.cambios.length === 0)) {
    return null
  }

  const entrada: EntradaHistorial = {
    accion: args.accion,
    usuario_id: args.usuario_id,
    usuario_nombre: args.usuario_nombre,
    fecha: new Date().toISOString(),
  }

  if (args.cambios && args.cambios.length > 0) {
    entrada.cambios = args.cambios
  }

  if (args.detalle) {
    entrada.detalle = args.detalle
  }

  return entrada
}

// ── Formatear cambio para mostrar en UI ────────────────────────────────────

/**
 * Convierte un cambio en string legible para mostrar al usuario.
 * Ej: "Pax del evento 1: 130 → 150"
 */
export function formatearCambio(cambio: CambioCampo): string {
  const antes = cambio.antes === null || cambio.antes === undefined ? '—' : cambio.antes
  const despues = cambio.despues === null || cambio.despues === undefined ? '—' : cambio.despues
  return `${cambio.etiqueta}: ${antes} → ${despues}`
}
