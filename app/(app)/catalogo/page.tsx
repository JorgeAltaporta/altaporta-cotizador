import Link from 'next/link'

const SECCIONES = [
  {
    id: 'paquetes',
    titulo: 'Paquetes',
    descripcion: 'Menús, precios por rango, contenido',
    icono: '📦',
    color: '#FDE68A',
    href: '/catalogo/paquetes',
  },
  {
    id: 'proteinas',
    titulo: 'Proteínas',
    descripcion: 'Pollo, filete, langosta, etc.',
    icono: '🍖',
    color: '#FECACA',
    href: '/catalogo/proteinas',
  },
  {
    id: 'zonas',
    titulo: 'Zonas y locaciones',
    descripcion: 'Mérida centro, haciendas, foráneas',
    icono: '📍',
    color: '#BBF7D0',
    href: '/catalogo/zonas',
  },
  {
    id: 'adicionales',
    titulo: 'Adicionales',
    descripcion: 'Postres, mobiliario, hora extra',
    icono: '🎁',
    color: '#BFDBFE',
    href: '/catalogo/adicionales',
  },
  {
    id: 'rangos',
    titulo: 'Rangos de pax',
    descripcion: 'Escalones de precio (50-79, 80-99, etc.)',
    icono: '👥',
    color: '#E7E5E4',
    href: '/catalogo/rangos',
  },
]

export default function CatalogoPage() {
  return (
    <div className="p-12 max-w-6xl">
      <div className="mb-10">
        <div className="text-xs tracking-widest text-amber-700 uppercase mb-2">
          Configuración
        </div>
        <h1 className="font-serif text-4xl text-stone-900">Catálogo</h1>
        <p className="text-stone-600 mt-2">
          Datos maestros que se usan en cotizaciones
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECCIONES.map((s) => (
          <Link
            key={s.id}
            href={s.href}
            className="bg-white rounded-2xl border border-stone-200 p-6 hover:border-amber-400 hover:shadow-md transition group"
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl mb-4"
              style={{ backgroundColor: s.color }}
            >
              {s.icono}
            </div>
            <h2 className="font-serif text-xl text-stone-900 mb-1 group-hover:text-amber-700 transition">
              {s.titulo}
            </h2>
            <p className="text-sm text-stone-600">{s.descripcion}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
