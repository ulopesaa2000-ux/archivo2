// scripts/n8n/diagnostics/verificar_paridad_sku_ocr.js
//
// Verifica que la logica de separacion de codigos sea IDENTICA entre:
//   - la app:      lib/inventario/sku-ocr.ts (exporta separarCodigos)
//   - el workflow:  nodo 'Parsear JSON1' (definicion separadaOcr / separarCodigosOcr)
//
// Compara la salida para casos con y sin espacios, que es donde antes divergia.
//
// Uso: node scripts/n8n/diagnostics/verificar_paridad_sku_ocr.js

const fs = require('fs');
const path = require('path');
const https = require('https');
const dotenv = require('dotenv');
const ts = require('typescript');

const env = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../../../.env.local')));
const workflowId = env.N8N_WORKFLOW_ID || 'DtZOqR4-9_DnULEjWW78b';

function httpsReq(opts) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(200000, () => { req.destroy(new Error('request timeout')); });
    req.end();
  });
}

const n8nGet = (apiPath) => httpsReq({
  hostname: 'n8n.sistemaindumentaria.com',
  path: '/api/v1' + apiPath,
  method: 'GET',
  headers: { 'X-N8N-API-KEY': env.N8N_API_KEY },
});

/** Transpila el helper TS de la app a JSCommonJS y lo carga en memoria. */
function cargarApp() {
  const ruta = path.resolve(__dirname, '../../../lib/inventario/sku-ocr.ts');
  const fuente = fs.readFileSync(ruta, 'utf8');
  const js = ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const modulo = { exports: {} };
  new Function('module', 'exports', 'require', js)(modulo, modulo.exports, require);
  return modulo.exports;
}

(async () => {
  const app = cargarApp();
  const wf = (await n8nGet('/workflows/' + workflowId)).data;
  const parserCode = wf.nodes.find((n) => n.name === 'Parsear JSON1').parameters.jsCode;
  const $ = () => { const items = [{ json: {} }]; return { all: () => items, first: () => items[0] }; };

  const casos = [
    'B0248 / 1CAC', 'BO / 2C SETAF', 'MK26 / 08 SW', 'JE26 / 09HC', 'AND 26 0003',
    'AND26/0016DC', '3VT8489 /AND250032', 'BO26 / 16 MSTLTC', 'JE40010 / TS', 'AND260004',
  ];

  console.log('caso                       | app (lib)                        | n8n (Parsear JSON1)               | igual');
  let difs = 0;
  // Se aísla la función del nodo n8n: se recorta desde el inicio de los helpers
  // (normalizarSku) hasta el final de separarCodigosOcr, sin código previo de n8n.
  const ini = parserCode.indexOf('function normalizarSku(raw) {');
  const fin = parserCode.indexOf('const SUFIJOS_OCR', ini);
  if (ini < 0 || fin < 0) { console.error('No se localizaron los helpers en el nodo n8n'); process.exit(1); }
  const bloque = parserCode.slice(ini, fin);
  const CASO = '@@CASO@@';
  const codigoAislado = bloque + '\n; return separarCodigosOcr(' + JSON.stringify(CASO) + ');';

  for (const caso of casos) {
    const appRes = app.separarCodigos(caso);
    const aislado = new Function('$', codigoAislado.split(CASO).join(JSON.stringify(caso).slice(1, -1)));
    const n8nRes = aislado($);
    const igual = JSON.stringify(appRes) === JSON.stringify(n8nRes);
    if (!igual) difs += 1;
    console.log(
      JSON.stringify(caso).padEnd(26),
      '|', JSON.stringify(appRes).padEnd(32),
      '|', JSON.stringify(n8nRes).padEnd(32),
      '|', igual ? 'OK' : 'DIF'
    );
  }
  console.log('');
  console.log('diferencias app vs n8n:', difs);
  if (difs > 0) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
