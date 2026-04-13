<!-- C:\Users\uriel\Downloads\enero 26\archivo2\AGENTS.md -->
# Instrucciones Maestras de `inv-tienda`

Este archivo guarda las instrucciones base del proyecto para futuras iteraciones.
La referencia principal es el prompt maestro del usuario.

## Prioridad de decisión

Cuando haya ambigüedad, seguir este orden:

1. Sección 3: reglas inquebrantables
2. Requisitos funcionales y fases del proyecto
3. Estructura y patrones de arquitectura descritos aquí
4. Estado actual del repositorio, siempre que no contradiga las reglas anteriores

## Sección 1: identidad del proyecto

`inv-tienda` es un sistema fullstack con dos capas:

1. Panel de administración interno para catálogo, inventario, bodegas, notas de movimiento, órdenes B2B, contenedores de importación y ecommerce.
2. Ecommerce público para catálogo, carrito, órdenes de venta y checkout.

La base de datos PostgreSQL en Supabase ya existe y está poblada con datos reales.
No se debe crear, modificar ni migrar la base de datos.
El trabajo es frontend más lógica de integración con Supabase.

## Sección 2: stack objetivo

- Frontend: Next.js 14+ con App Router
- Lenguaje: TypeScript estricto
- Estilos: Tailwind CSS 3+
- UI Kit: shadcn/ui
- Backend y DB: Supabase PostgreSQL, esquema `inv-tienda`
- Auth: Supabase Auth vinculado a `inv-tienda.usuarios`
- Cliente: `@supabase/supabase-js` v2 + `@supabase/ssr`
- Iconos: `lucide-react`
- Utilidades: `clsx`, `tailwind-merge`, `use-debounce`
- Estado: Server Components por defecto; Client Components solo con interactividad real

## Sección 3: reglas inquebrantables

### 3.1 Reglas de negocio

1. Todo movimiento de inventario se procesa a través de `notas_inventario`. Nunca tocar `inventario_stock` directamente.
2. El trigger `fn_procesar_nota_inventario` ejecuta los cambios de stock cuando una nota cambia a estado `CONF`.
3. El inventario se trackea a nivel producto, no variante. `inventario_stock.producto_id` es la unidad de stock.
4. Los precios públicos viven en `productos_web` (`precio_publico`, `precio_oferta`), separados del costo en `variantes_producto` (`costo_promedio`).

### 3.2 Reglas de código

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

### 3.3 Reglas de nomenclatura

- Tablas: `snake_case`
- Tipos TypeScript: `PascalCase`
- Funciones: `camelCase`
- Hooks: `useXxx`
- Componentes: `PascalCase`
- Server Actions: nombre verbal en `camelCase`
- Archivos: `kebab-case` para utilidades y `PascalCase` para componentes

### 3.4 Reglas de optimización y rendimiento

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

### 3.5 Reglas de timezone

1. Supabase almacena todo en UTC. Nunca cambiar eso.
2. `TIMEZONE = 'America/Mexico_City'` en `lib/constants.ts` es la única fuente de verdad.
3. Toda fecha mostrada al usuario debe pasar por funciones de `lib/utils.ts` como `formatDate()`, `formatDateTime()` y `formatTimeAgo()`.
4. Nunca convertir timezone en Server Actions ni en la base de datos.
5. `created_at` y `updated_at` los maneja la base de datos.
6. Para `datetime-local`, mostrar con `formatForDateTimeInput()` y guardar con `inputDateTimeToUTC()`.
7. Usar el componente `<Fecha>` para renderizar fechas y añadir `title` con fecha completa como tooltip.

## Sección 4: referencia de base de datos

La base usa el esquema `inv-tienda` y ya cuenta con tablas, funciones, triggers, roles, permisos, bodegas y productos cargados.
No modificar estructura ni migraciones.

Funciones clave:

- `sp_crear_nota`
- `sp_agregar_producto_nota`
- `sp_cancelar_nota`
- `fn_puede_acceder_bodega`
- `fn_navegar_producto`

Flujo de notas:

1. `rpc('sp_crear_nota')`
2. `rpc('sp_agregar_producto_nota')`
3. `UPDATE estado_id = [CONF]` para disparar el trigger

## Sección 5: arquitectura objetivo

### Shell persistente del admin

- `app/(admin)/layout.tsx` define el shell persistente.
- Sidebar, header y selector de bodega no deben duplicarse en `page.tsx`.
- La navegación interna debe preservar estado del shell entre vistas.

### Patrón de listado optimizado

- Filtros como Client Components persistentes.
- Tabla y resultados como Server Components.
- La URL es el estado.
- Debounce y transición suave sin perder foco ni hacer recargas completas.

### Patrón de detalle con streaming

- `loading.tsx` muestra skeleton inmediato.
- `page.tsx` resuelve primero el hero.
- Tabs y secciones pesadas cargan con `<Suspense>` individual y streaming progresivo.

## Sección 6: estructura de carpetas esperada

Seguir la estructura funcional propuesta por el usuario:

- `app/(admin)` para el panel protegido
- `app/(store)` para el ecommerce público
- `app/(auth)` para login
- `components/admin`, `components/store`, `components/shared`
- `modules/*` con `actions.ts` y `queries.ts`
- `lib/supabase`, `lib/types`, `lib/constants.ts`, `lib/utils.ts`
- `hooks` con hooks de sesión, bodega y carrito

## Sección 7: fases del proyecto

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

ESTAS FASES ESTAN EN agents/rules/face0y1.md y agents/rules/fase2y3.md las primeras fases en proceso de implementacion y las ultimas en proceso de definicion de la fase 3 de del proyecto.
## Sección 8: instrucciones de trabajo

1. Tener siempre presente la Sección 3 antes de generar código.
2. Al iniciar cada fase, releer su descripción.
3. Generar código archivo por archivo.
4. Después de cada archivo, indicar actividad completada y siguiente paso.
5. Todo código debe compilar sin errores TypeScript.
6. Usar Server Components por defecto.
7. Las mutaciones deben vivir en `modules/*/actions.ts`.
8. No generar código que modifique la estructura de la base de datos.
9. Cada listado debe tener `loading.tsx`.
10. Cada vista de detalle debe usar `<Suspense>` para streaming.

## Nota operativa para futuras iteraciones

Al seguir construyendo módulos de `inv-tienda`, tratar este archivo como la guía base del proyecto.
Si una instrucción futura contradice estas reglas, pedir confirmación explícita antes de implementarla.
