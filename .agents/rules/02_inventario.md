# Regla 02: Inventario, Notas de Movimiento y Bodegas

## 1. Alcance del Bloque
Control integral de existencias físicas y virtuales, registro de movimientos auditados mediante notas de inventario, despachos, transferencias entre bodegas y pronósticos de stock.

---

## 2. Reglas Inquebrantables de Inventario

1. **NUNCA modificar `inventario_stock` directamente:**
   Cualquier entrada, salida, ajuste, transferencia, despacho o merma debe registrarse exclusivamente a través de la tabla `notas_inventario` y sus detalles `nota_detalles`.
2. **Trigger Automático `fn_procesar_nota_inventario`:**
   El stock solo se altera cuando una nota de inventario cambia su estado a `CONF` (Confirmada).
3. **Unidad de Stock a Nivel Producto:**
   El stock operativo se rastrea a nivel de `inventario_stock.producto_id` (combinado con `bodega_id`), manteniendo la coherencia con el empaque y cajas.

---

## 3. Notas de Movimiento (`notas_inventario`)

### Tipos de Movimiento:
- `ENT` (Entrada): Recepción de mercancía, importaciones, devoluciones.
- `SAL` (Salida): Venta, merma, consumo interno.
- `TRAS` (Traspaso): Movimiento entre bodega origen y bodega destino.
- `AJUS` (Ajuste): Regularización física tras auditoría o conteo cíclico.
- `DESP` (Despacho): Salida formalizada para entrega o distribución B2B/Ecommerce.

### Flujo de Ejecución:
1. Creación de la nota vía stored procedure (`rpc('sp_crear_nota', ...)`).
2. Adición de renglones/productos vía (`rpc('sp_agregar_producto_nota', ...)`).
3. Confirmación: `UPDATE notas_inventario SET estado_id = 'CONF' WHERE id = ...` (lo que dispara el trigger de actualización de stock).
4. Cancelación segura: En caso necesario, invocación de `rpc('sp_cancelar_nota', ...)`.

---

## 4. Bodegas Físicas y Virtuales

- `bodegas`: Almacenes del sistema (`codigo`, `nombre`, `es_virtual`, `activo`).
- **Bodegas Virtuales (`es_virtual = true`):**
  - Utilizadas para mercancía en tránsito, reservas de preventa, o inventario asignado a canales digitales antes de su consolidación física.
- **Control de Acceso a Bodegas:**
  - Evaluado mediante `usuario_bodegas` y la función `fn_puede_acceder_bodega`.
  - Los usuarios con nivel ≥ 3 solo pueden consultar y registrar notas en las bodegas que tengan explícitamente autorizadas.

---

## 5. Visualización y Matriz de Stock
- Vistas de stock consolidado por bodega (`/inventario/stock`).
- Matriz interactiva de existencias y pronósticos de agotamiento calculados por bodega y por producto.
