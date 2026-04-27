import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

type Evento = {
  id?: string
  nombre?: string
  fecha?: string
  zona_id?: string
  locacion_id?: string | null
  locacion_texto?: string | null
  pax?: number
  paquete_id?: string
  precio_por_pax?: number
  subtotal_paquete?: number
  flete?: number
  total?: number
}

type Cotizacion = {
  id: string
  folio: string | null
  cliente_nombre: string
  estado: string
  ejecutivo_id: string | null
  wp_id: string | null
  comision_override: number | null
  eventos: Evento[] | null
  notas_cliente: string | null
  notas_internas: string | null
  fecha_creacion: string
}

const COLORES_ESTADO: Record<string, string> = {
  BORRADOR: 'bg-stone-100 text-stone-700',
  PENDIENTE: 'bg-amber-100 text-amber-700',
  ENVIADA: 'bg-blue-100 text-blue-700',
  APROBADA: 'bg-emerald-100 text-emerald-700',
  CANCELADA: 'bg-rose-100 text-rose-700',
}

export default async function CotizacionDetallePage({
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

  const c = cotizacion as Cotizacion

  // Cargar info adicional
  const [paquetesResp, zonasResp, ejecutivoResp, wpResp] = await Promise.all([
    supabase.from('paquetes').select('id, nombre'),
    supabase.from('zonas').select('id, nombre'),
    c.ejecutivo_id
      ? supabase.from('profiles').select('nombre').eq('id', c.ejecutivo_id).single()
      : Promise.resolve({ data: null }),
    c.wp_id
      ? supabase.from('wedding_planners').select('nombre, comision_default').eq('id', c.wp_id).single()
      : Promise.resolve({ data: null }),
  ])

  const paquetesMap = new Map((paquetesResp.data || []).map((p) => [p.id, p.nombre]))
  const zonasMap = new Map((zonasResp.data || []).map((z) => [z.id, z.nombre]))

  const totalCotizacion = (c.eventos || []).reduce((sum, e) => sum + (e.total || 0), 0)
  const comisionPct = c.comision_override ?? wpResp.data?.comision_default ?? 0
  const comisionMonto = totalCotizacion * (comisionPct / 100)

  return (
    <div className="p-12 max-w-4xl">
      <div className="mb-8">
        <Link href="/cotizaciones" className="text-sm text-amber-700 hover:underline">
          ← Volver a cotizaciones
        </Link>
      </div>

      {/* HEADER */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span
              className={`text-xs px-2 py-1 rounded font-medium ${
                COLORES_ESTADO[c.estado] || 'bg-stone-100 text-stone-700'
              }`}
            >
              {c.estado}
            </span>
            {c.folio && (
              <span className="text-xs tracking-widest text-stone-500 uppercase">
                {c.folio}
              </span>
            )}
          </div>
          <h1 className="font-serif text-4xl text-stone-900">
            {c.cliente_nombre}
          </h1>
          <div className="flex gap-4 text-sm text-stone-500 mt-2">
            {ejecutivoResp.data && (
              <span>Ejecutivo: <strong className="text-stone-700">{ejecutivoResp.data.nombre}</strong></span>
            )}
            {wpResp.data && (
              <span>WP: <strong className="text-stone-700">{wpResp.data.nombre}</strong></span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-stone-500 mb-1">Total</div>
          <div className="font-serif text-3xl text-stone-900">
            ${totalCotizacion.toLocaleString('es-MX')}
          </div>
          {comisionPct > 0 && (
            <div className="text-xs text-stone-500 mt-1">
              Comisión {comisionPct}%: ${comisionMonto.toLocaleString('es-MX')}
            </div>
          )}
        </div>
      </div>

      {/* EVENTOS */}
      {(c.eventos || []).map((evento, idx) => {
        const zonaNombre = evento.zona_id ? zonasMap.get(evento.zona_id) : null
        const paqueteNombre = evento.paquete_id ? paquetesMap.get(evento.paquete_id) : null

        return (
          <section
            key={evento.id || idx}
            className="bg-white rounded-2xl border border-stone-200 p-6 mb-6"
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-serif text-xl text-stone-900">
                {evento.nombre || `Evento ${idx + 1}`}
              </h2>
              <div className="text-right">
                <div className="text-xs text-stone-500">Total evento</div>
                <div className="font-medium text-stone-900">
                  ${(evento.total || 0).toLocaleString('es-MX')}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <div className="text-xs text-stone-500 mb-1">Fecha</div>
                <div className="text-stone-900">
                  {evento.fecha
                    ? new Date(evento.fecha).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-stone-500 mb-1">Locación</div>
                <div className="text-stone-900">
                  {evento.locacion_texto || '—'}
                </div>
                {zonaNombre && (
                  <div className="text-xs text-stone-500">
                    Zona {evento.zona_id} · {zonaNombre}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-stone-500 mb-1">Pax</div>
                <div className="text-stone-900">{evento.pax || 0}</div>
              </div>
              <div>
                <div className="text-xs text-stone-500 mb-1">Paquete</div>
                <div className="text-stone-900">{paqueteNombre || '—'}</div>
              </div>
            </div>

            <div className="border-t border-stone-100 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-700">
                  {paqueteNombre || 'Paquete'} · {evento.pax} pax × ${(evento.precio_por_pax || 0).toLocaleString('es-MX')}
                </span>
                <span className="font-medium text-stone-900">
                  ${(evento.subtotal_paquete || 0).toLocaleString('es-MX')}
                </span>
              </div>
              {(evento.flete || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-700">Flete</span>
                  <span className="font-medium text-stone-900">
                    ${(evento.flete || 0).toLocaleString('es-MX')}
                  </span>
                </div>
              )}
            </div>
          </section>
        )
      })}

      {/* AVISO MVP */}
      <section className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
        <h3 className="font-medium text-blue-900 mb-2">📋 Versión MVP</h3>
        <p className="text-sm text-blue-700">
          Esta cotización tiene la información básica. Próximamente podrás agregar proteínas,
          adicionales, generar PDF y enviarla al cliente.
        </p>
      </section>
    </div>
  )
}
