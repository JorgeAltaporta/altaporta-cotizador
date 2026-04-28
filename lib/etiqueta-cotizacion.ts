import { parsearFechaLocal } from './fecha'

const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

function normalizarTexto(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
}

function formatearFechaCorta(fechaISO: string): string {
  const d = parsearFechaLocal(fechaISO)
  const dia = d.getDate()
  const mes = MESES_CORTOS[d.getMonth()]
  const año = String(d.getFullYear()).slice(-2)
  return `${dia}${mes}${año}`
}

type Evento = {
  fecha?: string
  locacion_texto?: string | null
  pax?: number
}

type WeddingPlanner = {
  id: string
  nombre: string
}

export function generarEtiqueta(
  eventos: Evento[],
  wpId: string | null,
  wps: WeddingPlanner[]
): string {
  if (!eventos || eventos.length === 0) return ''

  const fechasValidas = eventos
    .map((e) => e.fecha)
    .filter((f): f is string => Boolean(f))

  if (fechasValidas.length === 0) return ''

  // Parte de fechas
  let fechaParte = ''
  if (fechasValidas.length === 1) {
    fechaParte = formatearFechaCorta(fechasValidas[0])
  } else {
    const ordenadas = [...fechasValidas].sort()
    const primera = ordenadas[0]
    const ultima = ordenadas[ordenadas.length - 1]
    if (primera === ultima) {
      fechaParte = formatearFechaCorta(primera)
    } else {
      const dPrimera = parsearFechaLocal(primera)
      const dUltima = parsearFechaLocal(ultima)
      if (
        dPrimera.getFullYear() === dUltima.getFullYear() &&
        dPrimera.getMonth() === dUltima.getMonth()
      ) {
        const mes = MESES_CORTOS[dPrimera.getMonth()]
        const año = String(dPrimera.getFullYear()).slice(-2)
        fechaParte = `${dPrimera.getDate()}-${dUltima.getDate()}${mes}${año}`
      } else {
        fechaParte = `${formatearFechaCorta(primera)}-${formatearFechaCorta(ultima)}`
      }
    }
  }

  // Locación: del primer evento
  const locacionTexto = normalizarTexto(eventos[0].locacion_texto || '')
  const locacionParte = locacionTexto || ''

  // Pax: suma total
  const paxTotal = eventos.reduce((s, e) => s + (e.pax || 0), 0)
  const paxParte = paxTotal > 0 ? `${paxTotal}pax` : ''

  // WP: con prefijo "WP"
  let wpParte = ''
  if (wpId && wpId !== 'WP-DIRECTO') {
    const wp = wps.find((w) => w.id === wpId)
    if (wp && wp.nombre) {
      const primerPalabra = normalizarTexto(wp.nombre.split(/\s+/)[0])
      if (primerPalabra) {
        wpParte = `WP ${primerPalabra}`
      }
    }
  }

  const partes = [fechaParte, locacionParte, paxParte, wpParte].filter(Boolean)
  return partes.join(' · ')
}
