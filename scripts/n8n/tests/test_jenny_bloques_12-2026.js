// scripts/n8n/tests/test_jenny_bloques_12-2026.js
// Prueba local del parser Jenny v2-bloques contra docs/samples/packing-lists/12-2026 jenny.xlsx
// Uso: node scripts/n8n/tests/test_jenny_bloques_12-2026.js
const E = require('exceljs');
const { JENNY_JS } = require('../updates/jenny_parser_code.js');

const ESPERADO = {
  '01 02': { cajas: 104, piezas: 4946 },
  '02MW': { cajas: 45, piezas: 2721 },
  '03 04': { cajas: 83, piezas: 2957 },
  '09 10': { cajas: 67, piezas: 2396 },
  '13 14': { cajas: 111, piezas: 3972 },
};

(async () => {
  const wb = new E.Workbook();
  await wb.xlsx.readFile('docs/samples/packing-lists/12-2026 jenny.xlsx');
  const sheets = [];
  for (const ws of wb.worksheets) {
    const rows = [];
    for (let r = 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const arr = [];
      for (let c = 1; c <= 26; c++) arr.push(row.getCell(c).value);
      rows.push(arr);
    }
    sheets.push({ name: ws.name, rows });
  }
  const stubInput = { first: () => ({ json: { __workbook_sheets: sheets } }) };
  const stubDollar = () => ({ first: () => ({ json: { __config: {} } }) });
  const fn = new Function('$input', '$', JENNY_JS);
  const j = fn(stubInput, stubDollar)[0].json;
  console.log('version=' + j.version_parser);
  console.log('resumen cajas=' + j.resumen.total_cajas + ' piezas=' + j.resumen.total_piezas + ' warnings=' + j.resumen.total_warnings);
  const porHoja = {};
  for (const c of j.cajas_para_editar) {
    if (c.es_resumen) continue;
    porHoja[c.hoja_origen] = porHoja[c.hoja_origen] || { cajas: 0, piezas: 0 };
    porHoja[c.hoja_origen].cajas += c.cantidad_cajas || 0;
    porHoja[c.hoja_origen].piezas += c.total_piezas || 0;
  }
  let ok = j.resumen.total_cajas === 410 && j.resumen.total_piezas === 16992;
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
  const prodSinDescr = j.productos_para_editar.filter((p) => !p.descripcion).length;
  const prodSinComp = j.productos_para_editar.filter((p) => !p.composicion).length;
  console.log('productos=' + j.productos_para_editar.length + ' sin_descr=' + prodSinDescr + ' sin_comp=' + prodSinComp);
  console.log(ok ? 'PASS 410/16992' : 'FAIL');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('ERROR ' + (e && e.message)); process.exit(1); });
