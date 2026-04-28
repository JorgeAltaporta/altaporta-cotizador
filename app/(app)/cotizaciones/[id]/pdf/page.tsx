import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PDFViewerCliente from './PDFViewerCliente'

export default async function PDFPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cotizacion, error } = await supabase
    .from('cotizaciones')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !cotizacion) {
    notFound()
  }

  const [paquetesResp, ejecutivoResp, wpResp, adicionalesResp, clausulasResp] =
    await Promise.all([
      supabase
        .from('paquetes')
        .select('id, nombre, horas_servicio, categorias'),
      cotizacion.ejecutivo_id
        ? supabase
            .from('profiles')
            .select('nombre')
            .eq('id', cotizacion.ejecutivo_id)
            .single()
        : Promise.resolve({ data: null }),
      cotizacion.wp_id
        ? supabase
            .from('wedding_planners')
            .select('nombre, contacto')
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

  const cotizacionConDatos = {
    ...cotizacion,
    ejecutivo_nombre: ejecutivoResp.data?.nombre || null,
    wp_nombre: wpResp.data?.nombre || null,
    wp_contacto: wpResp.data?.contacto || null,
  }

  const clausulas = (clausulasResp.data?.contenido as {
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

  return (
    <PDFViewerCliente
      cotizacion={cotizacionConDatos}
      paquetes={paquetesResp.data || []}
      adicionales={adicionalesResp.data || []}
      clausulas={clausulas}
    />
  )
}
