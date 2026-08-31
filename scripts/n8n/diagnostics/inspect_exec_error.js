// scripts/n8n/diagnostics/inspect_exec_error.js
const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../../../.env.local')));

function api(method, apiPath) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'n8n.sistemaindumentaria.com',
      path: '/api/v1' + apiPath,
      method: method,
      headers: { 'X-N8N-API-KEY': envConfig.N8N_API_KEY }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const resExecs = await api('GET', '/executions?limit=3');
  console.log('Últimas 3 ejecuciones:', resExecs.data.data);

  const lastExecId = resExecs.data.data[0]?.id;
  const resDetail = await api('GET', '/executions/' + lastExecId + '?includeData=true');
  console.log('ResDetail Keys:', Object.keys(resDetail.data || {}));
  console.log('Data keys:', Object.keys(resDetail.data?.data || {}));
  console.log('ResultData:', JSON.stringify(resDetail.data?.data?.resultData, null, 2));
}

run().catch(console.error);
