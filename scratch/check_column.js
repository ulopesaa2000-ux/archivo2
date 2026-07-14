// scratch/check_column.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'inv-tienda' }
  });

  const { count: countB2B, error: errB2B } = await supabase
    .from('productos')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_b2b_id', 27);

  const { count: countPersona, error: errPersona } = await supabase
    .from('productos')
    .select('id', { count: 'exact', head: true })
    .eq('persona_id', 27);

  console.log(`Products with cliente_b2b_id = 27: ${countB2B}`);
  console.log(`Products with persona_id = 27: ${countPersona}`);
}

main().catch(console.error);
