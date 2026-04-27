'use client'

type Zona = {
  id: string
  nombre: string
  color: string | null
}

type Adicional = {
  id: string
  nombre: string
  categoria_id: string | null
}

type Categoria = {
  id: string
  nombre: string
  icono: string | null
}

export default function PermisosEditor({
  zonasPermitidas,
  adicionalesPermitidos,
  todasLasZonas,
  todosLosAdicionales,
  categorias,
  onChangeZonas,
  onChangeAdicionales,
}: {
  zonasPermitidas: string[]
  adicionalesPermitidos: string[]
  todasLasZonas: Zona[]
  todosLosAdicionales: Adicional[]
  categorias: Categoria[]
  onChangeZonas: (nuevas: string[]) => void
  onChangeAdicionales: (nuevos: string[]) => void
}) {
  // Si zonasPermitidas está vacío = todas las zonas permitidas
  const todasPermitidas = zonasPermitidas.length === 0
  // Si adicionalesPermitidos está vacío = todos permitidos
  const todosAdicPermitidos = adicionalesPermitidos.length === 0

  function toggleZona(zonaId: string) {
    if (todasPermitidas) {
      // Cambiar a modo selección, todas menos esa
      onChangeZonas(todasLasZonas.filter((z) => z.id !== zonaId).map((z) => z.id))
    } else {
      const yaEsta = zonasPermitidas.includes(zonaId)
      if (yaEsta) {
        const nuevas = zonasPermitidas.filter((id) => id !== zonaId)
        // Si queda vacío, volver a "todas permitidas"
        onChangeZonas(nuevas.length === todasLasZonas.length - 1 ? nuevas : nuevas)
      } else {
        const nuevas = [...zonasPermitidas, zonaId]
        // Si quedaron todas, volver a array vacío (= todas)
        onChangeZonas(nuevas.length === todasLasZonas.length ? [] : nuevas)
      }
    }
  }

  function toggleAdicional(adId: string) {
    if (todosAdicPermitidos) {
      onChangeAdicionales(todosLosAdicionales.filter((a) => a.id !== adId).map((a) => a.id))
    } else {
      const yaEsta = adicionalesPermitidos.includes(adId)
      if (yaEsta) {
        onChangeAdicionales(adicionalesPermitidos.filter((id) => id !== adId))
      } else {
        const nuevos = [...adicionalesPermitidos, adId]
        onChangeAdicionales(nuevos.length === todosLosAdicionales.length ? [] : nuevos)
      }
    }
  }

  function permitirTodasZonas() {
    onChangeZonas([])
  }

  function permitirTodosAdicionales() {
    onChangeAdicionales([])
  }

  // Agrupar adicionales por categoría
  const adicionalesPorCat = categorias.map((cat) => ({
    ...cat,
    items: todosLosAdicionales.filter((a) => a.categoria_id === cat.id),
  }))
  const sinCategoria = todosLosAdicionales.filter(
    (a) => !a.categoria_id || !categorias.find((c) => c.id === a.categoria_id)
  )

  return (
    <div className="space-y-6">
      {/* Zonas permitidas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-medium text-stone-900">Zonas permitidas</h3>
            <p className="text-xs text-stone-500">
              {todasPermitidas
                ? 'Sin restricción: este paquete se puede cotizar en cualquier zona'
                : `Restringido a ${zonasPermitidas.length} zona(s)`}
            </p>
          </div>
          {!todasPermitidas && (
            <button
              type="button"
              onClick={permitirTodasZonas}
              className="text-xs text-amber-700 hover:text-amber-900"
            >
              Permitir todas
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {todasLasZonas.map((zona) => {
            const permitida = todasPermitidas || zonasPermitidas.includes(zona.id)

            return (
              <button
                key={zona.id}
                type="button"
                onClick={() => toggleZona(zona.id)}
                className={`px-3 py-1.5 rounded-lg text-sm transition flex items-center gap-2 ${
                  permitida
                    ? 'border-2 text-stone-900'
                    : 'bg-stone-100 text-stone-400 border-2 border-stone-100 hover:bg-stone-200'
                }`}
                style={
                  permitida
                    ? { borderColor: zona.color || '#A8A29E', backgroundColor: 'white' }
                    : undefined
                }
              >
                <span
                  className="w-4 h-4 rounded text-white text-xs flex items-center justify-center font-medium"
                  style={{ backgroundColor: zona.color || '#A8A29E' }}
                >
                  {zona.id}
                </span>
                <span>{zona.nombre}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Adicionales permitidos */}
      <div className="border-t border-stone-200 pt-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-medium text-stone-900">Adicionales permitidos</h3>
            <p className="text-xs text-stone-500">
              {todosAdicPermitidos
                ? 'Sin restricción: todos los adicionales se pueden agregar'
                : `Restringido a ${adicionalesPermitidos.length} adicional(es)`}
            </p>
          </div>
          {!todosAdicPermitidos && (
            <button
              type="button"
              onClick={permitirTodosAdicionales}
              className="text-xs text-amber-700 hover:text-amber-900"
            >
              Permitir todos
            </button>
          )}
        </div>

        <div className="space-y-3">
          {adicionalesPorCat.map((cat) => (
            <div key={cat.id}>
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <span>{cat.icono}</span>
                <span>{cat.nombre}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cat.items.map((ad) => {
                  const permitido = todosAdicPermitidos || adicionalesPermitidos.includes(ad.id)
                  return (
                    <button
                      key={ad.id}
                      type="button"
                      onClick={() => toggleAdicional(ad.id)}
                      className={`px-2 py-1 rounded text-xs transition ${
                        permitido
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-stone-100 text-stone-400 border border-stone-200 hover:bg-stone-200'
                      }`}
                    >
                      {ad.nombre}
                    </button>
                  )
                })}
                {cat.items.length === 0 && (
                  <span className="text-xs text-stone-400 italic">Sin adicionales</span>
                )}
              </div>
            </div>
          ))}

          {sinCategoria.length > 0 && (
            <div>
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">
                Sin categoría
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sinCategoria.map((ad) => {
                  const permitido = todosAdicPermitidos || adicionalesPermitidos.includes(ad.id)
                  return (
                    <button
                      key={ad.id}
                      type="button"
                      onClick={() => toggleAdicional(ad.id)}
                      className={`px-2 py-1 rounded text-xs transition ${
                        permitido
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-stone-100 text-stone-400 border border-stone-200 hover:bg-stone-200'
                      }`}
                    >
                      {ad.nombre}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
