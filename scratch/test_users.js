// scratch/test_users.js
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'inv-tienda' }
});

async function test() {
  console.log("Querying Supabase usuarios...");
  const { data, error } = await supabase
    .from('usuarios')
    .select('*');

  if (error) {
    console.error("SQL Error detail:", JSON.stringify(error, null, 2));
  } else {
    console.log("Success! Found:", data ? data.length : 0, "users");
    console.log("Users:", JSON.stringify(data, null, 2));
  }
}

test();
