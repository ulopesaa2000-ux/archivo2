// scripts\supabase\tests\test_nav_notas.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' }
});

async function testNav(notaId, bodegaFiltroId, usuarioId, isBodeguero) {
  let query = supabase
    .from('notas_inventario')
    .select(`
      id, numero_nota, fecha_nota, estado_id, bodega_origen_id, bodega_destino_id, usuario_id,
      estado:cat_estados_nota!notas_inventario_estado_id_fkey(codigo, nombre, color)
    `)
    .eq('activo', true);

  if (bodegaFiltroId && bodegaFiltroId > 0) {
    query = query.or(`bodega_origen_id.eq.${bodegaFiltroId},bodega_destino_id.eq.${bodegaFiltroId}`);
  }

  if (isBodeguero) {
    query = query.eq('usuario_id', usuarioId);
  }

  const { data: allNotas, error } = await query;
  if (error || !allNotas) {
    console.error('Error:', error);
    return;
  }

  // Ordenar: PEND/PROC primero en orden ASC por id, luego CONF/CANC en orden DESC por id
  const sorted = [...allNotas].sort((a, b) => {
    const aEst = Array.isArray(a.estado) ? a.estado[0] : a.estado;
    const bEst = Array.isArray(b.estado) ? b.estado[0] : b.estado;
    const aIsPend = aEst?.codigo === 'PEND' || aEst?.codigo === 'PROC';
    const bIsPend = bEst?.codigo === 'PEND' || bEst?.codigo === 'PROC';
    if (aIsPend && !bIsPend) return -1;
    if (!aIsPend && bIsPend) return 1;
    if (aIsPend && bIsPend) return a.id - b.id; // Secuencia ascendente para pendientes (86, 87...)
    return b.id - a.id; // Regresión descendente para confirmadas/canceladas (85, 84, 73...)
  });

  const currentIndex = sorted.findIndex(n => n.id === notaId);
  console.log(`\n======================================================`);
  console.log(`Búsqueda para Nota ID ${notaId} (Filtro Bodega: ${bodegaFiltroId || 'Todas'}):`);
  console.log(`Total notas en scope: ${sorted.length}`);
  console.log(`Posición: ${currentIndex !== -1 ? `${currentIndex + 1} de ${sorted.length}` : 'Fuera del scope'}`);
  
  if (currentIndex !== -1) {
    const prev = currentIndex > 0 ? sorted[currentIndex - 1] : null;
    const curr = sorted[currentIndex];
    const next = currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null;
    const currEst = Array.isArray(curr.estado) ? curr.estado[0] : curr.estado;
    const prevEst = prev ? (Array.isArray(prev.estado) ? prev.estado[0] : prev.estado) : null;
    const nextEst = next ? (Array.isArray(next.estado) ? next.estado[0] : next.estado) : null;

    console.log('⬅️ Anterior:', prev ? `${prev.numero_nota} (ID ${prev.id}) [${prevEst?.codigo}]` : 'NINGUNA');
    console.log('🔘 Actual:  ', `${curr.numero_nota} (ID ${curr.id}) [${currEst?.codigo}]`);
    console.log('➡️ Siguiente:', next ? `${next.numero_nota} (ID ${next.id}) [${nextEst?.codigo}]` : 'NINGUNA');
  }

  console.log('\nPrimeras 5 notas en el orden de navegación:');
  sorted.slice(0, 5).forEach((n, idx) => {
    const est = Array.isArray(n.estado) ? n.estado[0] : n.estado;
    console.log(` ${idx + 1}. ID ${n.id} -> ${n.numero_nota} [${est?.codigo} - ${est?.nombre}]`);
  });
}

async function run() {
  await testNav(86, 0, 1, false);
  await testNav(87, 10, 1, false);
  await testNav(85, 0, 1, false);
}
run();
