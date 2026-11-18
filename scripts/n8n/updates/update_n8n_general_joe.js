// scripts/n8n/updates/update_n8n_general_joe.js
const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const ExcelJS = require('exceljs');

const rootDir = path.resolve(__dirname, '../../..');
const envPath = path.join(rootDir, '.env.local');
const envConfig = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath)) : {};

const apiKey = process.env.N8N_API_KEY || envConfig.N8N_API_KEY || '';
const workflowId = '9XsVokBIW5HW3Pe-XP66f';

function api(method, apiPath, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: 'n8n.sistemaindumentaria.com',
        path: '/api/v1' + apiPath,
        method,
        headers: {
          'X-N8N-API-KEY': apiKey,
          ...(payload
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
              }
            : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function patchParserGeneralCode(code) {
  let updated = code;

  const replacements = [
    [
      "if (ns.some(x => /^(style no\\.?|style no,|style number|style|sku|item no\\.?|item number)$/.test(x))) score += 7;",
      "if (ns.some(x => /^(style no\\.?|style no,|style number|style|sku|sku base|item no\\.?|item number|reference|ref\\.?|ref no\\.?)$/.test(x))) score += 7;",
    ],
    [
      "if (ns.some(x => /quantity\\/pc|total quantity|ttl\\.?\\s*qty|total qty/.test(x))) score += 3;",
      "if (ns.some(x => /quantity\\/pc|total quantity|ttl\\.?\\s*qty|total qty|^qty$/.test(x))) score += 3;",
    ],
    [
      "if (ns.some(x => /carton size|measurement|meas|cbm/.test(x))) score += 3;",
      "if (ns.some(x => /carton size|measurement|meas|cbm|size assortment/.test(x))) score += 3;",
    ],
    [
      "if (/^(style no\\.?|style no,|style number|style|sku|sku base|item no\\.?|item number)$/.test(n)) return 'style_no';",
      "if (/^(style no\\.?|style no,|style number|style|sku|sku base|item no\\.?|item number|reference|ref\\.?|ref no\\.?)$/.test(n)) return 'style_no';",
    ],
    [
      "if (/^(marca|brand)$/.test(n)) return 'marca';",
      "if (/^(marca|brand)$/.test(n) || /商标/.test(raw)) return 'marca';",
    ],
    [
      "if (/quantity\\/pc|total quantity|ttl\\.?\\s*qty|ttl qty|total qty|total pieces|qty\\.?\\s*pcs|quantity$/.test(n)) return 'total_qty';",
      "if (/quantity\\/pc|total quantity|ttl\\.?\\s*qty|ttl qty|total qty|total pieces|qty\\.?\\s*pcs|quantity$|^qty$/.test(n)) return 'total_qty';",
    ],
    [
      "if (isSizeLabel(st) && (!h || /^sizes?$/.test(nh) || /^blank/.test(nh))) { useSubHeader = true; return st; }",
      "if (isSizeLabel(st) && (!h || /^sizes?$/.test(nh) || /^blank/.test(nh) || /size assortment|assortment per carton/.test(nh) || /尺寸配比/.test(h))) { useSubHeader = true; return st; }\n    if (/^(l|w|h)$/i.test(cleanText(st)) && (/measurement|meas|箱尺寸/.test(nh) || /箱尺寸/.test(h))) { useSubHeader = true; return `blank_meas_${i}`; }",
    ],
    [
      "let canonical = merged.map((h, i) => canonicalHeader(h, i));",
      "let canonical = merged.map((h, i) => {\n    if (/^l$/i.test(cleanText(h)) && /^w$/i.test(cleanText(merged[i + 1])) && /^h$/i.test(cleanText(merged[i + 2]))) return 'meas_1';\n    if (/^w$/i.test(cleanText(h)) && /^l$/i.test(cleanText(merged[i - 1])) && /^h$/i.test(cleanText(merged[i + 1]))) return 'meas_2';\n    if (/^h$/i.test(cleanText(h)) && /^l$/i.test(cleanText(merged[i - 2])) && /^w$/i.test(cleanText(merged[i - 1]))) return 'meas_3';\n    return canonicalHeader(h, i);\n  });",
    ],
    [
      "return /(^|\\|)\\s*(total|grand total|totales|合计)\\s*[:=]?/i.test(vals) || /total\\s*=\\s*\\(?\\s*\\d+\\s*\\)?\\s*carton/i.test(vals);",
      "return /(^|\\|)\\s*(total|grand total|totales)(\\s*[:=]|\\s|$|\\|)/i.test(vals) || /合计|总件数|总箱数|总净重|总毛重|总体积/.test(vals) || /total\\s*=\\s*\\(?\\s*\\d+\\s*\\)?\\s*carton/i.test(vals);",
    ],
    [
      "if (isTotalRow(row)) { totalesDetectados = extractTotals(row); continue; }",
      "if (isTotalRow(row)) { const tRow = extractTotals(row); if (tRow.total_cajas !== null || tRow.total_piezas !== null) totalesDetectados = tRow; continue; }",
    ],
  ];

  for (const [target, replacement] of replacements) {
    if (!updated.includes(target)) {
      throw new Error(`No se encontró el fragmento esperado en Parser General una hoja: ${target}`);
    }
    updated = updated.replace(target, replacement);
  }
  return updated;
}

async function excelToItems(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.worksheets[0];
  const items = [];
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const arr = [];
    for (let c = 1; c <= ws.columnCount; c++) {
      const v = row.getCell(c).value;
      const txt =
        v && typeof v === 'object'
          ? v.richText
            ? v.richText.map((x) => x.text).join('')
            : v.result !== undefined
              ? v.result
              : v.text !== undefined
                ? v.text
                : ''
          : v ?? '';
      arr.push(txt);
    }
    items.push({ json: arr });
  }
  return items;
}

function testParserLocally(jsCode, items, cfg = {}) {
  const wrapped = jsCode
    .replace(
      /const cfg = \(\(\) => \{[\s\S]*?\}\)\(\);\s*return \[\{ json: parsePackingListGeneral\(\$input\.all\(\), cfg\) \}\];/,
      'return parsePackingListGeneral($input.all(), __cfg);'
    );
  const fn = new Function('$input', '__cfg', wrapped);
  return fn({ all: () => items }, cfg);
}

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  if (!apiKey) {
    console.error('ERROR: N8N_API_KEY no encontrada');
    process.exit(1);
  }

  console.log(`1. Descargando workflow en vivo (${workflowId})...`);
  const resGet = await api('GET', `/workflows/${workflowId}`);
  if (resGet.status !== 200) {
    console.error('Error GET workflow:', resGet);
    process.exit(1);
  }
  const wf = resGet.data;

  // Backup obligatorio antes de modificar
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(rootDir, `scripts/backups/backup_packing_prePUT_${ts}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(wf, null, 2));
  console.log('2. Backup guardado en:', backupPath);

  const node = wf.nodes.find((n) => n.name === 'Parser General una hoja');
  if (!node) throw new Error('No se encontró el nodo "Parser General una hoja"');

  const patchedCode = patchParserGeneralCode(node.parameters.jsCode);
  node.parameters.jsCode = patchedCode;

  // Prueba local con 2.PACKING LIST JOE.xlsx
  console.log('3. Probando localmente con 2.PACKING LIST JOE.xlsx...');
  const joeItems = await excelToItems(path.join(rootDir, 'docs/samples/packing-lists/2.PACKING LIST JOE.xlsx'));
  const joeOut = testParserLocally(patchedCode, joeItems, { proveedor: 'JOE' });
  console.log('JOE resumen:', joeOut.resumen);
  console.log('JOE productos:', joeOut.productos_para_editar.map((p) => `${p.sku_base} (${p.marca})`));
  console.log('JOE cajas:', joeOut.cajas_para_editar.map((c) => `${c.sku_base}: ${c.cantidad_cajas}cjs x ${c.piezas_por_caja}pz = ${c.total_piezas}pz | tallas=${c.tallas} | colores=${c.colores}`));
  console.log('JOE warnings:', joeOut.warnings);

  if (joeOut.resumen.total_productos !== 2 || joeOut.resumen.total_cajas !== 85 || joeOut.resumen.total_piezas !== 5085) {
    throw new Error(`Validación fallida en JOE: ${JSON.stringify(joeOut.resumen)}`);
  }

  // Prueba de regresión con Packing list-260320.xlsx
  const sample2 = path.join(rootDir, 'docs/samples/packing-lists/Packing list-260320.xlsx');
  if (fs.existsSync(sample2)) {
    const s2Items = await excelToItems(sample2);
    const s2Out = testParserLocally(patchedCode, s2Items, { proveedor: 'Auto' });
    console.log('Regresión Packing list-260320:', s2Out.resumen);
  }

  if (dryRun) {
    console.log('DRY RUN completado con éxito. No se subió a n8n.');
    return;
  }

  console.log('4. Subiendo workflow actualizado a n8n (PUT)...');
  const payload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings,
    staticData: wf.staticData,
  };
  const resPut = await api('PUT', `/workflows/${workflowId}`, payload);
  if (resPut.status !== 200) {
    console.error('Error PUT workflow:', resPut);
    process.exit(1);
  }
  console.log('5. ¡Workflow actualizado en n8n con éxito!');
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
