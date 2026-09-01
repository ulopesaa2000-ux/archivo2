// scripts/supabase/updates/update_infantil_generos.js
/**
 * Script para corregir los géneros de los productos infantiles en inv-tienda.productos
 * Cambia los productos con edad_id = 1 (Infantil) de Hombre/Mujer a Niño/Niña/Unisex según corresponda.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'inv-tienda' },
});

async function run() {
  console.log('Iniciando corrección de géneros para productos infantiles...');

  // 1. Obtener productos con edad_id = 1 (Infantil)
  const { data: prods, error: fetchErr } = await supabase
    .from('productos')
    .select(`
      id, sku_base, nombre, genero_id, edad_id, tipo_prenda_id, es_conjunto,
      cat_generos ( id, nombre )
    `)
    .eq('edad_id', 1)
    .order('id', { ascending: true });

  if (fetchErr) {
    console.error('Error al consultar productos infantiles:', fetchErr);
    process.exit(1);
  }

  console.log(`Total productos infantiles encontrados: ${prods.length}`);

  // Guardar backup del estado actual antes de modificar
  const backupDir = path.join(__dirname, '../../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupPath = path.join(backupDir, `backup_infantil_generos_${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(prods, null, 2));
  console.log(`Backup guardado en: ${backupPath}`);

  // 2. Determinar nuevo género para cada uno
  const updates = [];

  for (const p of prods) {
    const sku = p.sku_base;
    const genActualId = p.genero_id;
    const genActualNom = p.cat_generos?.nombre;

    let nuevoGeneroId = genActualId;
    let motivo = 'Sin cambio';

    // Reglas precisas
    if (/GSET|GCH|GC|GGH|GCTEDDY|-G\b|\/.*G/i.test(sku)) {
      nuevoGeneroId = 5; // Niña
      motivo = 'Código G en SKU (Girl)';
    } else if (/BSET|BCH|BC|BCG|BCR|BTEDDY|BTS|-B\b|\/.*B/i.test(sku)) {
      nuevoGeneroId = 4; // Niño
      motivo = 'Código B en SKU (Boy)';
    } else if (/ISD|IS|IU|UNISEX/i.test(sku) || genActualId === 3) {
      nuevoGeneroId = 3; // Unisex
      motivo = 'Código I/U en SKU (Unisex)';
    } else if (genActualNom === 'Mujer' || genActualId === 1) {
      nuevoGeneroId = 5; // Niña
      motivo = 'Mujer en edad Infantil → Niña';
    } else if (genActualNom === 'Hombre' || genActualId === 2) {
      nuevoGeneroId = 4; // Niño
      motivo = 'Hombre en edad Infantil → Niño';
    }

    if (nuevoGeneroId !== genActualId) {
      updates.push({
        id: p.id,
        sku: p.sku_base,
        genero_anterior: genActualNom || `ID ${genActualId}`,
        genero_nuevo_id: nuevoGeneroId,
        genero_nuevo: nuevoGeneroId === 4 ? 'Niño' : nuevoGeneroId === 5 ? 'Niña' : 'Unisex',
        motivo,
      });
    }
  }

  console.log(`\nSe actualizarán ${updates.length} productos:`);
  console.table(updates.slice(0, 30));
  if (updates.length > 30) {
    console.log(`... y ${updates.length - 30} productos más.`);
  }

  // 3. Ejecutar actualizaciones en la BD
  let actualizados = 0;
  let errores = 0;

  for (const item of updates) {
    const { error: updErr } = await supabase
      .from('productos')
      .update({ genero_id: item.genero_nuevo_id })
      .eq('id', item.id);

    if (updErr) {
      console.error(`Error al actualizar producto ID ${item.id} (${item.sku}):`, updErr.message);
      errores++;
    } else {
      actualizados++;
    }
  }

  console.log(`\n======================================================`);
  console.log(`RESULTADO: ${actualizados} productos actualizados con éxito. (${errores} errores)`);
  console.log(`======================================================`);
}

run().catch(console.error);
