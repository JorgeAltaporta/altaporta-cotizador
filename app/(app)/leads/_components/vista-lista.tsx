'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Filter, X, Search, Calendar, Phone } from 'lucide-react'
import {
  CANAL_LABELS,
  ESTADO_LABELS,
  TIPO_EVENTO_LABELS,
  colorCanal,
  colorEstado,
  esLeadUrgente,
  formatearFechaEvento,
  telefonoNumerico,
  tiempoTranscurrido,
  type CanalLead,
  type EstadoLead,
  type TipoEvento,
  type LeadConRelaciones,
} from '@/lib/types/leads'

type Props = {
  leads: LeadConRelaciones[]
  ejecutivoNombrePreseleccionado?: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de filtros
// ─────────────────────────────────────────────────────────────────────────────

type FiltroEstado = Set<EstadoLead>
type FiltroCanal = Set<CanalLead>
type FiltroTipo = Set<TipoEvento>

type RangoNumero = { min: number | null; max: number | null }
type RangoFecha = { desde: string | null; hasta: string | null }

type Filtros = {
  buscador: string
  ejecutivo: string  // 'TODOS' o ejecutivo_nombre
  estado: FiltroEstado
  canal: FiltroCanal
  tipo: FiltroTipo
  pax: RangoNumero
  fechaEvento: RangoFecha
  fechaCreacion: RangoFecha
  nombre: string
  locacion: string
}

const FILTROS_INICIALES: Filtros = {
  buscador: '',
  ejecutivo: 'TODOS',
  estado: new Set<EstadoLead>(),
  canal: new Set<CanalLead>(),
  tipo: new Set<TipoEvento>(),
  pax: { min: null, max: null },
  fechaEvento: { desde: null, hasta: null },
  fechaCreacion: { desde: null, hasta: null },
  nombre: '',
  locacion: '',
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function VistaLista({ leads, ejecutivoNombrePreseleccionado }: Props) {
  const [filtros, setFiltros] = useState<Filtros>(() => ({
    ...FILTROS_INICIALES,
    ejecutivo: ejecutivoNombrePreseleccionado === 'Sin asignar'
      ? 'SIN_ASIGNAR'
      : ejecutivoNombrePreseleccionado || 'TODOS',
  }))
  const [popoverAbierto, setPopoverAbierto] = useState<string | null>(null)

  // Lista de ejecutivos únicos en los leads
  const ejecutivosUnicos = useMemo(() => {
    const set = new Set<string>()
    leads.forEach((l) => {
      if (l.ejecutivo_nombre) set.add(l.ejecutivo_nombre)
    })
    return Array.from(set).sort()
  }, [leads])

  // Filtrar leads
  const leadsFiltrados = useMemo(() => {
    return leads.filter((l) => {
      // Buscador libre
      if (filtros.buscador) {
        const q = filtros.buscador.toLowerCase()
        const matchBuscador =
          l.nombre.toLowerCase().includes(q) ||
          l.id.toLowerCase().includes(q) ||
          (l.locacion ?? '').toLowerCase().includes(q) ||
          (l.email ?? '').toLowerCase().includes(q) ||
          telefonoNumerico(l.telefono).includes(telefonoNumerico(filtros.buscador))
        if (!matchBuscador) return false
      }

      // Ejecutivo
      if (filtros.ejecutivo !== 'TODOS') {
        if (filtros.ejecutivo === 'SIN_ASIGNAR') {
          if (l.ejecutivo_nombre) return false
        } else {
          if (l.ejecutivo_nombre !== filtros.ejecutivo) return false
        }
      }

      // Estado (multi-select)
      if (filtros.estado.size > 0 && !filtros.estado.has(l.estado)) return false

      // Canal (multi-select)
      if (filtros.canal.size > 0 && !filtros.canal.has(l.canal)) return false

      // Tipo de evento (multi-select)
      if (filtros.tipo.size > 0) {
        if (!l.tipo_evento || !filtros.tipo.has(l.tipo_evento)) return false
      }

      // Pax (rango)
      if (filtros.pax.min !== null && (l.pax ?? 0) < filtros.pax.min) return false
      if (filtros.pax.max !== null && (l.pax ?? 0) > filtros.pax.max) return false

      // Fecha evento
      if (filtros.fechaEvento.desde && (l.fecha_evento ?? '') < filtros.fechaEvento.desde) return false
      if (filtros.fechaEvento.hasta && (l.fecha_evento ?? '') > filtros.fechaEvento.hasta) return false

      // Fecha creación
      if (filtros.fechaCreacion.desde && l.fecha_creacion < filtros.fechaCreacion.desde) return false
      if (filtros.fechaCreacion.hasta && l.fecha_creacion > filtros.fechaCreacion.hasta + 'T23:59:59') return false

      // Nombre (texto)
      if (filtros.nombre && !l.nombre.toLowerCase().includes(filtros.nombre.toLowerCase())) return false

      // Locación (texto)
      if (filtros.locacion && !(l.locacion ?? '').toLowerCase().includes(filtros.locacion.toLowerCase())) return false

      return true
    })
  }, [leads, filtros])

  function limpiarFiltros() {
    setFiltros(FILTROS_INICIALES)
    setPopoverAbierto(null)
  }

  function actualizarFiltro<K extends keyof Filtros>(key: K, value: Filtros[K]) {
    setFiltros((f) => ({ ...f, [key]: value }))
  }

  const hayFiltrosActivos =
    filtros.buscador !== '' ||
    filtros.ejecutivo !== 'TODOS' ||
    filtros.estado.size > 0 ||
    filtros.canal.size > 0 ||
    filtros.tipo.size > 0 ||
    filtros.pax.min !== null ||
    filtros.pax.max !== null ||
    filtros.fechaEvento.desde !== null ||
    filtros.fechaEvento.hasta !== null ||
    filtros.fechaCreacion.desde !== null ||
    filtros.fechaCreacion.hasta !== null ||
    filtros.nombre !== '' ||
    filtros.locacion !== ''

  return (
    <div>
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-stone-200 p-3 mb-3 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={filtros.buscador}
            onChange={(e) => actualizarFiltro('buscador', e.target.value)}
            placeholder="Buscar por nombre, ID, locación, email, teléfono..."
            className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm"
          />
        </div>

        <select
          value={filtros.ejecutivo}
          onChange={(e) => actualizarFiltro('ejecutivo', e.target.value)}
          className="px-3 py-2 border border-stone-300 rounded-lg text-sm"
        >
          <option value="TODOS">Todos los ejecutivos</option>
          <option value="SIN_ASIGNAR">Sin asignar</option>
          {ejecutivosUnicos.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>

        {hayFiltrosActivos ? (
          <button
            onClick={limpiarFiltros}
            className="text-xs text-stone-600 hover:text-rose-600 flex items-center gap-1 transition"
          >
            <X size={12} />
            Limpiar filtros
          </button>
        ) : null}
      </div>

      {/* Contador de resultados */}
      <div className="text-xs text-stone-500 mb-2 px-1">
        {leadsFiltrados.length === leads.length
          ? `${leads.length} leads`
          : `${leadsFiltrados.length} de ${leads.length} leads`}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <ColumnaHeader label="ID" abierto={popoverAbierto === 'id'} setAbierto={() => setPopoverAbierto(popoverAbierto === 'id' ? null : 'id')} activo={false} />
                <ColumnaHeader
                  label="Nombre"
                  abierto={popoverAbierto === 'nombre'}
                  setAbierto={() => setPopoverAbierto(popoverAbierto === 'nombre' ? null : 'nombre')}
                  activo={filtros.nombre !== ''}
                >
                  <FiltroTexto valor={filtros.nombre} onChange={(v) => actualizarFiltro('nombre', v)} placeholder="Buscar por nombre..." onCerrar={() => setPopoverAbierto(null)} />
                </ColumnaHeader>
                <ColumnaHeader
                  label="Estado"
                  abierto={popoverAbierto === 'estado'}
                  setAbierto={() => setPopoverAbierto(popoverAbierto === 'estado' ? null : 'estado')}
                  activo={filtros.estado.size > 0}
                >
                  <FiltroMultiSelect
                    opciones={Object.entries(ESTADO_LABELS).map(([k, v]) => ({ valor: k as EstadoLead, label: v }))}
                    seleccionados={filtros.estado}
                    onChange={(s) => actualizarFiltro('estado', s)}
                    onCerrar={() => setPopoverAbierto(null)}
                  />
                </ColumnaHeader>
                <ColumnaHeader
                  label="Canal"
                  abierto={popoverAbierto === 'canal'}
                  setAbierto={() => setPopoverAbierto(popoverAbierto === 'canal' ? null : 'canal')}
                  activo={filtros.canal.size > 0}
                >
                  <FiltroMultiSelect
                    opciones={Object.entries(CANAL_LABELS).map(([k, v]) => ({ valor: k as CanalLead, label: v }))}
                    seleccionados={filtros.canal}
                    onChange={(s) => actualizarFiltro('canal', s)}
                    onCerrar={() => setPopoverAbierto(null)}
                  />
                </ColumnaHeader>
                <ColumnaHeader
                  label="Tipo"
                  abierto={popoverAbierto === 'tipo'}
                  setAbierto={() => setPopoverAbierto(popoverAbierto === 'tipo' ? null : 'tipo')}
                  activo={filtros.tipo.size > 0}
                >
                  <FiltroMultiSelect
                    opciones={Object.entries(TIPO_EVENTO_LABELS).map(([k, v]) => ({ valor: k as TipoEvento, label: v }))}
                    seleccionados={filtros.tipo}
                    onChange={(s) => actualizarFiltro('tipo', s)}
                    onCerrar={() => setPopoverAbierto(null)}
                  />
                </ColumnaHeader>
                <ColumnaHeader
                  label="Pax"
                  abierto={popoverAbierto === 'pax'}
                  setAbierto={() => setPopoverAbierto(popoverAbierto === 'pax' ? null : 'pax')}
                  activo={filtros.pax.min !== null || filtros.pax.max !== null}
                >
                  <FiltroRangoNumero valor={filtros.pax} onChange={(v) => actualizarFiltro('pax', v)} onCerrar={() => setPopoverAbierto(null)} />
                </ColumnaHeader>
                <ColumnaHeader
                  label="Fecha evento"
                  abierto={popoverAbierto === 'fechaEvento'}
                  setAbierto={() => setPopoverAbierto(popoverAbierto === 'fechaEvento' ? null : 'fechaEvento')}
                  activo={filtros.fechaEvento.desde !== null || filtros.fechaEvento.hasta !== null}
                >
                  <FiltroRangoFecha valor={filtros.fechaEvento} onChange={(v) => actualizarFiltro('fechaEvento', v)} onCerrar={() => setPopoverAbierto(null)} />
                </ColumnaHeader>
                <ColumnaHeader
                  label="Locación"
                  abierto={popoverAbierto === 'locacion'}
                  setAbierto={() => setPopoverAbierto(popoverAbierto === 'locacion' ? null : 'locacion')}
                  activo={filtros.locacion !== ''}
                >
                  <FiltroTexto valor={filtros.locacion} onChange={(v) => actualizarFiltro('locacion', v)} placeholder="Buscar por locación..." onCerrar={() => setPopoverAbierto(null)} />
                </ColumnaHeader>
                <ColumnaHeader label="Ejecutivo" abierto={false} setAbierto={() => {}} activo={false} sinFiltro />
                <ColumnaHeader
                  label="Capturado"
                  abierto={popoverAbierto === 'fechaCreacion'}
                  setAbierto={() => setPopoverAbierto(popoverAbierto === 'fechaCreacion' ? null : 'fechaCreacion')}
                  activo={filtros.fechaCreacion.desde !== null || filtros.fechaCreacion.hasta !== null}
                >
                  <FiltroRangoFecha valor={filtros.fechaCreacion} onChange={(v) => actualizarFiltro('fechaCreacion', v)} onCerrar={() => setPopoverAbierto(null)} />
                </ColumnaHeader>
              </tr>
            </thead>
            <tbody>
              {leadsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-stone-400 text-sm">
                    No hay leads que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                leadsFiltrados.map((l) => <FilaLead key={l.id} lead={l} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COLUMNA HEADER con popover
// ─────────────────────────────────────────────────────────────────────────────

type PropsColumnaHeader = {
  label: string
  abierto: boolean
  setAbierto: () => void
  activo: boolean
  sinFiltro?: boolean
  children?: React.ReactNode
}

function ColumnaHeader({ label, abierto, setAbierto, activo, sinFiltro, children }: PropsColumnaHeader) {
  const ref = useRef<HTMLTableCellElement>(null)

  // Cerrar popover si clic fuera
  useEffect(() => {
    if (!abierto) return
    function handleClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto()
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [abierto, setAbierto])

  return (
    <th ref={ref} className="text-left text-[11px] uppercase tracking-wider font-semibold text-stone-600 px-3 py-3 relative">
      <button
        onClick={sinFiltro ? undefined : setAbierto}
        disabled={sinFiltro}
        className={`flex items-center gap-1.5 hover:text-stone-900 transition ${sinFiltro ? 'cursor-default' : 'cursor-pointer'}`}
      >
        {label}
        {!sinFiltro ? (
          <Filter size={11} className={activo ? 'text-amber-700' : 'text-stone-400'} />
        ) : null}
      </button>
      {abierto && children ? (
        <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-stone-300 rounded-lg shadow-lg p-3 min-w-[220px]">
          {children}
        </div>
      ) : null}
    </th>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTRO: Texto
// ─────────────────────────────────────────────────────────────────────────────

function FiltroTexto({ valor, onChange, placeholder, onCerrar }: { valor: string; onChange: (s: string) => void; placeholder: string; onCerrar: () => void }) {
  return (
    <div>
      <input
        type="text"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus
        className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm normal-case tracking-normal"
      />
      <div className="flex gap-2 mt-2">
        <button onClick={() => onChange('')} className="text-xs text-stone-600 hover:text-stone-900 normal-case tracking-normal">
          Limpiar
        </button>
        <button onClick={onCerrar} className="text-xs text-stone-600 hover:text-stone-900 ml-auto normal-case tracking-normal">
          Cerrar
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTRO: Multi-select
// ─────────────────────────────────────────────────────────────────────────────

function FiltroMultiSelect<T extends string>({ opciones, seleccionados, onChange, onCerrar }: { opciones: Array<{ valor: T; label: string }>; seleccionados: Set<T>; onChange: (s: Set<T>) => void; onCerrar: () => void }) {
  function toggle(v: T) {
    const next = new Set(seleccionados)
    if (next.has(v)) next.delete(v)
    else next.add(v)
    onChange(next)
  }

  return (
    <div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {opciones.map((o) => (
          <label key={o.valor} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-stone-50 px-1 py-0.5 rounded normal-case tracking-normal">
            <input type="checkbox" checked={seleccionados.has(o.valor)} onChange={() => toggle(o.valor)} className="w-3.5 h-3.5" />
            <span className="text-stone-700 font-normal">{o.label}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-2 mt-2 pt-2 border-t border-stone-100">
        <button onClick={() => onChange(new Set())} className="text-xs text-stone-600 hover:text-stone-900 normal-case tracking-normal">
          Limpiar
        </button>
        <button onClick={onCerrar} className="text-xs text-stone-600 hover:text-stone-900 ml-auto normal-case tracking-normal">
          Cerrar
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTRO: Rango número
// ─────────────────────────────────────────────────────────────────────────────

function FiltroRangoNumero({ valor, onChange, onCerrar }: { valor: RangoNumero; onChange: (v: RangoNumero) => void; onCerrar: () => void }) {
  return (
    <div>
      <div className="flex gap-2 items-center normal-case tracking-normal">
        <input
          type="number"
          value={valor.min ?? ''}
          onChange={(e) => onChange({ ...valor, min: e.target.value ? parseInt(e.target.value) : null })}
          placeholder="Mín"
          className="w-20 px-2 py-1.5 border border-stone-300 rounded text-sm"
        />
        <span className="text-stone-400 text-xs">–</span>
        <input
          type="number"
          value={valor.max ?? ''}
          onChange={(e) => onChange({ ...valor, max: e.target.value ? parseInt(e.target.value) : null })}
          placeholder="Máx"
          className="w-20 px-2 py-1.5 border border-stone-300 rounded text-sm"
        />
      </div>
      <div className="flex gap-2 mt-2">
        <button onClick={() => onChange({ min: null, max: null })} className="text-xs text-stone-600 hover:text-stone-900 normal-case tracking-normal">
          Limpiar
        </button>
        <button onClick={onCerrar} className="text-xs text-stone-600 hover:text-stone-900 ml-auto normal-case tracking-normal">
          Cerrar
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTRO: Rango fecha (con atajos)
// ─────────────────────────────────────────────────────────────────────────────

function FiltroRangoFecha({ valor, onChange, onCerrar }: { valor: RangoFecha; onChange: (v: RangoFecha) => void; onCerrar: () => void }) {
  function aplicarAtajo(atajo: 'hoy' | 'semana' | 'mes' | 'prox30') {
    const hoy = new Date()
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    if (atajo === 'hoy') {
      const f = fmt(hoy)
      onChange({ desde: f, hasta: f })
    }
    if (atajo === 'semana') {
      const lunes = new Date(hoy)
      lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))
      const domingo = new Date(lunes)
      domingo.setDate(lunes.getDate() + 6)
      onChange({ desde: fmt(lunes), hasta: fmt(domingo) })
    }
    if (atajo === 'mes') {
      const ini = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
      onChange({ desde: fmt(ini), hasta: fmt(fin) })
    }
    if (atajo === 'prox30') {
      const fin = new Date(hoy)
      fin.setDate(hoy.getDate() + 30)
      onChange({ desde: fmt(hoy), hasta: fmt(fin) })
    }
  }

  return (
    <div>
      <div className="space-y-2 normal-case tracking-normal">
        <div>
          <label className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold mb-0.5 block">Desde</label>
          <input
            type="date"
            value={valor.desde ?? ''}
            onChange={(e) => onChange({ ...valor, desde: e.target.value || null })}
            className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold mb-0.5 block">Hasta</label>
          <input
            type="date"
            value={valor.hasta ?? ''}
            onChange={(e) => onChange({ ...valor, hasta: e.target.value || null })}
            className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-stone-100">
        <BotonAtajo onClick={() => aplicarAtajo('hoy')}>Hoy</BotonAtajo>
        <BotonAtajo onClick={() => aplicarAtajo('semana')}>Esta semana</BotonAtajo>
        <BotonAtajo onClick={() => aplicarAtajo('mes')}>Este mes</BotonAtajo>
        <BotonAtajo onClick={() => aplicarAtajo('prox30')}>Próx 30 días</BotonAtajo>
      </div>
      <div className="flex gap-2 mt-2">
        <button onClick={() => onChange({ desde: null, hasta: null })} className="text-xs text-stone-600 hover:text-stone-900 normal-case tracking-normal">
          Limpiar
        </button>
        <button onClick={onCerrar} className="text-xs text-stone-600 hover:text-stone-900 ml-auto normal-case tracking-normal">
          Cerrar
        </button>
      </div>
    </div>
  )
}

function BotonAtajo({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-[11px] px-2 py-0.5 border border-stone-200 hover:border-amber-700 hover:bg-amber-50 hover:text-amber-800 rounded text-stone-600 transition normal-case tracking-normal">
      {children}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FILA del lead
// ─────────────────────────────────────────────────────────────────────────────

function FilaLead({ lead }: { lead: LeadConRelaciones }) {
  const urgente = esLeadUrgente(lead)
  const canalCol = colorCanal(lead.canal)
  const estadoCol = colorEstado(lead.estado)
  const tel = telefonoNumerico(lead.telefono)
  const waUrl = `https://wa.me/52${tel}`

  return (
    <tr className="border-b border-stone-100 hover:bg-stone-50 transition">
      <td className="px-3 py-2.5">
        <Link href={`/leads/${lead.id}`} className="text-xs font-mono text-amber-700 hover:underline">
          {lead.id}
        </Link>
      </td>
      <td className="px-3 py-2.5">
        <Link href={`/leads/${lead.id}`} className="font-medium text-stone-900 hover:text-amber-700">
          {lead.nombre}
        </Link>
        {lead.wp_nombre ? (
          <div className="text-[10px] text-purple-700 mt-0.5">vía {lead.wp_nombre}</div>
        ) : null}
      </td>
      <td className="px-3 py-2.5">
        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${estadoCol.bg} ${estadoCol.text}`}>
          {ESTADO_LABELS[lead.estado]}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${canalCol.bg} ${canalCol.text}`}>
          {CANAL_LABELS[lead.canal].slice(0, 3).toUpperCase()}
        </span>
      </td>
      <td className="px-3 py-2.5 text-stone-700">
        {lead.tipo_evento ? TIPO_EVENTO_LABELS[lead.tipo_evento] : <span className="text-stone-300">—</span>}
      </td>
      <td className="px-3 py-2.5 text-stone-700">{lead.pax ?? <span className="text-stone-300">—</span>}</td>
      <td className="px-3 py-2.5 text-stone-700">{formatearFechaEvento(lead.fecha_evento)}</td>
      <td className="px-3 py-2.5 text-stone-600 text-xs max-w-[180px] truncate" title={lead.locacion ?? ''}>
        {lead.locacion ?? <span className="text-stone-300">—</span>}
      </td>
      <td className="px-3 py-2.5">
        {lead.ejecutivo_nombre ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0" style={{ backgroundColor: lead.ejecutivo_color ?? '#78716c' }}>
              {lead.ejecutivo_nombre.charAt(0)}
            </div>
            <span className="text-xs text-stone-700 truncate">{lead.ejecutivo_nombre}</span>
          </div>
        ) : (
          <span className="text-stone-300">—</span>
        )}
      </td>
      <td className={`px-3 py-2.5 text-xs ${urgente ? 'text-rose-600 font-semibold' : 'text-stone-500'}`}>
        {tiempoTranscurrido(lead.fecha_creacion)}
      </td>
    </tr>
  )
}
