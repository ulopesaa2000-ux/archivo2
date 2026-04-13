import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  db: { schema: 'inv-tienda' }
})

async function test() {
  const query = supabase
    .from('notas_inventario')
    .select(`
      id, numero_nota, fecha_nota, fecha_confirmacion,
      total_cajas, nota_referencia, observaciones,
      tipo_movimiento:cat_tipos_movimiento!notas_inventario_tipo_movimiento_id_fkey (
        codigo, nombre, afecta_inventario
      ),
      estado:cat_estados_nota!notas_inventario_estado_id_fkey (
        codigo, nombre, color
      ),
      bodega_origen:bodegas!notas_inventario_bodega_origen_id_fkey (
        nombre, codigo
      ),
      bodega_destino:bodegas!notas_inventario_bodega_destino_id_fkey (
        nombre, codigo
      ),
      usuario:usuarios!notas_inventario_usuario_id_fkey (
        nombre_completo
      )
    `, { count: 'exact' })
    .limit(1)

  const { data, error } = await query
  if (error) {
    console.error('ERROR:', JSON.stringify(error, null, 2))
  } else {
    console.log('SUCCESS:', data)
  }
}

test()
