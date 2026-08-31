// scripts/n8n/updates/fix_openrouter_json_body.js
const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../../../.env.local')));
const apiKey = envConfig.N8N_API_KEY;
const workflowId = envConfig.N8N_WORKFLOW_ID || 'DtZOqR4-9_DnULEjWW78b';

function api(method, apiPath, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'n8n.sistemaindumentaria.com',
      path: '/api/v1' + apiPath,
      method: method,
      headers: {
        'X-N8N-API-KEY': apiKey,
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
  console.log('Obteniendo workflow de n8n...');
  const resGet = await api('GET', '/workflows/' + workflowId);
  if (resGet.status !== 200) {
    console.error('Error al obtener workflow:', resGet);
    return;
  }
  const wf = resGet.data;

  // 1. Corregir nodo OpenRouter Vision
  const openRouterNode = wf.nodes.find(n => n.name === 'OpenRouter Vision');
  if (openRouterNode) {
    openRouterNode.parameters = openRouterNode.parameters || {};
    openRouterNode.parameters.jsonBody = '={{ JSON.stringify($json.prompt_body || $json.openrouter_body || $json.body) }}';
    console.log('✓ Nodo "OpenRouter Vision" actualizado: jsonBody = {{ JSON.stringify($json.prompt_body || $json.openrouter_body || $json.body) }}');
  }

  // 2. Corregir nodos Construir prompt + body para emitir prompt_body, openrouter_body y body
  const promptNodes = wf.nodes.filter(n => n.name.startsWith('Construir prompt + body'));
  for (const pNode of promptNodes) {
    if (pNode.parameters && pNode.parameters.jsCode) {
      // Asegurarse de que en el return devuelva prompt_body, openrouter_body y body
      if (!pNode.parameters.jsCode.includes('openrouter_body: body')) {
        pNode.parameters.jsCode = pNode.parameters.jsCode.replace(
          'prompt_body: body,',
          'prompt_body: body,\n    openrouter_body: body,\n    body: body,'
        );
        console.log(`✓ Nodo "${pNode.name}" actualizado para emitir openrouter_body y prompt_body.`);
      }
    }
  }

  // 3. Guardar workflow en n8n
  const putPayload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  };

  const resPut = await api('PUT', '/workflows/' + workflowId, putPayload);
  if (resPut.status === 200) {
    console.log('\n🚀 WORKFLOW ACTUALIZADO CON ÉXITO EN N8N (ID:', resPut.data.id, ')');
  } else {
    console.error('Error al actualizar en n8n:', resPut);
  }
}

run().catch(console.error);
