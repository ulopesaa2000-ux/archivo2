// scripts\supabase\tests\test_pronostico_bodega.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' }
});

async function testPronosticoBodega(bodegaId) {
  // 1. Obtener notas pendientes para esta bodega
  const { data: notasPendientes, error: errNotas } = await supabase
    .from('notas_inventario')
    .select(`
      id, numero_nota, fecha_nota, estado_id, tipo_movimiento_id, bodega_origen_id, bodega_destino_id, observaciones, nota_referencia,
      tipo_movimiento:cat_tipos_movimiento!notas_inventario_tipo_movimiento_id_fkey(codigo, nombre, afecta_inventario),
      detalles:nota_detalle_productos(
        id, producto_id, cajas, piezas_sueltas,
        producto:productos!nota_detalle_productos_producto_id_fkey(id, sku_base, descripcion, familia, pz_en_caja)
      )
    `)
    .eq('activo', true)
    .in('estado_id', [1, 4]) // PEND, PROC
    .or(`bodega_origen_id.eq.${bodegaId},bodega_destino_id.eq.${bodegaId}`);

  console.log(`\n========================================================`);
  console.log(`Notas pendientes para Bodega ${bodegaId}:`, notasPendientes?.length || 0);

  // Mapear impacto por producto_id
  const impactoPorProducto = new Map();

  for (const n of (notasPendientes || [])) {
    const tipo = Array.isArray(n.tipo_movimiento) ? n.tipo_movimiento[0] : n.tipo_movimiento;
    const afecta = tipo?.afecta_inventario ?? 0;
    const tipoCod = (tipo?.codigo || '').toUpperCase();

    for (const d of (n.detalles || [])) {
      if (!d.producto_id) continue;
      const pId = d.producto_id;
      const prod = Array.isArray(d.producto) ? d.producto[0] : d.producto;

      if (!impactoPorProducto.has(pId)) {
        impactoPorProducto.set(pId, {
          producto_id: pId,
          sku: prod?.sku_base,
          descripcion: prod?.descripcion,
          familia: prod?.familia,
          entradas: 0,
          salidas: 0,
          notas: []
        });
      }

      const info = impactoPorProducto.get(pId);
      const cajas = Number(d.cajas || 0);

      let delta = 0;
      if (n.bodega_origen_id === bodegaId) {
        if (afecta > 0) {
          info.entradas += cajas;
          delta = +cajas;
        } else if (afecta < 0 || tipoCod === 'SAL') {
          info.salidas += cajas;
          delta = -cajas;
        } else if (tipoCod === 'TRF') {
          info.salidas += cajas;
          delta = -cajas;
        }
      } else if (n.bodega_destino_id === bodegaId) {
        if (tipoCod === 'TRF' || afecta > 0) {
          info.entradas += cajas;
          delta = +cajas;
        }
      }

      info.notas.push({
        nota_id: n.id,
        numero_nota: n.numero_nota,
        tipo_codigo: tipoCod,
        cajas,
        delta,
        observaciones: n.observaciones
      });
    }
  }

  console.log(`Productos con impacto de notas pendientes: ${impactoPorProducto.size}`);
  for (const [pId, info] of impactoPorProducto.entries()) {
    const notasStr = info.notas.map(x => `${x.numero_nota}(${x.delta >= 0 ? '+' : ''}${x.delta})`).join(', ');
    console.log(` • ID ${pId} | SKU: ${info.sku} | Familia: ${info.familia} | Entradas: +${info.entradas} | Salidas: -${info.salidas} | Notas: ${notasStr}`);
  }

  // 2. Traer stock físico para ver cómo se combina
  const pIds = Array.from(impactoPorProducto.keys());
  if (pIds.length > 0) {
    const { data: stockFisico } = await supabase
      .from('inventario_stock')
      .select('producto_id, cajas')
      .eq('bodega_id', bodegaId)
      .is('caja_id', null)
      .in('producto_id', pIds);

    console.log(`\nCruce Stock Físico vs Pronosticado:`);
    const stockMap = new Map((stockFisico || []).map(s => [s.producto_id, s.cajas]));

    for (const [pId, info] of impactoPorProducto.entries()) {
      const real = stockMap.get(pId) || 0;
      const pronosticado = real + info.entradas - info.salidas;
      console.log(` 📦 ${info.sku} (${info.familia}) -> Real: ${real} cjs | Delta: ${info.entradas - info.salidas >= 0 ? '+' : ''}${info.entradas - info.salidas} cjs | Pronosticado: ${pronosticado} cjs`);
    }
  }
}

async function run() {
  await testPronosticoBodega(10); // COCINA
  await testPronosticoBodega(5);  // DURAZNO
  await testPronosticoBodega(15); // TULANCINGO
}
run();
