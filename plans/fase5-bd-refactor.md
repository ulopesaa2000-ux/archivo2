<!-- plans/fase5-bd-refactor.md -->
# Plan de Ejecución — Fase 5: Endurecimiento de Base de Datos (SQL Revisable) y Refactorización Vertical

> **Rama objetivo:** `fix/auditoria-inicial` (o rama dedicada tras cierre de Fases 1–4)  
> **Referencia maestra:** `plans/revision final.md` (Fase 5) y `AGENTS.md` (Regla 3.7)  
> **Nota sobre BD:** Por regla del proyecto (`AGENTS.md`), el agente **no** ejecuta DDL ni migraciones en Producción; genera scripts SQL revisables en `scripts/supabase/` para que el propietario los audite y aplique manualmente tras probarlos en Staging/Sandbox.

---

## Hallazgos Verificados en Esquema `inv-tienda` (vía MCP Read-Only)

1. **RLS deshabilitado en las 67 tablas** del esquema `inv-tienda` (`rowsecurity = false`, `policy_count = 0`).
2. **Funciones helper ya existentes en `inv-tienda`:**
   - `get_current_usuario_id()` (`SECURITY DEFINER`)
   - `fn_permisos_usuario(p_usuario_id)` (`SECURITY INVOKER` — conviene pasar a `SECURITY DEFINER STABLE SET search_path = 'inv-tienda', public` para evitar recursión RLS al leer `usuarios`/`rol_permisos`/`usuario_permisos`).
   - `fn_puede_acceder_bodega(p_usuario_id, p_bodega_id)` (`SECURITY INVOKER` — conviene pasar a `SECURITY DEFINER STABLE SET search_path = 'inv-tienda', public`).
   - RPCs críticas (`sp_crear_nota`, `sp_agregar_producto_nota`, `fn_procesar_nota_inventario`, `fn_buscar_candidatos_sku_ocr`, `sp_promover_propuesta_auto`, `fn_auditoria_productos`) son `SECURITY DEFINER`; conviene fijarles `SET search_path = 'inv-tienda', public`.
3. **Más de 70 llaves foráneas sin índice** en `inv-tienda` (incluyendo `auditoria_inventario`, `orden_items`, `ordenes_b2b`, `ordenes_b2b_detalles`, `despachos_detalles`, `productos_web`, `variantes_producto`, `producto_imagenes`, `usuario_bodegas`, `rol_permisos`).

---

## Sub-fase 5A — Script SQL Revisable de Endurecimiento RLS (`scripts/supabase/updates/rls_hardening_inv_tienda.sql`)

Clasificación de las 67 tablas de `inv-tienda` en 5 grupos de políticas (usando `(SELECT "inv-tienda".get_current_usuario_id())` con patrón `initPlan` de Postgres para evaluar una sola vez por query):

1. **Grupo 1 — Storefront Público (`anon` + `authenticated` lectura restringida; escritura solo Staff):**
   - `productos_web`: `SELECT` público solo donde `activo = true`.
   - `productos`, `producto_imagenes`, `variantes_producto`, `cat_*` (catálogos soporte): `SELECT` público solo `activo = true` (o catálogos activos).
   - **Protección de columnas sensibles:** `REVOKE SELECT (costo_promedio) ON "inv-tienda".variantes_producto FROM anon;` (y solo otorgar a roles staff/admin si aplica).
   - `config_ecommerce`, `categoria_banners`: `SELECT` público (solo lectura).

2. **Grupo 2 — Propiedad del Cliente Ecommerce (`rol_id = 19` y usuarios autenticados):**
   - `ordenes_venta`, `orden_items`: usuario autenticado solo ve/crea sus propias órdenes (`usuario_id = get_current_usuario_id()`); invitados solo vía Server Action autorizada (sin `SELECT` directo `anon`); staff con `ecommerce_ordenes` lee/edita todo.
   - `carritos`, `carrito_items`, `producto_favoritos`, `user_table_configs`: `usuario_id = get_current_usuario_id()`.

3. **Grupo 3 — Credenciales, RBAC y Datos Internos de Usuarios (Cero acceso `anon`):**
   - `usuarios`: `SELECT` propio (`auth_user_id = auth.uid()`) o staff con `config_usuarios`; proteger `appsheet_pin` (`REVOKE SELECT (appsheet_pin) ON "inv-tienda".usuarios FROM anon, authenticated;` — leído solo por `service_role`/RPC).
   - `appsheet_login`, `roles`, `rol_permisos`, `usuario_permisos`, `usuario_bodegas`, `usuario_personas`: solo staff autenticado según permisos `config_*` (y lectura propia de permisos/bodegas).

4. **Grupo 4 — Inventario, B2B, Contenedores, Despachos y Auditoría (Cero acceso `anon`):**
   - `inventario_stock`, `notas_inventario`, `nota_detalle_productos`, `nota_ocr_propuestas`, `historial_estados_nota`, `auditoria_inventario`, `auditoria_productos`, `config_inventario`: solo staff con permiso del módulo y alcance de bodega (`fn_puede_acceder_bodega`). Escritura a `inventario_stock` bloqueada para clientes directos (solo vía trigger `fn_procesar_nota_inventario`).
   - `ordenes_b2b`, `ordenes_b2b_detalles`, `orden_cajas`, `orden_detalles_comentarios`, `orden_detalle_eventos`, `ordenes_compra`, `contenedores`, `contenedor_cajas`, `cajas_producto`, `caja_detalles`, `despachos`, `despachos_detalles`, `personas`: solo staff con permiso `b2b_*` / `despachos` / `contenedores`.

5. **Grupo 5 — Tablas Legacy / Soporte:**
   - `z_proveedores_archivado`: bloquear `anon` y `authenticated` no-SuperAdmin.
   - `table_config_defaults`: lectura `authenticated` (staff), escritura Super Admin.

---

## Sub-fase 5B — Script SQL Revisable de Índices en FKs Críticas (`scripts/supabase/updates/indexes_fk_inv_tienda.sql`)

- Script idempotente usando `CREATE INDEX CONCURRENTLY IF NOT EXISTS` (sin bloque transaccional `BEGIN/COMMIT`, para ejecutar en Producción sin bloquear lecturas/escrituras):
  - **Prioridad Alta (tablas operativas y de tienda):**
    - `auditoria_inventario(producto_id)`, `auditoria_inventario(bodega_id)`, `auditoria_inventario(nota_id)`
    - `orden_items(orden_id)`, `orden_items(variante_id)`
    - `ordenes_b2b(cliente_b2b_id)`, `ordenes_b2b(proveedor_id)`, `ordenes_b2b(contenedor_id)`
    - `ordenes_b2b_detalles(orden_id)`, `ordenes_b2b_detalles(producto_id)`
    - `despachos_detalles(despacho_id)`, `despachos_detalles(producto_id)`, `despachos_detalles(caja_id)`
    - `productos_web(producto_id)`
    - `producto_imagenes(producto_id)`
    - `variantes_producto(producto_id)`, `variantes_producto(color_id)`, `variantes_producto(talla_id)`
    - `usuario_bodegas(bodega_id)`, `rol_permisos(rol_id)`, `usuarios(rol_id)`

---

## Sub-fase 5C — Plan de Refactorización Vertical Anti-Spagueti (Regla 3.7.7)

Aplicar la arquitectura canónica (`page.tsx` Server ligero → `_hooks/use-*.ts` 1 hook = 1 responsabilidad → `_components/*.tsx` puros ≤ 300 líneas) en orden de riesgo/tamaño:

1. **`NoteDraftBuilder.tsx` (`app/(admin)/inventario/notas/nueva/`, 3,242 líneas):**
   - Extraer `_hooks/use-nota-draft.ts`, `use-nota-similares.ts`, `use-nota-packs.ts`, `use-nota-ocr.ts`.
   - Extraer `_components/NotaHeaderForm.tsx`, `NotaLineasTable.tsx`, `NotaBuscadorModal.tsx`, `NotaSimilaresPanel.tsx`, `NotaConfirmBar.tsx`.
2. **`FamiliasOrganizerClient.tsx` (`app/(admin)/catalogo/familias/`, 4,123 líneas):**
   - Seguir literalmente el mapa de la Regla 3.7.7: `use-directorio.ts`, `use-bandeja.ts`, `use-borrador.ts`, `use-stock-semaforo.ts`, `use-refresh-quirurgico.ts` + `ToolbarFamilias.tsx`, `SidebarBandeja.tsx`, `DirectorioCentral.tsx`, `BarraBorrador.tsx`, `InspectorProducto.tsx`, `Modales.tsx`, con queries estrechas por familia en `<Suspense>` por panel.
3. **`OrdenRapidaWizard.tsx` (`app/(admin)/ordenes-b2b/orden-rapida/`, 7,036 líneas):**
   - Extraer `_hooks/use-orden-rapida-parse.ts`, `use-orden-rapida-match.ts`, `use-orden-rapida-cajas.ts`, `use-orden-rapida-submit.ts`.
   - Extraer pasos del wizard en `_components/StepUpload.tsx`, `StepMatchSkus.tsx`, `StepColoresTallas.tsx`, `StepRepartoCajas.tsx`, `StepResumenConfirm.tsx`.

---

## Criterios de Aceptación de Fase 5

- **5A & 5B:** Scripts SQL generados, validados sintácticamente y probados en Sandbox/Staging antes de que el propietario los aplique en Producción; `get_advisors(security)` sin tablas expuestas sin RLS.
- **5C:** Cada componente cliente refactorizado queda `<= 300` líneas sin llamadas directas a `supabase`/`fetch` dentro de `_components/`, con `pnpm typecheck`, `pnpm build` y `vitest` en verde tras cada módulo refactorizado.
