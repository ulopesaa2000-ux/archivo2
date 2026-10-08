// scripts/n8n/tests/test_jenny_bloques_17-2026.js
// Harness Jenny 17-2026 + oraculo Jacky sobre el mismo Excel.
// Esperado: 06MSD 104/3739, 07MSD 80/2863, 11UC 67/2680 (total 251/9282)
// + paletas de color completas por caja (ej. 06MSD grupo 1 = 6 colores).
// Uso:
//   node scripts/n8n/tests/test_jenny_bloques_17-2026.js --parser jenny
//   node scripts/n8n/tests/test_jenny_bloques_17-2026.js --parser jackie
const E = require('exceljs');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const PARSER = arg('parser', 'jenny'); // jenny | jackie
const EXCEL = 'docs/samples/packing-lists/17-2026 JENNYContainer NO.TCNU8379766-Packing List.xlsx';
// Por defecto simula el lector de produccion (excel-reader:8000 NO expande
// celdas fusionadas: las esclavas llegan vacias). Con --expand se conserva
// el comportamiento exceljs (maestro replicado en esclavas).
const SIMULATE_PROD = !process.argv.includes('--expand');

function colToIdx(s) {
  let n = 0;
  for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}
function clearMergeSlaves(ws, rows) {
  const merges = (ws.model && ws.model.merges) || [];
  let cleared = 0;
  for (const m of merges) {
    const mm = String(m).match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!mm) continue;
    const c1 = colToIdx(mm[1]); const r1 = Number(mm[2]);
    const c2 = colToIdx(mm[3]); const r2 = Number(mm[4]);
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        if (r === r1 && c === c1) continue;
        if (rows[r - 1] && c <= rows[r - 1].length) {
          if (rows[r - 1][c - 1] !== null && rows[r - 1][c - 1] !== undefined && rows[r - 1][c - 1] !== '') cleared++;
          rows[r - 1][c - 1] = null;
        }
      }
    }
  }
  return cleared;
}

const ESPERADO = {
  '06MSD': { cajas: 104, piezas: 3739 },
  '07MSD': { cajas: 80, piezas: 2863 },
  '11UC': { cajas: 67, piezas: 2680 },
};

function colorSet(caja) {
  const s = String(caja.colores || '');
  return s ? s.split('|').filter(Boolean) : [];
}

(async () => {
  const { JENNY_JS } = require('../updates/jenny_parser_code.js');
  let CODE = JENNY_JS;
  if (PARSER === 'jackie') {
    const fs = require('fs');
    const src = fs.readFileSync('scripts/n8n/updates/jackie_parser_code.js', 'utf8');
    const m = src.match(/const JACKIE_JS = String\.raw`([\s\S]*)`;[\s\S]*$/);
    if (!m) throw new Error('No se pudo extraer JACKIE_JS');
    CODE = m[1];
  }
  const wb = new E.Workbook();
  await wb.xlsx.readFile(EXCEL);
  console.log('modo lector: ' + (SIMULATE_PROD ? 'produccion (esclavas vacias)' : 'expand (exceljs)'));
  const sheets = [];
  for (const ws of wb.worksheets) {
    const rows = [];
    for (let r = 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const arr = [];
      for (let c = 1; c <= 26; c++) arr.push(row.getCell(c).value);
      rows.push(arr);
    }
    if (SIMULATE_PROD) {
      const n = clearMergeSlaves(ws, rows);
      if (process.env.VERBOSE) console.log(' ' + ws.name + ': ' + n + ' celdas esclavas vaciadas');
    }
    sheets.push({ name: ws.name, rows });
  }
  const stubInput = { first: () => ({ json: { __workbook_sheets: sheets } }) };
  const stubDollar = () => ({ first: () => ({ json: { __config: {} } }) });
  const fn = new Function('$input', '$', CODE);
  const j = fn(stubInput, stubDollar)[0].json;
  console.log('parser=' + PARSER + ' version=' + j.version_parser);
  const cajas = (j.cajas_para_editar || []).filter((c) => !c.es_resumen && c.tipo_caja !== 'padre_resumen');
  const totCajas = cajas.reduce((s, c) => s + (Number(c.cantidad_cajas) || 0), 0);
  const totPiezas = cajas.reduce((s, c) => s + (Number(c.total_piezas) || 0), 0);
  console.log('cajas Fisicas=' + totCajas + ' (esp 251) piezas=' + totPiezas + ' (esp 9282)');
  let ok = totCajas === 251 && totPiezas === 9282;
  const porHoja = {};
  for (const c of cajas) {
    const h = c.hoja_origen || '?';
    porHoja[h] = porHoja[h] || { cajas: 0, piezas: 0, n: 0, minColores: 99 };
    porHoja[h].cajas += Number(c.cantidad_cajas) || 0;
    porHoja[h].piezas += Number(c.total_piezas) || 0;
    porHoja[h].n++;
    const nc = colorSet(c).length;
    if (nc < porHoja[h].minColores) porHoja[h].minColores = nc;
  }
  for (const h of Object.keys(ESPERADO)) {
    const calc = porHoja[h] || { cajas: -1, piezas: -1, n: 0, minColores: 0 };
    const esp = ESPERADO[h];
    const match = calc.cajas === esp.cajas && calc.piezas === esp.piezas;
    if (!match) ok = false;
    console.log(h + ' cajas=' + calc.cajas + '/' + esp.cajas + ' piezas=' + calc.piezas + '/' + esp.piezas +
      ' bloques=' + calc.n + ' minColoresPorCaja=' + calc.minColores + ' ' + (match ? 'OK' : 'FALLO'));
  }
  // Paleta del grupo 1 de 06MSD (carton 1-104...): debe traer 6 colores
  const g1 = cajas.find((c) => (c.hoja_origen === '06MSD') && String(c.carton_no_raw || '').indexOf('1-104') === 0);
  if (g1) {
    console.log('06MSD grupo1 colores=' + JSON.stringify(colorSet(g1)) + ' pcs=' + g1.piezas_por_caja);
    if (colorSet(g1).length < 6) { ok = false; console.log('FALLO paleta incompleta (esp >=6 colores)'); }
  } else { ok = false; console.log('FALLO: no se hallo grupo 06MSD 1-104'); }
  const wt = {};
  for (const w of (j.warnings || [])) wt[w.tipo] = (wt[w.tipo] || 0) + 1;
  console.log('warnings=' + JSON.stringify(wt));
  const detBad = (j.warnings || []).filter((w) => w.tipo === 'detalle_vs_piezas_por_caja').length;
  console.log('detalle_vs_piezas_por_caja altas=' + detBad);
  console.log(ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('ERROR ' + (e && e.message)); process.exit(1); });
