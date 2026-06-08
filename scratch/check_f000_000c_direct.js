const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envLocal = fs.readFileSync('.env.local', 'utf8');
const env = {};
envLocal.split('\n').forEach(line => {
  const clean = line.trim();
  if (clean && !clean.startsWith('#')) {
    const idx = clean.indexOf('=');
    if (idx !== -1) {
      const k = clean.substring(0, idx).trim();
      const v = clean.substring(idx + 1).trim();
      env[k] = v;
    }
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: { schema: 'inv-tienda' }
  }
);

async function main() {
  const { data, count, error } = await supabase
    .from('productos')
    .select('id, sku_base, nombre, familia', { count: 'exact' })
    .eq('familia', 'F000-000C');

  if (error) {
    console.error('Error fetching F000-000C:', error);
  } else {
    console.log('Count of products with F000-000C:', count);
    console.log('Sample of F000-000C:', data.slice(0, 10));
  }

  // Also query count of products with null familia
  const { count: nullCount } = await supabase
    .from('productos')
    .select('id', { count: 'exact', head: true })
    .is('familia', null);
  console.log('Count of products with NULL familia:', nullCount);
}

main().catch(console.error);
