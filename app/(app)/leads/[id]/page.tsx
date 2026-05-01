import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obtenerLeadPorId, obtenerNotasDeLead } from '@/lib/leads/queries'
import { createClient } from '@/lib/supabase/server'
import {
  CANAL_LABELS,
  ESTADO_LABELS,
  TIPO_EVENTO_LABELS,
  RAZON_PERDIDA_LABELS,
  colorEstado,
  formatearFechaEvento,
  telefonoNumerico,
  tiempoTranscurrido,
} from '@/lib/types/leads'
import { ArrowLeft, MessageSquare, Phone, Mail, MapPin, Calendar, Users, FileText } from 'lucide-react'
import CambiarEstado from './_components/cambiar-estado'
import AgregarNota from './_components/agregar-nota'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
}

export default async function LeadDetallePage({ params }: Props) {
  const { id } = await params
  const lead = await obtenerLeadPorId(id)

  if (!lead) {
    notFound()
  }

  const notas = await obtenerNotasDeLead(id)
  const colorEstadoActual = colorEstado(lead.estado)
  const tel = telefonoNumerico(lead.telefono)
  const waUrl = `https://wa.me/52${tel}`

  const puedeGenerarCotizacion = ['NUEVO', 'COTIZADO', 'SEGUIMIENTO', 'NEGOCIACION'].includes(
    lead.estado
  )

  // Si tiene WP, traer su comisión para mostrarla en el modal de GANADO
  let comisionWP: number | null = null
  if (lead.wp_id) {
    const supabase = await createClient()
    const { data: wp } = await supabase
      .from('wedding_planners')
      .select('comision_default')
      .eq('id', lead.wp_id)
      .maybeSingle()
    comisionWP = wp?.comision_default ?? null
  }

  return (
    <div className="p-12 max-w-5xl">
      <Link href="/leads" className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-amber-700 mb-4 transition">
        <ArrowLeft size={16} />
        Volver a Leads
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">Lead {lead.id}</div>
            <h1 className="font-serif text-4xl text-stone-900 leading-tight">{lead.nombre}</h1>
            <p className="text-stone-600 mt-2">
              Capturado {tiempoTranscurrido(lead.fecha_creacion)} · {CANAL_LABELS[lead.canal]}
            </p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${colorEstadoActual.bg} ${colorEstadoActual.text} flex-shrink-0`}>
            {ESTADO_LABELS[lead.estado]}
          </span>
        </div>
      </div>

      {/* Grid de columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: Info principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datos del cliente */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6">
            <h2 className="font-serif text-xl text-stone-900 mb-4">Datos del cliente</h2>

            <div className="space-y-3">
              <DatoFila icono={<Phone size={16} />} label="Teléfono">
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="text-stone-900 hover:text-emerald-700 hover:underline">{lead.telefono}</a>
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="ml-3 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50">{'WhatsApp'}</a>
              </DatoFila>

              {lead.email ? (
                <DatoFila icono={<Mail size={16} />} label="Email">
                  <a href={`mailto:${lead.email}`} className="text-stone-900 hover:text-amber-700 hover:underline">{lead.email}</a>
                </DatoFila>
              ) : null}

              {lead.wp_nombre ? (
                <DatoFila icono={<Users size={16} />} label="Wedding Planner">
                  <span className="text-stone-900">{lead.wp_nombre}</span>
                  {lead.wp_verificado === false ? (
                    <span className="ml-2 text-[10px] uppercase font-semibold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">sin verificar</span>
                  ) : null}
                </DatoFila>
              ) : null}
            </div>

            {lead.mensaje_inicial ? (
              <div className="mt-5 pt-5 border-t border-stone-100">
                <div className="text-xs uppercase tracking-wider text-stone-500 mb-2 font-semibold">Mensaje inicial</div>
                <div className="bg-stone-50 rounded-lg p-3 text-sm text-stone-700 italic border-l-3 border-stone-300">
                  &ldquo;{lead.mensaje_inicial}&rdquo;
                </div>
              </div>
            ) : null}
          </section>

          {/* Datos del evento */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6">
            <h2 className="font-serif text-xl text-stone-900 mb-4">Datos del evento</h2>
            <div className="grid grid-cols-2 gap-4">
              <DatoCompacto icono={<FileText size={16} />} label="Tipo" valor={lead.tipo_evento ? TIPO_EVENTO_LABELS[lead.tipo_evento] : '—'} />
              <DatoCompacto icono={<Users size={16} />} label="Pax" valor={lead.pax ? `${lead.pax} personas` : '—'} />
              <DatoCompacto icono={<Calendar size={16} />} label="Fecha" valor={formatearFechaEvento(lead.fecha_evento)} />
              <DatoCompacto icono={<MapPin size={16} />} label="Locación" valor={lead.locacion || '—'} />
            </div>
          </section>

          {/* Notas / Historial */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6">
            <h2 className="font-serif text-xl text-stone-900 mb-4 flex items-center gap-2">
              <MessageSquare size={18} />
              Historial y notas
              {notas.length > 0 ? (
                <span className="text-xs font-normal text-stone-500">({notas.length})</span>
              ) : null}
            </h2>

            {notas.length === 0 ? (
              <div className="text-sm text-stone-400 text-center py-6 bg-stone-50 rounded-lg mb-4">Sin notas todavía</div>
            ) : (
              <div className="space-y-3 mb-4">
                {notas.map((nota) => (
                  <NotaItem key={nota.id} nota={nota} />
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-stone-100">
              <AgregarNota leadId={lead.id} />
            </div>
          </section>
        </div>

        {/* Columna derecha */}
        <div className="space-y-6">
          {/* Ejecutivo asignado */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6">
            <h2 className="text-xs uppercase tracking-wider text-stone-500 mb-3 font-semibold">Ejecutivo asignado</h2>
            {lead.ejecutivo_nombre ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-semibold" style={{ backgroundColor: lead.ejecutivo_color ?? '#78716c' }}>
                  {lead.ejecutivo_nombre.charAt(0)}
                </div>
                <div>
                  <div className="font-medium text-stone-900">{lead.ejecutivo_nombre}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-stone-400">Sin ejecutivo asignado</div>
            )}
          </section>

          {/* Cambiar estatus */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6">
            <CambiarEstado
              leadId={lead.id}
              estadoActual={lead.estado}
              nombreLead={lead.nombre}
              tieneWP={!!lead.wp_id}
              comisionWP={comisionWP}
            />
          </section>

          {/* Acción: generar cotización */}
          {puedeGenerarCotizacion ? (
            <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <h2 className="text-xs uppercase tracking-wider text-amber-800 mb-2 font-semibold">Acción rápida</h2>
              <p className="text-sm text-stone-700 mb-3">Genera una cotización con los datos de este lead.</p>
              <Link href={`/cotizaciones/nueva?lead_id=${lead.id}`} className="block w-full bg-amber-700 hover:bg-amber-800 text-white py-2.5 rounded-lg font-medium text-center transition">
                + Generar cotización
              </Link>
              <p className="text-[10px] text-stone-500 mt-2 italic">Te llevará al cotizador con datos del lead disponibles.</p>
            </section>
          ) : null}

          {/* Razón de pérdida */}
          {lead.estado === 'PERDIDO' && lead.razon_perdida ? (
            <section className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
              <h2 className="text-xs uppercase tracking-wider text-rose-800 mb-2 font-semibold">Razón de pérdida</h2>
              <div className="text-sm text-rose-900 font-medium">{RAZON_PERDIDA_LABELS[lead.razon_perdida]}</div>
              {lead.razon_perdida_detalle ? (
                <div className="text-xs text-rose-700 mt-2 italic">&ldquo;{lead.razon_perdida_detalle}&rdquo;</div>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────────────────────────────────

function DatoFila({ icono, label, children }: { icono: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-stone-400 mt-0.5">{icono}</div>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold mb-0.5">{label}</div>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  )
}

function DatoCompacto({ icono, label, valor }: { icono: React.ReactNode; label: string; valor: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-stone-400 mt-0.5">{icono}</div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold mb-0.5">{label}</div>
        <div className="text-sm text-stone-900 font-medium">{valor}</div>
      </div>
    </div>
  )
}

type NotaProps = {
  nota: {
    id: string
    tipo: 'MANUAL' | 'SISTEMA'
    texto: string
    autor_nombre: string | null
    fecha_creacion: string
  }
}

function NotaItem({ nota }: NotaProps) {
  const esSistema = nota.tipo === 'SISTEMA'
  const bg = esSistema ? 'bg-amber-50 border-amber-200' : 'bg-stone-50 border-stone-200'
  const labelColor = esSistema ? 'text-amber-700' : 'text-stone-500'

  return (
    <div className={`${bg} border rounded-lg p-3`}>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold mb-1">
        <span className={labelColor}>
          {nota.autor_nombre ?? 'Sistema'}
          {esSistema ? ' · auto' : ''}
        </span>
        <span className="text-stone-400">{tiempoTranscurrido(nota.fecha_creacion)}</span>
      </div>
      <div className="text-sm text-stone-700 leading-relaxed">{nota.texto}</div>
    </div>
  )
}
