// C:\Users\uriel\Downloads\enero 26\archivo2\tests\fixtures\gen-moti-15-2026-fixture.js
// Genera tests/fixtures/moti-15-2026-separacion.json corriendo el parser MOTI
// vivo contra el Excel real (staging + separacion_sugerida + cajas del bloque final).
// Uso: node tests/fixtures/gen-moti-15-2026-fixture.js [--workflow <json>]
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

async function main() {
  const wfPath = path.resolve(arg('workflow', 'scripts/backups/n8n_2026-10-08T17-02-14/9XsVokBIW5HW3Pe-XP66f_packing-parser-switch-excel-reader-v13-sin-env.json'));
  const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
  const jsCode = String(wf.nodes.find((n) => n.name === 'Parser MOTI bloques').parameters.jsCode || '');
  if (!jsCode.includes('sku_conjoinado_dudoso')) throw new Error('El parser no trae Fase 1 (v1.1-detect)');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('docs/samples/packing-lists/15-2026 MOTI PACKING LIST TXGU4972610.xlsx');
  const ws = wb.worksheets[0];
  const rows = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    const a = [];
    for (let c = 1; c <= 20; c++) {
      let v = row.getCell(c).value;
      if (v && typeof v === 'object') {
        if (v.result !== undefined) v = v.result;
        else if (Array.isArray(v.richText)) v = v.richText.map((t) => t.text).join('');
        else if (v instanceof Date) v = v.toISOString();
        else if (typeof v.text === 'string') v = v.text;
        else v = '';
      }
      a.push(v === null || v === undefined ? '' : v);
    }
    rows.push(a);
  });
  const fn = new Function('$input', '$', jsCode);
  const fakeInput = { all: () => [{ json: { data: rows } }], first: () => [{ json: { data: rows } }] };
  const out = fn(fakeInput, () => { throw new Error('x'); })[0].json;

  const sep = (out.separacion_sugerida || []).find((s) => s.tipo === 'sku_conjoinado_dudoso');
  if (!sep) throw new Error('Sin separacion_sugerida sku_conjoinado_dudoso en la salida');
  const staging = ((out.staging_sugerido || {}).packing_lineas_staging || [])
    .filter((l) => String(l.sku_base || '').includes('AND260030'))
    .map((l) => ({
      fila_origen: l.fila_origen,
      codigo_caja_temporal: l.codigo_caja_temporal,
      carton_no_raw: l.carton_no_raw,
      cantidad_cajas: l.cantidad_cajas,
      piezas_por_caja: l.piezas_por_caja,
    }));
  const fixture = {
    descripcion: 'Bloque final 15-2026 TXGU4972610 (AND260030 + AND260029). Esperado: 4 primeras cajas -> AND260030 (filas 70/74/78/82), 2 ultimas -> AND260029 (filas 86/90).',
    version_parser: out.version_parser,
    sku_base_original: sep.sku_base_original,
    productos_candidatos: sep.productos_candidatos,
    cajas_para_revisar: sep.cajas_para_revisar,
    staging_bloque: staging,
    cajas_bloque: (out.cajas_para_editar || [])
      .filter((c) => (sep.cajas_para_revisar || []).includes(c.codigo_caja_temporal))
      .map((c) => ({
        codigo_caja_temporal: c.codigo_caja_temporal,
        carton_no_raw: c.carton_no_raw,
        cantidad_cajas: c.cantidad_cajas,
        piezas_por_caja: c.piezas_por_caja,
        total_piezas: c.total_piezas,
      })),
  };
  const outPath = path.resolve('tests/fixtures/moti-15-2026-separacion.json');
  fs.writeFileSync(outPath, JSON.stringify(fixture, null, 2));
  console.log('Fixture OK:', outPath, '| staging lines:', staging.length, '| cajas:', fixture.cajas_bloque.length);
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
