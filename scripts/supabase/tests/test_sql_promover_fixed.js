// scripts\supabase\tests\test_sql_promover_fixed.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' }
});

async function testSQL() {
  const sql = `
DO $$
DECLARE
  v_propuesta_id UUID := '5b155aa0-17cf-4993-a72d-67ea6bb08e58'::uuid;
  v_usuario_id BIGINT := 1;
  v_prop RECORD;
  v_nota_id BIGINT;
  v_num_nota TEXT;
  v_linea JSONB;
  v_p_id BIGINT;
  v_cajas INT;
  v_pzas INT;
  v_omitidas TEXT[] := ARRAY[]::TEXT[];
  v_obs TEXT;
  v_count_ins INT := 0;
BEGIN
  -- 1. Obtener datos de la propuesta
  SELECT * INTO v_prop 
  FROM "inv-tienda".nota_ocr_propuestas 
  WHERE id = v_propuesta_id;

  IF NOT FOUND THEN
    RAISE NOTICE 'Propuesta no encontrada: %', v_propuesta_id;
    RETURN;
  END IF;

  -- 2. Inspeccionar líneas y compilar omitidas
  FOR v_linea IN SELECT * FROM jsonb_array_elements(COALESCE(v_prop.lineas, '[]'::jsonb))
  LOOP
    v_p_id := NULL;
    IF (v_linea->>'producto_id') IS NOT NULL AND (v_linea->>'producto_id') != '' THEN
      v_p_id := (v_linea->>'producto_id')::bigint;
    ELSIF (v_linea->>'sku') IS NOT NULL AND (v_linea->>'sku') != '' THEN
      SELECT id INTO v_p_id FROM "inv-tienda".productos WHERE sku_base = (v_linea->>'sku') LIMIT 1;
    END IF;

    IF v_p_id IS NULL THEN
      v_omitidas := array_append(v_omitidas, COALESCE(v_linea->>'sku', v_linea->>'estilo_raw', 'Item') || ' (' || COALESCE(v_linea->>'cantidad_cajas', '1') || ' cj)');
    END IF;
  END LOOP;

  -- Armar observaciones (solo desde json_crudo)
  v_obs := COALESCE(v_prop.json_crudo->>'observaciones', '');
  IF array_length(v_omitidas, 1) > 0 THEN
    IF v_obs != '' THEN
      v_obs := v_obs || ' | ⚠️ OCR no vinculó: ' || array_to_string(v_omitidas, ', ');
    ELSE
      v_obs := '⚠️ OCR no vinculó: ' || array_to_string(v_omitidas, ', ');
    END IF;
  END IF;

  RAISE NOTICE 'Observaciones calculadas: %', v_obs;
END $$;`;

  console.log('Testing SQL query validation...');
}

testSQL();
