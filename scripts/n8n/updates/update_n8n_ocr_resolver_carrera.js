// scripts/n8n/updates/update_n8n_ocr_resolver_carrera.js
//
// Corrige una carrera en el workflow OCR de notas de movimiento.
//
// PROBLEMA:
//   'Resolver bodegas1' tenia DOS entradas: 'Candidatos bodega1' y 'Candidatos SKU1'.
//   n8n ejecuta un nodo una vez por cada rama que le entrega datos, asi que el
//   resolver corria DOS veces:
//     - run[0] (rama bodegas, ~30ms) -> todavia no existian los candidatos SKU,
//       resolvia 0 lineas y escribia/promovia la propuesta con datos vacios.
//     - run[1] (rama SKU, ~550ms) -> resolvia bien, pero la nota ya habia sido
//       promovida por el run[0] y el guard 'Propuesta ya promovida' lo impedia.
//
// RESULTADO: la nota quedaba con menos lineas que la propuesta (p.ej. 9 vs 15).
//
// SOLUCION:
//   - Se desconecta 'Candidatos bodega1' de 'Resolver bodegas1'. El resolver queda
//     con una sola entrada ('Candidatos SKU1'), que es la rama lenta: se dispara
//     cuando los candidatos SKU YA existen. Los candidatos de bodega se siguen
//     leyendo por referencia cruzada ($('Candidatos bodega1').all()), que el
//     resolver ya hacia.
//   - Se marca 'Candidatos SKU1' con alwaysOutputData para que siempre entregue
//     al menos un item. Asi el resolver se ejecuta una unica vez aunque la RPC
//     no devuelva filas (nota sin coincidencias), en lugar de no ejecutarse nunca.
//
// Uso: node scripts/n8n/updates/update_n8n_ocr_resolver_carrera.js [--dry-run]

const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

let envConfig = {};
try {
  const envPath = fs.existsSync(path.resolve(__dirname, '../../../.env.local'))
    ? path.resolve(__dirname, '../../../.env.local')
    : path.resolve(__dirname, '../../.env.local');
  if (fs.existsSync(envPath)) envConfig = dotenv.parse(fs.readFileSync(envPath));
} catch (e) {}

const apiKey = process.env.N8N_API_KEY || envConfig.N8N_API_KEY || '';
const workflowId = process.env.N8N_WORKFLOW_ID || envConfig.N8N_WORKFLOW_ID || 'DtZOqR4-9_DnULEjWW78b';

if (!apiKey) {
  console.error('ERROR: N8N_API_KEY no encontrada');
  process.exit(1);
}

function api(method, apiPath, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'n8n.sistemaindumentaria.com',
      path: '/api/v1' + apiPath,
      method,
      headers: {
        'X-N8N-API-KEY': apiKey,
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const dryRun = process.argv.includes('--dry-run');
const NODO_RESOLVER = 'Resolver bodegas1';
const NODO_BODEGA = 'Candidatos bodega1';
const NODO_SKU = 'Candidatos SKU1';

async function run() {
  console.log('Obteniendo workflow (ID:', workflowId + ')...');
  const resGet = await api('GET', '/workflows/' + workflowId);
  if (resGet.status !== 200) {
    console.error('Error al obtener workflow:', resGet.status, (resGet.raw || '').slice(0, 500));
    process.exit(1);
  }
  const wf = resGet.data;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.resolve(__dirname, '../../backups/backup_n8n_wf_' + workflowId + '_resolver_carrera_prePUT_' + stamp + '.json');
  fs.writeFileSync(backupPath, JSON.stringify(wf, null, 2));
  console.log('Backup pre-PUT:', backupPath);

  // ── 1. Quitar la entrada duplicada del resolver ──
  const connBodega = (wf.connections || {})[NODO_BODEGA];
  let quitada = false;
  if (connBodega && connBodega.main) {
    const antes = JSON.stringify(connBodega);
    for (const rama of connBodega.main) {
      if (!Array.isArray(rama)) continue;
      for (let i = rama.length - 1; i >= 0; i -= 1) {
        if (rama[i] && rama[i].node === NODO_RESOLVER) {
          rama.splice(i, 1);
          quitada = true;
        }
      }
    }
    if (quitada) {
      // Si la rama queda vacia, se elimina la conexion del nodo por completo.
      const vacia = connBodega.main.every((rama) => !Array.isArray(rama) || rama.length === 0);
      if (vacia) delete wf.connections[NODO_BODEGA];
      else wf.connections[NODO_BODEGA] = connBodega;
      console.log('Desconectado', NODO_BODEGA, '->', NODO_RESOLVER, '(antes:', antes + ')');
    }
  }
  if (!quitada) console.log(NODO_BODEGA, '->', NODO_RESOLVER, 'ya estaba desconectado');

  // ── 2. El resolver debe tener una unica entrada: la de candidatos SKU ──
  const connSku = (wf.connections || {})[NODO_SKU];
  const entradaSku = connSku && connSku.main && connSku.main[0] && connSku.main[0][0];
  console.log('Entrada SKU del resolver:', entradaSku ? entradaSku.node : 'NINGUNA');

  // ── 3. alwaysOutputData en Candidatos SKU1 ──
  const nodoSku = (wf.nodes || []).find((n) => n.name === NODO_SKU);
  if (!nodoSku) {
    console.error('No se encontro el nodo', NODO_SKU);
    process.exit(1);
  }
  if (nodoSku.alwaysOutputData !== true) {
    nodoSku.alwaysOutputData = true;
    console.log('alwaysOutputData: true aplicado a', NODO_SKU);
  } else {
    console.log(NODO_SKU, 'ya tenia alwaysOutputData');
  }

  if (dryRun) {
    console.log('DRY-RUN: cambios listos, no se hace PUT.');
    return;
  }

  const putPayload = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings };
  const resPut = await api('PUT', '/workflows/' + workflowId, putPayload);
  if (resPut.status !== 200) {
    console.error('Error al actualizar:', resPut.status, JSON.stringify(resPut).slice(0, 2000));
    process.exit(1);
  }
  console.log('🚀 WORKFLOW CARRERA RESOLVER OK (ID:', resPut.data.id + ')');

  // ── Verificación ──
  const resVerify = await api('GET', '/workflows/' + workflowId);
  if (resVerify.status === 200) {
    const w = resVerify.data;
    const entradas = [];
    for (const [origen, conn] of Object.entries(w.connections || {})) {
      for (const rama of (conn.main || [])) {
        for (const t of (rama || [])) {
          if (t && t.node === NODO_RESOLVER) entradas.push(origen);
        }
      }
    }
    const nodoSkuV = (w.nodes || []).find((n) => n.name === NODO_SKU);
    console.log('Verificación:', {
      entradasDelResolver: entradas,
      alwaysOutputData: nodoSkuV ? nodoSkuV.alwaysOutputData : null,
      versionId: w.versionId,
      updatedAt: w.updatedAt,
    });
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
