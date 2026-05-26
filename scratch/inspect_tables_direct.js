// scratch/inspect_tables_direct.js
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno de .env.local manualmente
try {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const parts = trimmed.split('=');
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = val;
      }
    });
  }
} catch (e) {
  console.warn('Advertencia: No se pudo cargar .env.local', e.message);
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'inv-tienda' }
});

async function main() {
  console.log('=== VERIFICANDO EXISTENCIA DE TABLAS B2B DIRECTAMENTE EN SUPABASE ===\n');

  // Intentamos consultar metadatos o hacer queries básicas a las 3 tablas propuestas
  
  // 1. Verificar usuario_personas
  console.log('> Verificando tabla "usuario_personas"...');
  try {
    const { data, error } = await supabaseAdmin.from('usuario_personas').select('id').limit(1);
    if (error) {
      console.log(`❌ No existe o dio error: ${error.message} (Código: ${error.code})`);
    } else {
      console.log('✅ ¡La tabla "usuario_personas" ya existe en la base de datos!');
    }
  } catch (err) {
    console.log(`❌ Error al conectar: ${err.message}`);
  }

  // 2. Verificar orden_detalles_comentarios
  console.log('\n> Verificando tabla "orden_detalles_comentarios"...');
  try {
    const { data, error } = await supabaseAdmin.from('orden_detalles_comentarios').select('id').limit(1);
    if (error) {
      console.log(`❌ No existe o dio error: ${error.message} (Código: ${error.code})`);
    } else {
      console.log('✅ ¡La tabla "orden_detalles_comentarios" ya existe en la base de datos!');
    }
  } catch (err) {
    console.log(`❌ Error al conectar: ${err.message}`);
  }

  // 3. Verificar orden_detalle_eventos
  console.log('\n> Verificando tabla "orden_detalle_eventos"...');
  try {
    const { data, error } = await supabaseAdmin.from('orden_detalle_eventos').select('id').limit(1);
    if (error) {
      console.log(`❌ No existe o dio error: ${error.message} (Código: ${error.code})`);
    } else {
      console.log('✅ ¡La tabla "orden_detalle_eventos" ya existe en la base de datos!');
    }
  } catch (err) {
    console.log(`❌ Error al conectar: ${err.message}`);
  }
}

main().catch(console.error);
