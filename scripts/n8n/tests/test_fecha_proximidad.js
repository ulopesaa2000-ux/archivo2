// scripts/n8n/tests/test_fecha_proximidad.js
function esBisiesto(y) { return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0); }
function construirISO(yyyy, mm, dd) {
  if (!(mm >= 1 && mm <= 12)) return null;
  const dim = [31, esBisiesto(yyyy) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mm - 1];
  let d = Math.min(Math.max(dd, 1), dim);
  if (mm === 2 && dd === 29 && !esBisiesto(yyyy)) d = 28;
  return yyyy + '-' + String(mm).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}
function corregirAnioProximo(yyyy, mm, dd, hoy) {
  const orig = yyyy;
  let base = hoy.yyyy;
  if (hoy.mm <= 2 && mm > hoy.mm) base = hoy.yyyy - 1;
  if (Math.abs(yyyy - hoy.yyyy) > 1) yyyy = base;
  else if (yyyy !== base && Math.abs(yyyy - base) > 1) yyyy = base;
  let iso = construirISO(yyyy, mm, dd);
  if (!iso) return { yyyy, corregida: yyyy !== orig };
  try {
    const f = new Date(iso + 'T12:00:00Z').getTime();
    const h = new Date(hoy.yyyy + '-' + String(hoy.mm).padStart(2, '0') + '-' + String(hoy.dd).padStart(2, '0') + 'T12:00:00Z').getTime();
    let tries = 0;
    while (f > h + 7 * 86400000 && tries < 3) { yyyy = yyyy - 1; iso = construirISO(yyyy, mm, dd); tries++; }
  } catch (e) {}
  return { yyyy, corregida: yyyy !== orig };
}
function normalizarFecha(raw, hoy) {
  if (!raw) return { fecha: null, corregida: false };
  const s = String(raw).trim();
  let dd = null, mm = null, yyyy = null;
  const mIso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (mIso) { yyyy = parseInt(mIso[1], 10); mm = parseInt(mIso[2], 10); dd = parseInt(mIso[3], 10); }
  else {
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      dd = parseInt(m[1], 10); mm = parseInt(m[2], 10);
      yyyy = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
    } else return { fecha: s, corregida: false };
  }
  if (!(mm >= 1 && mm <= 12) || !(dd >= 1 && dd <= 31)) return { fecha: s, corregida: false };
  const corr = corregirAnioProximo(yyyy, mm, dd, hoy);
  return { fecha: construirISO(corr.yyyy, mm, dd), corregida: corr.corregida };
}

const HOY_OCT = { dd: 15, mm: 10, yyyy: 2026 };
const HOY_ENE = { dd: 5, mm: 1, yyyy: 2027 };
const cases = [
  ['15/10/26', HOY_OCT, '2026-10-15', false],
  ['19/09/2016', HOY_OCT, '2026-09-19', true],
  ['2076-09-18', HOY_OCT, '2026-09-18', true],
  ['24/09/2024', HOY_OCT, '2026-09-24', true],
  ['21/09/2020', HOY_OCT, '2026-09-21', true],
  ['28/09/2076', HOY_OCT, '2026-09-28', true],
  ['20/12/2026', HOY_ENE, '2026-12-20', false],
  ['20/12/2016', HOY_ENE, '2026-12-20', true],
  ['29/02/2016', HOY_OCT, '2026-02-28', true],
];
let fail = 0;
for (const [inp, hoy, exp, expCorr] of cases) {
  const r = normalizarFecha(inp, hoy);
  const ok = r.fecha === exp && r.corregida === expCorr;
  if (!ok) fail++;
  console.log((ok ? 'OK  ' : 'FAIL') + ' ' + inp + ' hoy=' + hoy.yyyy + '-' + hoy.mm + ' -> ' + r.fecha + ' corr=' + r.corregida + ' (esp ' + exp + '/' + expCorr + ')');
}
if (fail > 0) { console.error('FALLOS:', fail); process.exit(1); }
console.log('TODOS LOS CASOS PASAN');
