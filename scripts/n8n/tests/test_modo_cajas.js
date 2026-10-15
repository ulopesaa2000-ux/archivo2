// scripts/n8n/tests/test_modo_cajas.js
function leerModo(v) {
  if (v === null || v === undefined || String(v) === '') return true;
  return !(['false', '0', 'no', 'off'].includes(String(v).toLowerCase().trim()));
}
function aplicarModo(lineas, modo) {
  let n = 0; const d = [];
  for (const pl of lineas) {
    const v = pl.piezas_por_caja;
    if (modo && v !== null && v !== undefined && String(v).trim() !== '' && !isNaN(Number(v)) && Number(v) !== 0) {
      n++;
      d.push('L' + (pl.index + 1) + ':' + v);
    }
    if (modo) { pl.piezas_por_caja = null; pl._piezas_detectadas = v ?? null; }
  }
  let obs = null;
  if (modo && n > 0) obs = 'Pz ignoradas por modo solo cajas (IA detecto ' + n + ' linea(s): ' + d.join(', ') + '). Se envian en 0.';
  return { lineas, n, obs };
}

let fail = 0;
function eq(a, b, msg) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log((ok ? 'OK  ' : 'FAIL') + ' ' + msg + (ok ? '' : ' got=' + JSON.stringify(a) + ' exp=' + JSON.stringify(b)));
  if (!ok) fail++;
}

// Default true cuando ausente
eq(leerModo(null), true, 'default null->true');
eq(leerModo(undefined), true, 'default undef->true');
eq(leerModo(''), true, 'default vacio->true');
eq(leerModo('false'), false, 'false->false');
eq(leerModo('0'), false, '0->false');
eq(leerModo(true), true, 'true->true');

// Con modo activo, piezas a cero + aviso
const r1 = aplicarModo([{ index: 0, piezas_por_caja: 5 }, { index: 1, piezas_por_caja: null }], true);
eq(r1.lineas.map(l => l.piezas_por_caja), [null, null], 'modo on: piezas en cero');
eq(r1.n, 1, 'modo on: 1 ignorada');
eq(typeof r1.obs === 'string' && r1.obs.includes('Pz ignoradas por modo solo cajas'), true, 'modo on: aviso observaciones');

// Con modo apagado, respeta piezas
const r2 = aplicarModo([{ index: 0, piezas_por_caja: 5 }], false);
eq(r2.lineas[0].piezas_por_caja, 5, 'modo off: respeta piezas');
eq(r2.obs, null, 'modo off: sin aviso');

// Sin piezas detectadas, sin aviso pero igual en cero
const r3 = aplicarModo([{ index: 0, piezas_por_caja: null }], true);
eq(r3.obs, null, 'modo on sin piezas: sin aviso');

if (fail > 0) { console.error('FALLOS:', fail); process.exit(1); }
console.log('TODOS LOS CASOS MODOCAJAS PASAN');
