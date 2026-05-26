// scratch/test_fetch_assigned.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno manualmente de .env.local
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
          if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
          if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = value;
        }
      });
    }
  } catch (e) {
    console.error('Error cargando .env.local:', e);
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'inv-tienda'
  }
});

async function main() {
  console.log('=== PROBANDO CONSULTA DE ASIGNACIONES CON JOIN ===\n');
  console.log('Supabase URL:', supabaseUrl);

  const usuarioId = 27; // El ID de usuario que inspeccionamos

  const { data, error } = await supabase
    .from('usuario_personas')
    .select(`
      persona_id,
      created_at,
      persona:personas!usuario_personas_persona_id_fkey (
        id,
        nombre_completo,
        tipo_entidad,
        activo
      )
    `)
    .eq('usuario_id', usuarioId)
    .order('created_at');

  if (error) {
    console.error('Error de Supabase:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
  } else {
    console.log('Asignaciones encontradas con éxito:', JSON.stringify(data, null, 2));
  }
}

main().catch(console.error);
