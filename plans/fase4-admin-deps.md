<!-- plans/fase4-admin-deps.md -->
# Plan de Ejecución — Fase 4: Bugs en Admin ERP, Compilación TypeScript y Dependencias

> **Rama objetivo:** `fix/auditoria-inicial`  
> **Referencia maestra:** `plans/revision final.md` (Fase 4)

---

## Sub-fase 4A — Dependencias Críticas (`pnpm audit`) y Compilación `docBuilder.ts` (CRÍTICA)

### 4A.1. Mitigación de las 8 vulnerabilidades críticas (`pnpm audit --audit-level=critical`)
- **Hallazgos actuales verificados:**
  1. `next` (5 advisories críticos, incluyendo RCE en Windows, Image Optimization AVIF/SVG, `next/og` y `use cache`): vulnerable `<=16.4.0`, parcheado `>=16.4.1`.
  2. `dompurify`: vulnerable `<=3.4.16`, parcheado `>=3.4.17`.
  3. `tar`: vulnerable `<=7.5.18`, parcheado `>=7.5.19`.
  4. `proxy-addr`: vulnerable `<2.0.8`, parcheado `>=2.0.8`.
- **Acción:**
  - Seguir la skill `next-upgrade` y las reglas de `AGENTS.md` (3.2.11–3.2.12: `pnpm` obligatorio, revisar `pnpm.onlyBuiltDependencies`).
  - Actualizar `next` y `eslint-config-next` a `>=16.4.5` (última parcheada compatible de la rama 16.x) vía `pnpm`.
  - Agregar/actualizar `pnpm.overrides` en `package.json` para fijar versiones seguras de `dompurify` (`>=3.4.17`), `tar` (`>=7.5.19`) y `proxy-addr` (`>=2.0.8`) si son transitivas, y ejecutar `pnpm install` + `pnpm audit --audit-level=critical`.
  - Verificar que `next build --webpack` siga generando `public/sw.js` (Serwist) y que no haya regresiones en Cache Components (`'use cache'`) ni en `proxy.ts`/middleware.

### 4A.2. Error TypeScript en `docs/generator/docBuilder.ts`
- **Archivo:** `docs/generator/docBuilder.ts` (L193-199).
- **Acción:** agregar `type: 'png'` en `new ImageRun({ type: 'png', data: imagenBuffer, transformation: { width: ancho, height: alto } })` para compatibilidad con la versión actual de `docx`.

---

## Sub-fase 4B — Bugs Funcionales en Admin ERP y Optimización de Bundle

### 4B.1. Matriz de Stock Móvil y Header Flotante (`app/(admin)/inventario/bodegas/matriz/`)
- **`StockMatrixMobileTable.tsx`:**
  - Corregir `itemVisibleTotal` en modo `isPronostico` para sumar `cell?.pronosticado ?? cell?.total ?? 0` en lugar de ignorar el pronóstico.
- **`use-header-flotante.ts`:**
  - Corregir la sincronización/posicionamiento `sticky left-0` del encabezado flotante al hacer scroll horizontal para que las columnas fijas no se desfasen respecto al cuerpo de la tabla.

### 4B.2. Carga dinámica de `exceljs` (Bundle Size)
- **`app/(admin)/inventario/stock/StockTable.tsx` (L12)** y **`StockMatrixTable.tsx`:**
  - Reemplazar `import ExcelJS from 'exceljs'` estático en el top-level por `const ExcelJS = (await import('exceljs')).default` dentro de los handlers de exportación (Regla 3.7.3).

### 4B.3. Trazabilidad: Timezone México y Chunks ≤ 200 (`modules/inventario/trazabilidad.ts`)
- **`resolverRangoFechas()` (L202-244):**
  - Reemplazar cálculos manuales de fecha/UTC por `todayMX()` y `dateInputToMexicoUTC()` de `lib/utils.ts` (Regla 3.5).
- **Queries con `.in('producto_id', ...)` (L390, L469, L485, L520, L578, L1060):**
  - Dividir los arreglos de `productosIds` en chunks `<= 200` (Regla 3.7.2) y combinar resultados con `Promise.all` acotado para evitar truncados o URLs excesivas en PostgREST.

---

## Sub-fase 4C — Skeletons Inmediatos (`loading.tsx` en `app/(admin)`)

- Crear `loading.tsx` (skeleton ligero inmediato reutilizando `@/components/ui/skeleton`, Regla 3.4.5) en las rutas admin faltantes detectadas:
  1. `app/(admin)/catalogo/catalogos/loading.tsx`
  2. `app/(admin)/configuracion/auditoria_producto/loading.tsx`
  3. `app/(admin)/configuracion/roles/loading.tsx`
  4. `app/(admin)/configuracion/tablas/loading.tsx`
  5. `app/(admin)/despachos/nuevo/loading.tsx`
  6. `app/(admin)/ecommerce/config/loading.tsx`
  7. `app/(admin)/ecommerce/ordenes-venta/loading.tsx`
  8. `app/(admin)/ecommerce/productos-web/loading.tsx`
  9. `app/(admin)/inventario/notas/nueva/loading.tsx`
  10. `app/(admin)/inventario/notas/propuestas/loading.tsx`
  11. `app/(admin)/ordenes-b2b/cajas/loading.tsx`
  12. `app/(admin)/ordenes-b2b/orden-rapida/loading.tsx`
  13. `app/(admin)/unauthorized/loading.tsx` *(opcional ligero)*

---

## Criterios de Aceptación y Verificación de Fase 4

- `pnpm audit --audit-level=critical` → **0 vulnerabilidades críticas**.
- `pnpm typecheck` → **0 errores**.
- `pnpm build` (`next build --webpack`) → compilación limpia y generación de `public/sw.js`.
- `pnpm exec vitest run tests/unit` → pruebas unitarias en verde (incluyendo tests nuevos para `resolverRangoFechas` / chunking si aplica).
- Todo archivo nuevo o editado incluye su ruta en la primera línea (Regla 3.2.10).
