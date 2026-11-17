<!-- plans/fase3-ecommerce.md -->
# Plan de Ejecución — Fase 3: Seguridad en Checkout y Bugs Funcionales/SEO en Ecommerce Público

> **Rama objetivo:** `fix/auditoria-inicial`  
> **Referencia maestra:** `plans/revision final.md` (Fase 3)  
> **Nota de estado:** La protección de `fetchOrdenesVenta`, `fetchOrdenVentaById` y el escape básico de `buscarOrdenInvitado` en `modules/ecommerce/queries.ts` ya quedaron aplicados durante la Sub-fase 2D. Este plan cubre todo lo pendiente de Fase 3.

---

## Sub-fase 3A — Seguridad en Checkout y Lecturas Públicas (CRÍTICA)

### 3A.1. `crearCotizacion` en `modules/ecommerce/actions.ts` (L1208-1319)
- **Problema actual:**
  1. Recibe `config: { tipo_orden_generada, requiere_aprobacion }` desde el cliente y confía en `config.requiere_aprobacion` para decidir si la orden nace `'pendiente'` o `'aprobada'`.
  2. Calcula `subtotal`, `precio_unitario` y `total` usando `item.precioUnitario || item.precioOfrecido || 0` enviados desde el cliente (manipulable vía DevTools/RPC).
  3. No valida cantidades enteras positivas ni datos de contacto con Zod.
- **Acción:**
  1. Eliminar el parámetro `config` de la firma de `crearCotizacion(items, datosContacto)` (y actualizar sus call-sites en `components/store/cotizacion/QuoteContactForm.tsx`).
  2. Leer `fetchConfigEcommerce()` en el servidor para obtener `requiere_aprobacion` (y verificar si aplica modo precios o catálogo).
  3. Validar con **Zod** (`items` no vacío, máx. 100 partidas, `cantidad` entero `>= 1`, `varianteId` entero `> 0`; `datosContacto`: `nombre`, `email` válido, `telefono`, `notas` acotadas).
  4. Resolver cada ítem contra `variantes_producto` y `productos_web` (`publicado = true`, `activo = true` vía `productos`) en el servidor, leyendo `precio_publico`, `precio_oferta` y `en_oferta` vigentes directamente de BD.
  5. Calcular `precio_unitario`, `subtotal` por partida y `total` de la orden exclusivamente en el servidor.
  6. Si algún producto no existe o no está publicado, abortar antes de insertar `ordenes_venta` (o hacer rollback compensatorio).

### 3A.2. Sanitización PostgREST y filtro `filtros.q` en `modules/ecommerce/queries.ts`
- **Sanitización (`L518-527` y helpers):**
  - Crear helper puro `sanitizePostgrestFilterTerm(raw: string)` que elimine/escape caracteres reservados de PostgREST (`,`, `(`, `)`, `*`) y escape `%` / `_` antes de interpolar en `.or(...)` / `.ilike(...)`.
- **Corrección de `filtros.q` en `executeFetchProductosWebPublicos` (`L523-527`):**
  - Actualmente encadena dos `.or()` distintos (`slug/titulo_seo` y `foreignTable: 'productos'`), lo que genera un `AND` excluyente y devuelve 0 resultados cuando la búsqueda coincide con el nombre/SKU del producto pero no con el slug/título SEO (o viceversa).
  - Unificar la búsqueda por texto para que coincida si aparece en `productos_web` (`slug`, `titulo_seo`) **O** en `productos` (`nombre`, `sku_base`), resolviendo IDs coincidentes o combinando en una consulta sin `AND` excluyente.
- **`incrementProductoWebVisitas` (`L795-809`):**
  - Dejar de depender de `visitasActuales` cacheadas; leer el valor actual en BD antes de incrementar (o usar incremento seguro sin sobrescribir con un valor stale del cache de Next).

---

## Sub-fase 3B — Bugs Funcionales en `/`, `/shop`, `/shop/[slug]` y Carrito

1. **Conectar `VariantSelector.tsx` con `AddToQuoteButton.tsx` en PDP (`app/(store)/shop/[slug]/page.tsx`)**
   - Hoy son componentes independientes y `AddToQuoteButton` no recibe la variante/talla/color seleccionados.
   - Crear un wrapper cliente mínimo (o estado compartido en el cliente PDP) que conecte la selección de `VariantSelector` (`varianteId`, `talla`, `color`, stock/imagen asociada) con `AddToQuoteButton`.

2. **Respetar `mostrarPrecio(prod, config)` y `getPrecioAMostrar(prod, config)` en toda la tienda**
   - `components/store/producto/AddToQuoteButton.tsx`: aplicar `getPrecioAMostrar(producto, config)` (para usar `precio_oferta` cuando `en_oferta = true`) y respetar `mostrarPrecio(producto, config)`.
   - `components/store/favoritos/FavoritosList.tsx`: respetar `mostrarPrecio` y `getPrecioAMostrar`.
   - `app/(store)/page.tsx` (`DestacadosSection`): respetar `mostrarPrecio` y `getPrecioAMostrar`.

3. **Incluir `pz_en_caja` en `ProductoWebPublico` (`modules/ecommerce/queries.ts` y `modules/ecommerce/types.ts`)**
   - Seleccionar `pz_en_caja` desde `productos` y propagarlo en `ProductoWebPublico` para que el carrito calcule correctamente las piezas totales por caja.

4. **Feedback de error y resiliencia en Storefront**
   - `components/store/cotizacion/QuoteContactForm.tsx`: mostrar `toast.error(...)` con mensaje claro cuando falle `crearCotizacion`.
   - `components/store/home/FavoritosYRecientesStrip.tsx`: agregar `.catch()` en la carga asíncrona y renderizar skeleton de carga sin quedar colgado ante errores de red.

---

## Sub-fase 3C — Imágenes Inteligentes y SEO en Ecommerce Público

1. **Optimización de imágenes (`getSmartImagenUrl` / `ProgressiveProductImage`)**
   - Revisar y aplicar `getSmartImagenUrl` / `ProgressiveProductImage` en las tarjetas/vistas del Home (`app/(store)/page.tsx`, `CategoryPromoHero.tsx`), `CartDrawer.tsx`, `QuoteCart.tsx` y `OrdenDetalleView.tsx` (sin sintéticas `_seo.jpg`, respetando Regla 3.1.5).

2. **Precios en Meta Tags y JSON-LD (`app/(store)/shop/page.tsx` y `app/(store)/shop/[slug]/page.tsx`)**
   - Respetar `mostrarPrecio(prod, config)` y `getPrecioAMostrar(prod, config)` en el JSON-LD (`offers`) y metadatos de producto/catálogo (no exponer precios cuando `mostrar_precios` o el producto está en modo catálogo).

3. **`app/robots.txt/route.ts` y Canonical en `/shop`**
   - Actualizar `app/robots.txt/route.ts` para bloquear explícitamente las rutas reales del ERP (`/dashboard`, `/catalogo`, `/inventario`, `/ecommerce`, `/ordenes-b2b`, `/contenedores`, `/despachos`, `/configuracion`, `/print`, además de `/admin/` y `/api/`).
   - Agregar `alternates: { canonical: '/shop' }` (respetando filtros base) en `app/(store)/shop/page.tsx`.

---

## Criterios de Aceptación y Verificación de Fase 3

- **Tests unitarios nuevos** en `tests/unit/ecommerce/`:
  - `crearCotizacion`: rechaza precios manipulados (usa los precios reales de BD), ignora cualquier `estado`/`requiere_aprobacion` enviado desde cliente, rechaza cantidades `<= 0` o no enteras.
  - `sanitizePostgrestFilterTerm`: neutraliza `,`, `(`, `)`, `%`, `_`.
- **Checks obligatorios tras el último cambio:**
  - `pnpm typecheck` con 0 errores.
  - `pnpm build` (`next build --webpack`) con código `0`.
  - `pnpm exec vitest run tests/unit` en verde.
