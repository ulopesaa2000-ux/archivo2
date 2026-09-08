// scripts/supabase/updates/insert_tallas_dobles.js
/**
 * Script para registrar las tallas dobles en inv-tienda.cat_tallas:
 * - CH-M (S/M)
 * - M-G (M/L)
 * - G-EG (L/XL)
 * - EG-2EG (XL/2XL)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'inv-tienda' },
});

const TALLAS_DOBLES = [
  {
    codigo: 'CH-M',
    nombre: 'CHICA - MEDIANA',
    categoria: 'ADULTO',
    talla_us: 'S/M',
    es_extra: false,
    orden: 22,
    tamano_cab_mx: '36-42',
    tamano_dama_mx: '28-34',
    activo: true,
  },
  {
    codigo: 'M-G',
    nombre: 'MEDIANA - GRANDE',
    categoria: 'ADULTO',
    talla_us: 'M/L',
    es_extra: false,
    orden: 23,
    tamano_cab_mx: '40-46',
    tamano_dama_mx: '32-38',
    activo: true,
  },
  {
    codigo: 'G-EG',
    nombre: 'GRANDE - EXTRA GDE',
    categoria: 'ADULTO',
    talla_us: 'L/XL',
    es_extra: true,
    orden: 24,
    tamano_cab_mx: '44-48',
    tamano_dama_mx: '36-42',
    activo: true,
  },
  {
    codigo: 'EG-2EG',
    nombre: 'EXTRA GDE - 2EG',
    categoria: 'ADULTO',
    talla_us: 'XL/2XL',
    es_extra: true,
    orden: 25,
    tamano_cab_mx: '48-52',
    tamano_dama_mx: '40-46',
    activo: true,
  },
];

async function run() {
  console.log('--- Verificando e insertando tallas dobles en cat_tallas ---');

  for (const talla of TALLAS_DOBLES) {
    // Verificar si ya existe por código
    const { data: existing, error: checkError } = await supabase
      .from('cat_tallas')
      .select('id, codigo, nombre')
      .eq('codigo', talla.codigo)
      .maybeSingle();

    if (checkError) {
      console.error(`Error verificando talla ${talla.codigo}:`, checkError);
      continue;
    }

    if (existing) {
      console.log(`✓ La talla ${talla.codigo} ya existe con ID ${existing.id} (${existing.nombre}).`);
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('cat_tallas')
        .insert(talla)
        .select('id, codigo, nombre, talla_us, orden')
        .single();

      if (insertError) {
        console.error(`✗ Error insertando talla ${talla.codigo}:`, insertError);
      } else {
        console.log(`+ Talla creada exitosamente: ID ${inserted.id} | Código: ${inserted.codigo} | US: ${inserted.talla_us} | Orden: ${inserted.orden}`);
      }
    }
  }

  console.log('\n--- Consulta final de cat_tallas ---');
  const { data: todas, error: errFinal } = await supabase
    .from('cat_tallas')
    .select('id, codigo, nombre, talla_us, categoria, orden')
    .order('orden', { ascending: true });

  if (errFinal) {
    console.error('Error al listar cat_tallas:', errFinal);
  } else {
    console.table(todas);
  }
}

run().catch(console.error);
