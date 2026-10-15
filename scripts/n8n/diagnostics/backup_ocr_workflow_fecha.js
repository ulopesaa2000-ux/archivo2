// scripts/n8n/diagnostics/backup_ocr_workflow_fecha.js
const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = fs.existsSync(path.resolve(__dirname, '../../../.env.local'))
  ? path.resolve(__dirname, '../../../.env.local')
  : path.resolve(__dirname, '../../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const apiKey = process.env.N8N_API_KEY || envConfig.N8N_API_KEY || '';
const workflowId = process.env.N8N_WORKFLOW_ID || envConfig.N8N_WORKFLOW_ID || 'DtZOqR4-9_DnULEjWW78b';

if (!apiKey) {
  console.error('ERROR: N8N_API_KEY no encontrada');
  process.exit(1);
}

function api(method, apiPath) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'n8n.sistemaindumentaria.com',
      path: '/api/v1' + apiPath,
      method,
      headers: { 'X-N8N-API-KEY': apiKey }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const res = await api('GET', '/workflows/' + workflowId);
  if (res.status !== 200) {
    console.error('Error al obtener workflow:', res.status, (res.raw || '').slice(0, 500));
    process.exit(1);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.resolve(__dirname, '../../backups');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `backup_n8n_wf_${workflowId}_fecha_${stamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(res.data, null, 2));
  console.log('Backup OK:', outPath);
  console.log('Nodos:', res.data.nodes.map(n => n.name).join(' | ').slice(0, 500));
}

run().catch(e => { console.error(e); process.exit(1); });
