// scripts/n8n/updates/update_n8n_prompt_patterns.js
const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = fs.existsSync(path.resolve(__dirname, '../../../.env.local'))
  ? path.resolve(__dirname, '../../../.env.local')
  : path.resolve(__dirname, '../../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const apiKey = envConfig.N8N_API_KEY;
const workflowId = envConfig.N8N_WORKFLOW_ID || 'DtZOqR4-9_DnULEjWW78b';

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

const NUEVA_GUIA_PROMPT = `═══════════════════════════════════════════════════════════════
GUIA ORIENTATIVA DE PATRON TEXTIL (ORIENTACION ANTI-ALUCINACION)
═══════════════════════════════════════════════════════════════
La estructura general sigue este orden de lectura habitual (NO es una ley rígida, sirve de guía para no inventar letras):
[PROVEEDOR] [AÑO/NÚMEROS] [/] [CONSECUTIVO] [GÉNERO + PRENDA] [EXTRA/TELA]

1. PROVEEDORES Y PREFIJOS CONOCIDOS:
   - TY (TIANYI), BO (BONNIE), FK (FINDAKERA), JA (JACKIE), AND|3VT|3JA|1AK|1VT (MOTI),
   - KB (KOBY), LW (LAWRENCE), LI (LILY), JE (JENNY), JO (JOE), VE (VENKAT), YI (YIMAY),
   - JM (JEMES), HT (HONTON), MA (Marvel), AL (ALIA), HO (HONOR), QQ (QUING QUING),
   - KU (KUAILE), HF (HAIZENFENG), MK (MANKENI), TC (TOCAS), 85 (858).

2. AÑO / PEDIDO (FLEXIBLE):
   - Años activos de temporada: 24, 25, 26, 27 (ej: TY26, HO26, QQ27, AND26, FK25).
   - En BONNIE puede ir directamente el separador: 'BO/1DSETFE', 'BO/3DSETFE', 'BO/4DSETFE'.

3. CONSECUTIVO DE MODELO:
   - 1 o 2 dígitos del modelo (01, 02, 03, 04, 05, 07, 10, 15, etc.). Rara vez supera 20.

4. GÉNERO, PRENDA Y TELAS ESTABLES (CRUCIAL PARA DESAMBIGUAR):
   - GÉNEROS: D o M o DA (Dama/Mujer), H o C o CA (Hombre/Caballero), B (Niño), G (Niña), U (Unisex).
   - PRENDAS: C (Chamarra), V (Chaleco), W o WB (Rompevientos), SD o SUD (Sudadera), ST o SET (Set), P (Pantalón), A (Abrigo), G (Gabardina), TS (Camisa/Playera), SW (Suéter).
   - SUFIJOS COMBINADOS HABITUALES:
     * 'HC' = Hombre Chamarra / 'MC' = Mujer Chamarra.
     * 'HW' = Hombre Rompevientos / 'MW' = Mujer Rompevientos.
     * 'HD' = Hombre Sudadera / 'MD' = Mujer Sudadera.
   - SUFIJOS DE TELA ESTABLES (Nunca inventar caracteres raros):
     * 'FE' = Felpa (ej: 'BO/1DSETFE', 'BO/3DSETFE', 'BO/4DSETFE'). NUNCA transcribir 'SETRE' ni 'SETF3'.
     * 'LYC' o 'PLYC' = Licra (ej: 'BO/2DPLYC', 'JA26/05MSDLYC'). NUNCA transcribir 'LY6'.
     * 'AF' = Afelpado (ej: 'BO/1DSETAF').

5. MARCAS Y NOMBRES COMERCIALES DE REFERENCIA EN DESCRIPCIÓN:
   - TORONTO, GREENFIELD, IDOL NAVY, BULLSTAFF, GREEN-BERRY, DULCE-CAROLINE, LOVI-MEN,
   - AIR COMPANY, SEALDON, NR, POLAR-BEAR, ROCK-SUGAR, AMERICAN-NICE, SILVER-SPOON, SAKERS&CO.

6. REGLA DE GENERACION DE 'posibles_variantes' ANTE DUDAS DE CALIGRAFIA Y GENERO:
   - PREFIJO AND (A00/AOD/AD): Si lees 'A00260012', 'AOD260012' o 'AD260012', el formato canónico es AND + año + folio. Pon el detectado en 'sku' e incluye ["AND260012"] en 'posibles_variantes'.
   - PREFIJO HO vs H0: Si parece 'H026/01HC', pon en 'posibles_variantes': ["HO26/01HC"].
   - DUDAS DE GÉNERO (H vs M): Si la letra manuscrita parece 'HW' pero podría ser 'MW' (ej: 'QQ27/03HW' vs 'QQ27/03MW'), pon el más probable en 'sku' e incluye la alternativa en 'posibles_variantes': ["QQ27/03MW"]. Igual con 'HC' vs 'MC'.
   - TRAZOS '1' vs '7': (ej: 'TY26/07HC' vs 'TY26/01HC'): pon el más probable en 'sku' e incluye el alternativo en 'posibles_variantes': ["TY26/01HC"].
   - '0' vs 'D' en sets: incluye la alternativa en 'posibles_variantes': ["BO/3DSETFE"].`;

async function run() {
  console.log('1. Obteniendo workflow de n8n (ID:', workflowId, ')...');
  const resGet = await api('GET', '/workflows/' + workflowId);
  if (resGet.status !== 200) {
    console.error('Error al obtener workflow:', resGet);
    return;
  }
  const wf = resGet.data;

  let nodesUpdated = 0;
  wf.nodes.forEach(n => {
    if (n.parameters && typeof n.parameters.jsCode === 'string') {
      if (n.parameters.jsCode.includes('GUIA ORIENTATIVA DE PATRON TEXTIL')) {
        // Reemplazar la sección de guía textil en el prompt
        const regexGuia = /═══════════════════════════════════════════════════════════════[\s\S]*?posibles_variantes['"]:?\s*\[['"]BO\/3DSETFE['"]\]\./;
        if (regexGuia.test(n.parameters.jsCode)) {
          n.parameters.jsCode = n.parameters.jsCode.replace(regexGuia, NUEVA_GUIA_PROMPT);
          console.log(`✅ Nodo actualizado con nuevas reglas: [${n.name}]`);
          nodesUpdated++;
        }
      }
    }
  });

  if (nodesUpdated === 0) {
    console.log('No se encontraron nodos para actualizar.');
    return;
  }

  console.log(`2. Guardando actualización de ${nodesUpdated} nodos en n8n...`);
  const updatePayload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || {}
  };

  const resPut = await api('PUT', '/workflows/' + workflowId, updatePayload);
  if (resPut.status === 200) {
    console.log('🚀 Workflow de n8n actualizado exitosamente con las nuevas reglas de patrones OCR y género!');
  } else {
    console.error('❌ Error al actualizar workflow en n8n:', resPut);
  }
}

run();
