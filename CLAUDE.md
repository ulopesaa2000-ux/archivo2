# CLAUDE.md - Contexto del Proyecto inv-tienda

## Identidad del Proyecto
`inv-tienda` es un sistema fullstack con dos capas:
1. Panel de administración interno para catálogo, inventario, bodegas, notas de movimiento, órdenes B2B, contenedores de importación y ecommerce.
2. Ecommerce público para catálogo, carrito, órdenes de venta y checkout.

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
5. **SEO de imágenes**: La creación e inserción de imágenes sintéticas recortadas `_seo.jpg` ha sido deshabilitada a favor del uso de la imagen principal real original del almacenamiento de Supabase directamente (sin recortes), lo cual garantiza una compatibilidad óptima con WhatsApp/Telegram sin fallos de archivos no encontrados.

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
11. **Gestión de dependencias**: Toda instalación, desinstalación o actualización de paquetes debe realizarse estrictamente con **pnpm** (nunca npm o yarn).
12. **Seguridad y cadena de suministro (Supply Chain Hardening)**: Al instalar bibliotecas nuevas, se debe verificar que no ejecuten scripts de postinstall maliciosos. Mantener el arreglo `pnpm.onlyBuiltDependencies` en `package.json` restringido al mínimo absoluto, admitiendo únicamente compiladores nativos e indispensables comprobados (como `@tailwindcss/oxide` y `sharp`).
13. **Hardening de dependencias**: En caso de reportarse vulnerabilidades críticas (vía `pnpm audit`), las bibliotecas afectadas deben removerse, sustituirse o actualizarse a versiones parcheadas directamente desde los canales de distribución oficiales del fabricante (como SheetJS desde cdn.sheetjs.com).
14. **PWA y Compilación (Turbopack/Webpack)**: Para dar soporte a la PWA con Serwist en Next.js 16+, el modo desarrollo (`pnpm dev`) corre nativo con Turbopack, pero la compilación de producción en `package.json` debe ejecutarse forzando Webpack (`next build --webpack`) para generar el Service Worker (`public/sw.js`) de manera correcta.

### 3.3 Reglas de Nomenclatura
- Tablas: `snake_case`
- Tipos TypeScript: `PascalCase`
- Funciones: `camelCase`
- Hooks: `useXxx`
- Componentes: `PascalCase`
- Server Actions: nombre verbal en `camelCase`
- Archivos: `kebab-case` para utilidades y `PascalCase` para componentes

### 3.4 Reglas de Optimización y Rendimiento
1. El shell admin vive exclusivamente en `app/(admin)/layout.tsx`.
2. La navegación interna debe usar `<Link>` de `next/link`.
3. En admin, solo cambia `{children}` dentro del layout.
4. Filtros y búsquedas usan `searchParams` como estado fuente de verdad.
5. Buscadores de texto usan debounce de 300 ms y `useTransition`.
6. Los cambios de filtros usan `router.push(..., { scroll: false })`.
7. Al cambiar filtros, solo se re-renderiza el Server Component del contenido.
8. Cada ruta admin debe tener `loading.tsx` con skeleton inmediato.
9. Las vistas de detalle deben cargar con skeleton inicial, hero primero y tabs independientes con `<Suspense>`.
10. Las queries pesadas deben wrappearse en `<Suspense>` individual.
11. Los catálogos de soporte deben cachearse y revalidarse solo cuando cambian.
12. Después de mutaciones usar `revalidatePath()` o `router.refresh()`, nunca navegación forzada solo para refrescar.
13. Aprovechar el prefetch automático de `<Link>` en el sidebar.

### 3.5 Reglas de Timezone
1. Supabase almacena todo en UTC. Nunca cambiar eso.
2. `TIMEZONE = 'America/Mexico_City'` en `lib/constants.ts` es la única fuente de verdad.
3. Toda fecha mostrada al usuario debe pasar por funciones de `lib/utils.ts` como `formatDate()`, `formatDateTime()` y `formatTimeAgo()`.
4. Nunca convertir timezone en Server Actions ni en la base de datos.
5. `created_at` y `updated_at` los maneja la base de datos.
6. Para `datetime-local`, mostrar con `formatForDateTimeInput()` y guardar con `inputDateTimeToUTC()`.
7. Usar el componente `<Fecha>` para renderizar fechas y añadir `title` con fecha completa como tooltip.

### 3.6 Reglas de Diseño de Modales (Dialogs)
1. Para modales de densidad alta o formularios complejos (como personalización de reportes o edición de datos), evitar forzar anchos angostos como `sm:max-w-sm` o `sm:max-w-md` en pantallas grandes.
2. En vistas móviles, el modal debe ser de ancho completo (`w-full` o `max-w-full`) para mantener la adaptabilidad responsiva sin recortar información ni generar barras de scroll innecesarias.
3. En pantallas medianas y grandes, usar clases responsivas como `sm:max-w-[80vw]` o `sm:max-w-[90vw]` (de 80% a 90% del ancho) o anchos máximos grandes y bien distribuidos (por ejemplo, `max-w-4xl`, `max-w-5xl` o `max-w-7xl` con `w-full`).
4. Para anular el ancho por defecto que impone el componente base (ej. `sm:max-w-sm` dentro de `dialog.tsx`), se debe especificar explícitamente en el componente que lo usa la clase correspondiente al ancho deseado para pantallas medianas/grandes (ej. `sm:max-w-[85vw]` o `sm:max-w-4xl`), anulando la restricción de anchos fijos pequeños.

## Arquitectura Objetivo

### Shell Persistente del Admin
- `app/(admin)/layout.tsx` define el shell persistente.
- Sidebar, header y selector de bodega no deben duplicarse en `page.tsx`.
- La navegación interna debe preservar estado del shell entre vistas.

### Patrón de Listado Optimizado
- Filtros como Client Components persistentes.
- Tabla y resultados como Server Components.
- La URL es el estado.
- Debounce y transición suave sin perder foco ni hacer recargas completas.

### Patrón de Detalle con Streaming
- `loading.tsx` muestra skeleton inmediato.
- `page.tsx` resuelve primero el hero.
- Tabs y secciones pesadas cargan con `<Suspense>` individual y streaming progresivo.

## Estructura de Carpetas Esperada
- `app/(admin)` para el panel protegido
- `app/(store)` para el ecommerce público
- `app/(auth)` para login
- `components/admin`, `components/store`, `components/shared`
- `modules/*` con `actions.ts` y `queries.ts`
- `lib/supabase`, `lib/types`, `lib/constants.ts`, `lib/utils.ts`
- `hooks` con hooks de sesión, bodega y carrito

## Fases del Proyecto
1. Fase 0: bootstrapping, estructura, clientes, tipos, optimización base
2. Fase 1: autenticación y login
3. Fase 2: shell admin persistente, sidebar, header, selector de bodega
4. Fase 3: módulo catálogo
5. Fase 4: módulo inventario
6. Fase 5: órdenes B2B, cajas, contenedores
7. Fase 6: ecommerce admin
8. Fase 7: tienda online pública
9. Fase 8: usuarios, roles y configuración
10. Fase 9: dashboard real, pulido y deploy

## Instrucciones de Trabajo
1. Tener siempre presente la Sección 3 (reglas inquebrantables) antes de generar código.
2. Al iniciar cada fase, releer su descripción.
3. Generar código archivo por archivo.
4. Después de cada archivo, indicar actividad completada y siguiente paso.
5. Todo código debe compilar sin errores TypeScript.
6. Usar Server Components por defecto.
7. Las mutaciones deben vivir en `modules/*/actions.ts`.
8. No generar código que modifique la estructura de la base de datos.
9. Cada listado debe tener `loading.tsx`.
10. Cada vista de detalle debe usar `<Suspense>` para streaming.
11. Antes de realizar cambios grandes, crear un punto de restauración con git (commit) para mantener versiones y poder regresar en caso de errores.

## Notas Adicionales
- Las skills personalizadas deben colocarse en `.claude/skills/nombre-de-la-skill/SKILL.md`
- Los archivos existentes en `.agents/skills/` son skills del sistema y no deben ser modificados para skills personalizadas
- Este archivo CLAUDE.md sirve como contexto general para futuras iteraciones del proyecto


## Skills Disponibles

Esta sección lista las skills del sistema disponibles en `.agents/skills/` que pueden ser invocadas para tareas específicas.

### accessibility
**Descripción**: Audit and improve web accessibility following WCAG 2.2 guidelines. Use when asked to "improve accessibility", "a11y audit", "WCAG compliance", "screen reader support", "keyboard navigation", or "make accessible".
**Archivo**: `.agents\skills\accessibility\SKILL.md`

### frontend-design
**Descripción**: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics.
**Archivo**: `.agents\skills\frontend-design\SKILL.md`

### next-best-practices
**Descripción**: Next.js best practices - file conventions, RSC boundaries, data patterns, async APIs, metadata, error handling, route handlers, image/font optimization, bundling
**Archivo**: `.agents\skills\next-best-practices\SKILL.md`

### next-cache-components
**Descripción**: Next.js 16 Cache Components - PPR, use cache directive, cacheLife, cacheTag, updateTag
**Archivo**: `.agents\skills\next-cache-components\SKILL.md`

### next-upgrade
**Descripción**: Upgrade Next.js to the latest version following official migration guides and codemods
**Archivo**: `.agents\skills\next-upgrade\SKILL.md`

### nodejs-backend-patterns
**Descripción**: Build production-ready Node.js backend services with Express/Fastify, implementing middleware patterns, error handling, authentication, database integration, and API design best practices. Use when creating Node.js servers, REST APIs, GraphQL backends, or microservices architectures.
**Archivo**: `.agents\skills\nodejs-backend-patterns\SKILL.md`

### nodejs-best-practices
**Descripción**: "Node.js development principles and decision-making. Framework selection, async patterns, security, and architecture. Teaches thinking, not copying."
**Archivo**: `.agents\skills\nodejs-best-practices\SKILL.md`

### playwright-best-practices
**Descripción**: Use when writing Playwright tests, fixing flaky tests, debugging failures, implementing Page Object Model, configuring CI/CD, optimizing performance, mocking APIs, handling authentication or OAuth, testing accessibility (axe-core), file uploads/downloads, date/time mocking, WebSockets, geolocation, permissions, multi-tab/popup flows, mobile/responsive layouts, touch gestures, GraphQL, error handling, offline mode, multi-user collaboration, third-party services (payments, email verification), console error monitoring, global setup/teardown, test annotations (skip, fixme, slow), test tags (@smoke, @fast, @critical, filtering with --grep), project dependencies, security testing (XSS, CSRF, auth), performance budgets (Web Vitals, Lighthouse), iframes, component testing, canvas/WebGL, service workers/PWA, test coverage, i18n/localization, Electron apps, or browser extension testing. Covers E2E, component, API, visual, accessibility, security, Electron, and extension testing.
**Archivo**: `.agents\skills\playwright-best-practices\SKILL.md`

### seo
**Descripción**: Optimize for search engine visibility and ranking. Use when asked to "improve SEO", "optimize for search", "fix meta tags", "add structured data", "sitemap optimization", or "search engine optimization".
**Archivo**: `.agents\skills\seo\SKILL.md`

### shadcn
**Descripción**: Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI. Provides project context, component docs, and usage examples. Applies when working with shadcn/ui, component registries, presets, --preset codes, or any project with a components.json file. Also triggers for "shadcn init", "create an app with --preset", or "switch to --preset".
**Archivo**: `.agents\skills\shadcn\SKILL.md`

### supabase-postgres-best-practices
**Descripción**: Postgres performance optimization and best practices from Supabase. Use this skill when writing, reviewing, or optimizing Postgres queries, schema designs, or database configurations.
**Cuándo aplicar**: Reference these guidelines when:
- Writing SQL queries or designing schemas
- Implementing indexes or query optimization
- Reviewing database performance issues
- Configuring connection pooling or sca...
**Archivo**: `.agents\skills\supabase-postgres-best-practices\SKILL.md`

### tailwind-css-patterns
**Descripción**: Provides comprehensive Tailwind CSS utility-first styling patterns including responsive design, layout utilities, flexbox, grid, spacing, typography, colors, and modern CSS best practices. Use when styling React/Vue/Svelte components, building responsive layouts, implementing design systems, or optimizing CSS workflow.
**Archivo**: `.agents\skills\tailwind-css-patterns\SKILL.md`

### tailwind-v4-shadcn
**Descripción**: |
**Archivo**: `.agents\skills\tailwind-v4-shadcn\SKILL.md`

### typescript-advanced-types
**Descripción**: Master TypeScript's advanced type system including generics, conditional types, mapped types, template literals, and utility types for building type-safe applications. Use when implementing complex type logic, creating reusable type utilities, or ensuring compile-time type safety in TypeScript projects.
**Archivo**: `.agents\skills\typescript-advanced-types\SKILL.md`

### vercel-composition-patterns
**Descripción**: React composition patterns that scale. Use when refactoring components with
**Cuándo aplicar**: Reference these guidelines when:

- Refactoring components with many boolean props
- Building reusable component libraries
- Designing flexible component APIs
- Reviewing component architecture
- Work...
**Archivo**: `.agents\skills\vercel-composition-patterns\SKILL.md`

### vercel-react-best-practices
**Descripción**: React and Next.js performance optimization guidelines from Vercel Engineering. This skill should be used when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance patterns. Triggers on tasks involving React components, Next.js pages, data fetching, bundle optimization, or performance improvements.
**Cuándo aplicar**: Reference these guidelines when:
- Writing new React components or Next.js pages
- Implementing data fetching (client or server-side)
- Reviewing code for performance issues
- Refactoring existing Rea...
**Archivo**: `.agents\skills\vercel-react-best-practices\SKILL.md`

### Recomendación para la solicitud actual

**Skill recomendada**: supabase-postgres-best-practices
Para usar esta skill, ejecute: `skill: "supabase-postgres-best-practices"`

