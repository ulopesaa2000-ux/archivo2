// scripts\supabase\tests\test_nav_verification.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' }
});

async function simulateFetchNavegacionNota(notaId, opciones) {
  let query = supabase
    .from('notas_inventario')
    .select(`
      id, numero_nota, fecha_nota, estado_id, bodega_origen_id, bodega_destino_id, usuario_id,
      estado:cat_estados_nota!notas_inventario_estado_id_fkey (
        codigo, nombre, color
      )
    `)
    .eq('activo', true);

  const isSuperAdmin = opciones?.nivelAcceso === 1 || opciones?.rolNombre === 'Super Admin';
  const isAdminInventario = opciones?.rolNombre === 'Admin Operativo Inventario';
  const isBodeguero = opciones?.rolNombre === 'Bodeguero';

  if (isBodeguero && opciones?.usuarioId) {
    query = query.eq('usuario_id', opciones.usuarioId);
  } else if (!isSuperAdmin && !isAdminInventario && opciones?.userBodegaIds && opciones.userBodegaIds.length > 0) {
    const idsStr = opciones.userBodegaIds.join(',');
    query = query.or(`bodega_origen_id.in.(${idsStr}),bodega_destino_id.in.(${idsStr})`);
  }

  let bodegaFiltroNombre = null;
  if (opciones?.bodegaActivaId && opciones.bodegaActivaId > 0) {
    query = query.or(`bodega_origen_id.eq.${opciones.bodegaActivaId},bodega_destino_id.eq.${opciones.bodegaActivaId}`);

    const { data: bData } = await supabase
      .from('bodegas')
      .select('nombre')
      .eq('id', opciones.bodegaActivaId)
      .maybeSingle();
    if (bData) {
      bodegaFiltroNombre = bData.nombre;
    }
  }

  const { data: allNotas, error } = await query;

  if (error || !allNotas || allNotas.length === 0) {
    return null;
  }

  const sorted = [...allNotas].sort((a, b) => {
    const aEst = Array.isArray(a.estado) ? a.estado[0] : a.estado;
    const bEst = Array.isArray(b.estado) ? b.estado[0] : b.estado;
    const aIsPend = aEst?.codigo === 'PEND' || aEst?.codigo === 'PROC';
    const bIsPend = bEst?.codigo === 'PEND' || bEst?.codigo === 'PROC';
    if (aIsPend && !bIsPend) return -1;
    if (!aIsPend && bIsPend) return 1;
    if (aIsPend && bIsPend) return a.id - b.id;
    return b.id - a.id;
  });

  const currentIndex = sorted.findIndex((n) => n.id === notaId);
  if (currentIndex === -1) {
    return null;
  }

  const formatItem = (n) => {
    const est = Array.isArray(n.estado) ? n.estado[0] : n.estado;
    return {
      id: n.id,
      numero_nota: n.numero_nota,
      estado_codigo: est?.codigo ?? '',
      estado_nombre: est?.nombre ?? '',
      estado_color: est?.color ?? null,
    };
  };

  const prev = currentIndex > 0 ? formatItem(sorted[currentIndex - 1]) : null;
  const curr = formatItem(sorted[currentIndex]);
  const next = currentIndex < sorted.length - 1 ? formatItem(sorted[currentIndex + 1]) : null;

  return {
    posicion: currentIndex + 1,
    total: sorted.length,
    anterior: prev,
    siguiente: next,
    actual: curr,
    bodega_filtro_id: opciones?.bodegaActivaId && opciones.bodegaActivaId > 0 ? opciones.bodegaActivaId : null,
    bodega_filtro_nombre: bodegaFiltroNombre,
  };
}

async function run() {
  console.log('=== CASO 1: Nota 86 (PEND) sin filtro de bodega ===');
  const res1 = await simulateFetchNavegacionNota(86, { nivelAcceso: 1 });
  console.log(JSON.stringify(res1, null, 2));

  console.log('\n=== CASO 2: Nota 87 (Última PEND) -> Siguiente debe ser CONF ===');
  const res2 = await simulateFetchNavegacionNota(87, { nivelAcceso: 1 });
  console.log(JSON.stringify(res2, null, 2));

  console.log('\n=== CASO 3: Nota 86 con filtro de Bodega 10 (COCINA) ===');
  const res3 = await simulateFetchNavegacionNota(86, { nivelAcceso: 1, bodegaActivaId: 10 });
  console.log(JSON.stringify(res3, null, 2));
}

run();
