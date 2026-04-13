---
trigger: always_on
---

FASE 2 — Shell Admin Persistente [2 días]
Qué se hizo
Construir el cascarón completo del panel que se renderiza UNA vez y NUNCA se recarga al navegar entre secciones.

Entregables
text

LAYOUT PERSISTENTE:
  ✅ app/(admin)/layout.tsx:
     Server Component que se renderiza 1 vez
     getCurrentUser() + fetchBodegasUsuario()
     Renderiza: Sidebar + Header + {children}
     Al navegar: SOLO {children} cambia

SIDEBAR:
  ✅ components/admin/Sidebar.tsx          → desktop, fijo 256px
  ✅ components/admin/SidebarContent.tsx   → contenido compartido
  ✅ components/admin/MobileSidebar.tsx    → Sheet drawer para mobile

  Menú con visibilidad condicional:
  ┌────────────────────────────────────────────────────────┐
  │ Dashboard          → siempre visible                   │
  │ Catálogo           → siempre visible                   │
  │  ├ Productos                                           │
  │  └ Catálogos Soporte                                   │
  │ Inventario         → nivel ≤ 2 o puede_ver_inventario  │
  │  ├ Notas                                               │
  │  ├ Stock                                               │
  │  └ Bodegas                                             │
  │ Órdenes B2B        → nivel ≤ 2 o puede_gestionar_b2b   │
  │ Contenedores       → nivel ≤ 2 o puede_gestionar_cont. │
  │ Ecommerce          → nivel ≤ 2 o puede_gestionar_ecom. │
  │  ├ Catálogo Web                                        │
  │  └ Órdenes Venta                                       │
  │ Configuración      → nivel ≤ 1 o es_super_admin        │
  │  ├ Usuarios                                            │
  │  └ Roles                                               │
  └────────────────────────────────────────────────────────┘

  Características:
  - Grupos colapsables con ChevronDown
  - Auto-abierto si la ruta actual está dentro del grupo
  - Ruta activa resaltada (bg-primary)
  - Sub-items con borde izquierdo (border-l)
  - Footer con avatar + nombre + rol
  - Mobile: drawer se cierra al hacer click en link

HEADER:
  ✅ components/admin/Header.tsx:
     Sticky top con backdrop blur
     Botón hamburguesa (solo mobile, lg:hidden)
     BodegaSelector
     Nombre + rol del usuario
     Separator vertical
     LogoutButton

BODEGA SELECTOR:
  ✅ components/admin/BodegaSelector.tsx:
     0 bodegas → "Sin bodegas asignadas"
     1 bodega → texto fijo (sin dropdown)
     2+ bodegas → Select dropdown
     Badge "Virtual" si bodega.es_virtual
     Persiste selección en cookie

  ✅ hooks/useBodegaActiva.ts:
     Lee cookie al montar
     Valida que bodega guardada siga accesible
     Si no es válida → selecciona la primera
     Cookie con 1 año de expiración
     getBodegaActivaFromCookies() para Server Components

  ✅ modules/auth/queries.ts (agregado):
     fetchBodegasUsuario(usuarioId, nivelAcceso):
       Nivel 1-2 → todas las bodegas activas
       Nivel 3+  → solo usuario_bodegas con puede_consultar=true

DATA TABLE GENÉRICA:
  ✅ components/admin/DataTable.tsx:
     Tipada con genéricos <T>
     Props: columns, data, rowKey, emptyMessage, emptyIcon,
            onRowClick, rowClassName, isLoading
     Empty state con ícono + mensaje
     Loading state con opacity
     Se reutiliza en TODOS los listados

PLACEHOLDERS ACTUALIZADOS:
  ✅ 12 page.tsx con título + descripción + indicador de fase
  ✅ Metadata con título para cada ruta
  ✅ loading.tsx con skeleton apropiado en cada ruta
Optimizaciones logradas
text

✅ Shell se renderiza 1 vez → sidebar y header NUNCA parpadean
✅ <Link> para toda navegación → client-side SPA
✅ Prefetch automático → páginas del sidebar pre-cargadas
✅ loading.tsx → skeleton aparece dentro del shell (no pantalla blanca)
✅ Cookie de bodega → persiste entre recargas y pestañas
✅ Permisos evaluados 1 vez → menú condicional sin re-cálculo
✅ Mobile responsive → drawer con auto-close al navegar
FASE 3 — Módulo Catálogo de Productos 
Qué se hizo
Listado operativo con filtros que NUNCA se recargan + detalle inspector con streaming progresivo por tabs.
Entregables
text

TIPOS (modules/catalogo/types.ts):
  ✅ FiltrosCatalogo (7 filtros tipados)
  ✅ ProductoListItem, CatalogosParaFiltros, ResultadoListado
  ✅ FKDescriptivas (7 FKs resueltas)
  ✅ CajaConDetalle + CajaContenidoMap (matriz talla×color)
  ✅ TagResuelto, ComplementoResuelto, AcabadoResuelto
  ✅ VarianteResuelta, MedidaResuelta, ConjuntoResuelto

QUERIES (modules/catalogo/queries.ts — 15 funciones):
  ✅ fetchProductosCatalogo    → listado con 7 filtros + paginación
  ✅ fetchCatalogosParaFiltros → marcas + generos + telas en paralelo
  ✅ fetchProductoPorId        → búsqueda por ID numérico
  ✅ fetchFKDescriptivas       → 7 FKs en Promise.all
  ✅ fetchProductoWeb          → datos ecommerce/SEO
  ✅ fetchImagenesProducto     → galería ordenada por principal/orden
  ✅ fetchCajasProducto        → cajas + caja_detalles + matriz
  ✅ fetchTagsProducto         → tags con tipo_tag + ref_tag resueltos
  ✅ fetchComplementosProducto → 4 FKs resueltas
  ✅ fetchAcabadosProducto     → 4 FKs resueltas
  ✅ fetchVariantesProducto    → talla + color + hex resueltos
  ✅ fetchMedidasProducto      → pivotable por talla y punto medida
  ✅ fetchConjuntoProducto     → hijos con imagen principal
  ✅ fetchNavegacionProducto   → RPC fn_navegar_producto
  ✅ fetchProductoPorIdParaEdicion → para modal de edición

ACTIONS (modules/catalogo/actions.ts):
  ✅ createProductAction  → INSERT con TODOS los campos del esquema
  ✅ updateProductAction  → UPDATE con TODOS los campos (no un subset)
  ✅ deactivateProductAction → soft delete (activo = false)
  ✅ Helpers: toCleanText, toInteger, toNumeric, toBoolean
  ✅ Manejo de SKU duplicado (error 23505)
  ✅ revalidatePath después de cada mutación
Listado /catalogo
text

ARQUITECTURA DE 2 ZONAS:

┌─────────────────────────────────────────────────────────────┐
│ ZONA A — FILTROS (Client Component, FIJO, nunca se desmonta)│
│                                                             │
│ 🔍 [Buscar por SKU o descripción...]      ← debounce 300ms │
│                                                             │
│ [Estado ▾]  [Marca ▾]  [Género ▾]                          │
│                                                             │
│ ☐ Solo destacados    ☐ Incluir no activos                  │
│                                            [Limpiar]        │
├─────────────────────────────────────────────────────────────┤
│ ZONA B — TABLA (Server Component, solo esto se re-renderiza)│
│                                                             │
│ SKU | Descripción | Familia | Marca | Pz/Caja | Precio |   │
│     |             |         |       |         | EC     |   │
│ Estado | ★☐ | Acciones                                      │
│                                                             │
│ Mostrando 1-20 de 345              [← 1 2 3 ... 18 →]     │
└─────────────────────────────────────────────────────────────┘

FILTROS:
  q                → busca en sku_base + descripcion (ILIKE)
  estado           → borrador|pendiente|publicado|pausado|descontinuado
  marca_id         → select de cat_marcas activas
  genero_id        → select de cat_generos activos
  destacados       → checkbox: OFF=sin filtro, ON=solo destacado=true
  incluir_inactivos → checkbox: OFF=solo activo=true, ON=sin filtro
  Ambas casillas OFF por default

COLUMNAS:
  SKU (clickeable → /catalogo/[id]) | Descripción (truncada 40ch) |
  Familia | Marca (lookup) | Pz/Caja | Precio EC ($) |
  Estado (badge color) | Flags (★ destacado, ☐ conjunto, Inactivo) |
  Acciones (dropdown: Ver, Editar, Desactivar)
Detalle /catalogo/[id]
text

STREAMING PROGRESIVO:

  0ms     → loading.tsx: skeleton completo aparece instantáneamente
  ~50ms   → Hero se resuelve: imagen + SKU + estado + precio + atributos
  ~200ms  → FK descriptivas + navegación prev/next
  ~300ms  → Tabs empiezan a resolverse independientemente
  ~500ms  → Todos los tabs listos

ESTRUCTURA:
  ┌─────────────────────────────────────────────────────────┐
  │ ← Catálogo / SKU-ORIGINAL     [← PREV] 15/230 [NEXT →]│
  ├─────────────────────────────────────────────────────────┤
  │ HERO: imagen + SKU + estado + precio + 9 atributos     │
  │       + composición                                     │
  ├─────────────────────────────────────────────────────────┤
  │ ▸ E-commerce / SEO (desplegable)                       │
  ├─────────────────────────────────────────────────────────┤
  │ TABS: cada uno en su propio <Suspense>                  │
  │                                                         │
  │ [Catálogos] [Imágenes] [Cajas] [Tags] [Complementos]   │
  │ [Acabados] [Variantes] [Medidas] [Conjunto*]           │
  │                                                         │
  │ * Conjunto solo visible si es_conjunto = true           │
  ├─────────────────────────────────────────────────────────┤
  │ Creado: 10/01/2026  Actualizado: hace 2 días           │
  └─────────────────────────────────────────────────────────┘

NAVEGACIÓN PREV/NEXT:
  fn_navegar_producto ordena por sku_base alfabéticamente
  Los links usan ID para la URL (seguro con K24/1DA24, espacios, etc.)
  El texto muestra sku_base (legible para el usuario)

10 TABS:
  Catálogos     → 7 FKs: marca, genero, edad, tipo_prenda, telas, persona
  Imágenes      → Grid con tipo uso, badge principal, orden
  Cajas         → Tarjetas con KPIs + matriz talla×color (o fallback texto)
  Tags          → Tabla: tipo_tag + código + referencia + valor
  Complementos  → 5 columnas: parte, tipo, material, corte, descripción
  Acabados      → 4 columnas: tipo, detalle, patrón, localización
  Variantes     → SKU, talla, color (●hex), costo, precio, estado
  Medidas       → Matriz pivoteada puntos×tallas con toggle CM/Pulgadas
  Conjunto      → Lista de productos hijos con imagen, cantidad, orden
  E-commerce    → Desplegable: slug, precios, flags, SEO, visitas
DECISIONES DE ARQUITECTURA TOMADAS
URLs
text

┌──────────────────────┬────────────────────────────────────────┐
│ CONTEXTO             │ ESTRATEGIA                             │
├──────────────────────┼────────────────────────────────────────┤
│ Admin listado        │ SKU visible en tabla como texto        │
│                      │ Link usa ID: /catalogo/747             │
├──────────────────────┼────────────────────────────────────────┤
│ Admin detalle        │ URL: /catalogo/[id]                    │
│                      │ Query: WHERE id = params.id            │
│                      │ Hero muestra: sku_base original        │
├──────────────────────┼────────────────────────────────────────┤
│ Ecommerce (futuro)   │ URL: /tienda/[slug]                   │
│                      │ Query: WHERE slug = params.slug        │
│                      │ Slug auto-generado por trigger en BD   │
└──────────────────────┴────────────────────────────────────────┘
Slugs en productos_web
text

BD (ya creado):
  ✅ fn_generar_slug()           → limpia texto a formato URL
  ✅ fn_generar_slug_unico()     → anti-duplicados con sufijo -2, -3
  ✅ trg_auto_slug_productos_web → genera slug automático al INSERT
  ✅ Migración masiva ejecutada  → todos los slugs limpios
  ✅ productos_web generados para productos que no tenían
Optimización
text

PERSISTENCIA:
  ✅ Shell (sidebar+header) se renderiza 1 vez
  ✅ Filtros son Client Components que NO se desmontan
  ✅ Solo la tabla se re-renderiza al cambiar filtros
  ✅ Buscador tiene debounce + no pierde foco

STREAMING:
  ✅ Detalle carga progresivamente con <Suspense> por tab
  ✅ Hero aparece primero (~50ms)
  ✅ Tabs cargan independientemente
  ✅ NUNCA hay pantalla en blanco

CACHE:
  ✅ Catálogos (marcas, generos, telas) se cachean
  ✅ revalidatePath() después de mutaciones
  ✅ Prefetch automático en links del sidebar
