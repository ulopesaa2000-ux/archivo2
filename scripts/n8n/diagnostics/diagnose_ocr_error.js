// scripts\n8n\diagnostics\diagnose_ocr_error.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' }
});

async function diagnose() {
  const ocrId = '5b155aa0-17cf-4993-a72d-67ea6bb08e58';
  console.log('=== DIAGNÓSTICO DE REGISTRO OCR ===', ocrId);

  // 1. Obtener la fila completa de nota_ocr_propuestas
  const { data: ocrRow, error: errOcr } = await supabase
    .from('nota_ocr_propuestas')
    .select('*')
    .eq('id', ocrId)
    .single();

  if (errOcr || !ocrRow) {
    console.error('Error al obtener fila de nota_ocr_propuestas:', errOcr);
    return;
  }

  console.log('\n--- DATOS DE CABECERA EN NOTA_OCR_PROPUESTAS ---');
  console.log('ID:', ocrRow.id);
  console.log('Folio detectado:', ocrRow.folio_detectado);
  console.log('Fecha detectada:', ocrRow.fecha_detectada);
  console.log('Tipo movimiento detectado:', ocrRow.tipo_movimiento_detectado, '| ID asignado:', ocrRow.tipo_movimiento_id);
  console.log('Origen detectado:', ocrRow.origen_detectado, '| Bodega Origen ID:', ocrRow.bodega_origen_id);
  console.log('Destino detectado:', ocrRow.destino_detectado, '| Bodega Destino ID:', ocrRow.bodega_destino_id);
  console.log('Estado propuesta:', ocrRow.estado);
  console.log('Nota ID vinculada:', ocrRow.nota_id);

  console.log('\n--- ANÁLISIS DE LAS LÍNEAS EXTRAÍDAS ---');
  const lineas = typeof ocrRow.lineas === 'string' ? JSON.parse(ocrRow.lineas) : ocrRow.lineas;
  console.log(`Total líneas extraídas: ${lineas?.length || 0}`);

  for (let i = 0; i < (lineas || []).length; i++) {
    const l = lineas[i];
    
    // Buscar en tabla productos por sku_base
    const { data: prodsExact } = await supabase
      .from('productos')
      .select('id, sku_base, descripcion, familia, activo')
      .eq('sku_base', l.sku);

    const { data: prodsLike } = await supabase
      .from('productos')
      .select('id, sku_base, descripcion, familia, activo')
      .ilike('sku_base', `%${l.sku}%`);

    console.log(`\n[Línea ${i + 1}]`);
    console.log(`  Detectado: SKU="${l.sku}", Raw="${l.estilo_raw}", Desc="${l.descripcion_texto || l.descripcion_raw}", Cajas=${l.cantidad_cajas}`);
    
    if (prodsExact && prodsExact.length > 0) {
      console.log(`  ✅ MATCH EXACTO EN DB: ID=${prodsExact[0].id}, SKU="${prodsExact[0].sku_base}", Familia="${prodsExact[0].familia}", Activo=${prodsExact[0].activo}`);
    } else if (prodsLike && prodsLike.length > 0) {
      console.log(`  ⚠️ COINCIDENCIA PARCIAL (no exacto):`, prodsLike.map(p => `"${p.sku_base}" (ID ${p.id})`).join(', '));
    } else {
      console.log(`  ❌ NO EXISTE EN TABLA PRODUCTOS con sku_base="${l.sku}"`);
      
      // Buscar alternativas parecidas
      const prefijo = l.sku.substring(0, 3);
      const { data: simProds } = await supabase
        .from('productos')
        .select('id, sku_base, descripcion, familia')
        .ilike('sku_base', `%${prefijo}%`)
        .limit(5);
      console.log(`     Sugerencias con prefijo "${prefijo}":`, simProds?.map(p => `"${p.sku_base}"`).join(', '));
    }
  }

  // 4. Revisar si hay notas ya creadas con ese folio o comprobante
  console.log('\n--- VERIFICACIÓN DE NOTAS EN BD ---');
  if (ocrRow.folio_detectado) {
    const { data: notasFolio } = await supabase
      .from('notas_inventario')
      .select('id, numero_nota, estado_id, fecha_nota, observaciones')
      .ilike('numero_nota', `%${ocrRow.folio_detectado}%`);
    console.log(`Notas existentes con folio ${ocrRow.folio_detectado}:`, notasFolio);
  }

  // 5. Verificar bodegas
  console.log('\n--- VERIFICACIÓN DE BODEGAS ---');
  const { data: bOrigen } = await supabase
    .from('bodegas')
    .select('id, nombre, ciudad, activo')
    .eq('id', ocrRow.bodega_origen_id || 0);
  console.log('Bodega Origen (ID 15):', bOrigen);

  const { data: bDestino } = await supabase
    .from('bodegas')
    .select('id, nombre, ciudad, activo')
    .ilike('nombre', `%CHOW%`);
  console.log('Búsqueda de Destino "CHOW" en tabla bodegas:', bDestino);

  // 6. Verificar tipos de movimiento
  console.log('\n--- VERIFICACIÓN TIPO DE MOVIMIENTO ---');
  const { data: tipoMov } = await supabase
    .from('cat_tipos_movimiento')
    .select('*')
    .eq('id', ocrRow.tipo_movimiento_id || 0);
  console.log('Tipo Movimiento (ID 2):', tipoMov);
}

diagnose();
