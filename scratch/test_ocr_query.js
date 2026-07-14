// scratch/test_ocr_query.js
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
  console.log("Querying Supabase nota_ocr_propuestas with Service Role...");
  const { data, error } = await supabase
    .from('nota_ocr_propuestas')
    .select('*')
    .limit(1);

  if (error) {
    console.error("SQL Error detail:", JSON.stringify(error, null, 2));
  } else {
    console.log("Success! Found:", data ? data.length : 0, "rows");
    if (data && data.length > 0) {
      console.log("Columns present in the table:");
      console.log(Object.keys(data[0]));
    }
  }
}

test();
