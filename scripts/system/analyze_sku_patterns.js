// scripts\system\analyze_sku_patterns.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' }
});

async function run() {
  const { data: catPrendas } = await supabase.from('cat_tipos_prenda').select('*').order('id');
  const { data: catGeneros } = await supabase.from('cat_generos').select('*').order('id');
  const { data: prods } = await supabase
    .from('productos')
    .select('id, sku_base, tipo_prenda_id, genero_id, descripcion');

  console.log('Catálogo Tipos Prenda:', catPrendas);
  console.log('Catálogo Géneros:', catGeneros);

  console.log('\n=== ANÁLISIS DE PATRONES DE SKU POR TIPO DE PRENDA ===');
  for (const cp of catPrendas || []) {
    const matching = (prods || []).filter(p => p.tipo_prenda_id === cp.id);
    const skus = matching.map(p => p.sku_base);
    console.log(`\nID: ${cp.id} | Nombre: "${cp.nombre}" | Total Productos: ${matching.length}`);
    console.log('Muestra de SKUs:', skus.slice(0, 15));
  }

  console.log('\n=== ANÁLISIS DE PATRONES DE SKU POR GÉNERO ===');
  for (const cg of catGeneros || []) {
    const matching = (prods || []).filter(p => p.genero_id === cg.id);
    const skus = matching.map(p => p.sku_base);
    console.log(`\nID: ${cg.id} | Nombre: "${cg.nombre}" | Total Productos: ${matching.length}`);
    console.log('Muestra de SKUs:', skus.slice(0, 15));
  }
}

run();
