<!-- plans/incidencias.md -->
# Registro Consolidado de Incidencias y Contexto Técnico (`inv-tienda`)

> **Fecha de auditoría:** 2026-11-17  
> **Documento hermano:** [`plans/revision final.md`](./revision%20final.md)  
> **Nota de seguridad:** Los valores de llaves, tokens y contraseñas detectados se registran en formato redactado para evitar introducir secretos en `plans/`.

---

## 1. Incidencias de Git, Secretos y Estructura de Carpetas

### 1.1 Estado del repositorio
- **Rama actual:** `master` en commit `12ada05` (**12 commits por delante** de `origin/master`).
- **Otras ramas:** `fix/auditoria-inicial` (`23deba7`, con upstream) y `feature/inventario-notas-mejoras` (`f41f36d`, solo local).
- **Total de archivos rastreados (`git ls-files`):** 1,143 archivos.

### 1.2 Secretos expuestos en archivos rastreados (`HEAD`)
1. **`scripts/n8n/updates/crear_workflow_conteo_fisico.js`** (commit `ebf6b8c`):
   - **Línea 11:** `N8N_API_KEY` hardcodeada como fallback (`eyJhbGci...SksGu57U`).
   - **Líneas 295 y 299:** `SUPABASE_SERVICE_ROLE_KEY` de Producción (`eyJhbGci...WUzjQ`).
   - **Línea 341:** `OPENROUTER_API_KEY` (`sk-or-v1-c640d1...`).
2. **`N8N_API_KEY` (`eyJhbGci...0pGc4Xg`) hardcodeada en 7 scripts rastreados:**
   - `scripts/n8n/diagnostics/backup_workflows.js:14`
   - `scripts/n8n/updates/apply_audit_node.js:15`
   - `scripts/n8n/updates/update_ai_validator.js:15`
   - `scripts/n8n/updates/update_n8n_bags_detection.js:27`
   - `scripts/n8n/updates/update_n8n_jackie_bilingual.js:16`
   - `scripts/n8n/updates/update_n8n_jackie_pesos.js:22`
   - `scripts/n8n/updates/update_n8n_tallas_dobles.js:27`
3. **Credenciales en tests E2E rastreados:**
   - `tests/e2e/inventario/notas/test-utils.ts:5` (`TEST_ADMIN_PASSWORD` con fallback hardcodeado, commit `b046ee7`).
   - `tests/e2e/test-login.js:17` y `tests/e2e/test-auth-query.js:20-21` (correo personal hardcodeado).

### 1.3 Secretos en historial de Git y archivos locales ignorados
- **Historial Git:**
  - `2aca548` / `180c15b`: `scripts/backup_packing_workflow.json` y `scripts/current_ocr_workflow.json` con `SUPABASE_SERVICE_ROLE_KEY` y `OPENROUTER_API_KEY`.
  - `2ea38b3` / `141e39b`: `start-tunnel.ps1` con usuario `root`, IP VPS `***REDACTED_VPS_IP***`, puerto `22` y ruta de llave SSH `id_mcp_supabase`.
  - `ebf6b8c`, `02966fc`, `9bf6557`, `bccbd09`, `f2b6512`, `7bcc3bb`, `b046ee7`.
- **Archivos locales ignorados sin sanitizar:**
  - `scratch/system/sanitize_secrets.js` no fue recursivo; quedaron secretos en:
    - `scratch/n8n/tests/test_full_ocr_resolution.js:5`, `test_intelligent_ocr_parser.js:5`
    - `scratch/n8n_nodes_dump/Subir_imagen_al_bucket1.txt:9,13`
    - `scratch/supabase/diagnostics/check_nota_detalles.js:5`, `scratch/supabase/tests/test_exact_query.js:5`, `test_fetch_nota_by_id.js:5`
    - `scratch/workflow_packing_active.json:620,1838`
    - `scratch/inspect_parser_general.js:13`, `scratch/verify_live_n8n.js:6`, `scratch/n8n/diagnostics/{fetch_ocr_workflow,fetch_packing_workflows,list_workflows}.js`, `scratch/n8n/tests/fix_and_test_node14.js`, `scratch/n8n/updates/{apply_gemini_workflow_fix,update_n8n_workflow_packing,update_ocr_workflow}.js`, `scratch/supabase/updates/update_moti_now.js`, `scratch/system/test_api_single.js`.
  - `plans/backups/workflow_ocr_backup_1787288687593.json:675,1671` (dos llaves OpenRouter `sk-or-v1-c640d1...` y `sk-or-v1-f50683...` + `service_role`).
  - `scripts/backups/n8n_*/mHPmvGBFjWWYnGz4YcopA_lark-message.json:143-147` (credenciales Larksuite `app_id` / `app_secret`).
  - `scripts/backups/n8n_*/n0xM7HLavPMcpJwFnVHFD_odoo-19-prueva.json:37-47` (URL interna Traefik con IP VPS + Bearer Token Odoo 19).

### 1.4 `.gitignore`, archivos indebidos y desorden de carpetas
- **En `.gitignore` pero aún rastreados (`git ls-files`):**
  - `.claude/settings.local.json`
  - `supabase/migrations/DB_dump.sql`, `20250109_config_ecommerce.sql`, `auditoria_productos.sql`
- **Faltan en `.gitignore` y están rastreados:**
  - `.mcp.json`, `opencode.json`, `.codex/config.toml`, `.playwright-mcp/page-2026-04-24T22-20-39-622Z.yml`, `.windsurf/workflows/shop.md`
  - `lint-output.txt` (52.4 KB), `docs/architecture/db_dumb.txt` (copia exacta de `DB_dump.sql`), `docs/architecture/temp_form.json`, `docs/json respuesta.txt`, `docs/parser bonnie.txt`, `docs/development/{errors,errors2,errors_utf8,ts-errors,ts_errors}.txt`, `fases-historicas/`.
- **Otros hallazgos de estructura:**
  - `scratch/` tiene ~115 archivos sueltos en su raíz.
  - Skills duplicadas entre `.agents/skills/` y `.claude/skills/`: `importacion-masiva` y `skill-selector`.
  - `app/(admin)/configuracion/tablas/actions.ts` ubicado en `app/` en vez de `modules/admin-table/config/`.
  - `NEXTJS_UPGRADE_GUIDE.md` (recomienda `npm install`) y `organizacion-del-proyecto.md` obsoletos en raíz.
  - Scripts sueltos en `tests/e2e/` (`test2.mts`..`test5.mts`, `test_query.mts`, `test-auth-query.js`, `test-login.js`), `tests/integration/test-query.js` y `tests/unit/{test-env.ts,test-info.js}`.
  - 74 archivos sin comentario de path en la primera línea (Regla 3.2.10).

---

## 2. Incidencias en Base de Datos (`supabase_production` y Sandbox)

### 2.1 Producción (`http://localhost:8080/mcp` — `supabase_production`)
- **48 de 66 tablas** en el esquema `inv-tienda` tienen **`rowsecurity = false`** con `GRANT ALL` (`SELECT, INSERT, UPDATE, DELETE, TRUNCATE`) para `anon` y `authenticated`:
  - Incluye: `variantes_producto` (expone `costo_promedio`), `productos`, `inventario_stock`, `nota_detalle_productos`, `auditoria_inventario`, `ordenes_venta`, `orden_items`, `carritos`, `carrito_items`, `bodegas`, `despachos`, `despachos_detalles`, `personas`, `rol_permisos`, `usuario_bodegas`, `usuario_permisos`, etc.
- **Políticas permisivas peligrosas en tablas con RLS activo:**
  - `config_inventario`: `config_inventario_all_policy` otorga `ALL` a `{public}` con `qual = true`.
  - `contenedores`, `ordenes_b2b`, `ordenes_b2b_detalles`, `orden_cajas`, `usuario_personas`, `table_config_defaults`: políticas `ALL` a `{authenticated}` con `qual = true`.

### 2.2 Sandbox (`superarchivo2` — `exualhkodjmjlijhlgiz`)
- Las 67 tablas de `inv-tienda` tienen `rowsecurity = false`.
- `public.fix_auth_tokens()` es `SECURITY DEFINER` ejecutable por `anon` y `authenticated` vía `/rest/v1/rpc/fix_auth_tokens`.
- 4 funciones con `search_path` mutable: `inv-tienda.fn_permisos_usuario`, `inv-tienda.sp_agregar_producto_nota`, `inv-tienda.uid`, `public.fix_auth_tokens`.
- 81 llaves foráneas sin índice cubriente detectadas por `get_advisors(performance)`.

---

## 3. Incidencias en Ecommerce Público (`/` Inicio, `/shop`, PDP y Checkout)

### 3.1 Seguridad
1. **`crearCotizacion` (`modules/ecommerce/actions.ts:1208-1319`):**
   - Usa `item.precioUnitario || item.precioOfrecido || 0` del cliente (`localStorage`).
   - Recibe `config.requiere_aprobacion` desde el cliente (`L1211-1214`, `L1249`), permitiendo auto-aprobar órdenes (`estado: 'aprobada'`).
   - No valida `cantidad >= 1` ni estado activo de `productos_web` en el servidor.
2. **SSRF y DoS en `/api/ecommerce/catalog-image` (`app/api/ecommerce/catalog-image/route.ts:56-227`) y `modules/ecommerce/pdf-catalog-actions.ts:224-329`:**
   - Sin autenticación, sin allowlist de dominios, sin bloqueo de IPs privadas/loopback (`127.0.0.1`, `169.254.169.254`, etc.) y sin límite de tamaño en `body.urls[]` procesado con `sharp` en `Promise.all`.
3. **`fetchOrdenesVenta` y `fetchOrdenVentaById` (`modules/ecommerce/queries.ts:2, 1262-1373`):**
   - `queries.ts` tiene `'use server'`. Si `currentUser === null`, `isClienteEcommerce` es `false`, omitiendo el filtro y exponiendo todas las órdenes de venta.
   - Interpolación sin sanitizar en `.or(...)` (`L103, 519, 525-526, 716, 1281, 1298`).
4. **`buscarOrdenInvitado` (`modules/ecommerce/queries.ts:1541-1566`):**
   - `.ilike('numero_orden', folioLimpio)` sin escapar `%` ni `_`.
5. **Contador de visitas corrupto por caché (`app/(store)/shop/[slug]/page.tsx:278-280` y `modules/ecommerce/queries.ts:653-660, 795-809`):**
   - `producto.visitas` viene cacheado (`cacheLife('hours')`) y `incrementProductoWebVisitas` sobrescribe la columna con `(visitasActuales ?? 0) + 1`.
6. **Acciones admin de web sin RBAC (`modules/catalogo/actions/web.ts:19-107`):**
   - `updateProductoWebAction` y `createProductoWebAction` solo validan `if (!user)` (cualquier `Cliente Ecommerce` autenticado podría invocarlas) y no revalidan `ecommerce-catalogo`.

### 3.2 Bugs Funcionales, UX, Imágenes y SEO
1. **`VariantSelector` desconectado de `AddToQuoteButton` (`app/(store)/shop/[slug]/page.tsx:369-383`, `VariantSelector.tsx:15-57`, `AddToQuoteButton.tsx:28-45`):**
   - Siempre agrega `varianteId: producto.id`, `talla: ''`, `color: ''`.
2. **Precio de oferta ignorado y precios expuestos cuando están ocultos:**
   - `AddToQuoteButton.tsx:42` y `FavoritosList.tsx:58,129-133` usan `precio_publico` en vez de `getPrecioAMostrar(prod, config)`.
   - `DestacadosSection` (`app/(store)/page.tsx:168-172`), `FavoritosList.tsx`, `/shop` meta (`app/(store)/shop/page.tsx:98-102`) y `/shop/[slug]` JSON-LD (`app/(store)/shop/[slug]/page.tsx:254, 297-307`) no validan `mostrarPrecio(prod, config)`.
3. **Filtro `q` en `/shop` (`modules/ecommerce/queries.ts:523-527`):**
   - Encadena dos `.or()` que actúan como `AND` excluyente entre `productos_web` y `productos`.
4. **`pz_en_caja` ausente en `ProductoWebPublico` (`modules/ecommerce/queries.ts:440-450`, `useQuoteCart.ts:93`):**
   - El carrito multiplica cajas por `1` en vez de `pz_en_caja`.
5. **Checkout (`QuoteContactForm.tsx:110-112`):**
   - `catch` silenciado sin `toast.error`.
6. **`FavoritosYRecientesStrip.tsx:20-55`:**
   - Sin `.catch()` en `fetchProductosWebByIds` y causa CLS al aparecer tras hidratar.
7. **Imágenes sin `imgproxy` (`getSmartImagenUrl`):**
   - `app/(store)/page.tsx:274-321`, `CategoryPromoHero.tsx:25-32`, `CartDrawer.tsx:118-124`, `QuoteCart.tsx:93-99`, `FavoritosList.tsx:119`, `OrdenDetalleView.tsx:72`.
8. **SEO / Enlaces / Tamaño:**
   - `app/robots.txt/route.ts:7` bloquea `/admin/` en lugar de las rutas reales del ERP.
   - `app/(store)/shop/page.tsx:21-30` sin `alternates.canonical`.
   - Enlaces internos inconsistentes entre `/` y `/inicio` (`StoreHeader.tsx:95`, `StoreFooter.tsx:23`).
   - `LiveEditDrawer.tsx` (782 líneas) y `StoreHeader.tsx` (642 líneas) >300 líneas; `hooks/useQuoteCart.ts` y `lib/utils/favoritos.ts` sin clave versionada `dominio:clave:v1`.

---

## 4. Incidencias en Panel Admin (ERP), Server Actions, Matriz y Build

### 4.1 Auth, RBAC y Endpoints
1. **`Cliente Ecommerce` (`rol_id = 19`) con acceso al Admin:**
   - `lib/auth/permissions.ts:114, 142, 158-160` + `lib/supabase/middleware.ts:123-125` + `app/(admin)/layout.tsx:16-28`.
2. **Bypass de RBAC en middleware cuando `claims?.version !== 2` (`lib/supabase/middleware.ts:118`).**
3. **`app/(admin)/dashboard/page.tsx:62-102`:** roles B2B (`nivel 4/5`) pueden ver vistas `inventario` / `ecommerce` pasando `?vista=` en URL.
4. **14 `page.tsx` en `app/(admin)` sin `requirePermission` ni `verifyModuleAccess`:**
   - `catalogo/{catalogos,imagenes}`, `configuracion/{auditoria_producto,tablas,tablas-soporte}`, `despachos/{page,[id],nuevo}`, `ecommerce/{config,ordenes-venta,ordenes-venta/[id],productos-web}`, `inventario-virtual/{page,[id]}`.
5. **Route Handlers sin auth/RBAC:**
   - `app/api/packing/parse/route.ts:6-78` (no está en `PROTECTED_ROUTES` ni verifica usuario).
   - `app/api/inventario/notas/nueva/similares-ampliado/route.ts:6-144` (sin `getUser()`).
   - `app/test/page.tsx:1-103` y `app/api/test-users/route.ts:5-17` (expuestos).
   - Resto de `/api/inventario/*` solo validan `if (!user)` sin comprobar `can(...)` ni bodega.
   - `/print/*` fuera de `PROTECTED_ROUTES`.
6. **Server Actions críticas sin auth/RBAC:**
   - `modules/config/tablas-soporte/actions.ts:14-152` (inyección de nombre de tabla `supabase.from(tabla as any)` + sin auth/RBAC).
   - `modules/auth/actions.ts:175-297` (`syncUserClaims` usa `service_role` desde `'use server'` sin auth).
   - `modules/cajas/actions.ts:11-722` (7 acciones sin auth/RBAC).
   - `modules/inventario/actions.ts:1747-1795` (`actualizarPropuestaOcrLineasAction`, `exportStockByBodegaAction`, `exportStockMatrixAction` sin auth).
   - **+35 Server Actions** en `modules/catalogo/actions/*`, `modules/inventario/{actions,import-actions,conteo-fisico-actions}.ts`, `modules/despachos/actions.ts`, `modules/contenedores/actions.ts`, `modules/ordenes-b2b/{actions,import/actions}.ts` solo validan `if (!user)` sin `can(...)`.
   - **12 archivos `queries.ts`** + `modules/inventario/trazabilidad.ts` marcados con `'use server'` en vez de `import 'server-only'`.

### 4.2 Reglas de Negocio, Bugs, Build y Dependencias
1. **Regla 3.1.1 violada (`modules/config/inventory-reset-actions.ts:97-100, 144-147, 193-196`):**
   - Ejecuta `.from('inventario_stock').update(...)` directamente sin `notas_inventario`.
2. **Error de compilación TypeScript (`npx tsc --noEmit`):**
   - `docs/generator/docBuilder.ts:193-199`: `TS2345` en `new ImageRun(...)` (falta `type: 'png'`).
3. **`pnpm audit`:**
   - 182 vulnerabilidades totales (**8 críticas**: `next` 16.2.3 con 5 CVEs críticos corregidos en `>=16.4.5`, `dompurify` vía `jspdf`, `tar`, `proxy-addr`).
4. **Bugs en `StockMatrixMobileTable.tsx` y `StockMatrixTable.tsx`:**
   - `use-header-flotante.ts:34` (`transform: translateX`) rompe `sticky left-0` del primer `<th>`.
   - `itemVisibleTotal` en `StockMatrixMobileTable.tsx:288-291, 390-393` suma `cell?.total` en vez de `pronosticado` cuando `isPronostico = true`.
   - `ExcelJS` importado estáticamente en `StockMatrixTable.tsx:30` y `StockTable.tsx:12`.
5. **Trazabilidad (`modules/inventario/trazabilidad.ts`):**
   - `resolverRangoFechas` (`L202-244`) usa fechas UTC en vez de `America/Mexico_City`.
   - `.in('producto_id', productosIds)` sin chunking ≤200 (`L390, 469, 485, 520, 578`).
6. **12 rutas de `app/(admin)` sin `loading.tsx`** (Regla 3.4.5) y **15 componentes monolíticos >300 líneas** (destacando `OrdenRapidaWizard.tsx` 7,036 líneas, `FamiliasOrganizerClient.tsx` 4,119 líneas, `NoteDraftBuilder.tsx` 3,242 líneas), más 36 usos de `.select('*')` y 38 usos de `router.refresh()`.
