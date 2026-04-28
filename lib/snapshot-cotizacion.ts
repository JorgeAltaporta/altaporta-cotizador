// ════════════════════════════════════════════════════════════════════════════
// FASE G — Snapshot de cotización
//
// Una cotización congela el estado del catálogo al momento de guardarse.
// Esto garantiza que, si Jorge cambia el nombre/precio/descripción de un
// paquete después, la cotización ya entregada al cliente sigue mostrando
// los datos originales.
//
// Reglas:
// - Crear cotización → construir snapshot
// - Editar cotización → REGENERAR snapshot (refleja cambios actuales del catálogo
//   solo para los items que la cotización usa; el resto del catálogo no se toca)
// - Leer cotización → preferir snapshot; fallback a catálogo si no existe
//   (cotizaciones legacy creadas antes de Fase G)
// ════════════════════════════════════════════════════════════════════════════

// ── Tipos del snapshot ──────────────────────────────────────────────────────

export type AtributoSnapshot = {
  id: string
  nombre: string
  valor: string
}

export type CategoriaSnapshot = {
  id: string
  nombre: string
  icono: string
  atributos: AtributoSnapshot[]
}

export type PaqueteSnapshot = {
  id: string
  nombre: string
  color: string | null
  descripcion: string | null
  horas_servicio: number
  categorias: CategoriaSnapshot[]
}

export type ZonaSnapshot = {
  id: string
  nombre: string
  color: string | null
}

export type AdicionalSnapshot = {
  id: string
  nombre: string
  unidad: string | null
  notas: string | null
}

export type ClausulasSnapshot = {
  anticipoPct: number
  vigenciaDiasDefault: number
  cambioFecha: string
  instalaciones: string
}

export type WPSnapshot = {
  id: string
  nombre: string
  contacto: string | null
} | null

export type EjecutivoSnapshot = {
  id: string
  nombre: string
} | null

export type CotizacionSnapshot = {
  version: 1
  capturadoEn: string // ISO
  paquetes: Record<string, PaqueteSnapshot> // solo los usados en la cotización
  zonas: Record<string, ZonaSnapshot>
  adicionales: Record<string, AdicionalSnapshot>
  clausulas: ClausulasSnapshot
  wp: WPSnapshot
  ejecutivo: EjecutivoSnapshot
}

// ── Tipos de entrada (lo que pasamos del catálogo actual) ──────────────────

type PaqueteCatalogo = {
  id: string
  nombre: string
  color: string | null
  descripcion: string | null
  horas_servicio: number
  categorias: CategoriaSnapshot[] | null
}

type ZonaCatalogo = {
  id: string
  nombre: string
  color: string | null
}

type AdicionalCatalogo = {
  id: string
  nombre: string
  unidad: string | null
  notas: string | null
}

type WPCatalogo = {
  id: string
  nombre: string
  contacto: string | null
} | null

type EjecutivoCatalogo = {
  id: string
  nombre: string
} | null

type EventoCotizacion = {
  paquete_id?: string
  zona_id?: string
  adicionales?: Array<{ adicionalId: string }>
}

// ── Construir snapshot ──────────────────────────────────────────────────────

/**
 * Construye el snapshot a partir del catálogo actual y los eventos de la cotización.
 * Solo incluye los paquetes/zonas/adicionales que efectivamente usa la cotización
 * (no clona el catálogo entero).
 *
 * El ID `__HORA_EXTRA__` es especial: no existe en la tabla `adicionales`, se trata
 * por separado y NO se incluye en el snapshot de adicionales.
 */
export function construirSnapshot(args: {
  eventos: EventoCotizacion[]
  paquetes: PaqueteCatalogo[]
  zonas: ZonaCatalogo[]
  adicionales: AdicionalCatalogo[]
  clausulas: ClausulasSnapshot
  wp: WPCatalogo
  ejecutivo: EjecutivoCatalogo
}): CotizacionSnapshot {
  const { eventos, paquetes, zonas, adicionales, clausulas, wp, ejecutivo } = args

  const paquetesUsados = new Set<string>()
  const zonasUsadas = new Set<string>()
  const adicionalesUsados = new Set<string>()

  for (const evt of eventos) {
    if (evt.paquete_id) paquetesUsados.add(evt.paquete_id)
    if (evt.zona_id) zonasUsadas.add(evt.zona_id)
    for (const sel of evt.adicionales || []) {
      if (sel.adicionalId && sel.adicionalId !== '__HORA_EXTRA__') {
        adicionalesUsados.add(sel.adicionalId)
      }
    }
  }

  const paquetesSnap: Record<string, PaqueteSnapshot> = {}
  for (const p of paquetes) {
    if (paquetesUsados.has(p.id)) {
      paquetesSnap[p.id] = {
        id: p.id,
        nombre: p.nombre,
        color: p.color,
        descripcion: p.descripcion,
        horas_servicio: p.horas_servicio,
        categorias: p.categorias || [],
      }
    }
  }

  const zonasSnap: Record<string, ZonaSnapshot> = {}
  for (const z of zonas) {
    if (zonasUsadas.has(z.id)) {
      zonasSnap[z.id] = {
        id: z.id,
        nombre: z.nombre,
        color: z.color,
      }
    }
  }

  const adicionalesSnap: Record<string, AdicionalSnapshot> = {}
  for (const a of adicionales) {
    if (adicionalesUsados.has(a.id)) {
      adicionalesSnap[a.id] = {
        id: a.id,
        nombre: a.nombre,
        unidad: a.unidad,
        notas: a.notas,
      }
    }
  }

  return {
    version: 1,
    capturadoEn: new Date().toISOString(),
    paquetes: paquetesSnap,
    zonas: zonasSnap,
    adicionales: adicionalesSnap,
    clausulas,
    wp,
    ejecutivo,
  }
}

// ── Leer del snapshot con fallback al catálogo ─────────────────────────────

/**
 * Helper para leer datos de paquete: prefiere snapshot, fallback a catálogo.
 * Devuelve null si no se encuentra en ninguno.
 */
export function obtenerPaquete(
  paqueteId: string | null | undefined,
  snapshot: CotizacionSnapshot | null,
  paquetesCatalogo: PaqueteCatalogo[]
): PaqueteSnapshot | null {
  if (!paqueteId) return null
  if (snapshot?.paquetes?.[paqueteId]) return snapshot.paquetes[paqueteId]
  const p = paquetesCatalogo.find((x) => x.id === paqueteId)
  if (!p) return null
  return {
    id: p.id,
    nombre: p.nombre,
    color: p.color,
    descripcion: p.descripcion,
    horas_servicio: p.horas_servicio,
    categorias: p.categorias || [],
  }
}

export function obtenerZona(
  zonaId: string | null | undefined,
  snapshot: CotizacionSnapshot | null,
  zonasCatalogo: ZonaCatalogo[]
): ZonaSnapshot | null {
  if (!zonaId) return null
  if (snapshot?.zonas?.[zonaId]) return snapshot.zonas[zonaId]
  const z = zonasCatalogo.find((x) => x.id === zonaId)
  return z ? { id: z.id, nombre: z.nombre, color: z.color } : null
}

export function obtenerAdicional(
  adicionalId: string | null | undefined,
  snapshot: CotizacionSnapshot | null,
  adicionalesCatalogo: AdicionalCatalogo[]
): AdicionalSnapshot | null {
  if (!adicionalId) return null
  if (adicionalId === '__HORA_EXTRA__') {
    return { id: '__HORA_EXTRA__', nombre: 'Hora extra', unidad: 'hora', notas: null }
  }
  if (snapshot?.adicionales?.[adicionalId]) return snapshot.adicionales[adicionalId]
  const a = adicionalesCatalogo.find((x) => x.id === adicionalId)
  return a ? { id: a.id, nombre: a.nombre, unidad: a.unidad, notas: a.notas } : null
}

export function obtenerClausulas(
  snapshot: CotizacionSnapshot | null,
  clausulasCatalogo: ClausulasSnapshot
): ClausulasSnapshot {
  return snapshot?.clausulas || clausulasCatalogo
}

export function obtenerWP(
  snapshot: CotizacionSnapshot | null,
  wpCatalogo: WPCatalogo
): WPCatalogo {
  // Si el snapshot tiene WP, usarlo. Si la cotización no tenía WP, ambos son null.
  if (snapshot?.wp !== undefined) return snapshot.wp
  return wpCatalogo
}

export function obtenerEjecutivo(
  snapshot: CotizacionSnapshot | null,
  ejecutivoCatalogo: EjecutivoCatalogo
): EjecutivoCatalogo {
  if (snapshot?.ejecutivo !== undefined) return snapshot.ejecutivo
  return ejecutivoCatalogo
}

/**
 * True si la cotización tiene snapshot. Útil para mostrar un banner
 * "datos actuales del catálogo" cuando es legacy.
 */
export function tieneSnapshot(snapshot: unknown): snapshot is CotizacionSnapshot {
  return (
    typeof snapshot === 'object' &&
    snapshot !== null &&
    'version' in snapshot &&
    (snapshot as { version: number }).version === 1
  )
}
