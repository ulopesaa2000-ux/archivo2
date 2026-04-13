import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  db: { schema: 'inv-tienda' }
})

async function test() {
  const { data, error } = await supabase.from('bodegas').select('*').limit(1)
  console.log('Result:', JSON.stringify({ data, error }, null, 2))
}
test()
