<!-- plans/revision final.md -->
# Plan Maestro de Revisión Final hacia Producción (`inv-tienda`)

> **Generado:** 2026-11-17  
> **Estado inicial:** BLOQUEADO para despliegue / `git push` hasta resolver los puntos críticos de las Fases 1 a 4.  
> **Alcance:** Repositorio Git y secretos, Base de Datos Supabase (`supabase_production` y Sandbox), Ecommerce Público (`/` y `/shop`), Panel Admin (ERP), Dependencias (`pnpm audit`) y Build (`pnpm typecheck` / `pnpm build`).

---

## Resumen Ejecutivo por Prioridad

| Fase | Enfoque | Severidad | Bloquea Producción |
| :--- | :--- | :---: | :---: |
| **Fase 0** | Rotación de credenciales comprometidas (acción manual del propietario) | **CRÍTICA** | Sí |
| **Fase 1** | Saneamiento de Git, secretos en código, `.gitignore` y limpieza de carpetas | **CRÍTICA** | Sí |
| **Fase 2** | Blindaje de Auth, RBAC, Middleware, Route Handlers, Server Actions y Regla 3.1.1 | **CRÍTICA** | Sí |
| **Fase 3** | Seguridad en Checkout (`crearCotizacion`) y bugs funcionales/SEO en Ecommerce (`/` y `/shop`) | **CRÍTICA / ALTA** | Sí |
| **Fase 4** | Error de compilación TS (`docBuilder.ts`), dependencias críticas (`next`), bugs en Matriz/Trazabilidad y `loading.tsx` | **CRÍTICA / ALTA** | Sí |
| **Fase 5** | Endurecimiento RLS en Supabase Producción (script SQL revisable) y refactorización modular anti-spagueti | **ALTA / MEDIA** | Recomendado |

---

## Fase 0: Rotación Inmediata de Credenciales Comprometidas (Acción del Propietario)

> [!CAUTION]
> Estas credenciales estuvieron o están en texto plano en archivos rastreados por Git (`HEAD` o historial) y en respaldos locales. Deben rotarse en sus respectivos paneles y actualizarse en `.env.local` y Dokploy/VPS:

- [ ] **Supabase Producción (`supabase.sistemaindumentaria.com`)**: rotar `SUPABASE_SERVICE_ROLE_KEY` (expuesta en `scripts/n8n/updates/crear_workflow_conteo_fisico.js:295,299` y commits `2aca548`/`180c15b`).
- [ ] **OpenRouter**: revocar y regenerar las 2 API keys (`sk-or-v1-c640d1...` y `sk-or-v1-f50683...`).
- [ ] **n8n (`n8n.sistemaindumentaria.com`)**: revocar y regenerar las 2 `N8N_API_KEY` (`eyJhbGci...Z1Kbuv...` y `eyJhbGci...Qfyrrt...`).
- [ ] **Larksuite y Odoo 19**: rotar `app_secret` de Larksuite y Bearer Token de Odoo 19 presentes en `scripts/backups/n8n_*/`.
- [ ] **Usuario de pruebas E2E**: cambiar la contraseña `TEST_ADMIN_PASSWORD` (`***REDACTED_PASSWORD***`) expuesta en `tests/e2e/inventario/notas/test-utils.ts:5`.

---

## Fase 1: Saneamiento de Git, `.gitignore` y Estructura de Carpetas

### 1.1. Eliminar secretos hardcodeados en archivos rastreados por Git
- [ ] `scripts/n8n/updates/crear_workflow_conteo_fisico.js` (líneas 11, 295, 299, 341): leer `N8N_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `OPENROUTER_API_KEY` exclusivamente desde `process.env` (fallar si faltan, sin fallback hardcodeado).
- [ ] Limpiar `N8N_API_KEY` hardcodeada en los 7 scripts rastreados:
  - `scripts/n8n/diagnostics/backup_workflows.js:14`
  - `scripts/n8n/updates/apply_audit_node.js:15`
  - `scripts/n8n/updates/update_ai_validator.js:15`
  - `scripts/n8n/updates/update_n8n_bags_detection.js:27`
  - `scripts/n8n/updates/update_n8n_jackie_bilingual.js:16`
  - `scripts/n8n/updates/update_n8n_jackie_pesos.js:22`
  - `scripts/n8n/updates/update_n8n_tallas_dobles.js:27`
- [ ] `tests/e2e/inventario/notas/test-utils.ts:5`: eliminar fallback `'***REDACTED_PASSWORD***'`; exigir `process.env.TEST_ADMIN_PASSWORD`.
- [ ] `tests/e2e/test-login.js:17` y `tests/e2e/test-auth-query.js:20-21`: reemplazar correo personal por variable de entorno.

### 1.2. Actualizar `.gitignore` y desindexar archivos indebidos (`git rm --cached`)
- [ ] Agregar a `.gitignore`:
  - `.mcp.json`, `opencode.json`, `.codex/`, `.playwright-mcp/`, `.windsurf/`
  - `.claude/*` con excepción `!.claude/skills/`
  - `lint-output.txt`, `fases-historicas/`, `docs/development/*.txt`, `docs/architecture/db_dumb.txt`, `docs/architecture/temp_form.json`
- [ ] Ejecutar `git rm --cached` (mantiene los archivos en disco local, los saca de Git):
  - `.claude/settings.local.json`
  - `.mcp.json`, `opencode.json`, `.codex/config.toml`, `.playwright-mcp/page-2026-04-24T22-20-39-622Z.yml`, `.windsurf/workflows/shop.md`
  - `lint-output.txt`
  - `supabase/migrations/DB_dump.sql`, `supabase/migrations/20250109_config_ecommerce.sql`, `supabase/migrations/auditoria_productos.sql`
  - `docs/architecture/db_dumb.txt`

### 1.3. Limpieza de archivos locales y duplicados (`AGENTS.md`)
- [ ] Ejecutar sanitización recursiva de secretos en `scratch/`, `scripts/backups/` y `plans/backups/`.
- [ ] Clasificar los ~115 archivos sueltos en la raíz de `scratch/` según `scratch/README.md`.
- [ ] Eliminar skills duplicadas en `.agents/skills/importacion-masiva` y `.agents/skills/skill-selector` (manteniéndolas únicamente en `.claude/skills/`, conforme a la Instrucción 8 de `AGENTS.md`).
- [ ] Evaluar retiro/archivo de `NEXTJS_UPGRADE_GUIDE.md` y `organizacion-del-proyecto.md` en raíz.

---

## Fase 2: Blindaje de Seguridad en Admin ERP, Auth, Middleware y Server Actions

### 2.1. Separación estricta Cliente Ecommerce (`rol_id = 19`) vs Staff Admin
- [ ] `lib/auth/permissions.ts`:
  - Eliminar `puede_leer: true` universal en `catalogo_catalogos` dentro de `createEmptyPermissionMatrix()` (L114) y `buildPermissionMatrix()` (L142).
  - Asegurar que `Cliente Ecommerce` (`rol_id = 19`) no reciba permisos de lectura sobre el panel administrativo.
- [ ] `lib/supabase/middleware.ts`:
  - Bloquear explícitamente `isClienteEcommerce` cuando `isProtectedRoute === true` (redirigir a `/`).
  - No omitir la validación de permisos cuando `claims?.version !== 2` (si no hay claims v2 en ruta protegida, denegar o delegar a validación estricta en servidor).
  - Añadir `/api/packing` y `/print` a `PROTECTED_ROUTES`.
- [ ] `app/(admin)/layout.tsx`: validar que el usuario en `verifySession()` no sea `Cliente Ecommerce` (`rol_id = 19`).
- [ ] `app/(admin)/dashboard/page.tsx`: forzar `vista = 'comercial'` cuando `isB2B === true` (`nivel 4/5`) para evitar exposición de vistas `inventario` o `ecommerce` vía query param `?vista=`.
- [ ] Añadir `requirePermission()` en las **14 páginas `page.tsx`** de `app/(admin)` que actualmente dependen solo del middleware:
  - `catalogo/catalogos/page.tsx`, `catalogo/imagenes/page.tsx`
  - `configuracion/auditoria_producto/page.tsx`, `configuracion/tablas/page.tsx`, `configuracion/tablas-soporte/page.tsx`
  - `despachos/page.tsx`, `despachos/[id]/page.tsx`, `despachos/nuevo/page.tsx`
  - `ecommerce/config/page.tsx`, `ecommerce/ordenes-venta/page.tsx`, `ecommerce/ordenes-venta/[id]/page.tsx`, `ecommerce/productos-web/page.tsx`
  - `inventario-virtual/page.tsx`, `inventario-virtual/[id]/page.tsx`

### 2.2. Cierre de Route Handlers vulnerables (SSRF, DoS y falta de Auth)
- [ ] `app/api/ecommerce/catalog-image/route.ts` y `modules/ecommerce/pdf-catalog-actions.ts`:
  - Exigir sesión autenticada (`getCurrentUser()`).
  - Validar `parsedUrl.protocol === 'https:'` y `hostname` contra allowlist estricta (`supabase.sistemaindumentaria.com`, `moda.sistemaindumentaria.com`, `snow-wolverine-506185.hostingersite.com`).
  - Bloquear IPs privadas/loopback (`127.0.0.1`, `localhost`, `169.254.169.254`, `10.x`, `172.16.x`, `192.168.x`).
  - Limitar `body.urls` a máximo 20 URLs, concurrencia acotada y límite de tamaño de respuesta (10 MB).
- [ ] `app/api/packing/parse/route.ts`: exigir `getCurrentUser()` + `can(user, 'b2b_ordenes', 'puede_crear')`.
- [ ] `app/api/inventario/notas/nueva/similares-ampliado/route.ts`: exigir `getCurrentUser()` y validar acceso a bodega.
- [ ] `app/test/page.tsx` y `app/api/test-users/route.ts`: bloquear con `notFound()` / `403` si `process.env.NODE_ENV !== 'development'`.

### 2.3. Blindaje de Server Actions y Conversión de `queries.ts`
- [ ] `modules/config/tablas-soporte/actions.ts` (L14-152):
  - Validar en runtime `Object.prototype.hasOwnProperty.call(TABLAS_SOPORTE_CONFIG, tabla)`.
  - Exigir `getCurrentUser()` + `canWithFallback(user, 'config_tablas_soporte', action)`.
- [ ] `modules/auth/actions.ts` (L175-297): extraer `syncUserClaims` a archivo `server-only` (sin `'use server'`) o validar que solo el propio usuario o un Super Admin pueda invocarla.
- [ ] `modules/cajas/actions.ts` (7 acciones): agregar `getCurrentUser()` + `can(user, 'b2b_cajas', ...)` en todas.
- [ ] `modules/inventario/actions.ts` (L1747-1795): proteger `actualizarPropuestaOcrLineasAction`, `exportStockByBodegaAction` y `exportStockMatrixAction` con `getCurrentUser()`, RBAC y filtro de bodegas autorizadas (`fetchBodegasUsuario`).
- [ ] Agregar validación RBAC (`can(user, modulo, accion)`) en las **+35 Server Actions** que hoy solo verifican `if (!user)`:
  - `modules/catalogo/actions/{product,detalle,variantes,imagenes,web}.ts`, `modules/catalogo/imagenes/actions.ts`, `modules/catalogo/import/actions.ts`
  - `modules/inventario/actions.ts` (bodegas/asignaciones), `modules/inventario/import-actions.ts`, `modules/inventario/conteo-fisico-actions.ts`
  - `modules/despachos/actions.ts`, `modules/contenedores/actions.ts`, `modules/ordenes-b2b/import/actions.ts`, `modules/ordenes-b2b/actions.ts`
- [ ] Reemplazar `'use server'` por `import 'server-only'` en los **12 archivos `queries.ts`** (exponiendo wrappers autenticados en `actions/` únicamente para las funciones llamadas desde Client Components).
- [ ] **Regla Inquebrantable 3.1.1** (`modules/config/inventory-reset-actions.ts:97-196`): eliminar los `UPDATE` directos a `inventario_stock`; procesar el reseteo creando y confirmando (`CONF`) notas de ajuste en `notas_inventario`.

---

## Fase 3: Seguridad y Bugs en Ecommerce Público (`/` Inicio, `/shop`, PDP y Checkout)

### 3.1. Seguridad en Checkout y Lecturas Públicas
- [ ] `modules/ecommerce/actions.ts` (`crearCotizacion`, L1208-1319):
  - Eliminar el parámetro `config` enviado desde el cliente; leer `fetchConfigEcommerce()` en el servidor.
  - Consultar precios reales vigentes (`precio_publico`, `precio_oferta`, `en_oferta`) desde `productos_web` (`activo = true`) en el servidor y calcular `precio_unitario`, `subtotal` y `total` exclusivamente en el servidor.
  - Validar con Zod cantidades enteras positivas (`cantidad >= 1`) y campos de contacto.
- [ ] `modules/ecommerce/queries.ts`:
  - `fetchOrdenesVenta` (L1262) y `fetchOrdenVentaById` (L1346): rechazar si `!currentUser`, y si no es cliente exigir `can(currentUser, 'ecommerce_ordenes', 'puede_leer')`.
  - Sanitizar caracteres reservados de PostgREST (`,`, `(`, `)`, `%`, `_`) antes de interpolar en `.or(...)` y en `buscarOrdenInvitado` (L1554).
  - `incrementProductoWebVisitas` (L795-809): no depender de `visitasActuales` cacheadas; incrementar en BD leyendo el valor actual o con RPC atómico.

### 3.2. Bugs Funcionales en `/`, `/shop`, `/shop/[slug]` y Carrito
- [ ] Conectar `VariantSelector.tsx` con `AddToQuoteButton.tsx` en `app/(store)/shop/[slug]/page.tsx` para enviar `varianteId`, `talla` y `color` seleccionados al carrito.
- [ ] Respetar `mostrarPrecio(prod, config)` y `getPrecioAMostrar(prod, config)` en:
  - `components/store/producto/AddToQuoteButton.tsx:42` (aplicar `precio_oferta` cuando `en_oferta = true`)
  - `components/store/favoritos/FavoritosList.tsx:58,129-133`
  - `app/(store)/page.tsx:168-172` (`DestacadosSection`)
  - Meta tags y JSON-LD en `app/(store)/shop/page.tsx:98-102` y `app/(store)/shop/[slug]/page.tsx:254,297-307`
- [ ] Incluir `pz_en_caja` en `ProductoWebPublico` (`modules/ecommerce/queries.ts`) para calcular correctamente las piezas en carrito.
- [ ] Corregir filtro `filtros.q` en `executeFetchProductosWebPublicos` (`modules/ecommerce/queries.ts:523-527`) para evitar el `AND` excluyente entre dos `.or()`.
- [ ] Mostrar `toast.error` en `components/store/cotizacion/QuoteContactForm.tsx:110-112` cuando falle el envío.
- [ ] Agregar `.catch()` y skeleton en `components/store/home/FavoritosYRecientesStrip.tsx`.
- [ ] Aplicar `getSmartImagenUrl` / `ProgressiveProductImage` en imágenes de Home, `CategoryPromoHero.tsx`, `CartDrawer.tsx`, `QuoteCart.tsx` y `OrdenDetalleView.tsx`.
- [ ] Corregir `app/robots.txt/route.ts` con las rutas privadas reales del ERP (`/dashboard`, `/catalogo`, `/inventario`, `/ecommerce`, `/ordenes-b2b`, `/contenedores`, `/despachos`, `/configuracion`, `/print`) y agregar `canonical` en `app/(store)/shop/page.tsx`.

---

## Fase 4: Bugs en Admin ERP, Compilación TypeScript y Dependencias

- [ ] **Error de compilación TypeScript**: corregir `docs/generator/docBuilder.ts:193-199` agregando `type: 'png'` en `new ImageRun(...)` para que `pnpm typecheck` y `pnpm build` pasen con código `0`.
- [ ] **Dependencias críticas (`pnpm audit`)**: actualizar `next` y `eslint-config-next` (`>=16.4.5`) y aplicar `pnpm.overrides` / actualizaciones para mitigar las 8 vulnerabilidades críticas (`next`, `dompurify`, `tar`, `proxy-addr`).
- [ ] **Matriz de Stock Móvil (`StockMatrixMobileTable.tsx` y `use-header-flotante.ts`)**:
  - Corregir `itemVisibleTotal` en modo `isPronostico` para sumar `cell?.pronosticado ?? cell?.total ?? 0`.
  - Corregir el `sticky left-0` del encabezado flotante al hacer scroll horizontal.
- [ ] **Bundle Size (`exceljs`)**: cambiar `import ExcelJS from 'exceljs'` estático a `await import('exceljs')` dinámico en `StockMatrixTable.tsx:30` y `StockTable.tsx:12`.
- [ ] **Trazabilidad (`modules/inventario/trazabilidad.ts`)**:
  - Usar `todayMX()` / `dateInputToMexicoUTC()` de `lib/utils.ts` en `resolverRangoFechas()` (L202-244).
  - Dividir `.in('producto_id', productosIds)` en chunks ≤200 (L390, 469, 485, 520, 578).
- [ ] **Skeletons inmediatos (`loading.tsx`)**: crear los 12 archivos `loading.tsx` faltantes en `app/(admin)`.

---

## Fase 5: Endurecimiento de Base de Datos (Opcional / Manual) y Deuda Técnica

- [ ] Generar script SQL de endurecimiento RLS para las **48 tablas** de `inv-tienda` en Producción sin RLS (protegiendo `variantes_producto.costo_promedio`, `inventario_stock`, `ordenes_venta`, `config_inventario`, etc.) + índices en las FKs críticas, para revisión y ejecución manual del propietario.
- [ ] Planificar refactorización vertical (Regla 3.7.7) de los componentes monolíticos (`OrdenRapidaWizard.tsx` 7k líneas, `FamiliasOrganizerClient.tsx` 4.1k líneas, `NoteDraftBuilder.tsx` 3.2k líneas) en iteraciones posteriores sin bloquear el lanzamiento.

---

## Verificación Final Pre-Producción
- `pnpm typecheck` → 0 errores.
- `pnpm build` (`next build --webpack`) → build completo + `public/sw.js` generado sin errores.
- `pnpm test:integration` (`vitest run`) → pruebas unitarias pasando.
- `pnpm audit --audit-level=critical` → 0 vulnerabilidades críticas.
- Búsqueda de secretos en `git ls-files` → 0 llaves o contraseñas expuestas.
