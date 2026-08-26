// scripts\supabase\tests\test_sql_promover.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' }
});

async function runTest() {
  const propuestaId = '5b155aa0-17cf-4993-a72d-67ea6bb08e58';
  console.log('Probando lógica de promoción para propuesta:', propuestaId);

  const { data: prop } = await supabase.from('nota_ocr_propuestas').select('*').eq('id', propuestaId).single();
  console.log('Propuesta actual nota_id:', prop.nota_id, 'estado:', prop.estado);
}

runTest();
