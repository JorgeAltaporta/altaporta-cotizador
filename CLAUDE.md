# [CLAUDE.md](http://CLAUDE.md) — Manual del Proyecto Altaporta Cotizador

> Documento vivo. Sirve como contexto para asistentes de IA y como documentación
> para cualquier persona técnica que entre al proyecto. Actualízalo cuando tomes
> decisiones importantes de arquitectura o negocio.

---

## 1. Contexto del negocio

**Altaporta Catering** es una empresa familiar de catering y renta de mobiliario
con más de 35 años de historia, basada en Mérida, Yucatán, México.

El propósito de este sistema es **sistematizar las operaciones** para reducir la
dependencia personal del dueño en decisiones operativas del día a día y darle al
equipo herramientas para trabajar de forma más autónoma.

### Equipo y roles

- **Jorge** — Dueño. Aprobador de cotizaciones y descuentos.
- **Danna** — Sales Manager (esposa de Jorge). Aprobadora de cotizaciones.
- **Christofer y Tiare** — Sales Executives. Comisión 1%. Capturan leads y arman cotizaciones.
- **Chef Gaspar** — Cocina. (No usa este sistema directamente todavía.)
- **Chucho** — Capitán de servicio. (No usa este sistema directamente todavía.)
- **Bodega y bar** — Equipos operativos. (No usan este sistema directamente todavía.)

### Canal de ventas críticos

- **Wedding Planners (WPs)** — Canal externo crítico. Comisión típica 7–8%.
  Tienen entidad propia en el sistema (`WP-NNN`). El valor especial `WP-DIRECTO`
  significa "venta directa, sin Wedding Planner".

### Flujo de ventas (resumen)

1. Llega un **Lead** (prospecto) por WhatsApp, WP, boda o corporativo.
2. Se captura en el sistema con estado `NUEVO`.
3. Se arma una **Cotización** (asistente de 4 pasos).
4. Se comparte con el cliente vía PDF o link público (`/p/[token]`).
5. Cotización tiene **15 días de vigencia**.
6. Confirmación = contrato + 30% de anticipo.
7. El 70% restante antes del evento.

---

## 2. Stack técnico

| Capa | Tecnología | Notas importantes |
|---|---|---|
| Framework | **Next.js 16.2.4** + React 19 | App Router + Server Actions |
| Base de datos | **Supabase** (PostgreSQL) | Cliente separado para server y browser |
| Autenticación | **Supabase Auth** | Protegida por `middleware.ts` global |
| Estilos | **Tailwind CSS 4** | Modo claro forzado |
| PDF | `@react-pdf/renderer` | Para exportar cotizaciones |
| Iconos | `lucide-react` | Importados uno por uno, no SVG inline |
| Hosting | **Vercel** | Despliegue automático desde `main` |
| Repo | **GitHub** | `JorgeAltaporta/altaporta-cotizador` |

### ⚠️ Regla #1 sobre Next.js 16

Esta versión es muy nueva. La mayoría de modelos de IA tienen entrenamiento con
versiones anteriores. **Antes de tocar código de Next.js, verifica contra la
documentación incluida en el proyecto** (`node_modules/next/dist/docs/`) para
no usar APIs obsoletas o que ya no funcionan en la 16.

---

## 3. Convenciones de código (obligatorias)

### Lenguaje y estilo

- **Todo el código en español**: variables, funciones, mensajes, comentarios.
  Solo APIs externas (React, Next, Supabase) están en inglés.
- **Tuteo informal con el usuario**: "tu sesión", "Selecciona", "Ingresa". Nunca "usted".
- **Emojis funcionales en UI**: ✏️ editar, 📋 vacío, ⚠ aviso, ✓ éxito, ▼/▶ colapsar.
  Son parte del diseño, no decorativos.
- **Banners en código**: secciones grandes se separan con líneas `─────────` y
  títulos en MAYÚSCULAS. Es la firma visual del código.

### Identificadores (IDs)

Formato `PREFIJO-NÚMERO` siempre en MAYÚSCULAS:

| Entidad | Formato | Ejemplo |
|---|---|---|
| Cotización | `AP-AÑO-NNN` | `AP-2026-001` |
| Lead | `L-NNN` | `L-001` |
| Wedding Planner | `WP-NNN` | `WP-042` |
| Proteína | `NOMBRE-XXXX` | `ATUN-SELLADO-K3F2` |
| Locación | `loc_<timestamp>_<i>` | `loc_1714678234_0` |

**Estados** y **canales** también en MAYÚSCULAS:
- Estados: `ACTIVO`, `ARCHIVADO`, `BORRADOR`, `PENDIENTE`, `NUEVO`, `COTIZADO`,
  `SEGUIMIENTO`, `NEGOCIACION`, `EJECUTIVO`.
- Canales: `WHATSAPP`, `WP`, `BODA`, `CORPORATIVO`.

**Riesgo conocido**: los folios se generan leyendo el último de la base y sumando
uno. Riesgo de colisión bajo concurrencia. Aceptable para el equipo actual.

### Identidad visual

- **Modo claro forzado** (no dark mode). En `globals.css` está `color-scheme: light`.
- **Paleta base**: Tailwind `stone` (grises cálidos). Fondo `stone-50`, texto `stone-900`.
- **Color principal**: `amber-700` (mostaza/dorado Altaporta). Botones primarios,
  acentos, links importantes.
- **Sidebar**: oscuro (`stone-900` con texto `stone-100`).
- **Tipografía**:
  - Títulos: serif (Georgia/Times) → `font-serif text-4xl` o `text-5xl`.
  - Cuerpo: sans estándar.
  - Etiqueta firma: `text-xs uppercase tracking-widest text-amber-700` arriba de
    cada título de sección.
- **Logo "A"**: cuadro `amber-700` con la letra en serif.

**Paleta semántica**:
- Error: `rose-600/700` con fondo `rose-50`
- Éxito: `emerald-600/700` con fondo `emerald-50`
- Aviso/duplicado: `amber-50/200/700`
- Wedding Planner: `purple-50/200/700` (color propio de WPs)

**Cajas y bordes**:
- Tarjetas grandes: `rounded-2xl` con `border-stone-200` fondo blanco.
- Botones e inputs: `rounded-lg`.
- Padding de página: `p-12 max-w-5xl` o `max-w-6xl`.

### Modales

**Todos hechos a mano**, sin librerías ni `<dialog>` nativo. Patrón:

- `if (!abierto) return null` arriba del componente.
- Capa oscura: `fixed inset-0 z-40 bg-stone-900/50`.
- Caja: `bg-white rounded-2xl shadow-xl max-w-2xl`.
- Click afuera cierra; click adentro hace `stopPropagation`.
- Botón cerrar arriba a la derecha con icono `X` de lucide-react.
- Modal sobre modal: el de arriba usa `z-50`.

### Estado y UI

- **React 19 con `useState` + `useTransition`**. El `useTransition` es obligatorio
  en cada acción que toca el servidor para mostrar "Guardando..." y desactivar el botón.
- **Actualización optimista**: actualizar lista en pantalla *antes* de esperar a
  Supabase, luego `router.refresh()` para resincronizar.
- **Toasts caseros**: `setMensaje(...)` con `setTimeout(3000)`. No usar librerías.
- **`useMemo`** para cálculos pesados (precios, etiquetas, listas combinadas).
- **`localStorage`** con prefijo de marca: `altaporta:<feature>:<key>`.
  Patrón doble useEffect (uno carga, otro guarda) con flag `hidratado` para
  evitar pisar estado durante el primer render.

### Datos con Supabase

Dos clientes separados:
- `lib/supabase/server.ts` para código que corre en el servidor.
- `lib/supabase/client.ts` para componentes que corren en el navegador.

**Regla de cuándo usar cada uno**:
- Acciones simples → escritura directa desde el cliente.
- Acciones con lógica de negocio (asignación, validaciones, generación de IDs) → Server Action.

Después de cualquier mutación importante: `revalidatePath('/ruta')` + `router.refresh()`.

**Server Actions devuelven `{ ok: boolean, error?: string }`** en vez de lanzar excepciones.

### Estructuras complejas como JSON

`eventos`, `historial`, `snapshot`, `descuento_general`, `cargos_extra`, `locaciones`
se guardan como columnas JSON en la base, no como tablas separadas.

**Implicación**: si cambias un paquete, las cotizaciones viejas no se actualizan
automáticamente. Por eso existe el patrón **snapshot** (ver punto 4).

### Hooks y componentes

- Funciones nombradas con verbo en español: `handleCrear`, `actualizar`, `irStep`,
  `cerrarTodo`, `quedarmeloAPesarSobrecarga`.
- Sub-componentes en el mismo archivo cuando son partes del mismo flujo
  (ej. `PasoOrigen`, `PasoCliente`, `PasoEvento` dentro de `captura-modal.tsx`).
- Pre-llenado con datos de origen cuando aplica (Lead → Cotización pre-rellena campos).
- Input numérico que permite vacío: `value === 0 ? '' : String(value)`.

### Estructura de carpetas

- `_components/`, `_actions/` → carpetas con guion bajo. Next.js las excluye del
  routing. Aquí van componentes y server actions privados de un módulo.
- `page.tsx` → ruta accesible.
- `form.tsx` → formulario.
- `manager.tsx` → CRUD simple.
- `actions.ts` o `<feature>.ts` → Server Actions.

### Validación y errores

- **No hay librería de validación** (ni Zod ni Yup). Cada formulario valida
  manualmente con `if (!campo) return error`.
- **Logs con prefijo entre corchetes**: `console.error('[crearLead] error insert:', errInsert)`.

---

## 4. Reglas de negocio importantes

### Snapshots de catálogo

Cada cotización guarda una copia (`snapshot`) de los paquetes, zonas, adicionales
y cláusulas vigentes en ese momento. Esto permite que la cotización siga "intacta"
aunque el catálogo cambie después. **Es una decisión arquitectónica intencional.**

### Moneda y formato

- Pesos mexicanos sin decimales: `toLocaleString('es-MX', { maximumFractionDigits: 0 })`.
- Símbolo: `$` antes del número.

### IVA

- **16% hardcodeado** en el código (`* 0.16`). No es configurable desde la UI.
- ⚠️ Vigilar si cambia el IVA en alguna región.

### Vigencia de cotización

- 15 días desde su creación.

### Comisiones

- Sales Executives (Christofer, Tiare): **1%** del total.
- Wedding Planners: **7–8%** típico (configurable por WP).

---

## 5. Módulos del sistema

| Módulo | Estado | Notas |
|---|---|---|
| **Catálogo** | Implementado | Paquetes, zonas, adicionales, proteínas, rangos, cláusulas |
| **Cotizaciones** | Implementado (más maduro) | Asistente 4 pasos: Datos → Adicionales → Ajustes → Resumen |
| **Leads** | Implementado | Lista, ficha, captura modal, notas, cambio de estado |
| **Configuración de Leads** | En refinamiento | Razones, umbrales, WPs |
| **Vista pública** (`/p/[token]`) | Implementado | Cotización sin login para clientes |
| **Login** | Implementado | Pantalla única |

Items en menú con `wip: true` redirigen a `/proximamente?modulo=...`. Es para
mostrar la visión completa del sistema sin tener que construir todo de una vez.

---

## 6. Deuda técnica conocida

Cosas que sabemos que hay que mejorar pero no son urgentes:

1. **Aprobadores hardcodeados** en sidebar: `APROBADORES = ['Jorge', 'Danna']`.
   Ya existe el campo `puede_aprobar` en la base, pero el sidebar no lo usa todavía.
2. **Generación de folios sin lock**: riesgo de colisión bajo concurrencia.
   Aceptable para el equipo actual (4–5 personas).
3. **IVA hardcodeado al 16%**: cambiar a configuración si alguna vez varía.
4. **No hay tests automáticos**: cada cambio se prueba a mano.
5. **No hay librería de validación**: validaciones manuales en cada formulario.

---

## 7. Cómo trabajar con asistentes de IA en este proyecto

### Antes de hacer cualquier cambio

1. **Leer este archivo completo.**
2. **Si es código de Next.js**, verificar contra `node_modules/next/dist/docs/`
   antes de usar cualquier API.
3. **Detectar el patrón existente** en archivos similares antes de inventar uno nuevo.

### Al proponer cambios

- Respetar todas las convenciones de código (sección 3).
- Mantener la firma visual (paleta, tipografía, etiquetas).
- Funciones y variables en español.
- Server Actions con respuesta `{ ok, error? }`.
- Modales custom siguiendo el patrón documentado.
- Optimistic UI con `useTransition`.

### Comunicación con el dueño (Jorge)

- **Hablar en español**, sin tecnicismos innecesarios.
- Jorge es el dueño del negocio, **no es programador**.
- Explicar el "qué" y el "por qué" en términos del negocio.
- Mostrar cambios propuestos antes de aplicarlos.

---

*Última actualización: mayo 2026*
