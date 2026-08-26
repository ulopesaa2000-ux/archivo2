// scripts\supabase\tests\test_forecast_query.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' }
});

async function testFetchStockPronostico(bodegaId, soloAfectados = false, q = '') {
  // 1. Obtener notas pendientes para esta bodega
  const { data: notasPendientes, error: errNotas } = await supabase
    .from('notas_inventario')
    .select(`
      id, numero_nota, fecha_nota, estado_id, tipo_movimiento_id, bodega_origen_id, bodega_destino_id, observaciones, nota_referencia,
      tipo_movimiento:cat_tipos_movimiento!notas_inventario_tipo_movimiento_id_fkey(codigo, nombre, afecta_inventario),
      bodega_destino:bodegas!notas_inventario_bodega_destino_id_fkey(nombre),
      detalles:nota_detalle_productos(
        id, producto_id, cajas, piezas_sueltas,
        producto:productos!nota_detalle_productos_producto_id_fkey(id, sku_base, descripcion, familia, pz_en_caja, marca:cat_marcas(nombre))
      )
    `)
    .eq('activo', true)
    .in('estado_id', [1, 4]) // PEND, PROC
    .or(`bodega_origen_id.eq.${bodegaId},bodega_destino_id.eq.${bodegaId}`);

  const mapImpacto = new Map();
  const productosEnNotasMap = new Map();

  for (const n of (notasPendientes || [])) {
    const tipo = Array.isArray(n.tipo_movimiento) ? n.tipo_movimiento[0] : n.tipo_movimiento;
    const afecta = tipo?.afecta_inventario ?? 0;
    const tipoCod = (tipo?.codigo || '').toUpperCase();
    const bDestino = Array.isArray(n.bodega_destino) ? n.bodega_destino[0] : n.bodega_destino;

    for (const d of (n.detalles || [])) {
      if (!d.producto_id) continue;
      const pId = Number(d.producto_id);
      const prod = Array.isArray(d.producto) ? d.producto[0] : d.producto;
      const marca = prod?.marca ? (Array.isArray(prod.marca) ? prod.marca[0] : prod.marca) : null;
      const cajas = Number(d.cajas || 0);

      if (!productosEnNotasMap.has(pId) && prod) {
        productosEnNotasMap.set(pId, {
          producto_id: pId,
          sku_base: prod.sku_base,
          descripcion: prod.descripcion,
          familia: prod.familia,
          pz_en_caja: prod.pz_en_caja,
          marca_nombre: marca?.nombre || null
        });
      }

      if (!mapImpacto.has(pId)) {
        mapImpacto.set(pId, {
          producto_id: pId,
          entradas: 0,
          salidas: 0,
          delta: 0,
          notas: []
        });
      }

      const info = mapImpacto.get(pId);
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

      info.delta = info.entradas - info.salidas;
      info.notas.push({
        nota_id: n.id,
        numero_nota: n.numero_nota,
        tipo_codigo: tipoCod,
        tipo_nombre: tipo?.nombre || tipoCod,
        cajas,
        delta,
        observaciones: n.observaciones,
        fecha_nota: n.fecha_nota,
        destino_nombre: bDestino?.nombre || null
      });
    }
  }

  // 2. Traer stock físico de la bodega
  let stockQuery = supabase
    .from('inventario_stock')
    .select(`
      id, bodega_id, producto_id, cajas, piezas_sueltas,
      ubicacion_pasillo, updated_at, caja_id,
      producto:productos!inner (
        id, sku_base, nombre, descripcion, familia, pz_en_caja,
        marca:cat_marcas!productos_marca_id_fkey ( nombre )
      )
    `)
    .eq('bodega_id', bodegaId)
    .is('caja_id', null);

  const { data: stockItems, error: errStock } = await stockQuery;

  const stockMap = new Map();
  (stockItems || []).forEach(s => {
    const prod = Array.isArray(s.producto) ? s.producto[0] : s.producto;
    const marca = prod?.marca ? (Array.isArray(prod.marca) ? prod.marca[0] : prod.marca) : null;
    stockMap.set(s.producto_id, {
      id: s.id,
      bodega_id: s.bodega_id,
      producto_id: s.producto_id,
      cajas: s.cajas,
      piezas_sueltas: s.piezas_sueltas,
      ubicacion_pasillo: s.ubicacion_pasillo,
      updated_at: s.updated_at,
      caja_id: s.caja_id,
      producto_sku: prod?.sku_base || '',
      producto_nombre: prod?.nombre || null,
      producto_descripcion: prod?.descripcion || null,
      producto_familia: prod?.familia || null,
      producto_pz_en_caja: prod?.pz_en_caja || null,
      marca_nombre: marca?.nombre || null,
    });
  });

  // Agregar productos de notas pendientes que no estaban en inventario_stock
  for (const [pId, pInfo] of productosEnNotasMap.entries()) {
    if (!stockMap.has(pId)) {
      stockMap.set(pId, {
        id: -pId,
        bodega_id: bodegaId,
        producto_id: pId,
        cajas: 0,
        piezas_sueltas: 0,
        ubicacion_pasillo: null,
        updated_at: null,
        caja_id: null,
        producto_sku: pInfo.sku_base || '',
        producto_nombre: pInfo.descripcion || null,
        producto_descripcion: pInfo.descripcion || null,
        producto_familia: pInfo.familia || null,
        producto_pz_en_caja: pInfo.pz_en_caja || null,
        marca_nombre: pInfo.marca_nombre || null,
      });
    }
  }

  // Enriquecer todos los items con los datos pronosticados
  let items = Array.from(stockMap.values()).map(item => {
    const impacto = mapImpacto.get(item.producto_id);
    const entradas = impacto?.entradas || 0;
    const salidas = impacto?.salidas || 0;
    const delta = impacto?.delta || 0;
    const pronosticado = item.cajas + delta;
    const notas = impacto?.notas || [];
    const tieneMovimiento = delta !== 0 || notas.length > 0;

    return {
      ...item,
      entradas_pendientes: entradas,
      salidas_pendientes: salidas,
      delta_cajas: delta,
      cajas_pronosticadas: pronosticado,
      notas_pendientes_afectando: notas,
      tiene_movimiento_pendiente: tieneMovimiento
    };
  });

  // Si soloAfectados es true
  if (soloAfectados) {
    items = items.filter(i => i.tiene_movimiento_pendiente);
  }

  // Búsqueda por texto si aplica
  if (q && q.trim()) {
    const term = q.toLowerCase().trim();
    items = items.filter(i => 
      (i.producto_sku || '').toLowerCase().includes(term) ||
      (i.producto_descripcion || '').toLowerCase().includes(term) ||
      (i.producto_familia || '').toLowerCase().includes(term)
    );
  }

  console.log(`\nResultados Modo Pronóstico (Bodega: ${bodegaId}, SoloAfectados: ${soloAfectados}, Q: "${q}"):`);
  console.log(`Total productos listados: ${items.length}`);
  console.log(`Total notas pendientes: ${notasPendientes?.length || 0}`);

  items.forEach(i => {
    const deltaSign = i.delta_cajas >= 0 ? '+' : '';
    console.log(` SKU: ${i.producto_sku} [${i.producto_familia}] | Real: ${i.cajas} cjs | Trámite: ${deltaSign}${i.delta_cajas} cjs | Pronosticado: ${i.cajas_pronosticadas} cjs | Notas: ${i.notas_pendientes_afectando.length}`);
  });
}

async function run() {
  await testFetchStockPronostico(10, false);
  await testFetchStockPronostico(10, true);
}
run();
