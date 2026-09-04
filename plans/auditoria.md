# Plan de auditoría integral del panel administrativo

<!-- C:\Users\uriel\Downloads\enero 26\archivo2\plans\auditoria.md -->

Fecha de creación: 2026-09-03  
Alcance: `app/(admin)`, `components/admin`, `modules`, `lib` y pruebas relacionadas.

## Objetivo

Revisar sección por sección la lógica de funcionamiento, composición de componentes, tablas, filtros, paginación, modales, notificaciones, botones, acciones y consultas para detectar:

- código espagueti y responsabilidades mezcladas;
- componentes o funciones sobrecargados;
- lógica duplicada;
- paginación incorrecta o inexistente;
- consultas que cargan más información de la necesaria;
- waterfalls, renders innecesarios y estado derivado mal gestionado;
- falta de reutilización en tablas, formularios, diálogos, acciones y feedback visual;
- pérdida de tipado por `any` y conversiones inseguras;
- riesgos de consistencia en acciones de varios pasos;
- oportunidades de mejora con cambios pequeños y controlados.

La auditoría no debe modificar la base de datos ni alterar reglas de inventario. Toda recomendación de base de datos debe limitarse a consultas, RPC existentes, vistas o una propuesta documentada para una fase posterior.

## Principios de la auditoría

1. Mantener Server Components por defecto.
2. Mantener el shell admin únicamente en `app/(admin)/layout.tsx`.
3. Mantener `searchParams` como fuente de verdad para filtros y paginación.
4. Mantener las mutaciones en `modules/*/actions.ts` o Server Actions.
5. Nunca modificar `inventario_stock` directamente para movimientos; usar `notas_inventario` y sus RPC/triggers.
6. No hacer una refactorización masiva. Cada fase debe producir cambios pequeños, verificables y reversibles.
7. Primero medir; después optimizar.
8. Extraer lógica reutilizable sin crear una capa abstracta innecesaria.
9. Usar tipos de `Database` y DTOs explícitos en los bordes de Supabase.
10. Cada fase debe conservar el comportamiento funcional existente.

## Entregables de cada fase

Cada fase debe generar:

- inventario de rutas, componentes, funciones, queries y acciones;
- mapa de responsabilidades actuales;
- hallazgos clasificados como crítico, alto, medio o bajo;
- propuesta de componentes reutilizables;
- propuesta de separación entre UI, estado, dominio y acceso a datos;
- mediciones antes/después;
- pruebas ejecutadas y resultados;
- lista de cambios mínimos recomendados;
- riesgos y elementos que no deben tocarse.

## Fase 0 — Línea base transversal

### Objetivo

Crear una medición confiable antes de tocar cada módulo.

### Revisar

- `app/(admin)/layout.tsx` y `components/admin/AdminLayoutClient.tsx`.
- autenticación, permisos, roles y bodegas activas.
- `lib/dal.ts`, `lib/auth/*`, `lib/supabase/*`.
- componentes compartidos de `components/ui` y `components/admin`.
- `Pagination`, filtros, `SearchInput`, `Fecha`, botones, badges, dialogs, sheets y toasts.
- convenciones de `loading.tsx`, `error.tsx`, `not-found.tsx` y `Suspense`.
- estado del lint, TypeScript, build, Vitest y Playwright.

### Auditoría de reutilización

Construir una matriz de componentes con estas columnas:

| Componente | Usos | Props | Estado interno | Dependencias | Duplicados similares | Recomendación |
|---|---:|---|---|---|---|---|

Especial atención a tablas, encabezados de página, barras de acciones, filtros, confirmaciones, formularios, feedback y paginación.

### Auditoría de tiempos

Medir por ruta:

- tiempo hasta `domcontentloaded`;
- tiempo hasta contenido principal visible;
- tiempo de respuesta de queries principales;
- número de requests iniciales;
- tamaño de payload RSC/JSON;
- tiempo de interacción de búsqueda, filtros y paginación;
- errores de consola y errores de red.

Usar al menos tres ejecuciones por ruta, separando primera carga y navegación interna.

## Fase 1 — Catálogo

### Rutas

- `/catalogo`.
- `/catalogo/[id]`.
- `/catalogo/familias`.
- `/catalogo/catalogos`.
- `/catalogo/imagenes`.

### Archivos prioritarios

- `app/(admin)/catalogo/CatalogoTable.tsx`.
- `app/(admin)/catalogo/CatalogoFilters.tsx`.
- `app/(admin)/catalogo/familias/FamiliasOrganizerClient.tsx`.
- `app/(admin)/catalogo/[id]/components/*`.
- `app/(admin)/catalogo/imagenes/components/ImportarMasivoModal.tsx`.
- `modules/catalogo/queries.ts`.
- `modules/catalogo/actions.ts` y `modules/catalogo/imagenes/*`.

### Revisar

- si tabla y grid comparten columnas, acciones, filtros y estados;
- si el detalle carga todas las pestañas aunque estén ocultas;
- si imágenes usan `next/image`, `sizes` y carga diferida;
- si la búsqueda, ordenamiento y paginación se ejecutan en servidor;
- si las familias hacen actualizaciones individuales evitables;
- si los diálogos de creación/edición reutilizan formularios;
- si las acciones de fila están duplicadas entre grid y tabla;
- si las queries devuelven DTOs tipados o datos sin filtrar;
- si existen consultas N+1 al cargar imágenes, variantes o cajas.

### Resultado esperado

Unificar patrones de tabla, filtros, acciones por fila, confirmación, notificación y paginación sin cambiar el comportamiento del catálogo.

## Fase 2 — Inventario y movimientos

### Rutas

- `/inventario/stock`.
- `/inventario/notas`.
- `/inventario/notas/nueva`.
- `/inventario/notas/[id]`.
- `/inventario/notas/propuestas`.
- `/inventario/bodegas`.
- `/inventario/bodegas/matriz`.
- `/inventario/config`.
- `/inventario/trazabilidad`.
- `/inventario-virtual`.
- `/despachos`.

### Archivos prioritarios

- `app/(admin)/inventario/notas/nueva/NoteDraftBuilder.tsx`.
- `app/(admin)/inventario/stock/StockTable.tsx`.
- `app/(admin)/inventario/stock/StockMatrixTable.tsx`.
- `app/(admin)/inventario/notas/NotasTable.tsx`.
- `app/(admin)/inventario/notas/NotasFilters.tsx`.
- `components/admin/cajas/CajaCard.tsx`.
- `components/admin/OcrLineasSyncModal.tsx`.
- `modules/inventario/queries.ts`.
- `modules/inventario/actions.ts`.
- `modules/inventario/trazabilidad.ts`.

### Revisar

- que todo movimiento pase por `notas_inventario`;
- separación entre borrador, validación, confirmación y persistencia;
- si `NoteDraftBuilder` debe pasar a `useReducer` y subcomponentes;
- estado derivado sincronizado mediante `useEffect`;
- cálculo de stock repetido entre tablas, modales y acciones;
- paginación real de stock, notas y matrices;
- virtualización o memoización de filas/celdas de la matriz;
- consultas completas de `inventario_stock` y agregaciones en JavaScript;
- consistencia de errores, loading, disabled states y toasts;
- acciones multi-step y posibilidad de estados parciales;
- permisos validados tanto en UI como en Server Actions.

### Resultado esperado

Separar el editor de nota en componentes de cabecera, productos, OCR, comprobante, validación y acciones, manteniendo una única fuente de estado.

## Fase 3 — Contenedores y cadena B2B

### Rutas

- `/contenedores`.
- `/contenedores/[id]`.
- `/ordenes-b2b`.
- `/ordenes-b2b/[id]`.
- `/ordenes-b2b/cajas`.
- `/ordenes-b2b/orden-rapida`.

### Archivos prioritarios

- `app/(admin)/ordenes-b2b/orden-rapida/OrdenRapidaWizard.tsx`.
- `app/(admin)/ordenes-b2b/cajas/components/ImportCajasModal.tsx`.
- `app/(admin)/ordenes-b2b/[id]/components/*`.
- `app/(admin)/contenedores/[id]/components/*`.
- `modules/ordenes-b2b/queries.ts`.
- `modules/ordenes-b2b/actions.ts`.
- `modules/ordenes-b2b/import/actions.ts`.
- `modules/contenedores/queries.ts`.
- `modules/contenedores/actions.ts`.

### Revisar

- separar parser, normalizador, validador, mapper y UI del wizard;
- separar productos, cajas, detalles y resumen en estados claramente delimitados;
- evitar `any` en payloads de importación;
- validar si los cruces de órdenes, cajas, imágenes y detalles generan N+1;
- revisar `select('*')` y consultas de vistas completas;
- revisar si las listas tienen paginación por servidor y límites explícitos;
- reutilizar tabla, filtros, badges de estado y diálogos entre órdenes y contenedores;
- detectar operaciones secuenciales que puedan ejecutarse en paralelo;
- revisar consistencia si una importación falla después de insertar parcialmente;
- garantizar autorización dentro de cada acción, no solo en la página.

### Resultado esperado

Obtener un flujo B2B con pasos pequeños, funciones puras testeables y acciones de persistencia separadas de la transformación de datos.

## Fase 4 — Ecommerce administrativo

### Rutas

- `/ecommerce/config`.
- `/ecommerce/productos-web`.
- `/ecommerce/ordenes-venta`.

### Archivos prioritarios

- `components/admin/ecommerce/ConfigForm.tsx`.
- `components/admin/ecommerce/ProductosWebTable.tsx`.
- `components/admin/ecommerce/CategoryBannersManager.tsx`.
- `components/admin/ecommerce/CatalogoPdfModal.tsx`.
- `modules/ecommerce/queries.ts`.
- `modules/ecommerce/actions.ts`.
- `modules/ecommerce/banners.ts`.

### Revisar

- paginación, filtros y ordenamiento de productos web;
- si las órdenes cargan relaciones o columnas innecesarias;
- formularios de configuración y manejo de valores por defecto;
- separación entre configuración, banners, catálogo y órdenes;
- carga diferida de PDF, Excel, imágenes y librerías pesadas;
- tablas reutilizables con acciones consistentes;
- estados de guardado, error y éxito;
- actualización de caché y revalidación después de mutaciones;
- renderizado de imágenes y tamaños responsivos.

## Fase 5 — Sistema compartido de UI y comportamiento

### Componentes a normalizar

- `DataTable` y filas expandibles;
- paginación y selector de tamaño de página;
- filtros y búsqueda con debounce;
- `Button`, botones de acción y botones destructivos;
- `Dialog`, `AlertDialog` y `Sheet`;
- notificaciones Sonner y mensajes inline;
- estados loading, empty, error y skeleton;
- badges de estado;
- `Fecha` y formato de fechas;
- confirmaciones de eliminación, desactivación y cambios irreversibles.

### Criterios

- API de props pequeña y coherente;
- accesibilidad de teclado y lector de pantalla;
- `aria-label` en acciones icon-only;
- foco inicial y retorno de foco en modales;
- botones deshabilitados durante mutaciones;
- una sola política de mensajes de error;
- no duplicar `router.refresh`, `revalidatePath` y navegación;
- no enviar objetos grandes a Client Components;
- mantener acciones de negocio fuera de componentes visuales.

## Fase 6 — Queries, acciones y tipado

### Revisar

- todas las llamadas Supabase con tipos de retorno explícitos;
- eliminación progresiva de `as any`, `query: any` y `data: any[]`;
- sustitución de `select('*')` por columnas explícitas;
- `Promise.all` para consultas independientes;
- límites, paginación y `count: 'exact', head: true` cuando corresponda;
- agregaciones en PostgreSQL/RPC en lugar de cargar tablas completas;
- errores tratados como `unknown`;
- autorización en cada Server Action;
- DTOs estables entre módulos y componentes.

## Fase 7 — Validación y medición final

### Validación funcional

- crear, editar, confirmar y cancelar notas;
- cambiar bodega activa;
- buscar, ordenar y paginar cada tabla;
- crear y editar productos;
- importar cajas y órdenes;
- editar configuración ecommerce;
- subir, cambiar y eliminar imágenes;
- verificar roles y permisos restrictivos;
- validar estados de error y reintento.

### Validación técnica

- `pnpm lint` sin errores;
- `pnpm typecheck` sin errores;
- `pnpm test:integration` aprobado;
- pruebas E2E críticas aprobadas;
- build de producción exitoso;
- sin errores de consola en rutas críticas;
- sin requests duplicados inesperados;
- sin consultas sin límite en listados.

## Método para medir tiempos

Registrar al menos tres mediciones antes y después por ruta:

| Métrica | Actual | Propuesta | Mejora esperada |
|---|---:|---:|---:|
| Primera carga de ruta | ms | ms | % |
| Navegación interna | ms | ms | % |
| Contenido principal visible | ms | ms | % |
| Búsqueda con debounce | ms | ms | % |
| Cambio de filtro | ms | ms | % |
| Cambio de página | ms | ms | % |
| Mutación y feedback | ms | ms | % |
| Requests iniciales | cantidad | cantidad | % |
| Payload inicial | KB | KB | % |
| Render de tabla | ms | ms | % |
| Memoria aproximada | MB | MB | % |

La columna “Propuesta” debe llenarse únicamente después de implementar y volver a medir. No usar estimaciones como si fueran resultados reales.

## Tabla comparativa final por sección

| Sección | Estado actual | Problemas principales | Componentes reutilizables propuestos | Paginación actual | Paginación propuesta | Tiempo actual | Tiempo propuesto | Prioridad |
|---|---|---|---|---|---|---:|---:|---|
| Base admin | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Alta |
| Catálogo | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Alta |
| Inventario | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Crítica |
| Contenedores | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Alta |
| Órdenes B2B | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Alta |
| Ecommerce | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Media |
| UI compartida | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Alta |

## Orden de ejecución recomendado

1. Fase 0: baseline y componentes compartidos.
2. Fase 2: inventario, por impacto operativo y riesgo de negocio.
3. Fase 1: catálogo.
4. Fase 3: contenedores y órdenes B2B.
5. Fase 4: ecommerce.
6. Fase 6: tipado transversal y queries.
7. Fase 7: medición final y reporte comparativo.

## Regla de cierre de cada fase

Una fase se considera terminada únicamente cuando:

- el comportamiento previo se conserva;
- los componentes extraídos tienen responsabilidades claras;
- las tablas tienen paginación verificable;
- las acciones tienen estados de loading/error/éxito;
- las queries tienen límites y columnas justificadas;
- las pruebas relevantes pasan;
- se documentan tiempos antes/después;
- no se introducen cambios en la estructura de la base de datos.
