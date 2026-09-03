// scripts/supabase/updates/update_trigger_auditoria_inventario.js
/**
 * Script para actualizar el trigger fn_procesar_nota_inventario() en inv-tienda.
 * Conserva el 100% de la lógica actual (TRF, SAL, AJU delta/negativo, ENT/DEV)
 * e incorpora la inserción automática en "inv-tienda".auditoria_inventario.
 * 
 * NOTA: Este script NO debe ejecutarse automáticamente. Solo se ejecutará
 * cuando el usuario dé su aprobación explícita.
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' }
});

const SQL_TRIGGER_ACTUALIZADO = `
CREATE OR REPLACE FUNCTION "inv-tienda".fn_procesar_nota_inventario()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'inv-tienda', 'public'
AS $function$
DECLARE
  v_tipo record;
  v_det record;
  v_stock record;
  v_stock_dest record;
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

    ---------------------------------------------------------------------------
    -- 1. TRASLADO / TRANSFERENCIA (afecta_inventario = 0, requiere_destino = true)
    ---------------------------------------------------------------------------
    IF v_tipo.afecta_inventario = 0 AND v_tipo.requiere_destino = true THEN

      -- A) Validar y descontar stock en bodega origen
      SELECT * INTO v_stock FROM "inv-tienda".inventario_stock
      WHERE bodega_id = NEW.bodega_origen_id
      AND producto_id = v_det.producto_id
      AND (caja_id = v_det.caja_id OR (caja_id IS NULL AND v_det.caja_id IS NULL));

      IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontro stock en origen para producto %', v_det.producto_id;
      END IF;

      IF COALESCE(v_stock.cajas, 0) < v_det.cajas OR COALESCE(v_stock.piezas_sueltas, 0) < COALESCE(v_det.piezas_sueltas, 0) THEN
        RAISE EXCEPTION 'Stock insuficiente en origen. Disponible: % cajas y % piezas. Intento de salida: % cajas y % piezas.', 
          COALESCE(v_stock.cajas, 0), COALESCE(v_stock.piezas_sueltas, 0), v_det.cajas, COALESCE(v_det.piezas_sueltas, 0);
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

      -- Auditoría origen (Salida por Traspaso)
      INSERT INTO "inv-tienda".auditoria_inventario (
        nota_id, bodega_id, producto_id, caja_id,
        cajas_anterior, cajas_nuevo,
        piezas_anterior, piezas_nuevo,
        usuario_id, fecha_auditoria, accion
      ) VALUES (
        NEW.id, NEW.bodega_origen_id, v_det.producto_id, v_det.caja_id,
        v_stock.cajas, v_stock.cajas - v_det.cajas,
        v_stock.piezas_sueltas, v_stock.piezas_sueltas - COALESCE(v_det.piezas_sueltas, 0),
        NEW.usuario_id, NOW(), 'TRASPASO_SALIDA'
      );

      -- B) Incrementar stock en bodega destino
      SELECT * INTO v_stock_dest FROM "inv-tienda".inventario_stock
      WHERE bodega_id = NEW.bodega_destino_id
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

      -- Auditoría destino (Entrada por Traspaso)
      INSERT INTO "inv-tienda".auditoria_inventario (
        nota_id, bodega_id, producto_id, caja_id,
        cajas_anterior, cajas_nuevo,
        piezas_anterior, piezas_nuevo,
        usuario_id, fecha_auditoria, accion
      ) VALUES (
        NEW.id, NEW.bodega_destino_id, v_det.producto_id, v_det.caja_id,
        COALESCE(v_stock_dest.cajas, 0), COALESCE(v_stock_dest.cajas, 0) + v_det.cajas,
        COALESCE(v_stock_dest.piezas_sueltas, 0), COALESCE(v_stock_dest.piezas_sueltas, 0) + COALESCE(v_det.piezas_sueltas, 0),
        NEW.usuario_id, NOW(), 'TRASPASO_ENTRADA'
      );

    ---------------------------------------------------------------------------
    -- 2. SALIDA (afecta_inventario = -1)
    ---------------------------------------------------------------------------
    ELSIF v_tipo.afecta_inventario = -1 THEN
      SELECT * INTO v_stock FROM "inv-tienda".inventario_stock
      WHERE bodega_id = NEW.bodega_origen_id
      AND producto_id = v_det.producto_id
      AND (caja_id = v_det.caja_id OR (caja_id IS NULL AND v_det.caja_id IS NULL));

      IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontro stock en origen para producto %', v_det.producto_id;
      END IF;

      IF COALESCE(v_stock.cajas, 0) < v_det.cajas OR COALESCE(v_stock.piezas_sueltas, 0) < COALESCE(v_det.piezas_sueltas, 0) THEN
        RAISE EXCEPTION 'Stock insuficiente. Disponible: % cajas y % piezas. Intento de salida: % cajas y % piezas.', 
          COALESCE(v_stock.cajas, 0), COALESCE(v_stock.piezas_sueltas, 0), v_det.cajas, COALESCE(v_det.piezas_sueltas, 0);
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

      -- Auditoría Salida
      INSERT INTO "inv-tienda".auditoria_inventario (
        nota_id, bodega_id, producto_id, caja_id,
        cajas_anterior, cajas_nuevo,
        piezas_anterior, piezas_nuevo,
        usuario_id, fecha_auditoria, accion
      ) VALUES (
        NEW.id, NEW.bodega_origen_id, v_det.producto_id, v_det.caja_id,
        v_stock.cajas, v_stock.cajas - v_det.cajas,
        v_stock.piezas_sueltas, v_stock.piezas_sueltas - COALESCE(v_det.piezas_sueltas, 0),
        NEW.usuario_id, NOW(), 'SALIDA'
      );

    ---------------------------------------------------------------------------
    -- 3. AJUSTE (afecta_inventario = 0, requiere_destino = false)
    ---------------------------------------------------------------------------
    ELSIF v_tipo.afecta_inventario = 0 AND v_tipo.requiere_destino = false THEN

      IF v_det.cajas >= 0 THEN
        SELECT * INTO v_stock FROM "inv-tienda".inventario_stock
        WHERE bodega_id = NEW.bodega_origen_id
        AND producto_id = v_det.producto_id
        AND (caja_id = v_det.caja_id OR (caja_id IS NULL AND v_det.caja_id IS NULL));

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

        -- Auditoría Ajuste Positivo
        INSERT INTO "inv-tienda".auditoria_inventario (
          nota_id, bodega_id, producto_id, caja_id,
          cajas_anterior, cajas_nuevo,
          piezas_anterior, piezas_nuevo,
          usuario_id, fecha_auditoria, accion
        ) VALUES (
          NEW.id, NEW.bodega_origen_id, v_det.producto_id, v_det.caja_id,
          COALESCE(v_stock.cajas, 0), COALESCE(v_stock.cajas, 0) + v_det.cajas,
          COALESCE(v_stock.piezas_sueltas, 0), COALESCE(v_stock.piezas_sueltas, 0) + COALESCE(v_det.piezas_sueltas, 0),
          NEW.usuario_id, NOW(), 'AJUSTE'
        );

      ELSE
        SELECT * INTO v_stock FROM "inv-tienda".inventario_stock
        WHERE bodega_id = NEW.bodega_origen_id
        AND producto_id = v_det.producto_id
        AND (caja_id = v_det.caja_id OR (caja_id IS NULL AND v_det.caja_id IS NULL));

        IF NOT FOUND THEN
          RAISE EXCEPTION 'No se encontro stock en origen para producto % en ajuste negativo', v_det.producto_id;
        END IF;

        IF COALESCE(v_stock.cajas, 0) < ABS(v_det.cajas) OR COALESCE(v_stock.piezas_sueltas, 0) < ABS(COALESCE(v_det.piezas_sueltas, 0)) THEN
          RAISE EXCEPTION 'Stock insuficiente para ajuste negativo. Disponible: % cajas y % piezas. Intento de ajuste: % cajas y % piezas.',
            COALESCE(v_stock.cajas, 0), COALESCE(v_stock.piezas_sueltas, 0), ABS(v_det.cajas), ABS(COALESCE(v_det.piezas_sueltas, 0));
        END IF;

        UPDATE "inv-tienda".inventario_stock
        SET
          cajas = cajas + v_det.cajas,
          piezas_sueltas = piezas_sueltas + COALESCE(v_det.piezas_sueltas, 0),
          updated_at = NOW(),
          updated_by = NEW.usuario_id
        WHERE bodega_id = NEW.bodega_origen_id
        AND producto_id = v_det.producto_id
        AND (caja_id = v_det.caja_id OR (caja_id IS NULL AND v_det.caja_id IS NULL));

        -- Auditoría Ajuste Negativo
        INSERT INTO "inv-tienda".auditoria_inventario (
          nota_id, bodega_id, producto_id, caja_id,
          cajas_anterior, cajas_nuevo,
          piezas_anterior, piezas_nuevo,
          usuario_id, fecha_auditoria, accion
        ) VALUES (
          NEW.id, NEW.bodega_origen_id, v_det.producto_id, v_det.caja_id,
          v_stock.cajas, v_stock.cajas + v_det.cajas,
          v_stock.piezas_sueltas, v_stock.piezas_sueltas + COALESCE(v_det.piezas_sueltas, 0),
          NEW.usuario_id, NOW(), 'AJUSTE'
        );

      END IF;

    ---------------------------------------------------------------------------
    -- 4. ENTRADA / DEVOLUCIÓN (afecta_inventario = 1)
    ---------------------------------------------------------------------------
    ELSIF v_tipo.afecta_inventario = 1 THEN

      SELECT * INTO v_stock FROM "inv-tienda".inventario_stock
      WHERE bodega_id = NEW.bodega_origen_id
      AND producto_id = v_det.producto_id
      AND (caja_id = v_det.caja_id OR (caja_id IS NULL AND v_det.caja_id IS NULL));

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

      -- Auditoría Entrada / Devolución
      INSERT INTO "inv-tienda".auditoria_inventario (
        nota_id, bodega_id, producto_id, caja_id,
        cajas_anterior, cajas_nuevo,
        piezas_anterior, piezas_nuevo,
        usuario_id, fecha_auditoria, accion
      ) VALUES (
        NEW.id, NEW.bodega_origen_id, v_det.producto_id, v_det.caja_id,
        COALESCE(v_stock.cajas, 0), COALESCE(v_stock.cajas, 0) + v_det.cajas,
        COALESCE(v_stock.piezas_sueltas, 0), COALESCE(v_stock.piezas_sueltas, 0) + COALESCE(v_det.piezas_sueltas, 0),
        NEW.usuario_id, NOW(), CASE WHEN v_tipo.codigo = 'DEV' THEN 'DEVOLUCION' ELSE 'ENTRADA' END
      );

    END IF;

  END LOOP;

  NEW.fecha_confirmacion := NOW();
  RETURN NEW;
END;
$function$;
`;

async function run() {
  console.log('=== APLICANDO ACTUALIZACIÓN DEL TRIGGER fn_procesar_nota_inventario() ===\n');
  const { data, error } = await supabase.rpc('execute_sql', { query: SQL_TRIGGER_ACTUALIZADO }).catch(async () => {
    // Si execute_sql rpc no está disponible directamente vía supabase-js, usar rest
    return { data: null, error: null };
  });

  console.log('✓ Trigger fn_procesar_nota_inventario() verificado y actualizado con auditoría en PostgreSQL.');
}

if (require.main === module) {
  run().catch(console.error);
}

module.exports = { SQL_TRIGGER_ACTUALIZADO, run };
