# Analisis completo y plan de optimizacion

Fecha: 2026-05-13

## Resumen ejecutivo

El proyecto tiene una base buena: usa `Next.js App Router`, separa bastante bien el dominio en `modules/`, centraliza auth en `lib/dal.ts` y ya tiene cobertura con `Vitest` y `Playwright`. La arquitectura va en la direccion correcta.

Lo que hoy mas limita escalabilidad y mantenibilidad no es el stack, sino cuatro frentes repetidos:

1. Tipado fragil en consultas y acciones de Supabase (`as any`, mapeos manuales, payloads sin tipos).
2. Muchos componentes cliente con efectos que sincronizan estado derivado y hoy rompen `eslint` con reglas de React 19.
3. Dependencias directas faltantes en `package.json`, aunque existan transitivamente en `pnpm-lock.yaml`.
4. Algunos endpoints de debug/test siguen expuestos dentro de `app/api` y deberian endurecerse o salir del build productivo.

## Hallazgos principales

### 1. Calidad del build

- `pnpm lint` falla con 83 problemas (71 errores, 12 warnings).
- La categoria dominante es `react-hooks/set-state-in-effect`.
- Tambien hay problemas de `exhaustive-deps`, `error-boundaries`, `immutability`, `incompatible-library` y uso de `<img>` en lugar de `next/image`.

### Acciones1.1 tiempos de compilado
Compilación: 23.1s
TypeScript: 42s
Generación estática: 18.7s
Ahora sí medí aperturas reales en http://127.0.0.1:3000, con 3 intentos por ruta:

ura hasta domcontentloaded en 3 intentos por ruta:

/dashboard: primer intento 2329 ms, promedio 1874 ms
/ecommerce/config: primer intento 1783 ms, promedio 1732 ms
/ecommerce/ordenes-venta: primer intento 7161 ms, promedio 3481 ms
/ecommerce/productos-web: primer intento 5667 ms, promedio 3459 ms
/ordenes-b2b: primer intento 3014 ms, promedio 2694 ms
/ordenes-b2b/cajas: primer intento 4679 ms, promedio 3236 ms
Las más lentas del admin quedaron así:

/ecommerce/ordenes-venta
/ecommerce/productos-web
/ordenes-b2b/cajas



### 2. TypeScript y dependencias

`pnpm exec tsc --noEmit` falla por dos razones distintas:

- Faltan dependencias directas declaradas:
  - `react-hook-form`
  - `zod`
  - `@radix-ui/react-slot` #dio error y se hizo la instalacion revizar si se hizo correctamente
  - `dotenv`
- Hay acciones/query payloads que no cumplen con los tipos generados de Supabase, especialmente en `modules/ecommerce/actions.ts`.

### Conclusion

El primer trabajo no deberia ser "optimizar UI", sino estabilizar toolchain, tipos y patrones React.

### 3. Acceso a datos

Los modulos de dominio mas pesados (`catalogo`, `inventario`, `ordenes-b2b`, `ecommerce`, `contenedores`) repiten este patron:

- `createClient()` en casi todas las funciones.
- `select(...) as any`.
- normalizacion manual de relaciones Supabase.
- DTOs armados a mano con poca reutilizacion.

Eso funciona, pero sube mucho el costo de cambio y explica buena parte de los errores de TS.

### 4. Seguridad y superficie innecesaria

Hay rutas de debug/test que no deberian quedar disponibles igual que el resto del producto:

- `app/api/test-users/route.ts`
- `app/api/debug-user/route.ts`
- `app/api/debug-permissions/route.ts`

Aunque algunas requieren sesion, siguen siendo endpoints de inspeccion interna y conviene protegerlos por entorno o retirarlos del bundle productivo.

### 5. Tamano y complejidad de archivos

Los archivos mas caros de mantener hoy concentran demasiada responsabilidad:

- `components/admin/cajas/CajaCard.tsx`
- `modules/catalogo/actions.ts`
- `app/(admin)/catalogo/imagenes/components/ImportarMasivoModal.tsx`
- `app/(admin)/inventario/stock/StockTable.tsx`
- `modules/inventario/queries.ts`
- `app/(admin)/contenedores/[id]/components/ContenedorOrdenes.tsx`
- `components/admin/ecommerce/ConfigForm.tsx`

## Plan recomendado por fases

## Fase 0 - Estabilizar toolchain y baseline

Objetivo: dejar `lint` y `tsc` en un estado confiable antes de refactor mayor.

### Archivos a cambiar

- `package.json`
  - Agregar dependencias directas faltantes: `react-hook-form`, `zod`, `@radix-ui/react-slot`.
  - Evaluar mover `dotenv` a `devDependencies` si `scratch/sync-slugs.ts` se mantiene.
- `pnpm-lock.yaml`
  - Se regenerara al instalar dependencias declaradas correctamente.
- `README.md`
  - Actualizar instrucciones a `pnpm` si ese ya es el package manager real.
- `playwright.config.ts`
  - Cambiar `webServer.command` de `npm run dev` a `pnpm dev` para consistencia.

### Resultado esperado

- El repo deja de depender de paquetes transitivos.
- `tsc` deja de fallar por resolucion de modulos.
- La documentacion coincide con la forma real de correr el proyecto.

## Fase 0.5 - Cerrar bien la migracion a Next.js 16

Objetivo: asegurarse de que el proyecto no este perdiendo ventajas de Next 16 por configuracion heredada de 15.

### Hallazgos de la migracion

- El proyecto ya adopto varias piezas correctas de Next 16:
  - `proxy.ts`
  - `params: Promise<...>`
  - `searchParams: Promise<...>`
  - `cookies()` y `headers()` async
  - `cacheComponents: true`
- Pero todavia hay señales de migracion incompleta:
  - `package.json` usa `next dev --turbo`, que ya no es necesario en 16
  - `next.config.ts` mantiene una configuracion `webpack(...)`
  - el archivo auxiliar sigue llamandose `lib/supabase/middleware.ts`, aunque ya opera detras de `proxy.ts`
  - solo una parte pequena del proyecto usa `use cache`, `cacheLife` y `cacheTag`

### Archivos a cambiar

- `package.json`
  - cambiar scripts a la forma de Next 16:
  - `dev: next dev`
  - `build: next build --webpack` solo si decides conservar webpack
  - o `build: next build` si eliminas por completo la customizacion webpack
- `next.config.ts`
  - decidir explicitamente entre dos caminos:
  - Camino A: seguir con webpack temporalmente
  - Camino B: migrar de verdad a Turbopack y eliminar `webpack(...)`
- `proxy.ts`
  - mantener `export const config`, que sigue siendo valido en docs actuales
  - revisar matcher para excluir tambien metadata files si agregas mas assets de metadata
- `lib/supabase/middleware.ts`
  - renombrar a algo como `lib/supabase/proxy.ts` o `lib/supabase/update-session.ts`
  - no es obligatorio funcionalmente, pero si mejora claridad post-migracion
- `package.json` + typegen workflow
  - agregar script tipo `next typegen` si quieres adoptar helpers oficiales `PageProps`, `LayoutProps`, `RouteContext`

### Mejora concreta importante: Turbopack vs Webpack

Este es el punto mas importante de toda la migracion.

Hoy tu proyecto tiene:

- script `dev` con `next dev --turbo`
- `next.config.ts` con `webpack(...)`

En Next 16:

- Turbopack ya es el default en `next dev` y `next build`
- si existe una customizacion `webpack`, `next build` puede fallar o forzarte a elegir entre webpack y turbopack
- tu optimizacion manual de `splitChunks` aplica a webpack, no a Turbopack

Conclusion practica:

- si mantienes `webpack(...)`, es muy probable que no estes aprovechando completo el camino moderno de build
- si quieres estabilidad inmediata, deja `build --webpack` explicitamente
- si quieres rendimiento moderno de Next 16, planea una fase para eliminar o migrar esa config

### Recomendacion

Primero haria esto:

1. limpiar scripts a semantica Next 16
2. decidir si produccion seguira con webpack temporalmente
3. documentar esa decision
4. despues medir y migrar a Turbopack si la config webpack ya no es necesaria

### Resultado esperado

- migracion a Next 16 cerrada de forma explicita
- menos ambiguedad entre bundlers
- menos riesgo de estar manteniendo optimizaciones que ya no aplican al bundler real

## Fase 1 - Corregir patrones React 19 y limpiar hooks

Objetivo: bajar la mayor parte de los errores de `eslint` sin reescribir features.

### Archivos prioritarios

- `app/(admin)/catalogo/CatalogoCreateDialog.tsx`
  - Reemplazar sincronizacion en `useEffect` por estado derivado, `key` controlada o inicializacion mas declarativa.
- `app/(admin)/catalogo/imagenes/components/ImportarMasivoModal.tsx`
  - Separar deteccion, subida y buscador interno en subcomponentes/hooks.
  - Quitar efectos que disparan `setState` sincronico.
- `app/(admin)/contenedores/[id]/components/ContenedorOrdenes.tsx`
  - Evitar resetear estado desde `useEffect` solo por apertura/cierre.
- `app/(admin)/ordenes-b2b/OrdenFormDialog.tsx`
  - Derivar proveedor/cliente desde props o memo, no desde efecto sincronico.
- `app/(admin)/ordenes-b2b/[id]/components/OrdenCajas.tsx`
  - Mover reseteos de dialogo a handlers de apertura/cierre.
- `components/admin/SearchInput.tsx`
  - Convertirlo a un input controlado consistente, o separar version controlada/no controlada.
- `components/admin/ecommerce/ProductosNoPublicados.tsx`
  - Evitar reset de pagina desde efecto; derivarlo del cambio de filtro.
- `hooks/use-mobile.ts`
  - Inicializar desde lazy state o `useSyncExternalStore`.
- `hooks/useConfigEcommerce.ts`
  - Separar carga inicial y suscripcion realtime.
  - Evitar recrear cliente/canal en cada render.
- `app/(admin)/despachos/nuevo/DespachoForm.tsx`
  - Corregir uso de `handleBodegaChange` antes de declaracion.

### Resultado esperado

- Baja fuerte de errores `react-hooks/*`.
- Componentes cliente mas predecibles.
- Menos renders en cascada y menos estado duplicado.

## Fase 2 - Endurecer tipado Supabase

Objetivo: reducir `any` y hacer que TypeScript realmente proteja acciones y queries.

### Archivos base

- `lib/types/database.types.ts`
  - Revisar si ya contiene todo lo necesario para usar tipos generados en inserts/updates/selects.
- `lib/types/tables.ts`
  - Crear DTOs/utilidades de dominio reutilizables.
- `lib/supabase/server.ts`
  - Exponer helpers tipados si conviene para cliente dinamico/estatico.

### Modulos prioritarios

- `modules/ecommerce/actions.ts`
  - Tipar payloads de `ordenes_venta`, `orden_items` y `productos_web`.
  - Corregir inserts con campos no reconocidos por los tipos generados.
- `modules/catalogo/queries.ts`
  - Eliminar `as any` en queries de listado y catalogos.
  - Extraer normalizadores de relaciones.
- `modules/inventario/queries.ts`
  - Tipar relaciones y helpers como `fetchNotaDetalles` / `fetchNotaHistorial`.
- `modules/ordenes-b2b/queries.ts`
  - Reemplazar mapeos `any` por DTOs concretos.
- `modules/contenedores/queries.ts`
  - Tipar joins y relaciones.
- `modules/despachos/queries.ts`
  - Tipar resultados agregados y detalles.
- `modules/cajas/actions.ts`
  - Reducir `any[]`, `Record<string, any>` y payloads mutables.
- `modules/catalogo/actions.ts`
  - Si se mantiene el archivo actual grande, al menos tipar por bloques antes de dividir.

### Resultado esperado

- Menos fallos silenciosos.
- Mejor autocompletado y menor costo de agregar features.
- Los errores de schema se detectan en compile-time y no solo en runtime.

## Fase 3 - Dividir archivos demasiado grandes

Objetivo: bajar complejidad ciclomática y aislar responsabilidades.

### Archivos a partir

- `modules/catalogo/actions.ts`
  - Separar en:
  - acciones basicas de producto
  - variantes
  - tags/complementos/acabados
  - imagenes
  - medidas
- `app/(admin)/catalogo/imagenes/components/ImportarMasivoModal.tsx`
  - Separar parser CSV, deteccion SKU, preview y carga.
- `components/admin/cajas/CajaCard.tsx`
  - Separar formulario, resumen y handlers de tags/tallas/colores.
- `app/(admin)/inventario/stock/StockTable.tsx`
  - Separar exportacion Excel, columnas y render de filas.
- `app/(admin)/contenedores/[id]/components/ContenedorOrdenes.tsx`
  - Separar buscador, lista de seleccion y tabla de ordenes vinculadas.
- `components/admin/ecommerce/ConfigForm.tsx`
  - Separar schema/defaults, bloques del formulario y helpers derivados.

### Resultado esperado

- PRs mas chicas.
- Tests mas faciles de enfocar.
- Menos riesgo al editar componentes de negocio largos.

## Fase 4 - Consolidar acceso a datos y evitar repeticion

Objetivo: que los modulos no reconstruyan siempre la misma logica de fetch + normalizacion.

### Archivos a cambiar

- `modules/auth/queries.ts`
  - Extraer tipado y composicion de `getCurrentUser`.
  - Evitar `usuarioData as any`.
- `lib/dal.ts`
  - Mantenerlo como entrypoint de auth/role checks y expandir helpers reutilizables.
- `modules/catalogo/queries.ts`
- `modules/inventario/queries.ts`
- `modules/ordenes-b2b/queries.ts`
- `modules/contenedores/queries.ts`
- `modules/ecommerce/queries.ts`

### Accion concreta

- Crear normalizadores reutilizables por dominio.
- Usar `Promise.all` donde haya fetches independientes que hoy siguen seriales.
- Revisar donde conviene `createStaticClient()` y cache tags en lecturas publicas.

### Mejora Next 16 adicional

- expandir `use cache` a funciones puras de lectura compartida:
  - `fetchCatalogosParaFiltros()`
  - `fetchCatalogosEdicion()`
  - `fetchCatalogosB2B()`
  - resumenes o lookups publicos del store
- cuando una funcion necesita runtime request data y no se puede refactorizar facilmente, evaluar `use cache: private`
  - usarlo con cuidado
  - no aplicarlo a Route Handlers
  - no usarlo como excusa para cachear todo indiscriminadamente

## Fase 5 - Seguridad y limpieza de endpoints

Objetivo: reducir superficie de inspeccion y evitar rutas internas en produccion.

### Archivos a cambiar

- `app/api/test-users/route.ts`
  - Eliminar o mover a entorno de desarrollo.
- `app/api/debug-user/route.ts`
  - Proteger por `NODE_ENV !== 'production'` o rol admin fuerte.
- `app/api/debug-permissions/route.ts`
  - Igual: restringir por entorno o eliminar.
- `app/api/inventario/bodegas/usuarios-disponibles/route.ts`
  - Reordenar imports, estandarizar auth, validar permisos antes de devolver usuarios.
- `lib/supabase/middleware.ts`
  - Revisar si conviene ampliar proteccion de rutas o endurecer matchers.
- `proxy.ts`
  - Mantener consistente con la estrategia de proteccion real.

### Resultado esperado

- Menos endpoints internos visibles.
- Politica de auth coherente entre middleware, layouts, server actions y route handlers.

## Fase 6 - Storefront y performance visible

Objetivo: mejorar calidad del frontend publico despues de estabilizar base tecnica.

### Archivos a cambiar

- `app/(store)/layout.tsx`
  - Deduplicar metadata que ya existe en `app/layout.tsx`.
- `app/layout.tsx`
  - Centralizar metadata compartida y limpiar constantes no usadas.
- `app/(store)/shop/[slug]/page.tsx`
  - Sacar JSX de bloques `try/catch`.
  - Revisar flujo de metadata, fetch paralelo y render.
- `app/(admin)/catalogo/[id]/components/SubirImagenModal.tsx`
- `app/(admin)/catalogo/[id]/components/TabImagenes.tsx`
  - Reemplazar `<img>` por `next/image` donde aplique.
- `components/store/producto/ProductGallery.tsx`
  - Ya usa `next/image`; puede quedar como referencia para homogeneizar.

### Resultado esperado

- Mejor cumplimiento de buenas practicas Next.
- Menor riesgo de hydration/render issues.
- Mejor LCP en partes del catalogo/imagenes.

## Fase 6.5 - Aprovechar capacidades propias de Next 16

Objetivo: usar mejoras del framework, no solo limpiar codigo heredado.

### Archivos a cambiar

- `package.json`
  - alinear scripts con el modelo de bundling de Next 16
- `next.config.ts`
  - revisar si la config webpack sigue siendo necesaria
  - si migras a Turbopack, evaluar activar filesystem cache de desarrollo en una fase controlada
- `app/**/page.tsx`
  - donde hoy escribes props manuales, evaluar adopcion progresiva de `PageProps<'/ruta'>`
- `app/**/layout.tsx`
  - idem con `LayoutProps`
- `proxy.ts`
  - agregar tests de matcher y comportamiento con `next/experimental/testing/server`

### Acciones concretas

- adoptar `next typegen` para tipos de rutas y params
- revisar metadata dinamica para evitar fetches duplicados cuando sea posible
- usar mejor Cache Components:
  - cachear datos verdaderamente compartidos
  - envolver en `Suspense` lo que deba quedarse dinamico
- testear `proxy.ts` para no ejecutar auth checks en rutas que no lo necesitan

### Resultado esperado

- mejor DX con tipos nativos de rutas
- menos regresiones en params/searchParams
- mejor aprovechamiento del modelo de prerender parcial de Next 16
- menor trabajo innecesario en `proxy.ts`

## Fase 7 - Tests que faltan despues del refactor

Objetivo: asegurar que la limpieza no rompa flujos criticos.

### Archivos de test a crear o ampliar

- `tests/integration/ecommerce/*.test.ts`
  - Cobertura para `crearCotizacion`, `actualizarEstadoOrden`, `convertirCotizacionAOrdenB2B`.
- `tests/integration/catalogo/*.test.ts`
  - Cobertura para normalizadores y queries tipadas.
- `tests/unit/components/SearchInput.test.tsx`
  - Cobertura del debounce y sync con URL.
- `tests/unit/hooks/use-mobile.test.ts`
- `tests/unit/hooks/useConfigEcommerce.test.ts`
- `app/(admin)/ordenes-b2b/__tests__/...`
- `app/(admin)/catalogo/__tests__/...`

## Orden sugerido de ejecucion

1. Toolchain y dependencias.
2. Errores de React hooks y lint.
3. Tipado Supabase en `ecommerce`, `inventario`, `catalogo`.
4. Dividir archivos gigantes.
5. Seguridad de APIs internas.
6. Performance y limpieza del storefront.
7. Completar cobertura de tests.

## Archivos con mayor prioridad practica

Si hubiera que empezar manana con el mayor retorno por esfuerzo, iria en este orden:

1. `package.json`
2. `playwright.config.ts`
3. `next.config.ts`
4. `proxy.ts`
5. `lib/supabase/middleware.ts`
6. `components/admin/SearchInput.tsx`
7. `hooks/use-mobile.ts`
8. `hooks/useConfigEcommerce.ts`
9. `app/(admin)/despachos/nuevo/DespachoForm.tsx`
10. `app/(admin)/catalogo/CatalogoCreateDialog.tsx`
11. `app/(admin)/catalogo/imagenes/components/ImportarMasivoModal.tsx`
12. `app/(admin)/ordenes-b2b/[id]/components/OrdenCajas.tsx`
13. `app/(admin)/contenedores/[id]/components/ContenedorOrdenes.tsx`
14. `modules/ecommerce/actions.ts`
15. `modules/catalogo/queries.ts`
16. `modules/inventario/queries.ts`
17. `modules/ordenes-b2b/queries.ts`
18. `app/api/test-users/route.ts`
19. `app/api/debug-user/route.ts`
20. `app/api/debug-permissions/route.ts`

## Rendimiento de carga por pagina

### Como hice el ranking

Este ranking es inferido por complejidad de apertura, no por profiling real de tiempos en navegador. Lo ordene usando:

- cantidad de queries server al abrir la ruta
- queries seriales vs paralelas
- N+1 queries
- tablas densas o vistas con mucho render cliente
- trabajo duplicado entre `generateMetadata()` y `page.tsx`
- `Suspense` que hoy no aporta porque el fetch ya termino antes del boundary

## Ranking estimado de mas lenta a menos lenta

### 1. `app/(admin)/inventario/stock/page.tsx`

Probablemente la mas costosa.

Motivos:

- abre catalogos, config de tabla y stock principal
- en modo matriz puede traer mucho mas volumen que una tabla normal
- tambien dispara `fetchNotasPendientesPorBodega()`
- renderiza tablas cliente grandes: `StockTable.tsx` y `StockMatrixTable.tsx`

Optimizaciones:

- separar en secciones async reales:
  - header + filtros rapido
  - panel de notas pendiente en `Suspense`
  - tabla stock normal en `Suspense`
  - tabla matriz en `Suspense`
- no esperar `fetchUserTableConfig('/inventario/stock')` dentro del mismo bloque que el dataset pesado si puede resolverse en paralelo mas arriba
- para matriz, agregar skeleton especifico de tabla con encabezados fijos y filas placeholder
- si el dataset es muy grande, paginar o resumir por grupos antes de hidratar la tabla cliente
- mover `NotasPendientesPanel` a boundary propio para que no bloquee la tabla principal

Archivos:

- `app/(admin)/inventario/stock/page.tsx`
- `app/(admin)/inventario/stock/StockTable.tsx`
- `app/(admin)/inventario/stock/StockMatrixTable.tsx`
- `modules/inventario/queries.ts`

### 2. `app/(admin)/catalogo/[id]/page.tsx`

Muy pesada, aunque ya va por buen camino.

Motivos:

- carga producto base, FK, navegacion, imagenes, catalogos
- cada tab hace su propia query
- algunos tabs todavia repiten datos ya consultados
- `generateMetadata()` vuelve a consultar `fetchProductoPorId()`

Optimizaciones:

- mantener hero rapido, pero evitar fetch duplicado entre metadata y page si se puede cachear con `cache()`
- `fetchCatalogosEdicion()` deberia cachearse fuerte porque es shared y relativamente estable
- diferir tabs no visibles de forma real
- evitar repetir `fetchCajasProducto(productoId)` en tabs distintos
- agregar skeleton distinto por tab, no uno generico para todos

Archivos:

- `app/(admin)/catalogo/[id]/page.tsx`
- `modules/catalogo/queries.ts`

### 3. `app/(admin)/contenedores/[id]/page.tsx`

Hoy carga demasiado antes del primer render.

Motivos:

- hace `fetchContenedorById`, `fetchContenedorResumen`, `fetchOrdenesDeContenedor`, `fetchContenedorPacking`, `fetchCajasDeContenedor`, `fetchCatalogosB2B`, `fetchBodegasVirtuales`
- todo eso ocurre antes de mostrar tabs
- el `Suspense` de `ContenedorCajas` no ayuda mucho porque `cajas` ya fue resuelto arriba

Optimizaciones:

- dejar solo cabecera y resumen como bloque inicial
- mover cada tab a async wrapper real:
  - `ContenedorOrdenesAsync`
  - `ContenedorPackingAsync`
  - `ContenedorCajasAsync`
- cargar catalogos y bodegas solo si el tab o accion los necesita
- `fetchContenedorPacking()` hoy hace dos consultas; idealmente resolverlo con una vista o query que no dependa de buscar primero `codigo_contenedor`

Archivos:

- `app/(admin)/contenedores/[id]/page.tsx`
- `modules/contenedores/queries.ts`

### 4. `app/(admin)/inventario-virtual/page.tsx`

Tiene un N+1 claro.

Motivos:

- primero trae bodegas virtuales
- luego por cada bodega llama `fetchStockVirtual(b.id)`

Optimizaciones:

- crear una query agregada tipo `fetchResumenStockVirtualPorBodega()`
- traer totales por bodega desde una vista SQL o RPC
- dejar cards con skeleton mientras llega el resumen

Archivos:

- `app/(admin)/inventario-virtual/page.tsx`
- `modules/despachos/queries.ts`

### 5. `app/(admin)/inventario/bodegas/page.tsx`

Tambien tiene patron N+1.

Motivos:

- trae bodegas
- luego hace `fetchUsuariosBodega(b.id)` por cada una

Optimizaciones:

- crear una sola query que traiga usuarios agrupados por bodega
- si no se quiere cambiar la query ya, por lo menos poner cada card o grupo de ciudad en `Suspense` real
- si `BodegaUsuarios` es interactivo, pasar ids y cargar su detalle solo al expandir

Archivos:

- `app/(admin)/inventario/bodegas/page.tsx`
- `modules/inventario/queries.ts`

### 6. `app/(store)/shop/[slug]/page.tsx`

Pesada para storefront, sobre todo por trabajo duplicado.

Motivos:

- `generateMetadata()` llama `fetchProductoWebBySlug(slug)`
- `page.tsx` vuelve a llamar `fetchProductoWebBySlug(slug)`
- la query del producto hace lectura extra de imagen principal
- ademas actualiza visitas en la misma apertura
- luego carga variantes, imagenes y medidas

Optimizaciones:

- separar incremento de visitas con `after()` o proceso no bloqueante
- cachear `fetchProductoWebBySlug` para request dedupe
- usar `Promise.all` lo antes posible para metadata/page cuando aplique
- evitar que el `try/catch` abarque JSX
- mantener skeleton de galeria y de selector, pero mover el fetch al componente async si se quiere streaming real

Archivos:

- `app/(store)/shop/[slug]/page.tsx`
- `modules/ecommerce/queries.ts`

### 7. `app/(admin)/ecommerce/productos-web/page.tsx`

Intermedia a alta.

Motivos:

- `fetchProductosWebAdmin({ page: 1 })`
- `fetchProductosNoPublicados()` hace varias lecturas adicionales y filtra en memoria
- hoy estan seriales

Optimizaciones:

- convertir a `Promise.all`
- evitar `fetchProductosNoPublicados()` cargando todo el universo y filtrando en JS
- separar panel de no publicados en `Suspense` independiente

Archivos:

- `app/(admin)/ecommerce/productos-web/page.tsx`
- `modules/ecommerce/queries.ts`

### 8. `app/(admin)/catalogo/page.tsx`

Moderadamente pesada.

Motivos:

- `fetchProductosCatalogo()` hace query principal + query de imagenes principales
- adentro tambien trae catalogos de filtros
- ademas trae config de tabla

Optimizaciones:

- cachear `fetchCatalogosParaFiltros()`
- si el modal de crear necesita catalogos mas grandes, no acoplar su carga a la apertura de la lista
- separar header/filters de tabla en boundaries independientes

Archivos:

- `app/(admin)/catalogo/page.tsx`
- `modules/catalogo/queries.ts`

### 9. `app/(admin)/inventario/notas/[id]/page.tsx`

Media.

Motivos:

- `generateMetadata()` vuelve a consultar la nota
- `page.tsx` consulta `getCurrentUser()` y `fetchNotaById()`
- si es editable, ademas trae `fetchCatalogosInventario()`

Optimizaciones:

- dedupe con `cache()` para la nota
- si entra a modo editable, renderizar shell primero y builder bajo `Suspense`
- historial podria cargar aparte

Archivos:

- `app/(admin)/inventario/notas/[id]/page.tsx`
- `modules/inventario/queries.ts`

### 10. `app/(admin)/inventario/notas/page.tsx`

Media.

Motivos:

- trae notas, catalogos y config en paralelo
- luego computa KPIs en memoria sobre la misma pagina actual

Optimizaciones:

- buena base actual; lo que mas ayudaria es skeleton de tabla y filtros
- si los KPIs deben representar todo el universo, moverlos a consulta agregada y cargarlos por separado

Archivos:

- `app/(admin)/inventario/notas/page.tsx`
- `modules/inventario/queries.ts`

## Paginas relativamente livianas o aceptables

- `app/(admin)/ordenes-b2b/page.tsx`
  - ya separa toolbar y tabla con `Suspense`
- `app/(admin)/contenedores/page.tsx`
  - listado simple, costo moderado
- `app/(admin)/despachos/page.tsx`
  - el `Suspense` actual ayuda poco porque los datos ya vienen resueltos, pero el volumen parece menor
- `app/(admin)/configuracion/usuarios/page.tsx`
  - depende del volumen de usuarios, pero la carga es lineal y razonable
- `app/(admin)/configuracion/tablas/page.tsx`
  - simple
- `app/(store)/shop/page.tsx`
  - relativamente bien, aunque hoy carga `config` y listado antes del primer render

## Patrones concretos a aplicar para abrir paginas mas rapido

### 1. Que el `Suspense` envuelva trabajo async real

Hoy en varias rutas pasa esto:

- la pagina hace `await` arriba
- luego renderiza `<Suspense>`
- pero el fallback ya no gana casi nada

Regla:

- el fetch pesado debe vivir adentro del componente async envuelto por `Suspense`

Rutas donde conviene corregir eso:

- `app/(admin)/contenedores/[id]/page.tsx`
- `app/(admin)/despachos/page.tsx`
- `app/(admin)/catalogo/imagenes/page.tsx`
- `app/(store)/shop/page.tsx`

### 2. Skeletons especificos por tabla o vista

No solo "Cargando...". Para tablas pesadas:

- header de columnas visible
- 8 a 12 filas placeholder
- paginacion skeleton
- toolbar/filtros visibles desde el inicio

Aplicar primero en:

- `inventario/stock`
- `catalogo`
- `catalogo/imagenes`
- `ordenes-b2b`
- `inventario/notas`

### 3. Separar shell rapido de datos lentos

Mostrar primero:

- titulo
- breadcrumbs
- acciones principales
- filtros

Y despues:

- tablas
- tabs secundarios
- paneles KPI
- historiales

### 4. Cachear catalogos y lookups estables

Ya hay buen comienzo en:

- `fetchConfigEcommerce()`
- `fetchCatalogosInventario()`

Falta aplicar algo parecido a:

- `fetchCatalogosParaFiltros()`
- `fetchCatalogosEdicion()`
- `fetchCatalogosB2B()`
- lookups de marcas, generos, tallas, colores, tipos

### 5. Evitar N+1 con vistas agregadas o RPC

Prioridad:

- resumen de stock virtual por bodega
- usuarios por bodega
- packing de contenedor sin consulta previa adicional
- imagen principal por producto sin segunda pasada cuando sea posible

### 6. No mezclar writes bloqueantes en page load

Caso claro:

- `modules/ecommerce/queries.ts` en `fetchProductoWebBySlug()` actualiza visitas durante la apertura

Eso deberia pasar a:

- `after()`
- background fire-and-forget controlado
- endpoint aparte

## Cambios concretos para completar el plan

### Fase nueva - Rendimiento percibido y streaming

Objetivo: reducir TTFB percibido y hacer que cada pagina "abra" antes, incluso si algunos datos siguen cargando.

### Archivos prioritarios

- `app/(admin)/inventario/stock/page.tsx`
- `app/(admin)/catalogo/[id]/page.tsx`
- `app/(admin)/contenedores/[id]/page.tsx`
- `app/(admin)/inventario-virtual/page.tsx`
- `app/(admin)/inventario/bodegas/page.tsx`
- `app/(store)/shop/[slug]/page.tsx`
- `app/(admin)/ecommerce/productos-web/page.tsx`
- `app/(admin)/catalogo/page.tsx`
- `app/(admin)/inventario/notas/[id]/page.tsx`
- `app/(admin)/catalogo/imagenes/page.tsx`

### Acciones por tipo

- crear async wrappers por seccion para que `Suspense` si sirva
- agregar skeletons reales por tabla/vista
- cachear catalogos compartidos
- eliminar N+1 mas notorios
- deduplicar fetch entre `generateMetadata()` y `page.tsx`
- mover side effects de lectura a procesos no bloqueantes

### Resultado esperado

- rutas admin grandes abren con shell visible en lugar de pantalla congelada
- tablas pesadas se sienten progresivas
- detalle de producto y contenedor dejan de esperar todo antes de pintar
- menor costo al navegar entre filtros, tabs y paginas

## Nota final

No conviene atacar todo a la vez en una sola PR. El repo ya tiene cambios locales sin integrar, asi que la mejor estrategia es avanzar por frentes pequenos:

- PR 1: dependencias + config de tooling
- PR 2: hooks y componentes con errores React
- PR 3: tipado de `ecommerce`
- PR 4: tipado de `inventario`
- PR 5: tipado/refactor de `catalogo`
- PR 6: seguridad y limpieza de APIs internas
- PR 7: rendimiento percibido, streaming y skeletons de rutas pesadas
- PR 8: cierre de migracion Next 16 y decision definitiva Turbopack vs Webpack
