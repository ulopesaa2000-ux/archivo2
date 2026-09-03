// scripts/supabase/updates/update_notas_year_2026.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' }
});

// IDs de las 11 notas auditadas
const NOTAS_A_ACTUALIZAR = [
  { id: 109, fecha_actual: '2016-08-11T12:00:00', fecha_nueva: '2026-08-11T12:00:00' },
  { id: 115, fecha_actual: '2016-09-17T12:00:00', fecha_nueva: '2026-09-17T12:00:00' },
  { id: 117, fecha_actual: '2016-08-17T12:00:00', fecha_nueva: '2026-08-17T12:00:00' },
  { id: 146, fecha_actual: '2016-08-28T12:00:00', fecha_nueva: '2026-08-28T12:00:00' },
  { id: 147, fecha_actual: '2016-08-28T12:00:00', fecha_nueva: '2026-08-28T12:00:00' },
  { id: 157, fecha_actual: '2016-08-24T12:00:00', fecha_nueva: '2026-08-24T12:00:00' },
  { id: 158, fecha_actual: '2020-08-24T12:00:00', fecha_nueva: '2026-08-24T12:00:00' },
  { id: 161, fecha_actual: '2020-08-24T12:00:00', fecha_nueva: '2026-08-24T12:00:00' },
  { id: 163, fecha_actual: '2016-08-25T12:00:00', fecha_nueva: '2026-08-25T12:00:00' },
  { id: 167, fecha_actual: '2016-08-18T12:00:00', fecha_nueva: '2026-08-18T12:00:00' },
  { id: 168, fecha_actual: '2016-08-18T12:00:00', fecha_nueva: '2026-08-18T12:00:00' }
];

async function run() {
  console.log('=== ACTUALIZACIÓN DE AÑO A 2026 EN NOTAS_INVENTARIO Y PROPUESTAS ===\n');

  // 1. Actualizar notas_inventario
  console.log('1. Actualizando notas_inventario...');
  let notasOk = 0;
  for (const n of NOTAS_A_ACTUALIZAR) {
    const { data, error } = await supabase
      .from('notas_inventario')
      .update({ fecha_nota: n.fecha_nueva })
      .eq('id', n.id)
      .select('id, numero_nota, fecha_nota');

    if (error) {
      console.error(`❌ Error actualizando nota #${n.id}:`, error.message);
    } else {
      console.log(`✓ Nota #${n.id} (${data[0]?.numero_nota}): ${n.fecha_actual} -> ${data[0]?.fecha_nota}`);
      notasOk++;
    }
  }

  // 2. Actualizar nota_ocr_propuestas vinculadas
  console.log('\n2. Actualizando nota_ocr_propuestas vinculadas...');
  const notaIds = NOTAS_A_ACTUALIZAR.map(n => n.id);
  const { data: props, error: errProps } = await supabase
    .from('nota_ocr_propuestas')
    .select('id, nota_id, fecha_detectada')
    .in('nota_id', notaIds);

  if (errProps) {
    console.error('❌ Error consultando propuestas:', errProps);
  } else {
    for (const p of props) {
      if (p.fecha_detectada) {
        // Reemplazar año manteniendo mes y día
        const partes = p.fecha_detectada.split('-');
        if (partes.length === 3) {
          const nuevaFechaDetectada = `2026-${partes[1]}-${partes[2]}`;
          const { error: errUp } = await supabase
            .from('nota_ocr_propuestas')
            .update({ fecha_detectada: nuevaFechaDetectada })
            .eq('id', p.id);

          if (errUp) {
            console.error(`❌ Error actualizando propuesta ${p.id}:`, errUp.message);
          } else {
            console.log(`✓ Propuesta ${p.id} (Nota #${p.nota_id}): ${p.fecha_detectada} -> ${nuevaFechaDetectada}`);
          }
        }
      }
    }
  }

  // 3. Verificación final en notas_inventario
  console.log('\n3. Verificación final de notas con fecha anterior a 2026:');
  const { data: restantes } = await supabase
    .from('notas_inventario')
    .select('id, numero_nota, fecha_nota')
    .lt('fecha_nota', '2026-01-01T00:00:00');

  console.log(`Notas restantes con año < 2026: ${restantes?.length || 0}`);
  console.log('\n=== PROCESO COMPLETADO EXITOSAMENTE ===');
}

run().catch(console.error);
