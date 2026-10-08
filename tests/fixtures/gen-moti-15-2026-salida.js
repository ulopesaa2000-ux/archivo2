// C:\Users\uriel\Downloads\enero 26\archivo2\tests\fixtures\gen-moti-15-2026-salida.js
// Genera tests/fixtures/moti-15-2026-salida.json: salida COMPLETA (recortada a lo
// que consume el wizard) del parser MOTI vivo contra el Excel real.
// Uso: node tests/fixtures/gen-moti-15-2026-salida.js [--workflow <json>]
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

  const slim = {
    version_parser: out.version_parser,
    metadata: out.metadata,
    separacion_sugerida: out.separacion_sugerida,
    staging_sugerido: out.staging_sugerido,
    productos_para_editar: out.productos_para_editar,
    cajas_para_editar: out.cajas_para_editar,
    caja_detalles_para_editar: out.caja_detalles_para_editar,
    warnings: out.warnings,
  };
  const outPath = path.resolve('tests/fixtures/moti-15-2026-salida.json');
  fs.writeFileSync(outPath, JSON.stringify(slim));
  console.log('Salida OK:', outPath, Math.round(fs.statSync(outPath).size / 1024) + 'KB');
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
