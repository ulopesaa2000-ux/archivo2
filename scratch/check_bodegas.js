// scratch/check_bodegas.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'inv-tienda' }
  });

  const { data: bodegas, error } = await supabase
    .from('bodegas')
    .select('id, nombre, es_virtual, activa')
    .order('id');

  if (error) {
    console.error('Error fetching bodegas:', error);
    return;
  }

  console.log('--- WAREHOUSES IN DB ---');
  console.table(bodegas);
}

main().catch(console.error);
