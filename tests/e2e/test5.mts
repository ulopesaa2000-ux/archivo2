import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  db: { schema: 'inv-tienda' }
})

async function test() {
  const query = supabase
    .from('productos')
    .select(`
      id, sku_base,
      inventario_stock!inner(bodega_id, cajas, piezas_sueltas, caja_id)
    `, { count: 'exact' })
    .is('inventario_stock.caja_id', null)
    .range(0, 2)

  const { data, count, error } = await query
  console.log('Result:', JSON.stringify({ count, data, error }, null, 2))
}
test()
