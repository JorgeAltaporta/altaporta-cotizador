'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

const ID_HORA_EXTRA = '__HORA_EXTRA__'

// ─────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────
type AdicionalEvento = {
  id: string
  adicionalId: string
  cantidad: number
  precioUnitario: number
}

type Evento = {
  id?: string
  idAmigable?: string
  fecha?: string
  zona_id?: string
  locacion_texto?: string | null
  pax?: number
  paquete_id?: string
  precio_por_pax?: number
  subtotal_paquete?: number
  flete?: number
  adicionales?: AdicionalEvento[]
  total?: number
}

type DescuentoGeneral = {
  tipo: 'porcentaje' | 'monto'
  valor: number
  concepto: string
}

type CargoExtra = {
  id: string
  concepto: string
  monto: number
}

type Cotizacion = {
  folio: string | null
  etiqueta: string | null
  cliente_nombre: string
  ejecutivo_nombre?: string | null
  wp_nombre?: string | null
  wp_contacto?: string | null
  vigencia_dias: number | null
  anticipo_pct_override: number | null
  aplica_iva: boolean | null
  descuento_general: DescuentoGeneral | null
  cargos_extra: CargoExtra[] | null
  notas_cliente: string | null
  eventos: Evento[] | null
  fecha_creacion: string
}

type Paquete = {
  id: string
  nombre: string
  horas_servicio: number
  categorias?: Array<{
    id: string
    nombre: string
    icono: string | null
    atributos: Array<{ id: string; nombre: string; valor: string }>
  }> | null
}

type Adicional = {
  id: string
  nombre: string
  unidad: string | null
  precio: number
  notas: string | null
  estado: string
}

type ClausulasGlobales = {
  anticipoPct: number
  cambioFecha: string
  instalaciones: string
}

// ─────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────
function formatMXN(n: number): string {
  return `$${n.toLocaleString('es-MX', { maximumFractionDigits: 2 })}`
}

function parsearFechaLocal(fechaISO: string): Date {
  const [y, m, d] = fechaISO.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatearFechaLarga(fechaISO: string): string {
  if (!fechaISO) return ''
  return parsearFechaLocal(fechaISO).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ─────────────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────────────
const COLORES = {
  fondoOscuro: '#2a2520',
  fondoMedio: '#3d3530',
  fondoCrema: '#F5ECD9',
  dorado: '#D4A574',
  doradoOscuro: '#8b6f47',
  texto: '#2a2520',
  textoSecundario: '#5c4a3a',
  textoLabel: '#8b6f47',
  textoCrema: '#F5ECD9',
  bordeSuave: '#f0e6d2',
  bordeAcento: '#D4A574',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: COLORES.texto,
    backgroundColor: '#fff',
  },

  // ─── Portada ───
  portadaHero: {
    backgroundColor: COLORES.fondoOscuro,
    height: 510,
    padding: 70,
    position: 'relative',
  },
  portadaLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  portadaLogoBox: {
    width: 32,
    height: 32,
    backgroundColor: COLORES.dorado,
    color: COLORES.fondoOscuro,
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    paddingTop: 7,
    marginRight: 10,
    borderRadius: 4,
  },
  portadaMarca: {
    color: COLORES.fondoCrema,
    fontSize: 18,
    letterSpacing: 2,
    fontFamily: 'Helvetica',
  },
  portadaSubmarca: {
    color: COLORES.dorado,
    fontSize: 8,
    letterSpacing: 3,
    marginTop: 2,
  },
  portadaFolio: {
    position: 'absolute',
    top: 70,
    right: 70,
    textAlign: 'right',
  },
  portadaFolioLabel: {
    color: COLORES.dorado,
    fontSize: 8,
    letterSpacing: 2,
    marginBottom: 3,
  },
  portadaFolioValor: {
    color: COLORES.fondoCrema,
    fontSize: 11,
    fontFamily: 'Courier',
  },
  portadaTituloContenedor: {
    position: 'absolute',
    bottom: 80,
    left: 70,
    right: 70,
  },
  portadaTituloKicker: {
    color: COLORES.dorado,
    fontSize: 9,
    letterSpacing: 4,
    marginBottom: 12,
  },
  portadaTitulo: {
    color: COLORES.fondoCrema,
    fontSize: 36,
    marginBottom: 8,
    fontFamily: 'Times-Roman',
  },
  portadaSubtitulo: {
    color: COLORES.dorado,
    fontSize: 12,
    fontFamily: 'Times-Roman',
  },

  portadaInfo: {
    backgroundColor: COLORES.fondoCrema,
    padding: '40 70',
    flexGrow: 1,
  },
  portadaGrid: {
    flexDirection: 'row',
    gap: 30,
    marginBottom: 30,
  },
  portadaGridItem: {
    flex: 1,
  },
  portadaGridLabel: {
    fontSize: 8,
    letterSpacing: 2,
    color: COLORES.textoLabel,
    marginBottom: 5,
  },
  portadaGridValor: {
    fontSize: 13,
    color: COLORES.texto,
    fontFamily: 'Times-Roman',
    marginBottom: 3,
  },
  portadaGridSecundario: {
    fontSize: 10,
    color: COLORES.textoSecundario,
  },

  portadaFooter: {
    backgroundColor: COLORES.fondoOscuro,
    padding: '20 70',
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: COLORES.dorado,
    fontSize: 9,
  },

  // ─── Páginas internas ───
  pagina: {
    padding: 60,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 25,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.bordeSuave,
    fontSize: 8,
    color: COLORES.textoLabel,
    letterSpacing: 2,
  },
  pageHeaderMarca: {
    color: COLORES.dorado,
  },

  // ─── Sección de evento ───
  eventoKicker: {
    fontSize: 8,
    letterSpacing: 3,
    color: COLORES.textoLabel,
    marginBottom: 4,
  },
  eventoTitulo: {
    fontSize: 26,
    fontFamily: 'Times-Roman',
    color: COLORES.texto,
    marginBottom: 6,
  },
  eventoSubtitulo: {
    fontSize: 11,
    color: COLORES.textoSecundario,
    fontFamily: 'Times-Roman',
    marginBottom: 24,
  },
  metaRow: {
    backgroundColor: COLORES.fondoCrema,
    padding: 16,
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
    borderRadius: 4,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 7,
    letterSpacing: 2,
    color: COLORES.textoLabel,
    marginBottom: 3,
  },
  metaValor: {
    fontSize: 12,
    color: COLORES.texto,
    fontFamily: 'Times-Roman',
  },

  catGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  catCol: {
    flex: 1,
  },
  catSection: {
    marginBottom: 12,
  },
  catTitulo: {
    fontSize: 8,
    letterSpacing: 3,
    color: COLORES.textoLabel,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.bordeAcento,
  },
  catBullet: {
    marginBottom: 6,
  },
  catBulletLabel: {
    fontSize: 7,
    letterSpacing: 1,
    color: COLORES.textoLabel,
    marginBottom: 1,
  },
  catBulletValor: {
    fontSize: 10,
    color: COLORES.textoSecundario,
    lineHeight: 1.4,
  },

  bannerInversion: {
    backgroundColor: COLORES.fondoOscuro,
    color: COLORES.textoCrema,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 4,
  },
  bannerLabel: {
    color: COLORES.dorado,
    fontSize: 8,
    letterSpacing: 3,
  },
  bannerValor: {
    color: COLORES.textoCrema,
    fontSize: 24,
    fontFamily: 'Times-Roman',
  },

  resumenTitulo: {
    fontSize: 26,
    fontFamily: 'Times-Roman',
    color: COLORES.texto,
    marginBottom: 20,
  },
  tabla: {
    marginBottom: 20,
  },
  tablaHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: COLORES.fondoOscuro,
    paddingBottom: 8,
    marginBottom: 6,
  },
  tablaHeaderCell: {
    fontSize: 7,
    letterSpacing: 2,
    color: COLORES.textoLabel,
  },
  tablaRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.bordeSuave,
  },
  tablaRowSub: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f1e0',
  },
  tablaCol1: {
    flex: 4,
    paddingRight: 8,
  },
  tablaCol2: {
    flex: 1,
    textAlign: 'right',
  },
  tablaCol3: {
    flex: 1,
    textAlign: 'right',
  },
  tablaCol4: {
    flex: 1,
    textAlign: 'right',
  },
  tablaConcepto: {
    fontSize: 10,
    color: COLORES.texto,
  },
  tablaSubconcepto: {
    fontSize: 9,
    color: COLORES.textoSecundario,
    paddingLeft: 12,
  },
  tablaSubmeta: {
    fontSize: 8,
    color: COLORES.textoLabel,
    marginTop: 2,
  },
  tablaNumero: {
    fontSize: 10,
    fontFamily: 'Courier',
  },
  tablaNumeroSub: {
    fontSize: 9,
    fontFamily: 'Courier',
    color: COLORES.textoSecundario,
  },
  tablaSubtotal: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: 2,
    borderTopColor: COLORES.fondoOscuro,
    marginTop: 6,
  },
  tablaTotalRow: {
    flexDirection: 'row',
    paddingTop: 8,
  },
  tablaTotalLabel: {
    fontSize: 12,
    letterSpacing: 2,
    color: COLORES.texto,
    fontFamily: 'Helvetica-Bold',
  },
  tablaTotalValor: {
    fontSize: 22,
    fontFamily: 'Times-Roman',
    color: COLORES.doradoOscuro,
  },

  bannerAnticipo: {
    backgroundColor: COLORES.fondoOscuro,
    color: COLORES.textoCrema,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 4,
    marginBottom: 24,
  },

  terminosTitulo: {
    fontSize: 9,
    letterSpacing: 4,
    color: COLORES.textoLabel,
    marginBottom: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.bordeAcento,
  },
  terminoItem: {
    flexDirection: 'row',
    fontSize: 10,
    color: COLORES.textoSecundario,
    marginBottom: 8,
    lineHeight: 1.5,
  },
  terminoBullet: {
    width: 12,
  },
  terminoTexto: {
    flex: 1,
  },

  notasCliente: {
    backgroundColor: COLORES.fondoCrema,
    padding: 16,
    marginTop: 20,
    borderRadius: 4,
  },
  notasTitulo: {
    fontSize: 9,
    letterSpacing: 3,
    color: COLORES.textoLabel,
    marginBottom: 6,
  },
  notasTexto: {
    fontSize: 10,
    color: COLORES.textoSecundario,
    lineHeight: 1.5,
  },

  footerPagina: {
    position: 'absolute',
    bottom: 35,
    left: 60,
    right: 60,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORES.bordeSuave,
    textAlign: 'center',
    fontSize: 8,
    color: COLORES.textoLabel,
    letterSpacing: 2,
  },
})

const PageHeader = ({ folio, page }: { folio: string; page: string }) => (
  <View style={styles.pageHeader} fixed>
    <Text>
      <Text style={styles.pageHeaderMarca}>Altaporta</Text> · {folio}
    </Text>
    <Text>{page}</Text>
  </View>
)

const PageFooter = () => (
  <Text style={styles.footerPagina} fixed>
    altaportabanquetes.com.mx · +52 999 903 7170
  </Text>
)

export default function PDFDocument({
  cotizacion,
  paquetes,
  adicionales,
  clausulas,
}: {
  cotizacion: Cotizacion
  paquetes: Paquete[]
  adicionales: Adicional[]
  clausulas: ClausulasGlobales
}) {
  const c = cotizacion
  const eventos = c.eventos || []

  function getDatosAdicional(adicionalId: string) {
    if (adicionalId === ID_HORA_EXTRA) {
      return { nombre: 'Hora extra', unidad: 'hora' }
    }
    return adicionales.find((a) => a.id === adicionalId) || null
  }

  const subtotalEventos = eventos.reduce((s, e) => s + (e.total || 0), 0)
  const descuentoAplicado = (() => {
    if (!c.descuento_general) return 0
    if (c.descuento_general.tipo === 'porcentaje') {
      return subtotalEventos * (c.descuento_general.valor / 100)
    }
    return c.descuento_general.valor
  })()
  const cargosExtra = c.cargos_extra || []
  const totalCargosExtra = cargosExtra.reduce((s, ce) => s + ce.monto, 0)
  const subtotalAjustado = subtotalEventos - descuentoAplicado + totalCargosExtra
  const aplicaIva = c.aplica_iva !== false
  const iva = aplicaIva ? subtotalAjustado * 0.16 : 0
  const total = subtotalAjustado + iva
  const anticipoPct = c.anticipo_pct_override ?? clausulas.anticipoPct
  const anticipoMonto = total * (anticipoPct / 100)
  const vigenciaDias = c.vigencia_dias ?? 15

  const fechaEmision = c.fecha_creacion
    ? new Date(c.fecha_creacion).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''
  const fechaVencimiento = (() => {
    const base = c.fecha_creacion ? new Date(c.fecha_creacion) : new Date()
    base.setDate(base.getDate() + vigenciaDias)
    return base.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  })()

  const subtituloPortada =
    eventos.length > 1
      ? `${eventos.length} eventos`
      : 'Servicio de catering & montaje'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.portadaHero}>
          <View style={styles.portadaLogo}>
            <Text style={styles.portadaLogoBox}>A</Text>
            <View>
              <Text style={styles.portadaMarca}>Altaporta</Text>
              <Text style={styles.portadaSubmarca}>CATERING & FURNITURE</Text>
            </View>
          </View>

          <View style={styles.portadaFolio}>
            <Text style={styles.portadaFolioLabel}>FOLIO</Text>
            <Text style={styles.portadaFolioValor}>{c.folio || '—'}</Text>
          </View>

          <View style={styles.portadaTituloContenedor}>
            <Text style={styles.portadaTituloKicker}>PRESUPUESTO DE SERVICIO</Text>
            <Text style={styles.portadaTitulo}>
              {c.cliente_nombre || 'Cotización'}
            </Text>
            <Text style={styles.portadaSubtitulo}>{subtituloPortada}</Text>
          </View>
        </View>

        <View style={styles.portadaInfo}>
          <View style={styles.portadaGrid}>
            <View style={styles.portadaGridItem}>
              <Text style={styles.portadaGridLabel}>PREPARADO PARA</Text>
              <Text style={styles.portadaGridValor}>
                {c.wp_nombre || c.cliente_nombre}
              </Text>
              {c.wp_contacto && (
                <Text style={styles.portadaGridSecundario}>{c.wp_contacto}</Text>
              )}
            </View>
            <View style={styles.portadaGridItem}>
              <Text style={styles.portadaGridLabel}>ATIENDE</Text>
              <Text style={styles.portadaGridValor}>
                {c.ejecutivo_nombre || 'Altaporta Catering'}
              </Text>
            </View>
          </View>

          <View style={styles.portadaGrid}>
            <View style={styles.portadaGridItem}>
              <Text style={styles.portadaGridLabel}>FECHA DE EMISIÓN</Text>
              <Text style={styles.portadaGridValor}>{fechaEmision}</Text>
            </View>
            <View style={styles.portadaGridItem}>
              <Text style={styles.portadaGridLabel}>VIGENCIA HASTA</Text>
              <Text style={styles.portadaGridValor}>{fechaVencimiento}</Text>
            </View>
          </View>
        </View>

        <View style={styles.portadaFooter}>
          <Text>altaportabanquetes.com.mx</Text>
          <Text>Mérida · Yucatán · México</Text>
          <Text>+52 999 903 7170</Text>
        </View>
      </Page>

      {eventos.map((evt, idx) => {
        const paquete = paquetes.find((p) => p.id === evt.paquete_id)
        const pax = evt.pax || 0
        const fletePerPax = pax > 0 ? (evt.flete || 0) / pax : 0
        const precioPorPaxConFlete = (evt.precio_por_pax || 0) + fletePerPax

        return (
          <Page
            key={evt.id || idx}
            size="A4"
            style={[styles.page, styles.pagina]}
          >
            <PageHeader
              folio={c.folio || ''}
              page={`Evento ${idx + 1} de ${eventos.length}`}
            />

            <Text style={styles.eventoKicker}>
              {evt.idAmigable ? `${evt.idAmigable} · ` : ''}
              {eventos.length > 1 ? `Evento ${idx + 1}` : 'Evento'}
            </Text>
            <Text style={styles.eventoTitulo}>
              {paquete?.nombre || 'Catering'} Catering Service
            </Text>
            <Text style={styles.eventoSubtitulo}>
              {evt.fecha && formatearFechaLarga(evt.fecha)} · {evt.locacion_texto}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>INVITADOS</Text>
                <Text style={styles.metaValor}>{pax} pax</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>SERVICIO</Text>
                <Text style={styles.metaValor}>
                  {paquete?.horas_servicio ?? '—'} horas
                </Text>
              </View>
            </View>

            {paquete?.categorias && paquete.categorias.length > 0 && (
              <View style={styles.catGrid}>
                {(() => {
                  const cats = paquete.categorias.filter(
                    (c) => c.atributos && c.atributos.length > 0
                  )
                  const cols: typeof cats[] = [[], [], []]
                  cats.forEach((cat, i) => cols[i % 3].push(cat))
                  return cols.map((col, ci) => (
                    <View key={ci} style={styles.catCol}>
                      {col.map((cat) => (
                        <View key={cat.id} style={styles.catSection}>
                          <Text style={styles.catTitulo}>
                            {cat.nombre.toUpperCase()}
                          </Text>
                          {cat.atributos
                            .filter(
                              (a) =>
                                a.valor &&
                                a.valor !== 'No incluido' &&
                                a.valor !== 'No incluida'
                            )
                            .map((attr) => (
                              <View key={attr.id} style={styles.catBullet}>
                                <Text style={styles.catBulletLabel}>
                                  {attr.nombre.toUpperCase()}
                                </Text>
                                <Text style={styles.catBulletValor}>
                                  {attr.valor}
                                </Text>
                              </View>
                            ))}
                        </View>
                      ))}
                    </View>
                  ))
                })()}
              </View>
            )}

            <View style={styles.bannerInversion}>
              <View>
                <Text style={styles.bannerLabel}>INVERSIÓN POR PERSONA</Text>
                <Text style={styles.bannerValor}>
                  {formatMXN(precioPorPaxConFlete)}
                </Text>
              </View>
              <View>
                <Text
                  style={[styles.bannerLabel, { textAlign: 'right' as const }]}
                >
                  SUBTOTAL DEL EVENTO
                </Text>
                <Text
                  style={[
                    styles.bannerValor,
                    { textAlign: 'right' as const, color: COLORES.dorado },
                  ]}
                >
                  {formatMXN(evt.total || 0)}
                </Text>
              </View>
            </View>

            <PageFooter />
          </Page>
        )
      })}

      <Page size="A4" style={[styles.page, styles.pagina]}>
        <PageHeader folio={c.folio || ''} page="Resumen de inversión" />

        <Text style={styles.eventoKicker}>RESUMEN</Text>
        <Text style={styles.resumenTitulo}>Inversión total</Text>

        <View style={styles.tabla}>
          <View style={styles.tablaHeader}>
            <View style={styles.tablaCol1}>
              <Text style={styles.tablaHeaderCell}>CONCEPTO</Text>
            </View>
            <View style={styles.tablaCol2}>
              <Text style={styles.tablaHeaderCell}>CANT</Text>
            </View>
            <View style={styles.tablaCol3}>
              <Text style={styles.tablaHeaderCell}>P. UNIT</Text>
            </View>
            <View style={styles.tablaCol4}>
              <Text style={styles.tablaHeaderCell}>TOTAL</Text>
            </View>
          </View>

          {eventos.map((evt, idx) => {
            const paquete = paquetes.find((p) => p.id === evt.paquete_id)
            const pax = evt.pax || 0
            const fletePerPax = pax > 0 ? (evt.flete || 0) / pax : 0
            const precioPorPaxConFlete = (evt.precio_por_pax || 0) + fletePerPax

            return (
              <View key={evt.id || idx}>
                <View style={styles.tablaRow}>
                  <View style={styles.tablaCol1}>
                    <Text style={styles.tablaConcepto}>
                      {evt.idAmigable ? `${evt.idAmigable} · ` : ''}
                      {paquete?.nombre || 'Paquete'}
                    </Text>
                    <Text style={styles.tablaSubmeta}>
                      {evt.fecha && formatearFechaLarga(evt.fecha)} ·{' '}
                      {evt.locacion_texto || ''}
                    </Text>
                  </View>
                  <View style={styles.tablaCol2}>
                    <Text style={styles.tablaConcepto}>{pax} pax</Text>
                  </View>
                  <View style={styles.tablaCol3}>
                    <Text style={styles.tablaNumero}>
                      {formatMXN(precioPorPaxConFlete)}
                    </Text>
                  </View>
                  <View style={styles.tablaCol4}>
                    <Text style={styles.tablaNumero}>
                      {formatMXN(precioPorPaxConFlete * pax)}
                    </Text>
                  </View>
                </View>

                {(evt.adicionales || []).map((sel) => {
                  const ad = getDatosAdicional(sel.adicionalId)
                  if (!ad) return null
                  return (
                    <View key={sel.id} style={styles.tablaRowSub}>
                      <View style={styles.tablaCol1}>
                        <Text style={styles.tablaSubconcepto}>
                          {'> '}{ad.nombre}
                        </Text>
                      </View>
                      <View style={styles.tablaCol2}>
                        <Text style={styles.tablaSubconcepto}>
                          {sel.cantidad} {ad.unidad || 'u'}
                        </Text>
                      </View>
                      <View style={styles.tablaCol3}>
                        <Text style={styles.tablaNumeroSub}>
                          {formatMXN(sel.precioUnitario)}
                        </Text>
                      </View>
                      <View style={styles.tablaCol4}>
                        <Text style={styles.tablaNumeroSub}>
                          {formatMXN(sel.cantidad * sel.precioUnitario)}
                        </Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            )
          })}

          {cargosExtra.map((cargo) => (
            <View key={cargo.id} style={styles.tablaRow}>
              <View style={styles.tablaCol1}>
                <Text style={styles.tablaConcepto}>
                  {cargo.concepto || 'Cargo extra'}
                </Text>
              </View>
              <View style={styles.tablaCol2}>
                <Text style={styles.tablaConcepto}>—</Text>
              </View>
              <View style={styles.tablaCol3}>
                <Text style={styles.tablaConcepto}>—</Text>
              </View>
              <View style={styles.tablaCol4}>
                <Text style={styles.tablaNumero}>{formatMXN(cargo.monto)}</Text>
              </View>
            </View>
          ))}

          {c.descuento_general && (
            <View style={styles.tablaRow}>
              <View style={styles.tablaCol1}>
                <Text style={[styles.tablaConcepto, { color: '#2a7d3a' }]}>
                  Descuento{' '}
                  {c.descuento_general.tipo === 'porcentaje'
                    ? `${c.descuento_general.valor}%`
                    : ''}
                  {c.descuento_general.concepto &&
                    ` (${c.descuento_general.concepto})`}
                </Text>
              </View>
              <View style={styles.tablaCol2}>
                <Text style={styles.tablaConcepto}>—</Text>
              </View>
              <View style={styles.tablaCol3}>
                <Text style={styles.tablaConcepto}>—</Text>
              </View>
              <View style={styles.tablaCol4}>
                <Text style={[styles.tablaNumero, { color: '#2a7d3a' }]}>
                  −{formatMXN(descuentoAplicado)}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.tablaSubtotal}>
            <View style={[styles.tablaCol1, styles.tablaCol2, styles.tablaCol3]}>
              <Text
                style={[
                  styles.tablaHeaderCell,
                  { textAlign: 'right' as const, paddingTop: 4 },
                ]}
              >
                SUBTOTAL
              </Text>
            </View>
            <View style={styles.tablaCol4}>
              <Text style={[styles.tablaNumero, { fontSize: 13 }]}>
                {formatMXN(subtotalAjustado)}
              </Text>
            </View>
          </View>

          {aplicaIva && (
            <View style={styles.tablaTotalRow}>
              <View style={[styles.tablaCol1, styles.tablaCol2, styles.tablaCol3]}>
                <Text
                  style={[
                    styles.tablaHeaderCell,
                    { textAlign: 'right' as const, paddingTop: 4 },
                  ]}
                >
                  IVA 16%
                </Text>
              </View>
              <View style={styles.tablaCol4}>
                <Text style={[styles.tablaNumero, { fontSize: 13 }]}>
                  {formatMXN(iva)}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.tablaTotalRow}>
            <View style={[styles.tablaCol1, styles.tablaCol2, styles.tablaCol3]}>
              <Text
                style={[styles.tablaTotalLabel, { textAlign: 'right' as const, paddingTop: 8 }]}
              >
                TOTAL
              </Text>
            </View>
            <View style={styles.tablaCol4}>
              <Text style={styles.tablaTotalValor}>{formatMXN(total)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.bannerAnticipo}>
          <View>
            <Text style={styles.bannerLabel}>ANTICIPO PARA APARTAR FECHA</Text>
            <Text style={[styles.bannerLabel, { fontSize: 9, marginTop: 4 }]}>
              {anticipoPct}% del total
            </Text>
          </View>
          <Text style={styles.bannerValor}>{formatMXN(anticipoMonto)}</Text>
        </View>

        {c.notas_cliente && (
          <View style={styles.notasCliente}>
            <Text style={styles.notasTitulo}>NOTAS PARA EL CLIENTE</Text>
            <Text style={styles.notasTexto}>{c.notas_cliente}</Text>
          </View>
        )}

        <PageFooter />
      </Page>

      <Page size="A4" style={[styles.page, styles.pagina]}>
        <PageHeader folio={c.folio || ''} page="Términos y condiciones" />

        <Text style={styles.eventoKicker}>CATÁLOGO COMPLETO</Text>
        <Text style={styles.resumenTitulo}>Servicios adicionales disponibles</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {adicionales
            .filter((a) => a.estado === 'ACTIVO')
            .slice(0, 30)
            .map((ad) => (
              <View
                key={ad.id}
                style={{
                  width: '48%',
                  padding: 8,
                  backgroundColor: '#faf5e8',
                  borderLeftWidth: 2,
                  borderLeftColor: COLORES.dorado,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <Text style={{ fontSize: 10, fontFamily: 'Times-Roman', color: COLORES.texto, flex: 1 }}>
                    {ad.nombre}
                  </Text>
                  <Text style={{ fontSize: 9, fontFamily: 'Courier', color: COLORES.textoLabel }}>
                    {formatMXN(ad.precio)}/{ad.unidad || 'u'}
                  </Text>
                </View>
                {ad.notas && (
                  <Text
                    style={{
                      fontSize: 8,
                      color: COLORES.textoSecundario,
                      marginTop: 2,
                    }}
                  >
                    {ad.notas}
                  </Text>
                )}
              </View>
            ))}
        </View>

        <Text style={styles.terminosTitulo}>TÉRMINOS Y CONDICIONES</Text>

        <View style={styles.terminoItem}>
          <Text style={styles.terminoBullet}>•</Text>
          <Text style={styles.terminoTexto}>
            El cliente proporcionará instalaciones adecuadas para el manejo de alimentos.
          </Text>
        </View>
        <View style={styles.terminoItem}>
          <Text style={styles.terminoBullet}>•</Text>
          <Text style={styles.terminoTexto}>
            El uso indebido o daños al mobiliario durante el evento generarán cargos adicionales,
            mismos que deberán ser cubiertos por el cliente.
          </Text>
        </View>
        <View style={styles.terminoItem}>
          <Text style={styles.terminoBullet}>•</Text>
          <Text style={styles.terminoTexto}>
            Presupuesto válido por {vigenciaDias} días a partir de su emisión.
          </Text>
        </View>
        <View style={styles.terminoItem}>
          <Text style={styles.terminoBullet}>•</Text>
          <Text style={styles.terminoTexto}>
            En caso de cambiar de fecha o reducir número de invitados,{' '}
            {clausulas.cambioFecha.toLowerCase()}.
          </Text>
        </View>
        <View style={styles.terminoItem}>
          <Text style={styles.terminoBullet}>•</Text>
          <Text style={styles.terminoTexto}>
            Se requiere un anticipo del {anticipoPct}% del total para el apartado de fecha.
          </Text>
        </View>
        <View style={styles.terminoItem}>
          <Text style={styles.terminoBullet}>•</Text>
          <Text style={styles.terminoTexto}>
            Los costos presentados no incluyen propinas, las cuales quedan a consideración del cliente.
          </Text>
        </View>

        <PageFooter />
      </Page>
    </Document>
  )
}
