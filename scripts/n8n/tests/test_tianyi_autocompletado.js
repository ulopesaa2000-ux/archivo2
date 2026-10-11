// scripts/n8n/tests/test_tianyi_autocompletado.js
// Repro + verificacion Fase 1 Tianyi contra docs/samples/packing-lists/PACKING LIST tianyi.xlsx
// Esperado (patched): 8 cajas con pcs reales [20,20,4,18,24,30,21,14],
// ctns [150,98,1,56,84,50,78,1], ttl [3000,1960,4,1008,2016,1500,1638,14],
// totales 518 cartones / 11140 piezas, 0 cajas fantasma.
// Uso:
//   node scripts/n8n/tests/test_tianyi_autocompletado.js --mode live
//   node scripts/n8n/tests/test_tianyi_autocompletado.js --mode patched --parser-file <jsCode>
const fs = require('fs');
const path = require('path');
const E = require('exceljs');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const MODE = arg('mode', 'live');
const WF_PATH = path.resolve(arg('workflow',
  'scripts/backups/n8n_2026-10-08T17-02-14/9XsVokBIW5HW3Pe-XP66f_packing-parser-switch-excel-reader-v13-sin-env.json'));
const PARSER_FILE = arg('parser-file', null);
const EXCEL = 'docs/samples/packing-lists/PACKING LIST tianyi.xlsx';

// Esperado por STYLE en orden de filas 5-12 del Excel
const ESPERADO = [
  { sku: 'TY25/01MC', pcs: 20, ctns: 150, ttl: 3000 },
  { sku: 'TY25/02HC', pcs: 20, ctns: 98, ttl: 1960 },
  { sku: 'TY25/02HC', pcs: 4, ctns: 1, ttl: 4 },
  { sku: 'TY25/03HC', pcs: 18, ctns: 56, ttl: 1008 },
  { sku: 'TY25/04HC', pcs: 24, ctns: 84, ttl: 2016 },
  { sku: 'TY25/06MC', pcs: 30, ctns: 50, ttl: 1500 },
  { sku: 'TY25/05HC', pcs: 21, ctns: 78, ttl: 1638 },
  { sku: 'TY25/05HC', pcs: 14, ctns: 1, ttl: 14 },
];

function loadJsCode() {
  if (PARSER_FILE) return fs.readFileSync(path.resolve(PARSER_FILE), 'utf8');
  const wf = JSON.parse(fs.readFileSync(WF_PATH, 'utf8'));
  const node = wf.nodes.find((n) => n.name === 'Parser Tianyi resumen');
  if (!node) throw new Error('Nodo Parser Tianyi resumen no encontrado en ' + WF_PATH);
  return String(node.parameters.jsCode || '');
}

(async () => {
  console.log('== Test Tianyi autocompletado == | mode=' + MODE);
  const jsCode = loadJsCode();
  console.log('Parser jsCode len: ' + jsCode.length);
  const wb = new E.Workbook();
  await wb.xlsx.readFile(EXCEL);
  const ws = wb.worksheets[0];
  const rows = [];
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const arr = [];
    for (let c = 1; c <= 24; c++) {
      const v = row.getCell(c).value;
      arr.push(v && typeof v === 'object' ? (v.text || v.result || '') : (v == null ? '' : v));
    }
    rows.push(arr);
  }
  const stubInput = { all: () => rows.map((x) => ({ json: { data: [x] } })) };
  const stubDollar = () => ({ first: () => ({ json: { __config: {} } }) });
  const out = new Function('$input', '$', jsCode)(stubInput, stubDollar)[0].json;
  console.log('version=' + out.version_parser);

  const cajas = out.cajas_para_editar || [];
  const fails = [];
  if (MODE === 'live') {
    const nulos = cajas.filter((c) => c.piezas_por_caja == null).length;
    console.log('cajas=' + cajas.length + ' con pcs null=' + nulos);
    if (cajas.length !== 6) fails.push('LIVE: se esperaban 6 cajas colapsadas, fue ' + cajas.length);
    if (nulos !== 6) fails.push('LIVE: se esperaban 6 cajas con pcs null (bug a reproducir), fue ' + nulos);
  } else {
    if (cajas.length !== 8) fails.push('PATCHED: se esperaban 8 cajas, fue ' + cajas.length);
    const key = (c) => [c.sku_base, c.piezas_por_caja, c.cantidad_cajas, c.total_piezas].join('|');
    const got = new Set(cajas.map(key));
    for (const e of ESPERADO) {
      if (!got.has([e.sku, e.pcs, e.ctns, e.ttl].join('|'))) {
        fails.push('PATCHED: falta caja ' + e.sku + ' pcs=' + e.pcs + ' ctns=' + e.ctns + ' ttl=' + e.ttl);
      }
    }
    const totCajas = cajas.reduce((s, c) => s + (Number(c.cantidad_cajas) || 0), 0);
    const totPz = cajas.reduce((s, c) => s + (Number(c.total_piezas) || 0), 0);
    console.log('cartones=' + totCajas + ' (esp 518) piezas=' + totPz + ' (esp 11140)');
    if (totCajas !== 518) fails.push('PATCHED: cartones deben ser 518, fue ' + totCajas);
    if (totPz !== 11140) fails.push('PATCHED: piezas deben ser 11140, fue ' + totPz);
    const sinPz = cajas.filter((c) => !(Number(c.piezas_por_caja) > 0)).length;
    if (sinPz !== 0) fails.push('PATCHED: ' + sinPz + ' cajas siguen sin piezas (floor no aplicado)');
    const fantasma = cajas.filter((c) => c.sku_base === 'SIN-SKU' || !c.sku_base).length;
    if (fantasma !== 0) fails.push('PATCHED: hay cajas fantasma sin SKU');
  }
  const wt = {};
  for (const w of (out.warnings || [])) wt[w.tipo] = (wt[w.tipo] || 0) + 1;
  console.log('warnings=' + JSON.stringify(wt));
  if (fails.length) {
    console.log('❌ FALLOS:');
    for (const f of fails) console.log(' - ' + f);
    process.exit(1);
  }
  console.log('✅ OK mode=' + MODE);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
