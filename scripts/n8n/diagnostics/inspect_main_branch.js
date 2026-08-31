// scripts/n8n/diagnostics/inspect_main_branch.js
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
  const res = await api('GET', '/workflows/' + workflowId);
  const wf = res.data;
  
  const nodesToCheck = [
    'Construir prompt + body',
    'OpenRouter Vision',
    'Parsear JSON1',
    'Candidatos SKU1',
    'Candidatos bodega1',
    'Resolver bodegas1',
    'Insertar propuesta1',
    'Promover a nota (auto)2'
  ];

  for (const name of nodesToCheck) {
    const node = wf.nodes.find(n => n.name === name);
    console.log(`\n=================== [${name}] ===================`);
    if (!node) {
      console.log('NO ENCONTRADO');
    } else {
      console.log('Tipo:', node.type);
      console.log('Parámetros:', JSON.stringify(node.parameters, null, 2));
    }
  }
}

run().catch(console.error);
