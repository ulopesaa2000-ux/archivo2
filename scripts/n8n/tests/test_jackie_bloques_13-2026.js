// scripts/n8n/tests/test_jackie_bloques_13-2026.js
// Prueba local del parser Jackie v2-bloques contra
// docs/samples/packing-lists/13-2026Haizenfeng packing list.xlsx
// Esperado: 61 cajas / 1466 piezas (TOTALes impresos por hoja).
// Uso: node scripts/n8n/tests/test_jackie_bloques_13-2026.js
const E = require('exceljs');
const { JACKIE_JS } = require('../updates/jackie_parser_code.js');

const ESPERADO = {
  'HF26-05USD#': { cajas: 6, piezas: 144 },
  'HF26-10USD#': { cajas: 10, piezas: 240 },
  'HF26-11USD#': { cajas: 10, piezas: 236 },
  'HF26-12USD#': { cajas: 6, piezas: 154 },
  'HF26-13USD#': { cajas: 11, piezas: 264 },
  'HF26-06MSD#': { cajas: 2, piezas: 48 },
  'HF26-07MSD#': { cajas: 5, piezas: 120 },
  'HF26-08MSD#': { cajas: 10, piezas: 233 },
  'HF26-14MSD#': { cajas: 1, piezas: 27 },
};
// Advertencias legitimas del documento (no del parser):
// - HF26/11USD: T.G.W impreso 122 vs calculado 152.8 (portada/hoja rancias)
const WARN_OK = { total_hoja_vs_detalle: 1, cover_totales: 1 };

(async () => {
  const wb = new E.Workbook();
  await wb.xlsx.readFile('docs/samples/packing-lists/13-2026Haizenfeng packing list.xlsx');
  const sheets = [];
  for (const ws of wb.worksheets) {
    const rows = [];
    for (let r = 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const arr = [];
      for (let c = 1; c <= ws.columnCount; c++) arr.push(row.getCell(c).value);
      rows.push(arr);
    }
    sheets.push({ name: ws.name, rows });
  }
  const fn = new Function('$input', '$', JACKIE_JS);
  const j = fn({ first: () => ({ json: { __workbook_sheets: sheets } }) }, () => ({ first: () => ({ json: { __config: {} } }) }))[0].json;
  console.log('version=' + j.version_parser);
  console.log('resumen cajas=' + j.resumen.total_cajas + ' piezas=' + j.resumen.total_piezas + ' warnings=' + j.resumen.total_warnings);
  const porHoja = {};
  for (const c of j.cajas_para_editar) {
    if (c.es_resumen) continue;
    porHoja[c.hoja_origen] = porHoja[c.hoja_origen] || { cajas: 0, piezas: 0 };
    porHoja[c.hoja_origen].cajas += c.cantidad_cajas || 0;
    porHoja[c.hoja_origen].piezas += c.total_piezas || 0;
  }
  let ok = j.resumen.total_cajas === 61 && j.resumen.total_piezas === 1466;
  for (const h of Object.keys(ESPERADO)) {
    const calc = porHoja[h] || { cajas: -1, piezas: -1 };
    const esp = ESPERADO[h];
    const match = calc.cajas === esp.cajas && calc.piezas === esp.piezas;
    if (!match) ok = false;
    console.log(h + ' calc=' + calc.cajas + '/' + calc.piezas + ' esp=' + esp.cajas + '/' + esp.piezas + ' ' + (match ? 'OK' : 'FALLO'));
  }
  const wt = {};
  for (const w of j.warnings) wt[w.tipo] = (wt[w.tipo] || 0) + 1;
  console.log('warnings=' + JSON.stringify(wt));
  for (const k of Object.keys(WARN_OK)) {
    if ((wt[k] || 0) !== WARN_OK[k]) { ok = false; console.log('WARN ' + k + ' esperado ' + WARN_OK[k] + ' FALLO'); }
  }
  const altas = j.warnings.filter((w) => w.severidad === 'alta').length;
  console.log('altas=' + altas + (altas > 0 ? ' FALLO (13-2026 no debe tener altas)' : ' OK'));
  if (altas > 0) ok = false;
  console.log(ok ? 'PASS 61/1466' : 'FAIL');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('ERROR ' + (e && e.message)); process.exit(1); });
