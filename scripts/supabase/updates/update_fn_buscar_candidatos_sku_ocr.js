// scripts/supabase/updates/update_fn_buscar_candidatos_sku_ocr.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' },
});

const sql = `
CREATE OR REPLACE FUNCTION "inv-tienda".fn_buscar_candidatos_sku_ocr(p_lineas jsonb)
 RETURNS TABLE(linea_index integer, sku_buscado text, producto_id integer, variante_id integer, sku_base text, sku_completo text, descripcion text, pz_en_caja integer, score numeric, metodo text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_elem            jsonb;
  v_idx             int;
  v_raw             text;
  v_limpio          text;
  v_desc            text;
  v_es_moti         boolean;
  v_es_and          boolean;
  v_es_nr           boolean;
  v_patron_and      text;
  v_patron_ho       text;
  v_patron_genero   text;
  v_alt_variantes   text[];
BEGIN
  -- Iterar sobre cada línea enviada en el JSON
  FOR v_idx IN 0 .. jsonb_array_length(p_lineas) - 1
  LOOP
    v_elem := p_lineas->v_idx;
    
    -- Extraer texto representativo del SKU
    v_raw := coalesce(
      nullif(v_elem->>'sku', ''),
      nullif(v_elem->>'estilo_raw', ''),
      nullif(v_elem->>'descripcion_raw', '')
    );
    
    IF v_raw IS NULL OR trim(v_raw) = '' THEN
      CONTINUE;
    END IF;

    -- Normalizar SKU eliminando espacios, puntos, comas, guiones y barras
    v_limpio := upper(regexp_replace(v_raw, '[\\s\\.\\,\\-\\/]+', '', 'g'));
    
    -- Detectar familias estrictas
    v_es_moti := v_limpio ~ '^(3JA|3VT|1AK)\\d{3,5}$';
    v_es_and  := v_limpio ~ '^AND\\d{6}$';
    v_es_nr   := v_limpio ~ '^NR\\d{4}';

    -- ── Segundo Repaso: Patrones OCR y Género ──
    v_patron_and := NULL;
    IF v_limpio ~ '^(A00|A0O|AOD|A0D|AD)\\d{6}$' THEN
      v_patron_and := 'AND' || substring(v_limpio from '\\d{6}$');
    END IF;

    v_patron_ho := NULL;
    IF v_limpio ~ '^H0\\d{2}' THEN
      v_patron_ho := 'HO' || substring(v_limpio from 3);
    END IF;

    v_patron_genero := NULL;
    IF v_limpio ~ 'HW$' THEN
      v_patron_genero := regexp_replace(v_limpio, 'HW$', 'MW');
    ELSIF v_limpio ~ 'MW$' THEN
      v_patron_genero := regexp_replace(v_limpio, 'MW$', 'HW');
    ELSIF v_limpio ~ 'HC$' THEN
      v_patron_genero := regexp_replace(v_limpio, 'HC$', 'MC');
    ELSIF v_limpio ~ 'MC$' THEN
      v_patron_genero := regexp_replace(v_limpio, 'MC$', 'HC');
    ELSIF v_limpio ~ 'HD$' THEN
      v_patron_genero := regexp_replace(v_limpio, 'HD$', 'MD');
    ELSIF v_limpio ~ 'MD$' THEN
      v_patron_genero := regexp_replace(v_limpio, 'MD$', 'HD');
    ELSIF v_limpio ~ 'H$' THEN
      v_patron_genero := regexp_replace(v_limpio, 'H$', 'M');
    ELSIF v_limpio ~ 'M$' THEN
      v_patron_genero := regexp_replace(v_limpio, 'M$', 'H');
    END IF;

    -- Extraer posibles variantes de la IA si existen
    v_alt_variantes := ARRAY[]::text[];
    IF v_elem ? 'posibles_variantes' AND jsonb_typeof(v_elem->'posibles_variantes') = 'array' THEN
      SELECT coalesce(array_agg(upper(regexp_replace(x, '[\\s\\.\\,\\-\\/]+', '', 'g'))), ARRAY[]::text[])
      INTO v_alt_variantes
      FROM jsonb_array_elements_text(v_elem->'posibles_variantes') AS x
      WHERE x IS NOT NULL AND trim(x) <> '';
    END IF;

    v_desc := upper(coalesce(
      nullif(v_elem->>'descripcion_texto', ''),
      nullif(v_elem->>'descripcion_raw', ''),
      ''
    ));

    RETURN QUERY
    WITH matches AS (
      -- 1. Coincidencias en productos base
      SELECT 
        (coalesce(v_elem->>'index', v_idx::text))::int AS m_linea_index,
        v_raw AS m_sku_buscado,
        p.id AS m_producto_id,
        NULL::int AS m_variante_id,
        p.sku_base::text AS m_sku_base,
        NULL::text AS m_sku_completo,
        coalesce(p.descripcion, p.nombre, '')::text AS m_descripcion,
        coalesce(p.pz_en_caja, 0)::int AS m_pz_en_caja,
        CASE
          -- 1A. Match Exacto Absoluto (cadena completa limpia) -> 1.00 (VERDE)
          WHEN upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')) = v_limpio THEN 1.00::numeric

          -- 1B. Match Exacto de Token en SKU compuesto -> 1.00 (VERDE)
          WHEN p.sku_base ~* ('\\y' || v_limpio || '\\y') 
               OR (upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')) LIKE ('%' || v_limpio || '%') 
                   AND (v_es_moti OR v_es_and OR v_es_nr)) THEN 1.00::numeric

          -- 2A. Segundo Repaso: Corrección de Patrón OCR (A00->AND, H0->HO) -> 0.85 (AMARILLO)
          WHEN v_patron_and IS NOT NULL AND upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')) = v_patron_and THEN 0.85::numeric
          WHEN v_patron_ho IS NOT NULL AND upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')) = v_patron_ho THEN 0.85::numeric

          -- 2B. Segundo Repaso: Alternancia de Género (HW<->MW, HC<->MC) -> 0.85 (AMARILLO)
          WHEN v_patron_genero IS NOT NULL AND upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')) = v_patron_genero THEN 0.85::numeric

          -- 2C. Segundo Repaso: Coincidencia con Posibles Variantes sugeridas por IA -> 0.85 (AMARILLO)
          WHEN array_length(v_alt_variantes, 1) > 0 
               AND upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')) = ANY(v_alt_variantes) THEN 0.85::numeric

          -- 1C. FAMILIAS ESTRICTAS (MOTI / AND / NR): No permitir similarity difuso al azar
          WHEN v_es_moti OR v_es_and OR v_es_nr THEN 0.00::numeric

          -- 3A. Similarity de la cadena completa limpia de SKU (>= 0.70) -> 0.70 - 0.75 (AMARILLO)
          WHEN similarity(upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')), v_limpio) >= 0.70 
               THEN (0.70 + (similarity(upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')), v_limpio) - 0.70) * 0.50)::numeric

          -- 3B. Similarity por descripción (>= 0.70) -> 0.60 (AMARILLO BAJO)
          WHEN v_desc <> '' AND similarity(upper(coalesce(p.descripcion, p.nombre, '')), v_desc) >= 0.70 
               THEN (0.50 + similarity(upper(coalesce(p.descripcion, p.nombre, '')), v_desc) * 0.20)::numeric

          ELSE 0.00::numeric
        END AS m_score,
        CASE
          WHEN upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')) = v_limpio THEN 'EXACTO'::text
          WHEN p.sku_base ~* ('\\y' || v_limpio || '\\y') OR upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')) LIKE ('%' || v_limpio || '%') THEN 'EXACTO_TOKEN'::text
          WHEN v_patron_and IS NOT NULL AND upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')) = v_patron_and THEN 'PROPUESTA_PATRON_AND'::text
          WHEN v_patron_ho IS NOT NULL AND upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')) = v_patron_ho THEN 'PROPUESTA_PATRON_HO'::text
          WHEN v_patron_genero IS NOT NULL AND upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')) = v_patron_genero THEN 'PROPUESTA_GENERO'::text
          WHEN array_length(v_alt_variantes, 1) > 0 AND upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')) = ANY(v_alt_variantes) THEN 'PROPUESTA_VARIANTE_IA'::text
          WHEN similarity(upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')), v_limpio) >= 0.70 THEN 'PROPUESTA_SIMILITUD_SKU'::text
          ELSE 'DESCRIPCION'::text
        END AS m_metodo
      FROM "inv-tienda".productos p
      WHERE p.activo = true
        AND (
          upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')) = v_limpio
          OR p.sku_base ~* ('\\y' || v_limpio || '\\y')
          OR (upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')) LIKE ('%' || v_limpio || '%') AND (v_es_moti OR v_es_and OR v_es_nr))
          OR (v_patron_and IS NOT NULL AND upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')) = v_patron_and)
          OR (v_patron_ho IS NOT NULL AND upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')) = v_patron_ho)
          OR (v_patron_genero IS NOT NULL AND upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')) = v_patron_genero)
          OR (array_length(v_alt_variantes, 1) > 0 AND upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')) = ANY(v_alt_variantes))
          OR (NOT v_es_moti AND NOT v_es_and AND NOT v_es_nr AND similarity(upper(regexp_replace(p.sku_base, '[\\s\\.\\,\\-\\/]+', '', 'g')), v_limpio) >= 0.70)
          OR (NOT v_es_moti AND NOT v_es_and AND NOT v_es_nr AND v_desc <> '' AND similarity(upper(coalesce(p.descripcion, p.nombre, '')), v_desc) >= 0.70)
        )

      UNION ALL

      -- 2. Coincidencias en variantes específicas (Match Exacto)
      SELECT 
        (coalesce(v_elem->>'index', v_idx::text))::int,
        v_raw,
        vp.producto_id,
        vp.id,
        p2.sku_base::text,
        vp.sku_completo::text,
        coalesce(p2.descripcion, p2.nombre, '')::text,
        coalesce(p2.pz_en_caja, 0)::int,
        1.00::numeric,
        'EXACTO_VARIANTE'::text
      FROM "inv-tienda".variantes_producto vp
      JOIN "inv-tienda".productos p2 ON vp.producto_id = p2.id
      WHERE vp.activo = true AND p2.activo = true
        AND upper(regexp_replace(vp.sku_completo, '[\\s\\.\\,\\-\\/]+', '', 'g')) = v_limpio
    )
    SELECT
      m_linea_index,
      m_sku_buscado,
      m_producto_id,
      m_variante_id,
      m_sku_base,
      m_sku_completo,
      m_descripcion,
      m_pz_en_caja,
      m_score,
      m_metodo
    FROM matches
    WHERE m_score >= 0.60
    ORDER BY m_score DESC, m_producto_id ASC
    LIMIT 5;

  END LOOP;
  RETURN;
END;
$function$;
`;

async function main() {
  console.log('Aplicando actualización a fn_buscar_candidatos_sku_ocr...');
  const { error } = await supabase.rpc('execute_sql', { query: sql });
  if (error) {
    console.error('Error al aplicar SQL:', error);
  } else {
    console.log('Función fn_buscar_candidatos_sku_ocr actualizada exitosamente.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { sql };
