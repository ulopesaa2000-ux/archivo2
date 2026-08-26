// scripts\supabase\queries\query_parameters.js
const https = require('https');
const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
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

// Let's set a query in Promover a nota (auto)2 to query parameters of sp_crear_nota
async function checkParams() {
  const query = `
    SELECT specific_name, parameter_name, data_type, parameter_mode, ordinal_position
    FROM information_schema.parameters
    WHERE specific_schema = 'inv-tienda' AND specific_name LIKE '%sp_crear_nota%'
    ORDER BY ordinal_position;
  `;
  console.log('Query prepared.');
}
checkParams();
