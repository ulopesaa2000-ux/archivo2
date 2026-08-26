// scripts\supabase\tests\test_matrix_forecast.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' }
});

async function testMatrixPronostico(ciudades = ['SAN MARTIN']) {
  // 1. Obtener bodegas de las ciudades seleccionadas
  const { data: bodegas, error: errB } = await supabase
    .from('bodegas')
    .select('id, nombre, ciudad')
    .in('ciudad', ciudades);

  if (errB || !bodegas) {
    console.error('Error bodegas:', errB);
    return;
  }

  const bodegaIds = bodegas.map(b => b.id);
  console.log(`Bodegas en ${ciudades.join(', ')}:`, bodegas.map(b => `${b.nombre} (${b.id})`).join(', '));

  // 2. Traer todas las notas pendientes que involucren a estas bodegas
  const idsStr = bodegaIds.join(',');
  const { data: notasPendientes, error: errN } = await supabase
    .from('notas_inventario')
    .select(`
      id, numero_nota, fecha_nota, estado_id, tipo_movimiento_id, bodega_origen_id, bodega_destino_id, observaciones,
      tipo_movimiento:cat_tipos_movimiento!notas_inventario_tipo_movimiento_id_fkey(codigo, nombre, afecta_inventario),
      detalles:nota_detalle_productos(
        id, producto_id, cajas, piezas_sueltas,
        producto:productos!nota_detalle_productos_producto_id_fkey(id, sku_base, descripcion, familia)
      )
    `)
    .eq('activo', true)
    .in('estado_id', [1, 4])
    .or(`bodega_origen_id.in.(${idsStr}),bodega_destino_id.in.(${idsStr})`);

  if (errN) {
    console.error('Error notas:', errN);
    return;
  }

  console.log(`Notas pendientes encontradas: ${notasPendientes?.length || 0}`);

  // Mapa de impacto por (producto_id, bodega_id)
  const mapImpacto = new Map(); // key: `${pId}_${bId}`

  for (const n of (notasPendientes || [])) {
    const tipo = Array.isArray(n.tipo_movimiento) ? n.tipo_movimiento[0] : n.tipo_movimiento;
    const afecta = tipo?.afecta_inventario ?? 0;
    const tipoCod = (tipo?.codigo || '').toUpperCase();

    for (const d of (n.detalles || [])) {
      if (!d.producto_id) continue;
      const pId = Number(d.producto_id);
      const prod = Array.isArray(d.producto) ? d.producto[0] : d.producto;
      const cajas = Number(d.cajas || 0);

      // Impacto en bodega origen
      if (n.bodega_origen_id && bodegaIds.includes(n.bodega_origen_id)) {
        const key = `${pId}_${n.bodega_origen_id}`;
        if (!mapImpacto.has(key)) mapImpacto.set(key, { sku: prod?.sku_base, familia: prod?.familia, bodega_id: n.bodega_origen_id, entradas: 0, salidas: 0, delta: 0, notas: [] });
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

      // Impacto en bodega destino (para traspasos entrantes)
      if (n.bodega_destino_id && bodegaIds.includes(n.bodega_destino_id)) {
        const key = `${pId}_${n.bodega_destino_id}`;
        if (!mapImpacto.has(key)) mapImpacto.set(key, { sku: prod?.sku_base, familia: prod?.familia, bodega_id: n.bodega_destino_id, entradas: 0, salidas: 0, delta: 0, notas: [] });
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

  console.log(`\nPares (Producto x Bodega) con impacto: ${mapImpacto.size}`);
  for (const [key, info] of mapImpacto.entries()) {
    const bNombre = bodegas.find(b => b.id === info.bodega_id)?.nombre;
    console.log(` • SKU: ${info.sku} [${info.familia}] @ Bodega ${bNombre} (${info.bodega_id}) -> Delta: ${info.delta >= 0 ? '+' : ''}${info.delta} cjs | Notas: ${info.notas.map(x => `${x.numero_nota}(${x.delta})`).join(', ')}`);
  }
}

testMatrixPronostico(['SAN MARTIN']);
