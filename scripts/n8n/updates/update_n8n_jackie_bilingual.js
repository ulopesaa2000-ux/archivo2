// scripts/n8n/updates/update_n8n_jackie_bilingual.js
const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables desde .env.local si existen
let envConfig = {};
try {
  const envPath = path.resolve(__dirname, '../../../.env.local');
  if (fs.existsSync(envPath)) {
    envConfig = dotenv.parse(fs.readFileSync(envPath));
  }
} catch (e) {}

const token = process.env.N8N_API_KEY || envConfig.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZmQ1MzZjYy03M2I1LTQyMmQtOWQyOC02NzE4NzIzNzM2ZWIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzg0MDUzNjcwfQ.QfyrrtYrKyfUaPXMnjSJb78Q_D4mUMjN1_fE0pGc4Xg';
const workflowId = process.env.N8N_WORKFLOW_ID || '9XsVokBIW5HW3Pe-XP66f';

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
  console.log(`1. Obteniendo workflow de n8n (ID: ${workflowId})...`);
  const resGet = await api('GET', `/workflows/${workflowId}`);
  if (resGet.status !== 200) {
    console.error('Error al obtener workflow:', resGet);
    return;
  }

  const workflow = resGet.data;
  console.log(`Workflow obtenido: "${workflow.name}" (${workflow.nodes.length} nodos)`);

  // Guardar copia de seguridad en scripts/backups
  const backupDir = path.resolve(__dirname, '../../backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.resolve(backupDir, `backup_packing_workflow_${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(workflow, null, 2));
  console.log(`2. Copia de seguridad guardada en: ${backupPath}`);

  // 1. Actualizar nodo "Normalizar archivo + ruta" para soportar honor, qingqing, etc.
  const normNode = workflow.nodes.find(n => n.name === 'Normalizar archivo + ruta');
  if (normNode) {
    console.log('3. Actualizando router "Normalizar archivo + ruta"...');
    let codeNorm = normNode.parameters.jsCode;
    codeNorm = codeNorm.replace(
      "/jackie|jacky|venkat|vencart|multi/.test(s)",
      "/jackie|jacky|venkat|vencart|qingqing|honor|multi/.test(s)"
    );
    codeNorm = codeNorm.replace(
      "/jackie|jacky|venkat|vencart/.test(signal)",
      "/jackie|jacky|venkat|vencart|qingqing|honor|2026.*ja\\b/.test(signal)"
    );
    normNode.parameters.jsCode = codeNorm;
  }

  // 2. Cargar código completo bilingüe del parser Jackie / Venkat
  const completeCodePath = path.resolve(__dirname, '../../../scratch/node_parser_jackie_complete.js');
  const completeCode = fs.readFileSync(completeCodePath, 'utf8');

  // 3. Actualizar el nodo activo que recibe datos de excel-reader
  // En el canvas se llamaba 'Code in JavaScript', lo renombramos a 'Parser Multi hoja Jackie/Venkat'
  const activeCodeNode = workflow.nodes.find(n => n.id === 'bbb73e00-bf12-410f-8eca-bc9c5c09cab4' || n.name === 'Code in JavaScript');
  const floatingJackieNodeIndex = workflow.nodes.findIndex(n => n.id === 'caf163a2-f893-42cc-bee5-17f50ceba090');

  if (floatingJackieNodeIndex !== -1) {
    console.log('4. Removiendo nodo flotante huérfano "Parser Multi hoja Jackie/Venkat"...');
    workflow.nodes.splice(floatingJackieNodeIndex, 1);
  }

  if (activeCodeNode) {
    console.log('5. Actualizando código e identidad del nodo principal a "Parser Multi hoja Jackie/Venkat"...');
    activeCodeNode.name = 'Parser Multi hoja Jackie/Venkat';
    activeCodeNode.parameters.jsCode = completeCode;

    // Actualizar conexiones en el grafo del workflow
    if (workflow.connections['Code in JavaScript']) {
      workflow.connections['Parser Multi hoja Jackie/Venkat'] = workflow.connections['Code in JavaScript'];
      delete workflow.connections['Code in JavaScript'];
    }

    if (workflow.connections['Leer workbook completo excel-reader1']) {
      workflow.connections['Leer workbook completo excel-reader1'] = {
        main: [[{ node: 'Parser Multi hoja Jackie/Venkat', type: 'main', index: 0 }]]
      };
    }
  }

  // 4. Subir workflow actualizado a n8n
  console.log('6. Guardando cambios en n8n...');
  const resPut = await api('PUT', `/workflows/${workflowId}`, {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings
  });

  if (resPut.status === 200) {
    console.log('✅ Workflow actualizado exitosamente en n8n!');
  } else {
    console.error('❌ Error al actualizar workflow en n8n:', resPut);
  }
}

run().catch(console.error);
