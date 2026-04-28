/**
 * Convierte un string ISO "2026-07-25" a Date local sin desfase de zona horaria.
 * El input type="date" guarda la fecha sin hora; al hacer new Date(...) JavaScript
 * la interpreta como UTC medianoche, lo que en zona horaria negativa hace que
 * se muestre como el día anterior. Esta función fuerza interpretación local.
 */
export function parsearFechaLocal(fechaISO: string): Date {
  const [year, month, day] = fechaISO.split('-').map(Number)
  return new Date(year, month - 1, day) // mes 0-indexado
}

/** Formatea fecha como "27 de abril de 2026" */
export function formatearFechaLarga(fechaISO: string): string {
  if (!fechaISO) return ''
  return parsearFechaLocal(fechaISO).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Formatea fecha como "27 abr 2026" */
export function formatearFechaCorta(fechaISO: string): string {
  if (!fechaISO) return ''
  return parsearFechaLocal(fechaISO).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Convierte fecha-hora ISO completa (ej: "2026-04-27T14:30:00Z") a "27 de abril de 2026" */
export function formatearFechaHoraLarga(fechaISO: string): string {
  if (!fechaISO) return ''
  return new Date(fechaISO).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
