// scripts/n8n/updates/crear_workflow_conteo_fisico.js
/**
 * Crea y activa en n8n el workflow especializado para escanear hojas manuscritas
 * de inventario físico cuadriculado (2 columnas, operaciones aritméticas 1.1 / 4+2, etc.).
 * Webhook: /webhook/conteo-fisico-hojas-ocr
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

let envConfig = {};
try {
  const envPath = path.resolve(__dirname, '../../../.env.local');
  if (fs.existsSync(envPath)) {
    envConfig = dotenv.parse(fs.readFileSync(envPath));
  }
} catch {}

const N8N_HOST = 'n8n.sistemaindumentaria.com';
const N8N_API_KEY = process.env.N8N_API_KEY || envConfig.N8N_API_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envConfig.SUPABASE_SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || envConfig.OPENROUTER_API_KEY;

if (!N8N_API_KEY || !SUPABASE_SERVICE_ROLE_KEY || !OPENROUTER_API_KEY) {
  console.error('ERROR: Faltan N8N_API_KEY, SUPABASE_SERVICE_ROLE_KEY u OPENROUTER_API_KEY en el entorno o .env.local');
  process.exit(1);
}

// Definición de código de construcción del prompt
const jsCodePrompt = `// Construir prompt y payload para OpenRouter Vision
const meta = $('Normalizar imagen').first()?.json || {};
const imageUrl = meta.comprobante_url;

if (!imageUrl) {
  throw new Error("No se encontro URL de imagen para el modelo de vision");
}

const PROMPT = 'Eres un asistente experto en transcripción y digitalización de inventarios físicos manuscritos en hojas de cuaderno cuadriculado para una comercializadora de ropa y calzado.\\n\\n' +
'ANALIZA CON DETENIMIENTO LA IMAGEN DE LA HOJA CUADRICULADA Y TRANSCRÍBELA A JSON.\\n\\n' +
'ESTRUCTURA DE LA HOJA:\\n' +
'1. DIVISIÓN EN 2 COLUMNAS PRINCIPALES:\\n' +
'   - COLUMNA 1 (IZQUIERDA): Productos anotados en la mitad izquierda de la página.\\n' +
'   - COLUMNA 2 (DERECHA): Productos anotados en la mitad derecha de la página.\\n' +
'   - CADA COLUMNA ES INDEPENDIENTE. Cada renglón contiene a la izquierda el CÓDIGO/ESTILO y a la derecha su CANTIDAD DE CAJAS.\\n' +
'   - No mezcles renglones ni unas la columna izquierda con la derecha. Extrae renglón por renglón.\\n\\n' +
'2. ENCABEZADO Y METADATOS:\\n' +
'   - En la parte superior suele haber anotaciones como la ubicación (ej: "ARRIBA", "ABAJO", "PASILLO 1", "BODEGA 2") y la fecha (ej: "15/OCT/26"). Extrae estos valores en "encabezado" y "fecha_detectada".\\n\\n' +
'3. CÓDIGOS Y ESTILOS (SKU):\\n' +
'   - Transcribe fielmente lo que está escrito en "estilo_raw" (ejemplos: UN 25-04, 3VT7904, 3VT8455, 21131, AND260005, AND260003, AND250003, AND250002, AND250019, AND250018, AND250022, AND230052, J225/10AC2, AND240017, AND250024, AND240038, AND240006, BO26/01MSTFE, AND23007, AND180102, 1907/140CAL7, AND240052, AND230019, AND240009, AND230068, AND230057, AND230023, AND230045, JE307/10AC, LW326/1CACR, J229/20ACS, J227/10AGS, 3VT4538, LW327/1CAC, AND230046, AND240012, LW203/10ACR, 3VT7900, JA181/10AC, JE304/10CAOR, AND230064, 2214B, 2218B, JE212/4DAV, 3VT6888, LW206/10AC, JE307/2CAC, 1019-2, AND230020, J225/30ACLR, J225/10ACLTE, 3SA4873, 3VT5147-1, 3688C, J332/10AC, J228/10AC2, A938/20CA21, A937/10VTN1, A928/40CAS3, A928/40CHS4).\\n' +
'   - En "sku_candidato" coloca una versión normalizada sin espacios (ej: AND 25 00 22 -> AND250022, AND 23 00 52 -> AND230052, U/N 25-04 -> UN25-04).\\n\\n' +
'4. CANTIDADES Y OPERACIONES ARITMÉTICAS (REGLA CRÍTICA):\\n' +
'   - Frecuentemente los bodegueros anotan sumas de bultos o cajas que contaron en distintas pilas:\\n' +
'     * Si anotan "1.1", significa 1 + 1 = 2 cajas.\\n' +
'     * Si anotan "1.1.1", significa 1 + 1 + 1 = 3 cajas.\\n' +
'     * Si anotan "4+2", significa 4 + 2 = 6 cajas.\\n' +
'     * Si anotan "1+6", significa 1 + 6 = 7 cajas.\\n' +
'     * Si es un número directo como "3", "7", "18", "21", es ese valor.\\n' +
'     * Si hay tachaduras o correcciones, toma el número corregido o final.\\n' +
'   - En "cajas_raw" guarda la anotación visual exacta (ej: "4+2", "1+6", "1.1", "18").\\n' +
'   - En "cajas" calcula el resultado numérico total de cajas (ej: 6, 7, 2, 18).\\n\\n' +
'5. RETORNA EXCLUSIVAMENTE UN OBJETO JSON VÁLIDO CON ESTA ESTRUCTURA EXACTA:\\n' +
'{\\n' +
'  "encabezado": "ARRIBA",\\n' +
'  "fecha_detectada": "15/OCT/26",\\n' +
'  "total_renglones_detectados": 60,\\n' +
'  "renglones": [\\n' +
'    {\\n' +
'      "columna": 1,\\n' +
'      "renglon": 1,\\n' +
'      "estilo_raw": "U/N 25-04",\\n' +
'      "sku_candidato": "UN25-04",\\n' +
'      "cajas_raw": "1",\\n' +
'      "cajas": 1,\\n' +
'      "confianza": 0.95\\n' +
'    }\\n' +
'  ]\\n' +
'}';

const body = {
  model: "google/gemini-2.5-flash",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: PROMPT },
        { type: "image_url", image_url: { url: imageUrl } }
      ]
    }
  ],
  temperature: 0.1,
  max_tokens: 8192
};

return [{
  json: {
    prompt_body: body,
    comprobante_url: imageUrl,
    numero_hoja: meta.numero_hoja || 1,
    total_hojas: meta.total_hojas || 1
  }
}];`;

// Definición de código de Parsear y Calcular Conteo
const jsCodeParse = `const item = $input.first()?.json || {};
const meta = $('Construir Prompt Conteo').first()?.json || {};

// 1. Extraer texto de la respuesta de OpenRouter
let rawContent = '';
if (item.choices && item.choices[0]) {
  const msg = item.choices[0].message;
  rawContent = (msg && typeof msg.content === 'string') ? msg.content : (item.choices[0].text || '');
} else if (item.candidates && item.candidates[0]?.content?.parts?.[0]?.text) {
  rawContent = item.candidates[0].content.parts[0].text;
} else if (typeof item === 'string') {
  rawContent = item;
}

// Limpiar markdown \`\`\`json ... \`\`\`
let jsonStr = rawContent.trim();
if (jsonStr.startsWith('\`\`\`')) {
  jsonStr = jsonStr.replace(/^\\s*\`\`\`(?:json)?\\s*/i, '').replace(/\\s*\`\`\`\\s*$/, '').trim();
}

let parsed = {};
try {
  parsed = JSON.parse(jsonStr);
} catch (e) {
  // Intento de rescate si hay texto adicional
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      parsed = JSON.parse(jsonStr.substring(firstBrace, lastBrace + 1));
    } catch (e2) {
      parsed = { error: 'No se pudo parsear el JSON retornado por la IA', raw: rawContent };
    }
  } else {
    parsed = { error: 'No se encontro JSON en la respuesta de la IA', raw: rawContent };
  }
}

// Función auxiliar para evaluar sumas manuales como "1.1", "1.1.1", "4+2", etc.
function evaluarCajas(rawStr, defaultNum) {
  if (rawStr === undefined || rawStr === null) return Number(defaultNum) || 0;
  const s = String(rawStr).trim();
  if (!s) return Number(defaultNum) || 0;
  
  // Caso suma con '+' ej "4+2" o "1+6"
  if (s.includes('+')) {
    const partes = s.split('+').map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
    if (partes.length > 0) {
      return partes.reduce((acc, curr) => acc + curr, 0);
    }
  }
  
  // Caso conteo con puntos "1.1", "1.1.1", "2.1"
  // Nota: si es un decimal tradicional como "0.5" se respeta como 0.5
  if (s.includes('.') && !s.startsWith('0.') && !s.startsWith('.')) {
    const partes = s.split('.').map(p => p.trim()).filter(Boolean);
    // Si todas las partes son dígitos enteros (ej "1", "1" -> 2 cajas)
    const todosEnteros = partes.every(p => /^\\d+$/.test(p));
    if (todosEnteros && partes.length > 1) {
      return partes.map(Number).reduce((acc, curr) => acc + curr, 0);
    }
  }
  
  const n = parseFloat(s.replace(/,/g, '.'));
  return !isNaN(n) ? n : (Number(defaultNum) || 0);
}

const renglonesOriginales = Array.isArray(parsed.renglones) ? parsed.renglones : [];

let totalCajasCol1 = 0;
let totalRenglonesCol1 = 0;
let totalCajasCol2 = 0;
let totalRenglonesCol2 = 0;

const renglonesProcesados = renglonesOriginales.map((r, idx) => {
  const col = (r.columna === 2 || r.columna === '2' || r.columna === 'der' || r.columna === 'derecha') ? 2 : 1;
  const rawCajas = r.cajas_raw !== undefined ? String(r.cajas_raw) : (r.cajas !== undefined ? String(r.cajas) : '1');
  const cajasFinales = evaluarCajas(rawCajas, r.cajas || 1);
  const estilo = (r.estilo_raw || r.sku_candidato || '').trim();
  const sku = (r.sku_candidato || r.estilo_raw || '').replace(/\\s+/g, '').toUpperCase().trim();
  
  if (col === 1) {
    totalCajasCol1 += cajasFinales;
    totalRenglonesCol1++;
  } else {
    totalCajasCol2 += cajasFinales;
    totalRenglonesCol2++;
  }
  
  return {
    id: 'h' + (meta.numero_hoja || 1) + '_c' + col + '_r' + (r.renglon || (idx + 1)),
    numero_hoja: meta.numero_hoja || 1,
    columna: col,
    renglon: r.renglon || (idx + 1),
    estilo_raw: estilo,
    sku_candidato: sku,
    cajas_raw: rawCajas,
    cajas: cajasFinales,
    confianza: typeof r.confianza === 'number' ? r.confianza : 0.95
  };
});

const totalCajasHoja = totalCajasCol1 + totalCajasCol2;
const totalRenglonesHoja = totalRenglonesCol1 + totalRenglonesCol2;

return [{
  json: {
    ok: true,
    numero_hoja: meta.numero_hoja || 1,
    total_hojas: meta.total_hojas || 1,
    comprobante_url: meta.comprobante_url,
    encabezado: parsed.encabezado || '',
    fecha_detectada: parsed.fecha_detectada || '',
    resumen: {
      columna_1: {
        renglones: totalRenglonesCol1,
        cajas: totalCajasCol1
      },
      columna_2: {
        renglones: totalRenglonesCol2,
        cajas: totalCajasCol2
      },
      total_hoja: {
        renglones: totalRenglonesHoja,
        cajas: totalCajasHoja
      }
    },
    renglones: renglonesProcesados
  }
}];`;

// Definición completa del Workflow para n8n
const workflowDefinition = {
  name: "OCR Conteo Físico Hojas de Libreta",
  nodes: [
    {
      parameters: {
        httpMethod: "POST",
        path: "conteo-fisico-hojas-ocr",
        responseMode: "responseNode",
        options: {
          binaryPropertyName: "foto"
        }
      },
      id: "cf-webhook-node",
      webhookId: "conteo-fisico-hojas-ocr",
      name: "Webhook Conteo Físico",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [100, 300]
    },
    {
      parameters: {
        jsCode: `const SUPABASE_URL = 'https://supabase.sistemaindumentaria.com';
const BUCKET = 'comprobantes';
const out = [];
const items = $input.all();

for (let i = 0; i < items.length; i++) {
  const item = items[i];
  const bin = item.binary || {};
  const keys = Object.keys(bin);
  if (keys.length === 0) { throw new Error('No se recibio ninguna imagen (binary vacio).'); }
  const key = bin.foto ? 'foto' : keys[0];
  const buffer = await this.helpers.getBinaryDataBuffer(i, key);
  const mimeType = bin[key].mimeType || 'image/jpeg';
  const meta = item.json || {};
  const body = meta.body || {};
  const ext = (mimeType.indexOf('png') >= 0) ? 'png' : ((mimeType.indexOf('webp') >= 0) ? 'webp' : 'jpg');
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = ('0' + (now.getMonth() + 1)).slice(-2);
  const rand = Math.floor(Math.random() * 1000000);
  const storagePath = yyyy + '/' + mm + '/conteo_fisico_' + now.getTime() + '_' + rand + '.' + ext;
  const comprobanteUrl = SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + storagePath;

  const numHoja = meta.numero_hoja || body.numero_hoja || 1;
  const totHojas = meta.total_hojas || body.total_hojas || 1;

  out.push({
    json: {
      mimeType: mimeType,
      storage_path: storagePath,
      comprobante_url: comprobanteUrl,
      numero_hoja: parseInt(numHoja, 10) || 1,
      total_hojas: parseInt(totHojas, 10) || 1
    },
    binary: { foto: bin[key] }
  });
}
return out;`
      },
      id: "cf-normalizar-node",
      name: "Normalizar imagen",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [320, 300]
    },
    {
      parameters: {
        method: "POST",
        url: "=https://supabase.sistemaindumentaria.com/storage/v1/object/comprobantes/{{ $json.storage_path }}",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: "Authorization",
              value: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            },
            {
              name: "apikey",
              value: SUPABASE_SERVICE_ROLE_KEY
            },
            {
              name: "x-upsert",
              value: "true"
            },
            {
              name: "Content-Type",
              value: "={{ $json.mimeType }}"
            }
          ]
        },
        sendBody: true,
        contentType: "binaryData",
        inputDataFieldName: "foto",
        options: {}
      },
      id: "cf-upload-storage",
      name: "Subir imagen al bucket",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [540, 300]
    },
    {
      parameters: {
        jsCode: jsCodePrompt
      },
      id: "cf-prompt-node",
      name: "Construir Prompt Conteo",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [760, 300]
    },
    {
      parameters: {
        method: "POST",
        url: "https://openrouter.ai/api/v1/chat/completions",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: "Authorization",
              value: `Bearer ${OPENROUTER_API_KEY}`
            },
            {
              name: "Content-Type",
              value: "application/json"
            },
            {
              name: "X-Title",
              value: "OCR Conteo Fisico Hojas"
            }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.prompt_body) }}",
        options: {
          timeout: 120000
        }
      },
      id: "cf-openrouter-node",
      name: "OpenRouter Vision",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [980, 300],
      retryOnFail: true
    },
    {
      parameters: {
        jsCode: jsCodeParse
      },
      id: "cf-parse-node",
      name: "Parsear y Calcular Conteo",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1200, 300]
    },
    {
      parameters: {
        respondWith: "firstIncomingItem",
        options: {
          responseCode: 200
        }
      },
      id: "cf-respond-node",
      name: "Responder Webhook",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [1420, 300]
    }
  ],
  connections: {
    "Webhook Conteo Físico": {
      main: [[{ node: "Normalizar imagen", type: "main", index: 0 }]]
    },
    "Normalizar imagen": {
      main: [[{ node: "Subir imagen al bucket", type: "main", index: 0 }]]
    },
    "Subir imagen al bucket": {
      main: [[{ node: "Construir Prompt Conteo", type: "main", index: 0 }]]
    },
    "Construir Prompt Conteo": {
      main: [[{ node: "OpenRouter Vision", type: "main", index: 0 }]]
    },
    "OpenRouter Vision": {
      main: [[{ node: "Parsear y Calcular Conteo", type: "main", index: 0 }]]
    },
    "Parsear y Calcular Conteo": {
      main: [[{ node: "Responder Webhook", type: "main", index: 0 }]]
    }
  },
  settings: {
    executionOrder: "v1"
  }
};

async function main() {
  console.log("Comprobando si ya existe un workflow de conteo físico...");
  const listOptions = {
    hostname: N8N_HOST,
    path: '/api/v1/workflows',
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  };

  const workflows = await new Promise((resolve, reject) => {
    https.get(listOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });

  const existing = workflows.data?.find(w => w.name === workflowDefinition.name);
  let workflowId = existing?.id;

  if (workflowId) {
    console.log(`Workflow existente encontrado con ID: ${workflowId}. Actualizando...`);
    const putData = JSON.stringify(workflowDefinition);
    await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: N8N_HOST,
        path: `/api/v1/workflows/${workflowId}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Length': Buffer.byteLength(putData)
        }
      }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          console.log(`Actualizado con status: ${res.statusCode}`);
          resolve(d);
        });
      });
      req.on('error', reject);
      req.write(putData);
      req.end();
    });
  } else {
    console.log("Creando nuevo workflow en n8n...");
    const postData = JSON.stringify(workflowDefinition);
    const created = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: N8N_HOST,
        path: '/api/v1/workflows',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          console.log(`Creado con status: ${res.statusCode}`);
          try { resolve(JSON.parse(d)); } catch(e) { resolve(d); }
        });
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
    workflowId = created.id;
  }

  console.log(`Activando workflow ID: ${workflowId}...`);
  await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: N8N_HOST,
      path: `/api/v1/workflows/${workflowId}/activate`,
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        console.log(`Activación status: ${res.statusCode}`);
        resolve(d);
      });
    });
    req.on('error', reject);
    req.end();
  });

  console.log("¡Workflow configurado y activado exitosamente!");
  console.log("Webhook activo en: https://" + N8N_HOST + "/webhook/conteo-fisico-hojas-ocr");
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
