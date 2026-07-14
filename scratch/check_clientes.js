// scratch/check_clientes.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'inv-tienda' }
  });

  const { data: persona, error } = await supabase
    .from('personas')
    .select('id, nombre_completo')
    .eq('id', 27)
    .single();

  if (error) {
    console.error('Error fetching persona 27:', error);
  } else {
    console.log('--- PERSONA 27 ---', persona);
  }
}

main().catch(console.error);
