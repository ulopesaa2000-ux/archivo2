// scripts/n8n/tests/test_jackie_packs_14-2026jacky.js
// Prueba local del parser Jackie v2 con PACK A/B en la misma celda del style:
// docs/samples/packing-lists/14-2026Jacky packing list.xlsx
// Esperado: 214 cajas / 7548 piezas; PACK A y PACK B separados por SKU,
// un solo producto por SKU limpio, sin avisos.
// Uso: node scripts/n8n/tests/test_jackie_packs_14-2026jacky.js
const E = require('exceljs');
const { JACKIE_JS } = require('../updates/jackie_parser_code.js');

const ESPERADO_PACK = {
  'JA26/01HSD|PACK UNICO': { cajas: 46, piezas: 1294 },
  'JA25/01USD|PACK A': { cajas: 38, piezas: 1444 },
  'JA25/01USD|PACK B': { cajas: 38, piezas: 1429 },
  'JA25/03USD|PACK A': { cajas: 28, piezas: 1061 },
  'JA25/03USD|PACK B': { cajas: 28, piezas: 1064 },
  'JA25/05ISD|PACK A': { cajas: 18, piezas: 626 },
  'JA25/05ISD|PACK B': { cajas: 18, piezas: 630 },
};
const ESPERADO_SKUS = ['JA26/01HSD', 'JA25/01USD', 'JA25/03USD', 'JA25/05ISD'];

(async () => {
  const wb = new E.Workbook();
  await wb.xlsx.readFile('docs/samples/packing-lists/14-2026Jacky packing list.xlsx');
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
  console.log('resumen productos=' + j.resumen.total_productos + ' cajas=' + j.resumen.total_cajas + ' piezas=' + j.resumen.total_piezas + ' warnings=' + j.resumen.total_warnings);
  let ok = j.resumen.total_cajas === 214 && j.resumen.total_piezas === 7548;
  const porPack = {};
  const cods = new Set();
  let dupCod = 0;
  for (const c of j.cajas_para_editar) {
    if (c.es_resumen) continue;
    if (cods.has(c.codigo_caja_temporal)) dupCod++;
    cods.add(c.codigo_caja_temporal);
    const k = c.sku_base + '|' + c.nombre_pack;
    porPack[k] = porPack[k] || { cajas: 0, piezas: 0 };
    porPack[k].cajas += c.cantidad_cajas || 0;
    porPack[k].piezas += c.total_piezas || 0;
  }
  for (const k of Object.keys(ESPERADO_PACK)) {
    const calc = porPack[k] || { cajas: -1, piezas: -1 };
    const esp = ESPERADO_PACK[k];
    const match = calc.cajas === esp.cajas && calc.piezas === esp.piezas;
    if (!match) ok = false;
    console.log(k + ' calc=' + calc.cajas + '/' + calc.piezas + ' esp=' + esp.cajas + '/' + esp.piezas + ' ' + (match ? 'OK' : 'FALLO'));
  }
  const skus = j.productos_para_editar.map((p) => p.sku_base).sort();
  const skusOk = JSON.stringify(skus) === JSON.stringify(ESPERADO_SKUS.slice().sort());
  if (!skusOk) ok = false;
  console.log('productos=' + JSON.stringify(skus) + ' ' + (skusOk ? 'OK' : 'FALLO (debe ser 1 por SKU limpio)'));
  if (dupCod > 0) { ok = false; console.log('codigos duplicados=' + dupCod + ' FALLO'); }
  else console.log('codigos unicos OK');
  // Linea por SKU (lo que usa el wizard para match): debe sumar ambos packs
  for (const op of j.orden_preview.orden_productos) {
    console.log('linea ' + op.sku_base + ': ' + op.cajas_pedidas + ' cjs / ' + op.piezas_pedidas + ' pz');
  }
  if (j.warnings.length > 0) { ok = false; console.log('warnings inesperados FALLO: ' + JSON.stringify(j.warnings.map((w) => w.tipo))); }
  console.log(ok ? 'PASS 214/7548 packs separados' : 'FAIL');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('ERROR ' + (e && e.message)); process.exit(1); });
