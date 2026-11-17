<!-- plans/fase2-seguridad.md -->
# Plan de Ejecución — Fase 2: Blindaje de Seguridad (Auth, RBAC, Middleware, Endpoints y Server Actions)

> **Rama de trabajo:** `fix/auditoria-inicial` (sincronizada con `master` en `8a0c09c`)  
> **Documento maestro:** [`plans/revision final.md`](./revision%20final.md)  
> **Registro de hallazgos:** [`plans/incidencias.md`](./incidencias.md)

---

## Objetivo de la Fase 2

Cerrar todas las brechas críticas y altas de autenticación, autorización (RBAC), SSRF, inyección de tablas, exposición de lecturas internas como Server Actions y violaciones a la Regla Inquebrantable 3.1.1 en el Panel Admin y APIs, antes de pasar a Fase 3 (Ecommerce público) y Fase 4 (Bugs de Matriz/Trazabilidad y dependencias).

---

## Sub-fase 2A: Separación Cliente Ecommerce vs Staff Admin y Middleware

1. **`lib/auth/permissions.ts`**:
   - En `createEmptyPermissionMatrix()` (L114) y `buildPermissionMatrix()` (L142): eliminar `catalogo_catalogos.puede_leer = true` por defecto para evitar que usuarios externos hereden acceso a `/catalogo`.
   - Mantener compatibilidad para roles internos que sí tengan permisos configurados en `rol_permisos` / `usuario_permisos`.
2. **`lib/supabase/middleware.ts`**:
   - Añadir `/api/packing` y `/print` a `PROTECTED_ROUTES`.
   - Bloquear explícitamente a `Cliente Ecommerce` (`rol_id === 19` o `rol_nombre.includes('cliente ecom')`) en cualquier ruta de `PROTECTED_ROUTES` (redirigir a `/`).
   - Cuando `modulo` exista y `claims?.version !== 2`, no permitir bypass silencioso (si es cliente redirigir a `/`; si es staff sin claims v2, delegar o validar).
3. **`app/(admin)/layout.tsx`**:
   - Tras `verifySession()`, verificar que el usuario no sea `Cliente Ecommerce` (`rol_id === 19`); si lo es, redirigir a `/`.
4. **`app/(admin)/dashboard/page.tsx`**:
   - Forzar `vista = 'comercial'` cuando `isB2B === true` (`nivel_acceso === 4 || 5`), ignorando `?vista=inventario` o `?vista=ecommerce`.
5. **14 páginas `page.tsx` en `app/(admin)` sin verificación en Server Component**:
   - Agregar `await requirePermission(...)` / `requireCatalogReadPermission()` al inicio de:
     - `catalogo/catalogos/page.tsx`, `catalogo/imagenes/page.tsx`
     - `configuracion/auditoria_producto/page.tsx`, `configuracion/tablas/page.tsx`, `configuracion/tablas-soporte/page.tsx`
     - `despachos/page.tsx`, `despachos/[id]/page.tsx`, `despachos/nuevo/page.tsx`
     - `ecommerce/config/page.tsx`, `ecommerce/ordenes-venta/page.tsx`, `ecommerce/ordenes-venta/[id]/page.tsx`, `ecommerce/productos-web/page.tsx`
     - `inventario-virtual/page.tsx`, `inventario-virtual/[id]/page.tsx`

---

## Sub-fase 2B: Cierre de Route Handlers (SSRF, DoS y Sin Auth) y `/test`

1. **`app/api/ecommerce/catalog-image/route.ts` y `modules/ecommerce/pdf-catalog-actions.ts`**:
   - Exigir sesión autenticada (`getCurrentUser()`) y permiso `ecommerce_catalogo` / `catalogo_productos` en el proxy y acciones de PDF.
   - Implementar helper compartido `validateSafeImageUrl(rawUrl)`:
     - Solo protocolo `https:`.
     - Allowlist de hostnames (`supabase.sistemaindumentaria.com`, `moda.sistemaindumentaria.com`, `snow-wolverine-506185.hostingersite.com` y el host de `NEXT_PUBLIC_SUPABASE_URL`).
     - Bloqueo explícito de IPs privadas/loopback (`localhost`, `127.0.0.1`, `::1`, `169.254.169.254`, `10.x`, `172.16-31.x`, `192.168.x`).
   - Limitar `body.urls` / lotes a máximo 20 URLs y tamaño máximo de descarga a 10 MB.
2. **`app/api/packing/parse/route.ts`**:
   - Exigir `getCurrentUser()` + `can(user, 'b2b_ordenes', 'puede_crear')`.
3. **`app/api/inventario/notas/nueva/similares-ampliado/route.ts`**:
   - Exigir `supabase.auth.getUser()` + `getCurrentUser()` + permiso `inventario_notas`.
4. **`app/test/page.tsx` y `app/api/test-users/route.ts`**:
   - Restringir `app/test/page.tsx` con `if (process.env.NODE_ENV !== 'development') notFound()`.
   - En `app/api/test-users/route.ts`, mantener bloqueo en producción y exigir Super Admin si está en dev.

---

## Sub-fase 2C: Blindaje de Server Actions Críticas

1. **`modules/config/tablas-soporte/actions.ts`** (L14-152):
   - Validar en runtime `if (!Object.prototype.hasOwnProperty.call(TABLAS_SOPORTE_CONFIG, tabla))` antes de tocar Supabase.
   - Exigir `getCurrentUser()` + `canWithFallback(user, 'config_tablas_soporte', action)` en las 4 acciones (`create`, `update`, `toggleActive`, `delete`).
2. **`modules/auth/actions.ts`** (`syncUserClaims`, L175-297):
   - Mover `syncUserClaims` a un archivo `server-only` (sin `'use server'`) o validar que el caller autenticado coincida con `authUserId` o sea Super Admin (`isSuperAdmin(caller)`).
3. **`modules/cajas/actions.ts`** (7 acciones):
   - Añadir helper `requireCajasPermission(action)` (`getCurrentUser()` + `can(user, 'b2b_cajas', action) || can(user, 'catalogo_productos', action)`) en todas.
4. **`modules/inventario/actions.ts`** (L1747-1795 y acciones de bodegas/asignaciones):
   - Proteger `actualizarPropuestaOcrLineasAction`, `exportStockByBodegaAction`, `exportStockMatrixAction`, `validarDisponibilidadNotaAction`, `validarDisponibilidadNotaPorIdAction`, `getNotaDetallesAction`, `sincronizarLineasOcrAction`, `resolverProductosPegadosAction` con `getCurrentUser()` + permiso de inventario y scoping de bodegas (`fetchBodegasUsuario`).
   - Proteger `crearBodegaAction`, `actualizarBodegaAction`, `eliminarUsuarioBodegaAction`, `asignarUsuarioZonaAction`, `guardarAsignacionBodegaJSONAction`, `eliminarAsignacionBodegaJSONAction` con `can(user, 'inventario_bodegas', ...)` / `nivel_acceso <= 2`.
5. **Resto de Server Actions que solo validan `if (!user)`**:
   - `modules/catalogo/actions/{product,detalle,variantes,imagenes,web}.ts`, `modules/catalogo/imagenes/actions.ts`, `modules/catalogo/import/actions.ts`: aplicar `requireCatalogoPermission(...)` (y `ecommerce_catalogo` en `web.ts` + `revalidateStoreCatalogo()`).
   - `modules/despachos/actions.ts`: aplicar `can(user, 'despachos', ...)`.
   - `modules/contenedores/actions.ts`: aplicar `requireContenedorPermission('puede_editar')` en `surtirContenedorAction` y `confirmarIngresoVirtualAction`.
   - `modules/inventario/import-actions.ts` y `modules/inventario/conteo-fisico-actions.ts`: aplicar `can(user, 'inventario_notas', 'puede_crear' | 'puede_editar')` + verificación de acceso a bodega.
   - `modules/ordenes-b2b/actions.ts` y `modules/ordenes-b2b/import/actions.ts`: aplicar `getCurrentUser()` + `can(user, 'b2b_ordenes' | 'b2b_cajas', ...)`.

---

## Sub-fase 2D: Conversión de `queries.ts` (`'use server'` → `'server-only'`)

1. Reemplazar `'use server'` por `import 'server-only'` en los **12 archivos `queries.ts`** + `modules/inventario/trazabilidad.ts`.
2. Para cualquier función de lectura que actualmente sea importada directamente desde un `'use client'` component (ej. `fetchProductosWebByIds`, `fetchStock...`, etc.), exponer un wrapper específico en `actions/` con validación explícita (o mantener la lectura pública acotada para Storefront donde corresponda).

---

## Sub-fase 2E: Regla Inquebrantable 3.1.1 (`modules/config/inventory-reset-actions.ts`)

1. Eliminar los `UPDATE` directos sobre `inventario_stock` en `resetStockCeroAction`, `resetCompletoInventarioAction` y `resetStockCeroBodegaAction` (L97-100, L144-147, L193-196).
2. Reemplazar el reseteo de existencias por la creación y confirmación (`CONF`) de notas de ajuste/salida vía `sp_crear_nota` + `sp_agregar_producto_nota` por cada bodega/producto con stock > 0, preservando el Kardex y disparando `fn_procesar_nota_inventario`.

---

## Decisiones Cerradas por el Propietario (Listas para Ejecución)

1. **Pregunta 1 (`/api/ecommerce/catalog-image` y `pdf-catalog-actions.ts`):** **Opción A (Admin-only)**.
   - Guard de sesión + RBAC (`ecommerce_catalogo` o `catalogo_productos`) en ambos: `route.ts` y `pdf-catalog-actions.ts` (`401` / `403` JSON, nunca redirect HTML en `/api/*`).
   - Allowlist estricta (`https:`, hostnames permitidos + `NEXT_PUBLIC_SUPABASE_URL`, bloqueo de loopback/privadas/link-local + validación IP anti DNS-rebinding, `redirect: 'manual'`, sin reenviar cookies).
   - Límites: ≤20 URLs/lote, ≤10 MB/descarga, timeout ~5s, `Content-Type` imagen, rate-limit por usuario, log de auditoría y `Cache-Control: private`.
   - Degradación elegante en `pdfCatalogGenerator.ts`: ante `401/403/413/timeout`, caer a la URL pública original de Supabase y continuar sin abortar el PDF.
   - Middleware: para `/api/*`, devolver `401` JSON en lugar de `307` redirect HTML.
2. **Pregunta 2 (`modules/config/inventory-reset-actions.ts` — Regla 3.1.1):** **Opción A (Cumplimiento estricto)**.
   - Cero escrituras directas a `inventario_stock` y **prohibido** `activo = false` masivo en `notas_inventario` (verificado en `supabase_production` que existen 16 notas `CONF/MODF` ocultas actualmente, y que `activo` afecta Trazabilidad y Kardex).
   - Por bodega: nota `AJU` (`id = 4`) → `sp_crear_nota` + `sp_agregar_producto_nota` con `-cajas`/`-piezas_sueltas` respetando `caja_id` → `CONF` → `fn_procesar_nota_inventario`.
   - Orden en `resetCompletoInventarioAction`: crear+CONF por bodega (máx 3–4 bodegas concurrentes, líneas en serie dentro de cada nota) → verificar stock 0 + Kardex + auditoría → registrar auditoría (sin ocultar notas previas; corte por fecha derivado de la nota `AJU` de cierre).
   - Permisos diferenciados: `ResetInventarioClient` exige nivel 1 + dry-run + confirmación escrita `RESET`; `ImportStepConfirm` (`resetStockPrevio`) exige permiso de notas + scope de bodega (sin nivel 1) y aborta la importación si falla parcialmente.
3. **Pregunta 3 (`queries.ts` `'use server'` → `import 'server-only'`):** **Confirmada**.
   - Piloto en `modules/ecommerce/queries.ts` → `pnpm build` para inventariar call-sites → propagar a `trazabilidad.ts` y los demás `queries.ts`.
   - Prioridad 1: bajar datos por props desde Server Component.
   - Admin (`actions/reads.ts`): `requirePermission(...)` + scope de bodega + columnas explícitas (sin `select('*')` ni `export *`).
   - Tienda (`actions/public-reads.ts`): API pública tratada como hostil (`activo = true`, lista blanca de columnas, Zod ≤50 IDs, rate-limit, caché, sin costos ni stock por bodega).
   - Guard anti-regresión obligatorio en tests de integración (`vitest`).

---

## Verificación de Fase 2

- `pnpm typecheck` (`next typegen && tsc --noEmit`) → 0 errores.
- `pnpm test:integration` (`vitest run`) → pruebas pasando.
- Revisión de que ningún Client Component importe directamente un archivo marcado con `import 'server-only'`.
