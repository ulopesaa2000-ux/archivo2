// scripts/n8n/diagnostics/inspect_all_nodes.js
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
  
  console.log('=== NODOS HTTP REQUEST Y SUS PARAMS ===');
  wf.nodes.filter(n => n.type.includes('httpRequest')).forEach(n => {
    console.log(`\n--- NODO: ${n.name} (id: ${n.id}) ---`);
    console.log(JSON.stringify(n.parameters, null, 2));
  });

  console.log('\n=== CONEXIONES ===');
  console.log(JSON.stringify(wf.connections, null, 2));
}

run().catch(console.error);
