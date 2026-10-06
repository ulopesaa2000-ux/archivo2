// scripts/n8n/tests/test_jackie_bloques_14-2026.js
// Prueba local del parser Jackie v2-bloques contra
// docs/samples/packing-lists/14-2026Haizenfeng packing list.xlsx
// Esperado: 69 cajas / 1660 piezas (TOTALes impresos por hoja).
// Uso: node scripts/n8n/tests/test_jackie_bloques_14-2026.js
const E = require('exceljs');
const { JACKIE_JS } = require('../updates/jackie_parser_code.js');

const ESPERADO = {
  'HF26-05USD#': { cajas: 10, piezas: 240 },
  'HF26-10USD#': { cajas: 5, piezas: 119 },
  'HF26-11USD#': { cajas: 5, piezas: 120 },
  'HF26-12USD#': { cajas: 10, piezas: 240 },
  'HF26-13USD#': { cajas: 3, piezas: 72 },
  'HF26-06MSD#': { cajas: 13, piezas: 310 },
  'HF26-07MSD#': { cajas: 8, piezas: 199 },
  'HF26-08MSD#': { cajas: 3, piezas: 72 },
  'HF26-14MSD#': { cajas: 12, piezas: 288 },
};
// Advertencias legitimas del documento:
// - HF26/10USD B2: tallas suman 27 vs PC/CTN 23 (alta, dato impreso)
// - cover_totales: GW/NW/CBM de portada rancios vs calculado
const WARN_MIN = { detalle_vs_piezas_por_caja: 1, cover_totales: 1 };

(async () => {
  const wb = new E.Workbook();
  await wb.xlsx.readFile('docs/samples/packing-lists/14-2026Haizenfeng packing list.xlsx');
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
  let ok = j.resumen.total_cajas === 69 && j.resumen.total_piezas === 1660;
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
  for (const k of Object.keys(WARN_MIN)) {
    if ((wt[k] || 0) < WARN_MIN[k]) { ok = false; console.log('WARN ' + k + ' ausente FALLO'); }
  }
  console.log(ok ? 'PASS 69/1660' : 'FAIL');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('ERROR ' + (e && e.message)); process.exit(1); });
