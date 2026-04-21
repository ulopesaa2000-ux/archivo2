const http = require('http');

const sql = `CREATE OR REPLACE FUNCTION "inv-tienda".fn_procesar_nota_inventario()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_tipo record;
  v_det record;
  v_stock record;
BEGIN
  IF NEW.estado_id = OLD.estado_id THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "inv-tienda".cat_estados_nota
    WHERE id = NEW.estado_id AND codigo = 'CONF'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_tipo FROM "inv-tienda".cat_tipos_movimiento WHERE id = NEW.tipo_movimiento_id;

  FOR v_det IN (SELECT * FROM "inv-tienda".nota_detalle_productos WHERE nota_id = NEW.id) LOOP
    IF v_tipo.afecta_inventario = 0 AND v_tipo.requiere_destino = true THEN
      
      SELECT * INTO v_stock FROM "inv-tienda".inventario_stock
      WHERE bodega_id = NEW.bodega_origen_id
      AND producto_id = v_det.producto_id
      AND (caja_id = v_det.caja_id OR (caja_id IS NULL AND v_det.caja_id IS NULL));
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontro stock en origen para producto %', v_det.producto_id;
      END IF;

      IF COALESCE(v_stock.cajas, 0) < v_det.cajas OR COALESCE(v_stock.piezas_sueltas, 0) < COALESCE(v_det.piezas_sueltas, 0) THEN
        RAISE EXCEPTION 'Stock insuficiente. Disponible: % cajas y % piezas. Intento de salida: % cajas y % piezas.', COALESCE(v_stock.cajas, 0), COALESCE(v_stock.piezas_sueltas, 0), v_det.cajas, COALESCE(v_det.piezas_sueltas, 0);
      END IF;

      UPDATE "inv-tienda".inventario_stock
      SET 
        cajas = cajas - v_det.cajas,
        piezas_sueltas = piezas_sueltas - COALESCE(v_det.piezas_sueltas, 0),
        updated_at = NOW(),
        updated_by = NEW.usuario_id
      WHERE bodega_id = NEW.bodega_origen_id
      AND producto_id = v_det.producto_id
      AND (caja_id = v_det.caja_id OR (caja_id IS NULL AND v_det.caja_id IS NULL));

      UPDATE "inv-tienda".inventario_stock
      SET 
        cajas = cajas + v_det.cajas,
        piezas_sueltas = piezas_sueltas + COALESCE(v_det.piezas_sueltas, 0),
        updated_at = NOW(),
        updated_by = NEW.usuario_id
      WHERE bodega_id = NEW.bodega_destino_id
      AND producto_id = v_det.producto_id
      AND (caja_id = v_det.caja_id OR (caja_id IS NULL AND v_det.caja_id IS NULL));

      IF NOT FOUND THEN
        INSERT INTO "inv-tienda".inventario_stock (bodega_id, producto_id, caja_id, cajas, piezas_sueltas, created_by, updated_by)
        VALUES (NEW.bodega_destino_id, v_det.producto_id, v_det.caja_id, v_det.cajas, COALESCE(v_det.piezas_sueltas, 0), NEW.usuario_id, NEW.usuario_id);
      END IF;

    ELSIF v_tipo.afecta_inventario = -1 THEN
      SELECT * INTO v_stock FROM "inv-tienda".inventario_stock
      WHERE bodega_id = NEW.bodega_origen_id
      AND producto_id = v_det.producto_id
      AND (caja_id = v_det.caja_id OR (caja_id IS NULL AND v_det.caja_id IS NULL));
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontro stock en origen para producto %', v_det.producto_id;
      END IF;

      IF COALESCE(v_stock.cajas, 0) < v_det.cajas OR COALESCE(v_stock.piezas_sueltas, 0) < COALESCE(v_det.piezas_sueltas, 0) THEN
        RAISE EXCEPTION 'Stock insuficiente. Disponible: % cajas y % piezas. Intento de salida: % cajas y % piezas.', COALESCE(v_stock.cajas, 0), COALESCE(v_stock.piezas_sueltas, 0), v_det.cajas, COALESCE(v_det.piezas_sueltas, 0);
      END IF;

      UPDATE "inv-tienda".inventario_stock
      SET 
        cajas = cajas - v_det.cajas,
        piezas_sueltas = piezas_sueltas - COALESCE(v_det.piezas_sueltas, 0),
        updated_at = NOW(),
        updated_by = NEW.usuario_id
      WHERE bodega_id = NEW.bodega_origen_id
      AND producto_id = v_det.producto_id
      AND (caja_id = v_det.caja_id OR (caja_id IS NULL AND v_det.caja_id IS NULL));
      
    ELSIF v_tipo.afecta_inventario = 1 THEN
      UPDATE "inv-tienda".inventario_stock
      SET 
        cajas = cajas + v_det.cajas,
        piezas_sueltas = piezas_sueltas + COALESCE(v_det.piezas_sueltas, 0),
        updated_at = NOW(),
        updated_by = NEW.usuario_id
      WHERE bodega_id = NEW.bodega_origen_id
      AND producto_id = v_det.producto_id
      AND (caja_id = v_det.caja_id OR (caja_id IS NULL AND v_det.caja_id IS NULL));

      IF NOT FOUND THEN
        INSERT INTO "inv-tienda".inventario_stock (bodega_id, producto_id, caja_id, cajas, piezas_sueltas, created_by, updated_by)
        VALUES (NEW.bodega_origen_id, v_det.producto_id, v_det.caja_id, v_det.cajas, COALESCE(v_det.piezas_sueltas, 0), NEW.usuario_id, NEW.usuario_id);
      END IF;
    END IF;
  END LOOP;

  NEW.fecha_confirmacion := NOW();
  RETURN NEW;
END;
$function$;`;

const payload = JSON.stringify({
  jsonrpc: "2.0",
  id: 16,
  method: "tools/call",
  params: { name: "execute_sql", arguments: { query: sql } }
});

const req = http.request({ hostname: 'localhost', port: 8080, path: '/mcp', method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' } }, res => {
  let data = ''; res.on('data', d => data += d); res.on('end', () => console.log(data));
});
req.write(payload);
req.end();
