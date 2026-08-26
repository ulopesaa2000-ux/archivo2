// scripts\n8n\tests\test_2phase_resolution.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' }
});

async function testTwoPhase() {
  const lineasPrueba = [
    { sku: 'TY26/03MC', estilo_raw: 'TY26/03MC', producto_id: 7573, cantidad_cajas: 1 }, // Fase A: tiene producto_id
    { sku: 'AND250001', estilo_raw: 'AND250001', producto_id: null, cantidad_cajas: 1 }, // Fase B1: sku_base exacto
    { sku: 'BO4DSETFE', estilo_raw: 'BO/4D SETFE', producto_id: null, cantidad_cajas: 1 }, // Fase B2: normalizado sin diagonales ni espacios (BO/4DSETFE)
    { sku: 'BO3DSETFE', estilo_raw: 'BO/3D SET FE', producto_id: null, cantidad_cajas: 1 }, // Fase B2: normalizado (BO/3DSETFE)
    { sku: 'CODIGO_INEXISTENTE_999', estilo_raw: 'XYZ 999', producto_id: null, cantidad_cajas: 1 } // Fase C: No existe -> Omitir
  ];

  console.log('--- PROBANDO ESTRATEGIA EN 2 FASES (ID + FALLBACK POR STRING) ---');

  for (let i = 0; i < lineasPrueba.length; i++) {
    const l = lineasPrueba[i];
    let resolvedId = null;
    let metodo = '';

    // Fase A: Trae producto_id
    if (l.producto_id) {
      resolvedId = l.producto_id;
      metodo = 'FASE A (producto_id pre-asignado)';
    }

    // Fase B1: Buscar por sku_base exacto
    if (!resolvedId && l.sku) {
      const { data: p1 } = await supabase
        .from('productos')
        .select('id, sku_base')
        .eq('sku_base', l.sku.trim().toUpperCase())
        .single();
      if (p1) {
        resolvedId = p1.id;
        metodo = `FASE B1 (match exacto sku_base: ${p1.sku_base})`;
      }
    }

    // Fase B2: Buscar por estilo_raw exacto
    if (!resolvedId && l.estilo_raw) {
      const { data: p2 } = await supabase
        .from('productos')
        .select('id, sku_base')
        .eq('sku_base', l.estilo_raw.trim().toUpperCase())
        .single();
      if (p2) {
        resolvedId = p2.id;
        metodo = `FASE B2 (match exacto estilo_raw: ${p2.sku_base})`;
      }
    }

    // Fase B3: Buscar normalizado (sin diagonales, espacios ni guiones)
    if (!resolvedId) {
      const cleanTarget = (l.sku || l.estilo_raw || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
      // Buscar productos que tengan esa misma base alfanumérica
      const { data: prods } = await supabase
        .from('productos')
        .select('id, sku_base')
        .ilike('sku_base', `%${cleanTarget.substring(0, 4)}%`);
      
      const hit = prods?.find(p => p.sku_base.replace(/[^A-Z0-9]/gi, '').toUpperCase() === cleanTarget);
      if (hit) {
        resolvedId = hit.id;
        metodo = `FASE B3 (match normalizado alfanumérico: ${hit.sku_base})`;
      }
    }

    if (resolvedId) {
      console.log(`[Línea ${i + 1}] ✅ Resuelto: ID=${resolvedId} | Método: ${metodo}`);
    } else {
      console.log(`[Línea ${i + 1}] ⚠️ Omitido de nota (No existe en catálogo) | SKU="${l.sku}"`);
    }
  }
}

testTwoPhase();
