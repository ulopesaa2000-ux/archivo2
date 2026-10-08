// scripts/n8n/tests/test_moti_separacion_15-2026.js
// Reproduce el bug del bloque final de "15-2026 MOTI PACKING LIST TXGU4972610.xlsx"
// (AND260030 + AND260029 pegados en un solo sku_base) y verifica la Fase 1:
// el parser debe NOTIFICAR (warnings + separacion_sugerida) sin auto-dividir.
// Uso:
//   node scripts/n8n/tests/test_moti_separacion_15-2026.js --mode live
//   node scripts/n8n/tests/test_moti_separacion_15-2026.js --mode patched --parser-file <jsCode>
//   node scripts/n8n/tests/test_moti_separacion_15-2026.js --mode live --workflow <workflow.json>

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const MODE = arg('mode', 'live'); // live | patched
const DEFAULT_WF = path.resolve(
  'scripts/backups/n8n_2026-10-08T16-33-18',
  '9XsVokBIW5HW3Pe-XP66f_packing-parser-switch-excel-reader-v13-sin-env.json'
);
const WF_PATH = path.resolve(arg('workflow', DEFAULT_WF));
const EXCEL = path.resolve(arg('excel', 'docs/samples/packing-lists/15-2026 MOTI PACKING LIST TXGU4972610.xlsx'));
const PARSER_FILE = arg('parser-file', null);

function loadJsCode() {
  if (PARSER_FILE) return fs.readFileSync(path.resolve(PARSER_FILE), 'utf8');
  const wf = JSON.parse(fs.readFileSync(WF_PATH, 'utf8'));
  const node = wf.nodes.find((n) => n.name === 'Parser MOTI bloques');
  if (!node) throw new Error('Nodo Parser MOTI bloques no encontrado en ' + WF_PATH);
  return String(node.parameters.jsCode || '');
}

async function buildRows(excelPath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath);
  const ws = wb.worksheets[0];
  console.log('Hoja: ' + ws.name + ' | dims: ' + ws.dimensions);
  const rows = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    const arr = [];
    for (let c = 1; c <= 20; c++) {
      let v = row.getCell(c).value;
      if (v !== null && v !== undefined && typeof v === 'object') {
        if (v.result !== undefined) v = v.result;
        else if (Array.isArray(v.richText)) v = v.richText.map((t) => t.text).join('');
        else if (v instanceof Date) v = v.toISOString();
        else if (typeof v.text === 'string') v = v.text;
        else v = '';
      }
      arr.push(v === null || v === undefined ? '' : v);
    }
    rows.push(arr);
  });
  return rows;
}

function runParser(jsCode, rows) {
  const fn = new Function('$input', '$', jsCode);
  const $input = {
    all: () => [{ json: { data: rows } }],
    first: () => ({ json: { data: rows } }),
  };
  const $stub = () => { throw new Error('sin contexto n8n'); };
  return fn($input, $stub)[0].json;
}

async function main() {
  console.log('== Test MOTI separacion 15-2026 == | mode=' + MODE);
  const jsCode = loadJsCode();
  console.log('Parser jsCode len: ' + jsCode.length);
  const rows = await buildRows(EXCEL);
  console.log('Filas leidas: ' + rows.length);
  const out = runParser(jsCode, rows);

  const productos = out.productos_para_editar || [];
  const cajas = out.cajas_para_editar || [];
  const warnings = out.warnings || [];
  const sep = out.separacion_sugerida || [];

  console.log('\n--- Productos (' + productos.length + ') ---');
  for (const p of productos) console.log(' - ' + p.sku_base);

  const totalCajas = cajas.reduce((s, c) => s + (Number(c.cantidad_cajas) || 0), 0);
  const totalPz = cajas.reduce(
    (s, c) => s + (Number(c.total_piezas) || (Number(c.cantidad_cajas) || 0) * (Number(c.piezas_por_caja) || 0)),
    0
  );
  console.log('\nRegistros caja: ' + cajas.length + ' | cartones fisicos: ' + totalCajas + ' | piezas: ' + totalPz);
  console.log('(esperado: 10 registros, 390 cartones, 10800 piezas)');

  const conj = warnings.filter((w) => w.tipo === 'sku_conjoinado_dudoso');
  const packDup = warnings.filter((w) => w.tipo === 'pack_duplicado_dudoso');
  console.log('\nWarnings sku_conjoinado_dudoso: ' + conj.length);
  for (const w of conj) console.log(' - [' + w.severidad + '] ' + w.sku_base + ' :: ' + w.detalle);
  console.log('Warnings pack_duplicado_dudoso: ' + packDup.length + ' (esperado 0: todo PACK UNICO)');
  console.log('separacion_sugerida entries: ' + sep.length);
  for (const s of sep) {
    console.log(' - tipo=' + s.tipo + ' orig=' + s.sku_base_original);
    console.log('   candidatos=' + (s.productos_candidatos || []).map((c) => c.sku_base).join(' + '));
    console.log('   cajas_para_revisar=' + (s.cajas_para_revisar || []).length);
  }

  let fails = [];
  const hasConjoined = productos.some(
    (p) => /AND260030/i.test(p.sku_base || '') && /AND260029/i.test(p.sku_base || '')
  );
  if (MODE === 'live') {
    if (!hasConjoined) fails.push('LIVE: se esperaba el sku pegado AND260030+AND260029 (bug a reproducir)');
    if (conj.length !== 0) fails.push('LIVE: no debe haber deteccion aun');
  } else {
    if (!hasConjoined) fails.push('PATCHED: Fase 1 conserva el sku conjunto (solo notifica, no divide)');
    if (conj.length < 1) fails.push('PATCHED: falta warning sku_conjoinado_dudoso');
    else {
      const d = String(conj[0].detalle || '');
      if (!/AND260030/.test(d) || !/AND260029/.test(d)) fails.push('PATCHED: el warning debe citar ambos AND');
      if (conj[0].severidad !== 'alta') fails.push('PATCHED: severidad debe ser alta');
    }
    if (packDup.length !== 0) fails.push('PATCHED: falso positivo pack_duplicado (todo es PACK UNICO)');
    if (!Array.isArray(sep) || sep.length < 1) fails.push('PATCHED: falta separacion_sugerida');
    else {
      const cands = sep[0].productos_candidatos || [];
      const ups = cands.map((c) => String(c.sku_base || '').toUpperCase());
      if (!ups.includes('AND260030') || !ups.includes('AND260029')) {
        fails.push('PATCHED: candidatos deben ser AND260030 y AND260029, fue: ' + ups.join(','));
      }
      if ((sep[0].cajas_para_revisar || []).length !== 6) {
        fails.push('PATCHED: cajas_para_revisar del bloque final deben ser 6, fue: ' + (sep[0].cajas_para_revisar || []).length);
      }
    }
    if (cajas.length !== 10) fails.push('PATCHED: registros caja deben seguir 10, fue: ' + cajas.length);
    if (totalCajas !== 390) fails.push('PATCHED: cartones fisicos deben ser 390, fue: ' + totalCajas);
    if (totalPz !== 10800) fails.push('PATCHED: piezas deben ser 10800, fue: ' + totalPz);
  }

  if (fails.length) {
    console.log('\n❌ FALLOS:');
    for (const f of fails) console.log(' - ' + f);
    process.exit(1);
  }
  console.log('\n✅ OK mode=' + MODE);
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
