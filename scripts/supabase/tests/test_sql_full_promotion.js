// scripts\supabase\tests\test_sql_full_promotion.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' }
});

async function run() {
  console.log('Validando tipos enteros para sp_crear_nota y sp_agregar_producto_nota...');
}
run();
