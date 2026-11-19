# Plan de Corrección: Reinicio de Bodega a Cero y Limpieza de Piezas Sueltas

> **Fecha:** 19 de Noviembre de 2026  
> **Objetivo:** Documentar y planificar la solución integral para que el reinicio de bodega a 0 (operativo vía notas `AJU` $\rightarrow$ `CONF`) funcione al 100% sin romper el stock histórico ni disparar violaciones de constraints en Postgres.

---

## 1. Contexto y Diagnóstico del Problema

### 1.1 El Bloqueo en Postgres
1. **Flujo de reinicio actual:** Tanto en `/configuracion/inventario` (`resetStockCeroBodegaAction`) como en la casilla de Importar Stock (`resetStockParaImportacionAction`), el sistema busca productos con existencias distintas de cero:
   ```ts
   // modules/config/inventory-reset-actions.ts
   .or('cajas.neq.0,piezas_sueltas.neq.0')
   ```
2. **Generación de nota `AJU`:** Para poner la bodega en cero, genera una nota de ajuste negativa mediante `sp_crear_nota` y agrega los productos con `sp_agregar_producto_nota`:
   ```ts
   p_cajas: -row.cajas,
   p_piezas_sueltas: -row.piezas_sueltas,
   ```
3. **El conflicto:** La tabla `"inv-tienda".nota_detalle_productos` tiene la restricción:
   ```sql
   CONSTRAINT chk_detalle_piezas_no_negativas CHECK (piezas_sueltas >= 0)
   ```
   Si una bodega contiene cualquier producto con `piezas_sueltas > 0`, el código intenta enviar un número negativo (`-row.piezas_sueltas`), lo cual es **rechazado inmediatamente por Postgres**, provocando que el reinicio de esa bodega aborte por completo.

### 1.2 Estado Actual en Bases de Datos (Auditado)
Tanto en **Sandbox** (`exualhkodjmjlijhlgiz`) como en **Producción**, existen exactamente **15 filas** con `piezas_sueltas <> 0` en `"inv-tienda".inventario_stock`:
* **Bodega 6 (`SAN DIEGO 1`):** 13 filas (51 piezas sueltas acumuladas).
* **Bodega 10 (`COCINA`):** 2 filas (49 piezas sueltas acumuladas).
* *Todas las demás bodegas tienen `piezas_sueltas = 0`.*

### 1.3 Compatibilidad con el Stock Histórico
* **Regla de negocio (AGENTS.md 3.1 y 3.7.1):** La unidad única y oficial de stock del sistema son **exclusivamente CAJAS**.
* `lib/inventario/stock-historico.ts` ignora deliberadamente `piezas_sueltas` en la reconstrucción del Kardex y en los rollbacks temporales.
* **Cuidado con `updated_at`:** La tabla `inventario_stock` tiene un trigger `update_inventario_updated_at` que actualiza `updated_at = NOW()`. El detector de auditoría `detectarAjustesDirectos()` en el histórico alerta si más de 5 filas de una bodega cambian el mismo día sin una nota confirmada. Por ello, la limpieza debe **preservar el timestamp original**.

---

## 2. Plan de Ejecución (Paso a Paso)

### Fase 1: Limpieza en Base de Datos (SQL)
Ejecutar el script transaccional en Sandbox primero y, tras verificación, en Producción.

```sql
BEGIN;

-- 1. Verificación previa de las 15 filas afectadas
SELECT id, bodega_id, producto_id, cajas, piezas_sueltas, updated_at
FROM "inv-tienda".inventario_stock
WHERE COALESCE(piezas_sueltas, 0) <> 0
ORDER BY bodega_id, producto_id;

-- 2. Deshabilitar temporalmente el trigger para no alterar updated_at
--    (Previene falsos positivos en el detector de Stock Histórico)
ALTER TABLE "inv-tienda".inventario_stock 
    DISABLE TRIGGER update_inventario_updated_at;

-- 3. Llevar piezas sueltas a 0 conservando cajas y fechas intactas
UPDATE "inv-tienda".inventario_stock
SET piezas_sueltas = 0
WHERE COALESCE(piezas_sueltas, 0) <> 0;

-- 4. Reactivar el trigger
ALTER TABLE "inv-tienda".inventario_stock 
    ENABLE TRIGGER update_inventario_updated_at;

-- 5. Verificación final: debe devolver 0
SELECT COUNT(*) AS pendientes
FROM "inv-tienda".inventario_stock
WHERE COALESCE(piezas_sueltas, 0) <> 0;

COMMIT;
```

---

### Fase 2: Blindaje en Código TypeScript (`inventory-reset-actions.ts`)
Para evitar que en el futuro cualquier pieza residual rompa el reseteo:

1. **Ajuste en `resetBodegaViaNotaAju` (`modules/config/inventory-reset-actions.ts`):**
   * En `sp_agregar_producto_nota`, forzar `p_piezas_sueltas: 0` (cumple siempre `chk_detalle_piezas_no_negativas`).
   * Como el sistema opera en "Modo solo cajas", el movimiento de ajuste solo debe descontar cajas (`p_cajas: -row.cajas`).
2. **Cierre de piezas residuales en la verificación:**
   * Si una fila legacy tuviese piezas, tras la confirmación de la nota `AJU`, asegurar que no bloquee el ciclo de `pendingRows` si las cajas ya llegaron a cero.

---

### Fase 3: Pruebas y Validación (Sandbox)

1. **Comprobar lectura:**
   * Correr query de validación en Sandbox para confirmar que `COUNT(*) FILTER (WHERE piezas_sueltas <> 0) = 0`.
2. **Prueba de Reinicio de Bodega a 0:**
   * En `/configuracion/inventario`, ejecutar un reseteo simulado (`dry-run`) y luego uno real en una bodega de prueba en Sandbox.
   * Verificar que la nota `AJU` se cree con estado `CONF` sin errores de Postgres.
3. **Prueba de Importación con Reinicio:**
   * En `/inventario/stock` $\rightarrow$ "Importar stock" (Modo Delta).
   * Marcar la casilla *"Poner en stock 0 la bodega antes de importar"*.
   * Verificar que:
     - El reseteo a 0 se ejecute de forma limpia.
     - Se cree la nota de entrada `ENT` con los productos importados.
4. **Verificación de Stock Histórico:**
   * Ejecutar suite de pruebas:
     ```bash
     pnpm vitest run tests/unit/stock-historico.test.ts tests/integration/stock-historico-db.test.ts
     ```
   * Confirmar en la pantalla de histórico que la bodega muestre sus saldos correctos para fechas anteriores y posteriores al reinicio, sin advertencias de inconsistencia ni falsos ajustes directos.

---

## 3. Criterios de Aceptación

- [ ] 0 filas con `piezas_sueltas <> 0` en `inventario_stock`.
- [ ] La acción `resetStockCeroBodegaAction` procesa exitosamente bodegas que antes fallaban (Bodega 6 y 10).
- [ ] La importación masiva con casilla de "Reinicio previo a 0" completa sin abortar.
- [ ] El módulo de Stock Histórico / Kardex cuadra perfectamente con las notas confirmadas y no emite alertas de descuadre.
