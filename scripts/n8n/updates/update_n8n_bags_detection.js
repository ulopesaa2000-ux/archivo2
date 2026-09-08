// scripts/n8n/updates/update_n8n_bags_detection.js
/**
 * Script para actualizar con extrema precaución ÚNICAMENTE el nodo
 * 'Parser General una hoja' en el workflow de n8n para:
 * 1. Detectar correctamente 'BAG NO.' como carton_no (y rangos con doble guion '--')
 * 2. Detectar 'BAGS' como ctns (cantidad de cajas por pack)
 * 3. Detectar 'PCS/CTN PCS/BAG', 'CTN/BAG Size/cm', 'Net Weight/CTN Net Weight/BAG'
 * 4. Puntuación de encabezado que reconozca BAG NO y BAGS
 *
 * Realiza un backup completo del workflow antes de cualquier modificación.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables desde .env.local
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
  const backupPath = path.resolve(backupDir, `backup_n8n_before_bags_detection_${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(workflow, null, 2));
  console.log(`2. Copia de seguridad intacta guardada en: ${backupPath}`);

  // Encontrar nodo Parser General una hoja
  const node = workflow.nodes.find(n => n.name === 'Parser General una hoja');
  if (!node) {
    console.error('❌ Nodo "Parser General una hoja" no encontrado en el workflow.');
    return;
  }

  let code = node.parameters.jsCode;
  console.log(`3. Analizando código de "${node.name}" (${code.length} caracteres)...`);

  // Reemplazo 1: canonicalHeader carton_no
  const targetCartonNo = "/^(ctn no\\.?|ctn no,|carton no\\.?|carton no|ctn number|carton number|ctn)$/.test(n)";
  const repCartonNo = "/^(ctn no\\.?|ctn no,|carton no\\.?|carton no|ctn number|carton number|ctn|bag no\\.?|bag no|bag number|bolsa no\\.?|caja no\\.?)$/.test(n)";
  if (!code.includes(targetCartonNo) && !code.includes(repCartonNo)) {
    console.error('❌ No se encontró targetCartonNo en el código.');
    return;
  }
  if (code.includes(targetCartonNo)) {
    code = code.replace(targetCartonNo, repCartonNo);
    console.log('  ✅ canonicaHeader: soporte para bag no / bolsa no aplicado.');
  }

  // Reemplazo 2: canonicalHeader ctns
  const targetCtns = "/^(ctns|cartons|total ctn|total ctns|ttl ctn|ttl ctns|of ctns)$/.test(n)";
  const repCtns = "/^(ctns|cartons|total ctn|total ctns|ttl ctn|ttl ctns|of ctns|bags|total bags|ttl bags|bolsas|cajas|bultos)$/.test(n)";
  if (!code.includes(targetCtns) && !code.includes(repCtns)) {
    console.error('❌ No se encontró targetCtns en el código.');
    return;
  }
  if (code.includes(targetCtns)) {
    code = code.replace(targetCtns, repCtns);
    console.log('  ✅ canonicaHeader: soporte para bags / total bags / bolsas aplicado.');
  }

  // Reemplazo 3: canonicalHeader pcs_per_ctn
  const targetPcs = "/pcs\\s*\\/\\s*ctn|pc\\s*\\/\\s*ctn|pcs per ctn|pcs\\/carton|set per ctn|set\\/ctn|pcs per carton|sets per ctn/.test(n)";
  const repPcs = "/pcs\\s*\\/\\s*(?:ctn|bag|carton)|pc\\s*\\/\\s*(?:ctn|bag)|pcs per (?:ctn|bag|carton)|pcs\\/(?:carton|bag)|set per (?:ctn|bag)|set\\/(?:ctn|bag)|pcs per (?:carton|bag)|sets per (?:ctn|bag)/.test(n)";
  if (code.includes(targetPcs)) {
    code = code.replace(targetPcs, repPcs);
    console.log('  ✅ canonicaHeader: soporte para pcs per bag aplicado.');
  }

  // Reemplazo 4: canonicalHeader meas_1
  const targetMeas = "/carton size|ctn size|measurement|meas|means/.test(n)";
  const repMeas = "/carton size|ctn size|bag size|ctn\\/bag size|measurement|meas|means/.test(n)";
  if (code.includes(targetMeas)) {
    code = code.replace(targetMeas, repMeas);
    console.log('  ✅ canonicaHeader: soporte para ctn/bag size aplicado.');
  }

  // Reemplazo 5: canonicalHeader weights (nw_per_ctn y gw_per_ctn)
  const targetNw = "/net weight\\/ctn|net weight per ctn|n\\.w\\/ctn|nw\\/ctn/.test(n)";
  const repNw = "/net weight\\/(?:ctn|bag)|net weight per (?:ctn|bag)|n\\.w\\/(?:ctn|bag)|nw\\/(?:ctn|bag)/.test(n)";
  if (code.includes(targetNw)) {
    code = code.replace(targetNw, repNw);
    console.log('  ✅ canonicaHeader: soporte para net weight/bag aplicado.');
  }

  const targetGw = "/gross weight\\/ctn|gross weight per ctn|g\\.w\\/ctn|gw\\/ctn/.test(n)";
  const repGw = "/gross weight\\/(?:ctn|bag)|gross weight per (?:ctn|bag)|g\\.w\\/(?:ctn|bag)|gw\\/(?:ctn|bag)/.test(n)";
  if (code.includes(targetGw)) {
    code = code.replace(targetGw, repGw);
    console.log('  ✅ canonicaHeader: soporte para gross weight/bag aplicado.');
  }

  // Reemplazo 6: parseCartonRange para soportar '--'
  const targetRange = "const rangeMatches = [...s.matchAll(/(?:from\\s*)?(\\d+)\\s*#?\\s*[-~]\\s*(\\d+)\\s*#?/ig)];";
  const repRange = "const rangeMatches = [...s.matchAll(/(?:from\\s*)?(\\d+)\\s*#?\\s*(?:--+|-|~|\\.\\.|to|al)\\s*(\\d+)\\s*#?/ig)];";
  if (!code.includes(targetRange) && !code.includes(repRange)) {
    console.error('❌ No se encontró targetRange en el código.');
    return;
  }
  if (code.includes(targetRange)) {
    code = code.replace(targetRange, repRange);
    console.log('  ✅ parseCartonRange: soporte para doble guion (--) y otros separadores aplicado.');
  }

  // Reemplazo 7: headerScore
  const targetScore1 = "if (ns.some(x => /^(ctn no|carton no|ctn|carton)$/.test(x))) score += 4;";
  const repScore1 = "if (ns.some(x => /^(ctn no|carton no|ctn|carton|bag no|bag)$/.test(x))) score += 4;";
  if (code.includes(targetScore1)) {
    code = code.replace(targetScore1, repScore1);
    console.log('  ✅ headerScore: soporte para bag no / bag (+4) aplicado.');
  }

  const targetScore2 = "if (ns.some(x => /^(ctns|cartons|total ctn|total ctns|ttl ctn|ttl ctns)$/.test(x))) score += 5;";
  const repScore2 = "if (ns.some(x => /^(ctns|cartons|total ctn|total ctns|ttl ctn|ttl ctns|bags|total bags)$/.test(x))) score += 5;";
  if (code.includes(targetScore2)) {
    code = code.replace(targetScore2, repScore2);
    console.log('  ✅ headerScore: soporte para bags / total bags (+5) aplicado.');
  }

  // Validar sintaxis JS
  try {
    new Function('$input', code);
    console.log('4. ✅ Validación de sintaxis JS exitosa.');
  } catch (syntaxErr) {
    console.error('❌ Error de sintaxis en el código generado:', syntaxErr);
    return;
  }

  node.parameters.jsCode = code;

  // 5. Actualizar en n8n
  console.log(`5. Actualizando workflow en n8n...`);
  const updatePayload = {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings,
    staticData: workflow.staticData
  };

  const resPut = await api('PUT', `/workflows/${workflowId}`, updatePayload);
  if (resPut.status === 200) {
    console.log('🎉 ¡Workflow actualizado exitosamente en n8n!');
  } else {
    console.error('❌ Error al actualizar workflow:', resPut);
  }
}

run().catch(console.error);
