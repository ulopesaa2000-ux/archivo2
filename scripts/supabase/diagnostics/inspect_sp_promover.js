// scripts\supabase\diagnostics\inspect_sp_promover.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const { data, error } = await supabase.rpc('get_function_def', { func_name: 'sp_promover_propuesta_auto' });
  if (error) {
    // query pg_proc directly via postgres or a raw query if available
    console.log('RPC error:', error);
  } else {
    console.log('Function definition:', data);
  }
}
// Try querying with direct SQL query if we can or check files
async function searchCodebase() {
  // Let's search files in repo for sp_promover_propuesta_auto
}

inspect();
