import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  db: { schema: 'inv-tienda' }
})

async function test() {
  const query = supabase
    .from('notas_inventario')
    .select('*')
    .limit(1)

  const { data, error } = await query
  console.log('Result:', JSON.stringify({ data, error }, null, 2))
}

test()
