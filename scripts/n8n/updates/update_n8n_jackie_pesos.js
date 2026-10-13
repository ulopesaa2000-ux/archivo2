// scripts/n8n/updates/update_n8n_jackie_pesos.js
// Parche quirurgico v2.1-pesos SOLO al nodo 'Parser Multi hoja Jackie/Venkat':
// amplia JACKIE_COL_ALIASES de pesos (gw/nw/tgw/tnw) en chino/ingles para
// Haizenfeng (total g.w/total n.w, gw/nw, 毛重kg/净重kg/总毛重kg/总净重kg,
// gross/net weight). Sin cambios de logica de bloques.
// Uso: node scripts/n8n/updates/update_n8n_jackie_pesos.js [--apply]
// Sin --apply solo valida y muestra preview (dry-run).

const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

let envConfig = {};
try {
  const envPath = path.resolve(__dirname, '../../../.env.local');
  if (fs.existsSync(envPath)) {
    envConfig = dotenv.parse(fs.readFileSync(envPath));
  }
} catch (e) {}

const token = process.env.N8N_API_KEY || envConfig.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZmQ1MzZjYy03M2I1LTQyMmQtOWQyOC02NzE4NzIzNzM2ZWIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzg0MDUzNjcwfQ.QfyrrtYrKyfUaPXMnjSJb78Q_D4mUMjN1_fE0pGc4Xg';
const workflowId = process.env.N8N_WORKFLOW_ID || '9XsVokBIW5HW3Pe-XP66f';
const APPLY = process.argv.includes('--apply');
const NODE = 'Parser Multi hoja Jackie/Venkat';

const OLD_GW = "['gw', ['g.w', '毛重']],";
const NEW_GW = "['gw', ['g.w', 'gw', '毛重', '毛重kg', 'gross weight']],";
const OLD_NW = "['nw', ['n.w', '净重']],";
const NEW_NW = "['nw', ['n.w', 'nw', '净重', '净重kg', 'net weight']],";
const OLD_TGW = "['tgw', ['t. g.w', 'total gw', '总毛重']],";
const NEW_TGW = "['tgw', ['t. g.w', 'total gw', 'total g.w', '总毛重', '总毛重kg', 'total gross weight']],";
const OLD_TNW = "['tnw', ['t. n.w', 'total nw', '总净重']],";
const NEW_TNW = "['tnw', ['t. n.w', 'total nw', 'total n.w', '总净重', '总净重kg', 'total net weight']],";

function api(method, apiPath, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'n8n.sistemaindumentaria.com',
      path: '/api/v1' + apiPath,
      method: method,
      headers: {
        'X-N8N-API-KEY': token,
        ...(payload ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('1. Obteniendo workflow ' + workflowId + '...');
  const resGet = await api('GET', '/workflows/' + workflowId);
  if (resGet.status !== 200) {
    console.error('Error al obtener workflow:', resGet.status);
    return;
  }
  const workflow = resGet.data;
  console.log('Workflow: "' + workflow.name + '" (' + workflow.nodes.length + ' nodos)');

  const node = workflow.nodes.find(n => n.name === NODE);
  if (!node) {
    console.error('Nodo "' + NODE + '" no encontrado.');
    return;
  }
  let code = String(node.parameters.jsCode || '');
  console.log('2. Codigo actual: ' + code.length + ' caracteres.');

  if (code.includes('v2.1-jackie-pesos')) {
    console.log('Ya es v2.1-pesos, sin cambios.');
    return;
  }

  const pairs = [[OLD_GW, NEW_GW, 'gw'], [OLD_NW, NEW_NW, 'nw'], [OLD_TGW, NEW_TGW, 'tgw'], [OLD_TNW, NEW_TNW, 'tnw']];
  for (const [oldS, newS, label] of pairs) {
    if (!code.includes(oldS)) {
      console.error('Ancla no encontrada para ' + label + ' (workflow intacto, aborto).');
      return;
    }
    code = code.split(oldS).join(newS);
    console.log('  + alias ' + label + ' OK.');
  }
  code = code.split('v2.0-jackie-bloques').join('v2.1-jackie-pesos');
  console.log('  + version v2.0 -> v2.1-pesos OK.');

  try {
    new Function('$input', '$', code);
    console.log('3. Sintaxis JS OK.');
  } catch (e) {
    console.error('Error de sintaxis:', e.message);
    return;
  }

  const prevDir = 'C:/Users/uriel/AppData/Local/Temp/opencode/jackie_pesos_preview';
  fs.mkdirSync(prevDir, { recursive: true });
  fs.writeFileSync(path.join(prevDir, 'parser_jackie_patched.js'), code);
  console.log('4. Preview en: ' + prevDir);

  if (!APPLY) {
    console.log('5. Dry-run: sin --apply no se sube nada.');
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.resolve('scripts/backups', 'n8n_prefill_' + stamp);
  fs.mkdirSync(backupDir, { recursive: true });
  const live = await api('GET', '/workflows/' + workflowId);
  fs.writeFileSync(path.join(backupDir, workflowId + '_antes-jackie-pesos.json'), JSON.stringify(live.data || live, null, 2));
  console.log('5. Respaldo fresco en: ' + backupDir);

  node.parameters.jsCode = code;
  console.log('6. Subiendo...');
  const resPut = await api('PUT', '/workflows/' + workflowId, {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings || {}
  });
  if (resPut.status !== 200) {
    console.error('Error al subir:', resPut.status);
    return;
  }
  const check = await api('GET', '/workflows/' + workflowId);
  const chk = String((check.data || check).nodes.find(n => n.name === NODE).parameters.jsCode || '');
  const ok = chk.includes('v2.1-jackie-pesos') && chk.includes('total g.w') && chk.includes('总毛重kg');
  console.log('Verificacion v2.1-pesos: ' + ok);
  if (!ok) throw new Error('Verificacion fallida tras PUT.');
  console.log('LISTO: pesos Jackie v2.1 aplicados y verificados.');
}

run().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
