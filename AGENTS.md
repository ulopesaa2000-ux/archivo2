<!-- C:\Users\uriel\Downloads\enero 26\archivo2\AGENTS.md -->
# AGENTS.md - Contexto del Proyecto inv-tienda

> Fuente única de verdad para agentes (OpenCode lee este archivo).
> `.agents/AGENTS.md` y `CLAUDE.md` solo lo referencian, no duplican reglas.
> Backup de referencia pre-mejora: `scratch/backups/agents-20261013-1624/`

## Prioridad de decisión

Cuando haya ambigüedad, seguir este orden:

1. Sección 3: reglas inquebrantables
2. Requisitos funcionales y fases del proyecto
3. Estructura y patrones de arquitectura descritos aquí
4. Estado actual del repositorio, siempre que no contradiga lo anterior

## Identidad del Proyecto

`inv-tienda` es un sistema fullstack con dos capas:

1. Panel de administración interno (ERP): catálogo, inventario, bodegas, notas de movimiento, órdenes B2B, contenedores de importación y ecommerce.
2. Ecommerce público: catálogo, carrito, órdenes de venta y checkout.

La base de datos PostgreSQL en Supabase ya existe y está poblada con datos reales. No se debe crear, modificar ni migrar la base de datos. El trabajo es frontend más lógica de integración con Supabase.

## Stack Objetivo

- Frontend: Next.js 16+ con App Router
- Lenguaje: TypeScript estricto
- Estilos: Tailwind CSS 3+
- UI Kit: shadcn/ui
- Backend y DB: Supabase PostgreSQL, esquema `inv-tienda`
- Auth: Supabase Auth vinculado a `inv-tienda.usuarios`
- Cliente: `@supabase/supabase-js` v2 + `@supabase/ssr`
- Iconos: `lucide-react`
- Utilidades: `clsx`, `tailwind-merge`, `use-debounce`
- Estado: Server Components por defecto; Client Components solo con interactividad real

## Reglas Inquebrantables (Prioridad Máxima)

### 3.1 Reglas de Negocio

1. Todo movimiento de inventario se procesa a través de `notas_inventario`. Nunca tocar `inventario_stock` directamente.
2. El trigger `fn_procesar_nota_inventario` ejecuta los cambios de stock cuando una nota cambia a estado `CONF`.
3. El inventario se trackea a nivel producto, no variante. `inventario_stock.producto_id` es la unidad de stock.
4. Los precios públicos viven en `productos_web` (`precio_publico`, `precio_oferta`), separados del costo en `variantes_producto` (`costo_promedio`).
5. **SEO de imágenes**: deshabilitada la creación de sintéticas `_seo.jpg`; usar la imagen principal real de Supabase Storage sin recortes (compatibilidad WhatsApp/Telegram).

### 3.2 Reglas de Código

1. Tipar siempre el retorno de las llamadas a Supabase con genéricos.
2. Usar `Database['inv-tienda']['Tables']['nombre_tabla']['Row']` para tipos.
3. Las llamadas a stored procedures van vía `supabase.rpc('nombre_fn', {})`.
4. Usar el cliente servidor con cookies en Server Components y Route Handlers.
5. Usar el cliente browser solo en Client Components con interacción.
6. Con RLS activo, todas las queries deben respetar las políticas del esquema.
7. El esquema es `inv-tienda` y debe especificarse en el cliente.
8. Las mutaciones van como Server Actions con `'use server'`.
9. No instalar dependencias fuera del stack sin justificación clara.
10. Cada archivo generado debe incluir el path completo como comentario en la primera línea.
11. **pnpm obligatorio**: instalar/actualizar solo con `pnpm` (nunca npm/yarn).
12. **Supply chain**: verificar postinstall al agregar libs; mantener `pnpm.onlyBuiltDependencies` al mínimo (`@tailwindcss/oxide`, `sharp`). Ante `pnpm audit` crítico, remover/sustituir/actualizar desde el canal oficial.
13. **PWA/build**: dev con Turbopack (`pnpm dev`); producción con `next build --webpack` para generar `public/sw.js` (Serwist).

### 3.3 Reglas de Nomenclatura

- Tablas: `snake_case`
- Tipos TypeScript: `PascalCase`
- Funciones: `camelCase`
- Hooks: `useXxx`
- Componentes: `PascalCase`
- Server Actions: nombre verbal en `camelCase`
- Archivos: `kebab-case` para utilidades y `PascalCase` para componentes

### 3.4 Reglas de Optimización y Rendimiento

1. El shell admin vive exclusivamente en `app/(admin)/layout.tsx`; solo cambia `{children}`.
2. Navegación interna con `<Link>` de `next/link` (aprovechar prefetch del sidebar).
3. Filtros y búsquedas usan `searchParams` como fuente de verdad; cambios con `router.push(..., { scroll: false })`, debounce 300 ms + `useTransition`, sin perder foco.
4. Al cambiar filtros, solo se re-renderiza el Server Component del contenido.
5. Cada ruta admin tiene `loading.tsx` con skeleton inmediato; detalle con hero primero y tabs/secciones pesadas en `<Suspense>` individual (streaming).
6. Catálogos de soporte se cachean y revalidan solo cuando cambian.
7. Tras mutaciones usar `revalidatePath()`; para refrescar info en pantalla preferir recarga quirúrgica por entidad visible antes que `router.refresh()` full (ver 3.7.6).

### 3.5 Reglas de Timezone

1. Supabase almacena todo en UTC. Nunca cambiar eso.
2. `TIMEZONE = 'America/Mexico_City'` en `lib/constants.ts` es la única fuente de verdad.
3. Toda fecha mostrada pasa por `lib/utils.ts` (`formatDate()`, `formatDateTime()`, `formatTimeAgo()`).
4. Nunca convertir timezone en Server Actions ni en la base de datos.
5. `created_at` y `updated_at` los maneja la base de datos.
6. Para `datetime-local`, mostrar con `formatForDateTimeInput()` y guardar con `inputDateTimeToUTC()`.
7. Usar el componente `<Fecha>` con `title` de fecha completa como tooltip.

### 3.6 Reglas de Diseño de Modales (Dialogs)

1. En densidad alta/formularios complejos, no forzar `sm:max-w-sm/md`; en desktop usar `sm:max-w-[80vw/90vw]` o `max-w-4xl/5xl/7xl` con `w-full`.
2. En móvil, ancho completo (`w-full`/`max-w-full`), sin recortes ni scroll innecesario.
3. Anular el ancho por defecto del base (`dialog.tsx`) explícitamente en el consumidor.

### 3.7 Anti-spagueti ERP (visual vs datos, presupuestos)

1. **Separación**: visual en `app/(admin)/<ruta>/_components/` (puro: recibe `props`, emite `onX`; prohibido `supabase`/`fetch`/`router.refresh`); datos en `modules/<dominio>/queries.ts` (lectura Server) y `modules/<dominio>/actions/` (mutaciones `'use server'`); puente en `app/(admin)/<ruta>/_hooks/use-*.ts` (1 hook = 1 responsabilidad). Puro compartido en `lib/<dominio>/` (sin React).
2. **Presupuesto de queries**: `select` explícito, prohibido `SELECT *`; resumen light sin `skus[]`/fotos, detalle lazy por demanda (`eq familia`, imagen solo `es_principal`); `IN` en chunks ≤200; `Promise.all` para independientes, nunca cascada evitable.
3. **Render por pasos**: central/hero primero, resto diferido (`Suspense` por panel, `requestIdleCallback`/`IntersectionObserver` para lo no visible); derivados caros en `useMemo`; listas largas con `content-visibility`/paginación; pesados (`exceljs`, `motion`) con `dynamic import`.
4. **Tamaño**: max ~300 líneas por Client; si crece, extraer `_components`/`_hooks`. Sin boolean-props en proliferación (usar composición/variantes explícitas).
5. **Temporal local**: `localStorage` solo para borrador/bandeja efímera, con schema versionado `dominio:clave:v1` + `clear` al guardar en BD o al olvidar; validar forma al leer y filtrar IDs ya inexistentes.
6. **Refresh quirúrgico**: el botón icono recarga solo entidades visibles (ej. `F000-000C` + pineadas) y hace diff local; no reemplaza todo el arreglo ni borra borrador/bandeja.
7. **Ejemplo canónico (Familias, no alucinar estructura)**: horizontal (prohibido) = `app/(admin)/catalogo/familias/FamiliasOrganizerClient.tsx` (~3.8k líneas, trae todo con `fetchResumenFamilias` y renderiza de jalón); vertical (obligatorio) = `page.tsx` light con conteos + `app/(admin)/catalogo/familias/_hooks/use-directorio|use-bandeja|use-borrador|use-stock-semaforo|use-refresh-quirurgico.ts` + `app/(admin)/catalogo/familias/_components/ToolbarFamilias|SidebarBandeja|DirectorioCentral|BarraBorrador|InspectorProducto|Modales.tsx` + queries estrechas por familia (`fetchProductosPorFamilia`) en `<Suspense>` por panel. Ante duda de cómo separar un módulo nuevo, replicar este mapa.

## Arquitectura Objetivo (sin duplicar 3.4)

- Shell persistente en `app/(admin)/layout.tsx`; `page.tsx` no duplica sidebar/header/selector de bodega.
- Listado: filtros Client persistentes + tabla Server; URL es el estado.
- Detalle: `loading.tsx` inmediato, hero primero, resto con `<Suspense>` y streaming.

## Estructura de Carpetas Esperada

- `app/(admin)` panel protegido; cada ruta con `page.tsx` (Server orquestador) + `loading.tsx` + `_components/` (visual) + `_hooks/` (puente Client)
- `app/(store)` ecommerce público; `app/(auth)` login
- `components/admin`, `components/store`, `components/shared`, `components/ui` (shadcn)
- `modules/<dominio>/` con `queries.ts`, `actions/`, `types.ts` (+ `search.ts` donde aplique)
- `lib/supabase`, `lib/types`, `lib/constants.ts`, `lib/utils.ts`, `lib/<dominio>/` (puro)
- `hooks/` globales (sesión, bodega, carrito)

## Bloques Funcionales del Proyecto

0. **Capa Transversal (Base, Auth & RBAC)**: Auth, `usuarios`, `roles`, `usuario_permisos`, `usuario_bodegas`, shell y selector de bodegas (`.agents/rules/00_base_auth_rbac.md`).
1. **Bloque 1 (Catálogo y Cadena de Suministro)**: catálogo, variantes, cajas talla×color, órdenes B2B, contenedores, OCR n8n, galería (`.agents/rules/01_catalogo_b2b.md`).
2. **Bloque 2 (Inventario, Movimientos y Bodegas)**: stock por producto, notas CONF (`fn_procesar_nota_inventario`), despachos, transferencias, matriz y pronósticos (`.agents/rules/02_inventario.md`).
3. **Bloque 3 (Ecommerce y Tienda Pública)**: `productos_web`, precios, slugs, pedidos, carrito, checkout, SEO (`.agents/rules/03_ecommerce_tienda.md`).
4. **Sistema de Diseño Unificado**: tokens, atómicos, modales densos, tablas, badges, Sonner (`.agents/rules/04_design_system.md`).

## Skills (enrutar antes de codificar, sobre todo en OpenCode)

No adivinar: invocar vía skill tool el ID exacto cuando la tarea encaje. Mapa mínimo:

| Tarea | Skill |
|---|---|
| SQL / queries lentas / índices / pooling | `supabase-postgres-best-practices` |
| Refactor >300 líneas, boolean-props, librería de componentes | `vercel-composition-patterns` |
| Perf render/fetch/bundle/re-renders | `vercel-react-best-practices` |
| RSC, boundaries, data patterns, `Suspense`, bundling, metadata, imágenes/fuentes | `next-best-practices` |
| Cache Components / PPR (`use cache`, `cacheLife/Tag`) | `next-cache-components` |
| Subir versión Next.js | `next-upgrade` |
| UI nueva / layout / dashboard | `frontend-design`, `shadcn`, `tailwind-css-patterns` |
| Imágenes Supabase + imgproxy en Next | `supabase-imgproxy` |
| Tipos avanzados / type-safety | `typescript-advanced-types` |
| A11y / SEO / E2E | `accessibility`, `seo`, `playwright-best-practices` |
| Duda de cuál usar (proyecto inv-tienda) | `skill-selector` |

## Instrucciones de Trabajo (OpenCode)

1. Tener presente la Sección 3 antes de generar código; al iniciar fase, releer su regla de bloque.
2. Generar archivo por archivo; tras cada uno, indicar completado y siguiente paso.
3. Todo código compila sin errores TypeScript; Server Components por defecto.
4. Verificar con ejecución (tests, build parcial, sanity check) antes de dar por hecho; evidencia antes que síntesis; si algo contradice un supuesto previo, decirlo.
5. Paralelizar llamadas independientes; secuencial solo con dependencia real. Al referenciar código usar `file_path:line_number`.
6. Editar antes que crear; `read` antes que `shell` para ver archivos; `pnpm` para dependencias.
7. Antes de cambios grandes, commit de restauración. Scripts/diagnósticos nuevos van según `scripts/README.md` y `scratch/README.md` (`n8n/|supabase/|system/` × `diagnostics/|queries/|tests/|updates/`); respaldos en `scripts/backups/` o `scratch/backups/` (gitignore); todo script lleva su path en la primera línea.
8. Las skills del sistema viven en `.agents/skills/` (no editar para personalizadas); las personalizadas van en `.claude/skills/<nombre>/SKILL.md`.
