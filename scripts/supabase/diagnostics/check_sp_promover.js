// scripts\supabase\diagnostics\check_sp_promover.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkProc() {
  // Let's see if we can read information_schema.routines or call execute_sql or write a query
  const { data, error } = await supabase
    .from('nota_ocr_propuestas')
    .select('id, estado, nota_id, lineas')
    .limit(3);
  console.log('nota_ocr_propuestas sample:', data);
}

checkProc();
