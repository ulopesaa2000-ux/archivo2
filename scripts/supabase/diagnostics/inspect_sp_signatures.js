// scripts\supabase\diagnostics\inspect_sp_signatures.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' }
});

async function checkSignatures() {
  console.log('--- INSPECTING SP SIGNATURES VIA TEST CALLS ---');

  // Let's test what types sp_crear_nota expects by calling with exact types
  // In Supabase client:
  // p_tipo_movimiento_id: integer/bigint/smallint?
  // p_bodega_origen_id: integer/bigint?
  // p_bodega_destino_id: integer/bigint?
  // p_usuario_id: bigint? uuid?
  // p_nota_referencia: text/varchar?
  // p_observaciones: text/varchar?

  // Let's check how actions.ts calls sp_crear_nota:
  // p_tipo_movimiento_id, p_bodega_origen_id, p_bodega_destino_id, p_usuario_id, p_nota_referencia, p_observaciones
}
checkSignatures();
