// scripts\supabase\tests\test_matrix_forecast_complete.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' }
});

async function testFetchStockMatrixPronostico(ciudades = ['SAN MARTIN'], soloAfectados = false, q = '') {
  // 1. Bodegas
  const { data: bodegas } = await supabase
    .from('bodegas')
    .select('id, nombre, ciudad')
    .in('ciudad', ciudades);
  const bodegasIds = bodegas.map(b => b.id);

  // 2. Notas pendientes
  const idsStr = bodegasIds.join(',');
  const { data: notasPendientes } = await supabase
    .from('notas_inventario')
    .select(`
      id, numero_nota, fecha_nota, estado_id, tipo_movimiento_id, bodega_origen_id, bodega_destino_id, observaciones,
      tipo_movimiento:cat_tipos_movimiento!notas_inventario_tipo_movimiento_id_fkey(codigo, nombre, afecta_inventario),
      detalles:nota_detalle_productos(
        id, producto_id, cajas, piezas_sueltas,
        producto:productos!nota_detalle_productos_producto_id_fkey(id, sku_base, descripcion, familia, pz_en_caja, marca:cat_marcas(nombre))
      )
    `)
    .eq('activo', true)
    .in('estado_id', [1, 4])
    .or(`bodega_origen_id.in.(${idsStr}),bodega_destino_id.in.(${idsStr})`);

  const mapImpacto = new Map();
  const productosEnNotasMap = new Map();

  for (const n of (notasPendientes || [])) {
    const tipo = Array.isArray(n.tipo_movimiento) ? n.tipo_movimiento[0] : n.tipo_movimiento;
    const afecta = tipo?.afecta_inventario ?? 0;
    const tipoCod = (tipo?.codigo || '').toUpperCase();

    for (const d of (n.detalles || [])) {
      if (!d.producto_id) continue;
      const pId = Number(d.producto_id);
      const prod = Array.isArray(d.producto) ? d.producto[0] : d.producto;
      const cajas = Number(d.cajas || 0);

      if (!productosEnNotasMap.has(pId) && prod) {
        productosEnNotasMap.set(pId, {
          producto_id: pId,
          sku_base: prod.sku_base,
          descripcion: prod.descripcion,
          familia: prod.familia,
          pz_en_caja: prod.pz_en_caja,
        });
      }

      // Origen
      if (n.bodega_origen_id && bodegasIds.includes(n.bodega_origen_id)) {
        const key = `${pId}_${n.bodega_origen_id}`;
        if (!mapImpacto.has(key)) mapImpacto.set(key, { entradas: 0, salidas: 0, delta: 0, notas: [] });
        const info = mapImpacto.get(key);

        let delta = 0;
        if (afecta > 0) {
          info.entradas += cajas;
          delta = +cajas;
        } else if (afecta < 0 || tipoCod === 'SAL' || tipoCod === 'TRF') {
          info.salidas += cajas;
          delta = -cajas;
        }
        info.delta = info.entradas - info.salidas;
        info.notas.push({ nota_id: n.id, numero_nota: n.numero_nota, tipo_codigo: tipoCod, cajas, delta });
      }

      // Destino
      if (n.bodega_destino_id && bodegasIds.includes(n.bodega_destino_id)) {
        const key = `${pId}_${n.bodega_destino_id}`;
        if (!mapImpacto.has(key)) mapImpacto.set(key, { entradas: 0, salidas: 0, delta: 0, notas: [] });
        const info = mapImpacto.get(key);

        let delta = 0;
        if (tipoCod === 'TRF' || afecta > 0) {
          info.entradas += cajas;
          delta = +cajas;
        }
        info.delta = info.entradas - info.salidas;
        info.notas.push({ nota_id: n.id, numero_nota: n.numero_nota, tipo_codigo: tipoCod, cajas, delta });
      }
    }
  }

  // 3. Traer stock físico de los productos en estas bodegas
  let query = supabase
    .from('productos')
    .select(`
      id, sku_base, nombre, descripcion, familia, pz_en_caja,
      inventario_stock!inner(bodega_id, cajas, piezas_sueltas, caja_id)
    `)
    .in('inventario_stock.bodega_id', bodegasIds)
    .is('inventario_stock.caja_id', null);

  const { data: stockData, error: errStock } = await query;

  const itemsMap = new Map();

  (stockData || []).forEach(prod => {
    const stockEntries = Array.isArray(prod.inventario_stock) ? prod.inventario_stock : [prod.inventario_stock];
    const dict = {};
    bodegasIds.forEach(id => (dict[id] = { cajas: 0, piezas_sueltas: 0, total: 0 }));

    stockEntries.forEach(s => {
      if (!dict[s.bodega_id]) dict[s.bodega_id] = { cajas: 0, piezas_sueltas: 0, total: 0 };
      dict[s.bodega_id].cajas += s.cajas;
      dict[s.bodega_id].piezas_sueltas += s.piezas_sueltas;
    });

    itemsMap.set(prod.id, {
      producto_id: prod.id,
      producto_sku: prod.sku_base,
      producto_nombre: prod.nombre,
      producto_descripcion: prod.descripcion,
      producto_familia: prod.familia,
      pz_en_caja: prod.pz_en_caja,
      stock_por_bodega: dict,
    });
  });

  // Agregar productos de notas pendientes que no estaban en stockData
  for (const [pId, pInfo] of productosEnNotasMap.entries()) {
    if (!itemsMap.has(pId)) {
      const dict = {};
      bodegasIds.forEach(id => (dict[id] = { cajas: 0, piezas_sueltas: 0, total: 0 }));
      itemsMap.set(pId, {
        producto_id: pId,
        producto_sku: pInfo.sku_base,
        producto_nombre: pInfo.descripcion,
        producto_descripcion: pInfo.descripcion,
        producto_familia: pInfo.familia,
        pz_en_caja: pInfo.pz_en_caja,
        stock_por_bodega: dict,
      });
    }
  }

  // Enriquecer con cálculo de pronóstico celda por celda
  let items = Array.from(itemsMap.values()).map(item => {
    let tieneMov = false;
    let totalDelta = 0;
    let totalPronostico = 0;

    bodegasIds.forEach(bId => {
      const key = `${item.producto_id}_${bId}`;
      const imp = mapImpacto.get(key);
      const cell = item.stock_por_bodega[bId];
      const cajasReales = cell?.cajas || 0;
      const delta = imp?.delta || 0;
      const pronosticado = cajasReales + delta;

      if (delta !== 0 || (imp?.notas?.length || 0) > 0) {
        tieneMov = true;
      }

      totalDelta += delta;
      totalPronostico += pronosticado;

      item.stock_por_bodega[bId] = {
        cajas: cajasReales,
        piezas_sueltas: cell?.piezas_sueltas || 0,
        total: pronosticado,
        entradas: imp?.entradas || 0,
        salidas: imp?.salidas || 0,
        delta: delta,
        pronosticado: pronosticado,
        tiene_movimiento: delta !== 0 || (imp?.notas?.length || 0) > 0,
        notas: imp?.notas || []
      };
    });

    item.tiene_movimiento_pendiente = tieneMov;
    item.total_delta = totalDelta;
    item.total_pronosticado = totalPronostico;
    item.total_general = totalPronostico;

    return item;
  });

  if (soloAfectados) {
    items = items.filter(i => i.tiene_movimiento_pendiente);
  }

  console.log(`\nResultados Matriz Pronóstico (Ciudades: ${ciudades.join(',')}, SoloAfectados: ${soloAfectados}):`);
  console.log(`Total productos: ${items.length}`);
  items.forEach(i => {
    const bodegasInfo = bodegasIds.map(bId => {
      const c = i.stock_por_bodega[bId];
      return `${bId}: ${c.cajas} (${c.delta >= 0 ? '+' : ''}${c.delta}) = ${c.pronosticado}`;
    }).join(' | ');
    console.log(` • SKU: ${i.producto_sku} [${i.producto_familia}] -> Total: ${i.total_pronosticado} cjs | Bodegas: ${bodegasInfo}`);
  });
}

async function run() {
  await testFetchStockMatrixPronostico(['SAN MARTIN'], true);
}
run();
