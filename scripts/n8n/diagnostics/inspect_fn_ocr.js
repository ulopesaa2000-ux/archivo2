// scripts\n8n\diagnostics\inspect_fn_ocr.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' }
});

async function inspect() {
  console.log('--- PROBANDO CASOS EN fn_buscar_candidatos_sku_ocr ---');
  
  const testCases = [
    { index: 0, sku: 'BO1DSETFE', estilo_raw: 'BO1DSETFE', descripcion_texto: 'SET DAMA FELPA' },
    { index: 1, sku: 'BO3DSETFE', estilo_raw: 'BO3DSETFE', descripcion_texto: 'PANTS FELPA' },
    { index: 2, sku: 'BO4DSETFE', estilo_raw: 'BO4DSETFE', descripcion_texto: 'PANTS FELPA' },
    { index: 3, sku: 'BO/1DSETFE', estilo_raw: 'BO/1DSETFE', descripcion_texto: 'SET DAMA' },
    { index: 4, sku: 'TY2601HC', estilo_raw: 'TY2601HC', descripcion_texto: 'CHAM CABALLERO TORONTO' },
    { index: 5, sku: 'TY26/01HC', estilo_raw: 'TY26/01HC', descripcion_texto: 'CHAM CABALLERO TORONTO' },
    { index: 6, sku: 'AND250001', estilo_raw: 'AND250001', descripcion_texto: 'CHALECO GREENFIELD' }
  ];

  const { data, error } = await supabase.rpc('fn_buscar_candidatos_sku_ocr', { p_lineas: testCases });
  console.log('Resultados devueltos por la BD:');
  console.table(data);
}

inspect();
