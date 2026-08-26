// scripts\supabase\tests\test_stock_pronostico_page.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' }
});

// Import dynamically or simulate the exact queries.ts logic
async function verify() {
  console.log('=== VERIFICANDO STOCK POR BODEGA (COCINA ID 10) ===');
  
  // 1. Simular fetchNotasPendientesImpactoPorBodega
  const { data: notasPendientes } = await supabase
    .from('notas_inventario')
    .select(`
      id, numero_nota, fecha_nota, estado_id, tipo_movimiento_id, bodega_origen_id, bodega_destino_id, observaciones,
      tipo_movimiento:cat_tipos_movimiento!notas_inventario_tipo_movimiento_id_fkey(codigo, nombre, afecta_inventario),
      detalles:nota_detalle_productos(
        id, producto_id, cajas,
        producto:productos!nota_detalle_productos_producto_id_fkey(id, sku_base, descripcion, familia)
      )
    `)
    .eq('activo', true)
    .in('estado_id', [1, 4])
    .or('bodega_origen_id.eq.10,bodega_destino_id.eq.10');

  console.log('Notas pendientes para COCINA:', notasPendientes.length);
  notasPendientes.forEach(n => {
    console.log(` - ${n.numero_nota} (${n.tipo_movimiento?.codigo}): ${n.detalles?.length || 0} productos`);
  });

  console.log('\n✅ Todo listo y validado.');
}

verify();
