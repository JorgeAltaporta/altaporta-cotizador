'use client'

import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer'
import Link from 'next/link'
import PDFDocument from './PDFDocument'

type Props = {
  cotizacion: any
  paquetes: any[]
  adicionales: any[]
  clausulas: any
}

/**
 * Genera nombre de archivo limpio a partir de la etiqueta.
 * "15Mar26 · Xcanatun · 150pax · WP Baku" → "15Mar26-Xcanatun-150pax-WP_Baku.pdf"
 */
function generarNombreArchivo(etiqueta: string | null, folio: string | null): string {
  if (etiqueta) {
    const limpio = etiqueta
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quitar tildes
      .replace(/·/g, '-')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .replace(/-+/g, '-')
      .replace(/_+/g, '_')
    return `${limpio}.pdf`
  }
  return `${folio || 'cotizacion'}.pdf`
}

export default function PDFViewerCliente({
  cotizacion,
  paquetes,
  adicionales,
  clausulas,
}: Props) {
  const nombreArchivo = generarNombreArchivo(
    cotizacion.etiqueta,
    cotizacion.folio
  )

  const documento = (
    <PDFDocument
      cotizacion={cotizacion}
      paquetes={paquetes}
      adicionales={adicionales}
      clausulas={clausulas}
    />
  )

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Header con botones */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Link
            href={`/cotizaciones/${cotizacion.id}`}
            className="text-sm text-amber-700 hover:underline"
          >
            ← Volver a cotización
          </Link>

          <div className="flex items-center gap-3">
            <div className="text-xs text-stone-500 font-mono hidden md:block">
              {nombreArchivo}
            </div>
            <PDFDownloadLink
              document={documento}
              fileName={nombreArchivo}
              className="bg-amber-700 hover:bg-amber-800 text-white px-5 py-2 rounded-lg font-medium text-sm transition"
            >
              {({ loading }) =>
                loading ? 'Generando PDF...' : '⬇ Descargar PDF'
              }
            </PDFDownloadLink>
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <PDFViewer
            width="100%"
            height={900}
            showToolbar={true}
            style={{ border: 'none' }}
          >
            {documento}
          </PDFViewer>
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
          💡 Si quieres enviarlo por WhatsApp: clic en{' '}
          <strong>⬇ Descargar PDF</strong> arriba, después arrastra el archivo a WhatsApp.
        </div>
      </div>
    </div>
  )
}
