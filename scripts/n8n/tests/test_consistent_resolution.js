// scripts\n8n\tests\test_consistent_resolution.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' }
});

async function run() {
  const lineasOcr = [
    { index: 0, sku: 'TY26/03MC', estilo_raw: 'TY26/03MC', descripcion_texto: 'CHAM. DAMA', cantidad_cajas: 1 },
    { index: 1, sku: 'TY26/05HC', estilo_raw: 'TY26/05HC', descripcion_texto: 'CHAM CABALLERO TORONTO', cantidad_cajas: 1 },
    { index: 2, sku: 'AND250001', estilo_raw: 'AND250001', descripcion_texto: 'CHAL. CABALLERO GREENFIELD', cantidad_cajas: 1 },
    { index: 3, sku: 'AND250019', estilo_raw: 'AND250019', descripcion_texto: 'CHAL CABALLERO COW GORNO', cantidad_cajas: 1 },
    { index: 4, sku: 'AND250017', estilo_raw: 'AND250017', descripcion_texto: 'CAAM. CABALLERO CON GORNO', cantidad_cajas: 1 },
    { index: 5, sku: 'TY26/07HC', estilo_raw: 'TY26/07HC', descripcion_texto: 'CHAM. CABALLERO TORONTO', cantidad_cajas: 1 },
    { index: 6, sku: 'BO30SETRE', estilo_raw: 'BO/30 SETRE', descripcion_texto: 'PANTS FELPA', cantidad_cajas: 1 },
    { index: 7, sku: 'BO4DSETFE', estilo_raw: 'BO/4D SETFE', descripcion_texto: 'PANTS FELPA', cantidad_cajas: 1 }
  ];

  const payload = lineasOcr.map((item, idx) => ({
    index: item.index ?? idx,
    sku: item.estilo_raw || item.sku,
    estilo_raw: item.estilo_raw || item.sku,
    descripcion_texto: item.descripcion_texto || '',
    descripcion_raw: item.descripcion_texto || '',
  }));

  const { data: candidates } = await supabase.rpc('fn_buscar_candidatos_sku_ocr', {
    p_lineas: payload,
  });

  const candList = Array.isArray(candidates) ? candidates : [];

  console.log('--- RESOLUCIÓN CONSISTENTE (IGUAL AL MODAL MANUAL) ---');

  const lineasResueltas = lineasOcr.map((l, idx) => {
    const rawText = l.estilo_raw || l.sku || '';
    const itemIndex = l.index ?? idx;

    const cands = candList
      .filter((c) => c.linea_index === itemIndex || c.sku_buscado === rawText || c.sku_buscado === l.sku)
      .sort((a, b) => Number(b.score) - Number(a.score));

    const topCand = cands.length > 0 ? cands[0] : null;

    if (topCand && Number(topCand.score) >= 0.60) {
      return {
        index: itemIndex,
        sku_detectado: l.sku,
        sku_resuelto: topCand.sku_base,
        producto_id: topCand.producto_id,
        producto_nombre: topCand.descripcion,
        score: topCand.score,
        metodo: topCand.metodo,
        cajas: l.cantidad_cajas,
        estado: 'MATCH_EXITOSO'
      };
    } else {
      return {
        index: itemIndex,
        sku_detectado: l.sku,
        sku_resuelto: null,
        producto_id: null,
        score: topCand?.score || 0,
        cajas: l.cantidad_cajas,
        estado: 'NO_ENCONTRADO'
      };
    }
  });

  console.table(lineasResueltas);
}

run();
