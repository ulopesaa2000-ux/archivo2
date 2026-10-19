// scripts/n8n/updates/update_n8n_ocr_max_tokens.js
//
// Ajusta el presupuesto de tokens de salida del nodo 'Construir prompt + body'
// del workflow OCR de notas de movimiento.
//
// Contexto: los modelos razonadores (ej. deepseek/deepseek-v4.1-flash) consumen el
// presupuesto de `max_tokens` en tokens de razonamiento ANTES de emitir el JSON.
// Con max_tokens: 8192 el modelo terminaba con finish_reason 'length' y
// `message.content` vacio, por lo que el parser recibia una lectura vacia.
// Con 32768 el modelo alcanza a emitir el JSON completo (finish_reason 'stop').
//
// No modifica el modelo, el prompt ni los demas nodos: solo el valor numerico
// de `max_tokens` en el body que se envia a OpenRouter.
//
// Uso: node scripts/n8n/updates/update_n8n_ocr_max_tokens.js [--dry-run] [--max-tokens 32768]

const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

let envConfig = {};
try {
  const envPath = fs.existsSync(path.resolve(__dirname, '../../../.env.local'))
    ? path.resolve(__dirname, '../../../.env.local')
    : path.resolve(__dirname, '../../.env.local');
  if (fs.existsSync(envPath)) envConfig = dotenv.parse(fs.readFileSync(envPath));
} catch (e) {}

const apiKey = process.env.N8N_API_KEY || envConfig.N8N_API_KEY || '';
const workflowId = process.env.N8N_WORKFLOW_ID || envConfig.N8N_WORKFLOW_ID || 'DtZOqR4-9_DnULEjWW78b';

if (!apiKey) {
  console.error('ERROR: N8N_API_KEY no encontrada');
  process.exit(1);
}

function api(method, apiPath, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'n8n.sistemaindumentaria.com',
      path: '/api/v1' + apiPath,
      method,
      headers: {
        'X-N8N-API-KEY': apiKey,
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Argumentos ──
const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const idxArg = argv.indexOf('--max-tokens');
const MAX_TOKENS = idxArg >= 0 ? parseInt(argv[idxArg + 1], 10) : 32768;
if (!Number.isFinite(MAX_TOKENS) || MAX_TOKENS < 1024) {
  console.error('ERROR: --max-tokens inválido:', MAX_TOKENS);
  process.exit(1);
}

const RE_MAX_TOKENS = /(max_tokens:\s*)(\d+)/;

function patchMaxTokens(js) {
  if (!RE_MAX_TOKENS.test(js)) return { code: js, changed: false, actual: null };
  const m = js.match(RE_MAX_TOKENS);
  const actual = parseInt(m[2], 10);
  if (actual === MAX_TOKENS) return { code: js, changed: false, actual };
  const code = js.replace(RE_MAX_TOKENS, '$1' + MAX_TOKENS);
  return { code, changed: true, actual };
}

async function run() {
  console.log('Obteniendo workflow (ID:', workflowId + ')...');
  const resGet = await api('GET', '/workflows/' + workflowId);
  if (resGet.status !== 200) {
    console.error('Error al obtener workflow:', resGet.status, (resGet.raw || '').slice(0, 500));
    process.exit(1);
  }
  const wf = resGet.data;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.resolve(__dirname, '../../backups/backup_n8n_wf_' + workflowId + '_max_tokens_prePUT_' + stamp + '.json');
  fs.writeFileSync(backupPath, JSON.stringify(wf, null, 2));
  console.log('Backup pre-PUT:', backupPath);

  const node = (wf.nodes || []).find((n) => n.name === 'Construir prompt + body');
  if (!node) {
    console.error('No se encontro el nodo Construir prompt + body');
    process.exit(1);
  }

  const r = patchMaxTokens(node.parameters.jsCode || '');
  console.log('max_tokens actual:', r.actual, '-> objetivo:', MAX_TOKENS, '| changed:', r.changed);
  if (r.changed) node.parameters.jsCode = r.code;

  // No se tocan modelo/prompt/parser/resolver: se verifica que siguen intactos.
  const byName = Object.fromEntries((wf.nodes || []).map((n) => [n.name, n.parameters.jsCode || '']));
  const modelo = (byName['Construir prompt + body'] || '').split('\n').find((l) => l.includes('MODELO_VISION'));
  console.log('MODELO_VISION:', (modelo || '').trim());
  console.log('prompt LITERAL:', (byName['Construir prompt + body'] || '').includes('LECTURA LITERAL vs CANONICO'));
  console.log('parsear FAMILIA:', (byName['Parsear JSON1'] || '').includes('FAMILIA_CONFUSIONES_OCR'));
  console.log('resolver SCOREREAL:', (byName['Resolver bodegas1'] || '').includes('score REAL de la base de datos'));

  try {
    new Function(node.parameters.jsCode);
    console.log('✓ Sintaxis OK: Construir prompt + body');
  } catch (err) {
    console.error('✗ Sintaxis rota:', err.message);
    process.exit(1);
  }

  if (dryRun) {
    console.log('DRY-RUN: cambio listo, no se hace PUT.');
    return;
  }

  if (!r.changed) {
    console.log('Sin cambios que aplicar (max_tokens ya es ' + MAX_TOKENS + ').');
    return;
  }

  const putPayload = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings };
  const resPut = await api('PUT', '/workflows/' + workflowId, putPayload);
  if (resPut.status !== 200) {
    console.error('Error al actualizar:', resPut.status, JSON.stringify(resPut).slice(0, 2000));
    process.exit(1);
  }
  console.log('🚀 WORKFLOW MAX_TOKENS OK (ID:', resPut.data.id + ')');

  const resVerify = await api('GET', '/workflows/' + workflowId);
  if (resVerify.status === 200) {
    const v = Object.fromEntries((resVerify.data.nodes || []).map((n) => [n.name, n.parameters.jsCode || '']));
    const mt = (v['Construir prompt + body'] || '').match(RE_MAX_TOKENS);
    console.log('Verificación:', {
      max_tokens: mt ? parseInt(mt[2], 10) : null,
      versionId: resVerify.data.versionId,
      updatedAt: resVerify.data.updatedAt,
    });
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
