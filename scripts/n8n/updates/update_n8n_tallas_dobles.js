// scripts/n8n/updates/update_n8n_tallas_dobles.js
/**
 * Script para actualizar con extrema precaución ÚNICAMENTE la tabla tallaMap
 * en los nodos parser del workflow de n8n para soportar las tallas dobles:
 * - CH-M (S/M, CH/M)
 * - M-G (M/L, M/G)
 * - G-EG (L/XL, G/EG)
 * - EG-2EG (XL/2XL, EG/2EG)
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

const TALLAS_DOBLES_ENTRIES = `,
  // --- TALLAS DOBLES / COMPUESTAS ---
  'ch-m': 'CH-M', 'ch/m': 'CH-M', 's-m': 'CH-M', 's/m': 'CH-M', 'sm': 'CH-M', 'chm': 'CH-M',
  'm-g': 'M-G', 'm/g': 'M-G', 'm-l': 'M-G', 'm/l': 'M-G', 'ml': 'M-G', 'mg': 'M-G',
  'g-eg': 'G-EG', 'g/eg': 'G-EG', 'l-xl': 'G-EG', 'l/xl': 'G-EG', 'lxl': 'G-EG', 'geg': 'G-EG', 'g-xg': 'G-EG', 'g/xg': 'G-EG',
  'eg-2eg': 'EG-2EG', 'eg/2eg': 'EG-2EG', 'xl-2xl': 'EG-2EG', 'xl/2xl': 'EG-2EG', 'xl-xxl': 'EG-2EG', 'xl/xxl': 'EG-2EG',`;

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
  const backupPath = path.resolve(backupDir, `backup_n8n_before_tallas_dobles_${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(workflow, null, 2));
  console.log(`2. Copia de seguridad intacta guardada en: ${backupPath}`);

  // Nodos parser a actualizar
  const targetNodeNames = [
    'Parser General una hoja',
    'Parser MOTI bloques',
    'Parser Tianyi resumen',
    'Parser Multi hoja Jackie/Venkat',
  ];

  let nodesUpdated = 0;

  for (const nodeName of targetNodeNames) {
    const node = workflow.nodes.find(n => n.name === nodeName);
    if (!node) {
      console.warn(`⚠️ Nodo "${nodeName}" no encontrado en el workflow.`);
      continue;
    }

    let code = node.parameters.jsCode;
    if (!code) continue;

    // Verificar si ya tiene 'ch-m'
    if (code.includes("'ch-m': 'CH-M'")) {
      console.log(`ℹ️ El nodo "${nodeName}" ya contiene las tallas dobles.`);
      continue;
    }

    // Buscar tallaMap en el código
    const tallaMapIndex = code.indexOf('tallaMap = {');
    if (tallaMapIndex === -1) {
      console.warn(`⚠️ No se encontró "tallaMap = {" en "${nodeName}".`);
      continue;
    }

    const closeBraceIndex = code.indexOf('};', tallaMapIndex);
    if (closeBraceIndex === -1) {
      console.warn(`⚠️ No se encontró fin de objeto "};" para tallaMap en "${nodeName}".`);
      continue;
    }

    // Insertar antes del cierre de tallaMap
    const updatedCode = code.slice(0, closeBraceIndex) + TALLAS_DOBLES_ENTRIES + '\n' + code.slice(closeBraceIndex);

    // Validar sintaxis rápida del código modificado
    try {
      new Function('$input', '$node', '$json', '$workflow', updatedCode);
    } catch (syntaxErr) {
      console.error(`❌ Error de sintaxis al inyectar en "${nodeName}":`, syntaxErr.message);
      continue;
    }

    node.parameters.jsCode = updatedCode;
    nodesUpdated++;
    console.log(`✓ Tallas dobles inyectadas con éxito en "${nodeName}".`);
  }

  if (nodesUpdated === 0) {
    console.log('No fue necesario actualizar ningún nodo (ya estaban actualizados o no coincidieron).');
    return;
  }

  // Subir workflow actualizado manteniendo intactos todos los demás nodos, conexiones y configuraciones
  console.log(`3. Guardando actualización quirúrgica de ${nodesUpdated} nodos en n8n...`);
  const resPut = await api('PUT', `/workflows/${workflowId}`, {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings,
  });

  if (resPut.status === 200) {
    console.log('✅ Workflow de n8n actualizado exitosamente sin modificar ninguna otra configuración!');
  } else {
    console.error('❌ Error al guardar en n8n:', resPut);
  }
}

run().catch(console.error);
