import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PDFViewerCliente from '@/app/(app)/cotizaciones/[id]/pdf/PDFViewerCliente'
import {
  type CotizacionSnapshot,
  tieneSnapshot,
  obtenerClausulas,
  obtenerWP,
  obtenerEjecutivo,
} from '@/lib/snapshot-cotizacion'

export default async function PDFPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Validar formato UUID
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    notFound()
  }

  const supabase = await createClient()

  // Buscar cotización por token (no por id)
  const { data: cotizacion, error } = await supabase
    .from('cotizaciones')
    .select('*')
    .eq('token_publico', token)
    .single()

  if (error || !cotizacion) {
    notFound()
  }

  // Snapshot vs catálogo (Fase G)
  const snapshot: CotizacionSnapshot | null = tieneSnapshot(cotizacion.snapshot)
    ? cotizacion.snapshot
    : null

  const [paquetesResp, ejecutivoResp, wpResp, adicionalesResp, clausulasResp] =
    await Promise.all([
      supabase
        .from('paquetes')
        .select('id, nombre, horas_servicio, categorias'),
      cotizacion.ejecutivo_id
        ? supabase
            .from('profiles')
            .select('id, nombre')
            .eq('id', cotizacion.ejecutivo_id)
            .single()
        : Promise.resolve({ data: null }),
      cotizacion.wp_id
        ? supabase
            .from('wedding_planners')
            .select('id, nombre, contacto')
            .eq('id', cotizacion.wp_id)
            .single()
        : Promise.resolve({ data: null }),
      supabase
        .from('adicionales')
        .select('id, nombre, unidad, precio, notas, estado'),
      supabase
        .from('clausulas_globales')
        .select('contenido')
        .eq('id', 'global')
        .single(),
    ])

  const clausulasCatalogo = (clausulasResp.data?.contenido as {
    anticipoPct: number
    vigenciaDiasDefault: number
    cambioFecha: string
    instalaciones: string
  }) || {
    anticipoPct: 30,
    vigenciaDiasDefault: 15,
    cambioFecha: 'Se actualiza costo por persona',
    instalaciones: 'Las proporciona el cliente',
  }

  // Si hay snapshot: usamos ese. Si no: caemos al catálogo actual (cotización legacy).
  const paquetesParaPDF = snapshot
    ? Object.values(snapshot.paquetes).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        horas_servicio: p.horas_servicio,
        categorias: p.categorias,
      }))
    : paquetesResp.data || []

  const adicionalesParaPDF = snapshot
    ? Object.values(snapshot.adicionales).map((a) => ({
        id: a.id,
        nombre: a.nombre,
        unidad: a.unidad,
        precio: 0,
        notas: a.notas,
        estado: 'ACTIVO',
      }))
    : adicionalesResp.data || []

  const clausulas = obtenerClausulas(snapshot, clausulasCatalogo)

  const wpDatos = obtenerWP(
    snapshot,
    wpResp.data
      ? { id: wpResp.data.id, nombre: wpResp.data.nombre, contacto: wpResp.data.contacto }
      : null
  )

  const ejecutivoDatos = obtenerEjecutivo(
    snapshot,
    ejecutivoResp.data
      ? { id: ejecutivoResp.data.id, nombre: ejecutivoResp.data.nombre }
      : null
  )

  const cotizacionConDatos = {
    ...cotizacion,
    ejecutivo_nombre: ejecutivoDatos?.nombre || null,
    wp_nombre: wpDatos?.nombre || null,
    wp_contacto: wpDatos?.contacto || null,
  }

  return (
    <PDFViewerCliente
      cotizacion={cotizacionConDatos}
      paquetes={paquetesParaPDF}
      adicionales={adicionalesParaPDF}
      clausulas={clausulas}
    />
  )
}
