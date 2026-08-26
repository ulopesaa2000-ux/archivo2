// scripts\n8n\tests\test_full_dynamic_workflow.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' }
});

async function run() {
  console.log('--- 1. CONSULTANDO CATÁLOGOS DINÁMICOS DE SUPABASE ---');
  
  const { data: provs } = await supabase.from('personas').select('id, nombre_completo, prefijo').eq('tipo_entidad', 'Proveedor').eq('activo', true);
  const { data: prendas } = await supabase.from('cat_tipo_prenda').select('id, nombre, prefijo').eq('activo', true);
  const { data: generos } = await supabase.from('cat_generos').select('id, nombre, codigo, prefijo').eq('activo', true);
  const { data: marcas } = await supabase.from('cat_marcas').select('id, nombre').eq('activo', true);

  console.log(`Proveedores: ${provs?.length}, Prendas: ${prendas?.length}, Géneros: ${generos?.length}, Marcas: ${marcas?.length}`);

  // Simulación de respuesta del LLM con variantes para Folio 003
  const llmResponse = {
    folio: "003",
    fecha: "2026-08-20",
    tipo_movimiento: "SAL",
    origen: "BODEGA TULANCINGO",
    destino: "SR. CHOW.",
    lineas: [
      { index: 0, sku: "TY26/03MC", posibles_variantes: ["TY26/03HC"], descripcion_texto: "CHAM. DAMA", cantidad_cajas: 1 },
      { index: 1, sku: "TY26/05HC", posibles_variantes: ["TY26/05MC"], descripcion_texto: "CHAM CABALLERO TORONTO", cantidad_cajas: 1 },
      { index: 2, sku: "AND250001", posibles_variantes: [], descripcion_texto: "CHAL. CABALLERO GREENFIELD", cantidad_cajas: 1 },
      { index: 3, sku: "AND250019", posibles_variantes: [], descripcion_texto: "CHAL CABALLERO COW GORNO", cantidad_cajas: 1 },
      { index: 4, sku: "AND250017", posibles_variantes: [], descripcion_texto: "CAAM. CABALLERO CON GORNO", cantidad_cajas: 1 },
      { index: 5, sku: "TY26/07HC", posibles_variantes: ["TY26/01HC", "TY26/07MC"], descripcion_texto: "CHAM. CABALLERO TORONTO", cantidad_cajas: 1 }, // Duda 1 vs 7
      { index: 6, sku: "BO/30DSETFE", posibles_variantes: ["BO/3DSETFE", "BO3DSETFE"], descripcion_texto: "SET DAMA FELPA", cantidad_cajas: 1 }, // Duda 0 vs D
      { index: 7, sku: "BO4DSETFE", posibles_variantes: ["BO/4DSETFE"], descripcion_texto: "SET DAMA FELPA", cantidad_cajas: 1 } // Sin diagonal
    ]
  };

  // 2. Preparar candidatos planos para Postgres
  const searchPayload = [];
  llmResponse.lineas.forEach(l => {
    const s = l.sku.trim().toUpperCase();
    searchPayload.push({ index: l.index, sku: s, estilo_raw: s, descripcion_texto: l.descripcion_texto });
    (l.posibles_variantes || []).forEach(v => {
      const vClean = v.trim().toUpperCase();
      if (vClean !== s) {
        searchPayload.push({ index: l.index, sku: vClean, estilo_raw: vClean, descripcion_texto: l.descripcion_texto });
      }
    });
  });

  const { data: candidates } = await supabase.rpc('fn_buscar_candidatos_sku_ocr', { p_lineas: searchPayload });
  const candsList = Array.isArray(candidates) ? candidates : [];

  console.log('\n--- 2. RANKING JERÁRQUICO EN RESOLVER BODEGAS ---');
  const advertencias = [];

  const lineasResueltas = llmResponse.lineas.map(l => {
    const rawSku = l.sku.trim().toUpperCase();
    const desc = (l.descripcion_texto || '').toLowerCase();
    const candsDeEstaLinea = candsList.filter(c => c.linea_index === l.index);

    // Extraer prefijo de proveedor buscado (ej: TY, FK, BO, AND, JA)
    const prefijoMatch = rawSku.match(/^([A-Z0-9]+?)(\d{2}|\/|$)/);
    const prefijoBuscado = prefijoMatch ? prefijoMatch[1] : '';

    const esCaballero = desc.includes('cab') || desc.includes('hombre');
    const esDama = desc.includes('dama') || desc.includes('mujer');

    let mejorCand = null;
    let maxScore = -999;

    for (const cand of candsDeEstaLinea) {
      let score = Number(cand.score || 0) * 10;
      const cSku = (cand.sku_base || '').toUpperCase();
      const cDesc = (cand.descripcion || '').toLowerCase();

      // 1. Proveedor (+50 / -30)
      if (prefijoBuscado && cSku.startsWith(prefijoBuscado)) {
        score += 50;
      } else if (prefijoBuscado && !cSku.startsWith(prefijoBuscado)) {
        score -= 30;
      }

      // 2. Género (+30 / -50)
      if (esCaballero) {
        if (cSku.includes('HC') || cSku.includes('CA') || cSku.endsWith('H')) score += 30;
        if (cSku.includes('MC') || cSku.includes('DA') || cSku.endsWith('M')) score -= 50;
      } else if (esDama) {
        if (cSku.includes('MC') || cSku.includes('DA') || cSku.endsWith('M') || cSku.includes('DSET')) score += 30;
        if (cSku.includes('HC') || cSku.includes('CA') || cSku.endsWith('H')) score -= 50;
      }

      // 3. Marca / Modelo (+35)
      if (desc.includes('toronto') && cDesc.includes('toronto')) score += 35;
      if (desc.includes('greenfield') && cDesc.includes('greenfield')) score += 35;
      if (desc.includes('felpa') && (cDesc.includes('felpa') || cSku.includes('FE'))) score += 35;

      // 4. Match Exacto con SKU original (+40)
      if (cSku === rawSku || cSku.replace(/[^A-Z0-9]/g, '') === rawSku.replace(/[^A-Z0-9]/g, '')) {
        score += 40;
      }

      if (score > maxScore) {
        maxScore = score;
        mejorCand = { cand, score };
      }
    }

    if (mejorCand && mejorCand.score >= 50) {
      const resueltoSku = mejorCand.cand.sku_base;
      if (resueltoSku !== rawSku && resueltoSku.replace(/[^A-Z0-9]/g, '') !== rawSku.replace(/[^A-Z0-9]/g, '')) {
        advertencias.push(`L${l.index + 1}: Resuelto a ${resueltoSku} (leído: ${rawSku})`);
      }
      return {
        index: l.index,
        sku: resueltoSku,
        producto_id: mejorCand.cand.producto_id,
        piezas_por_caja: mejorCand.cand.pz_en_caja,
        descripcion_texto: l.descripcion_texto,
        cantidad_cajas: l.cantidad_cajas,
        score: mejorCand.score
      };
    }

    return { index: l.index, sku: rawSku, producto_id: null, cantidad_cajas: l.cantidad_cajas, score: 0 };
  });

  console.table(lineasResueltas);
  console.log('\nAdvertencias generadas para Observaciones:');
  console.log(advertencias);
}

run();
