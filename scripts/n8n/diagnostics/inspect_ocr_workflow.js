// scripts/n8n/diagnostics/inspect_ocr_workflow.js
const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar .env.local desde la raíz
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
  console.log('Workflow Name:', wf.name, '(ID:', wf.id, ')');
  
  console.log('\n--- TODOS LOS NODOS ---');
  wf.nodes.forEach(n => {
    console.log(`- [${n.name}] (Type: ${n.type})`);
  });

  const visionNode = wf.nodes.find(n => n.name.toLowerCase().includes('openrouter') || n.name.toLowerCase().includes('vision') || n.name.toLowerCase().includes('ollama'));
  console.log('\n--- NODO VISION / OPENROUTER ---:');
  console.log(JSON.stringify(visionNode, null, 2));

  // Buscar el nodo previo que alimenta a OpenRouter Vision
  console.log('\n--- CONEXIONES QUE LLEGAN A VISION ---:');
  for (const [sourceNode, targets] of Object.entries(wf.connections)) {
    if (JSON.stringify(targets).includes(visionNode?.name)) {
      console.log(`Origen: ${sourceNode} -> Conecta con:`, targets);
      const srcObj = wf.nodes.find(n => n.name === sourceNode);
      console.log('Detalle de nodo origen:', JSON.stringify(srcObj, null, 2));
    }
  }
}

run().catch(console.error);
