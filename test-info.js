const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testQuery() {
  console.log('Querying information_schema...')
  
  // Try to query information_schema
  const { data, error } = await supabase
    .from('information_schema.table_constraints')
    .select('*')
    .eq('constraint_schema', 'inv-tienda')
    
  console.log('Constraints:', data)
  console.log('Error:', error)
}

testQuery()
