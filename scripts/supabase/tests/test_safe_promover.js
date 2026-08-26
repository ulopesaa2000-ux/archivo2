// scripts\supabase\tests\test_safe_promover.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' }
});

async function testSafePromote() {
  const propuestaId = '5b155aa0-17cf-4993-a72d-67ea6bb08e58';
  const usuarioId = 1;

  console.log('--- TEST PROMOCIÓN SEGURA DE PROPUESTA ---', propuestaId);

  // 1. Obtener propuesta
  const { data: prop, error: errProp } = await supabase
    .from('nota_ocr_propuestas')
    .select('*')
    .eq('id', propuestaId)
    .single();

  if (errProp || !prop) {
    console.error('Error al obtener propuesta:', errProp);
    return;
  }

  console.log('Propuesta encontrada:', {
    tipo: prop.tipo_movimiento_id,
    origen: prop.bodega_origen_id,
    destino: prop.bodega_destino_id,
    folio: prop.folio_detectado,
    fecha: prop.fecha_detectada
  });

  const lineas = typeof prop.lineas === 'string' ? JSON.parse(prop.lineas) : (prop.lineas || []);
  console.log(`Líneas en propuesta: ${lineas.length}`);

  // 2. Mapear productos válidos
  const lineasValidas = [];
  const lineasOmitidas = [];

  for (const l of lineas) {
    let pId = l.producto_id;
    if (!pId) {
      // Intentar resolver por sku exacto
      const { data: prod } = await supabase
        .from('productos')
        .select('id, sku_base')
        .eq('sku_base', l.sku)
        .single();
      if (prod) pId = prod.id;
    }

    if (pId) {
      lineasValidas.push({
        producto_id: pId,
        sku: l.sku,
        cajas: Number(l.cantidad_cajas) || 1,
        piezas_sueltas: Number(l.piezas_por_caja) || 0
      });
    } else {
      lineasOmitidas.push({
        sku: l.sku || l.estilo_raw || 'DESCONOCIDO',
        desc: l.descripcion_texto || l.descripcion_raw || '',
        cajas: Number(l.cantidad_cajas) || 1
      });
    }
  }

  console.log(`\n✓ Líneas VÁLIDAS a insertar (${lineasValidas.length}):`, lineasValidas);
  console.log(`⚠️ Líneas OMITIDAS para revisión manual (${lineasOmitidas.length}):`, lineasOmitidas);

  let obs = prop.observaciones || '';
  if (lineasOmitidas.length > 0) {
    const textoOmitidas = lineasOmitidas.map(o => `${o.sku} (${o.cajas} cj${o.cajas !== 1 ? 's' : ''})`).join(', ');
    obs = obs ? `${obs} | ⚠️ OCR no vinculó: ${textoOmitidas}` : `⚠️ OCR no vinculó: ${textoOmitidas}`;
  }

  console.log('\nObservaciones finales calculadas:', obs);
}

testSafePromote();
