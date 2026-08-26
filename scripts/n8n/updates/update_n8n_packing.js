// scripts\n8n\updates\update_n8n_packing.js
const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables desde .env.local si existen
let envConfig = {};
try {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    envConfig = dotenv.parse(fs.readFileSync(envPath));
  }
} catch (e) {}

const apiKey = process.env.N8N_API_KEY || envConfig.N8N_API_KEY || '';
const workflowId = process.env.N8N_WORKFLOW_ID || '9XsVokBIW5HW3Pe-XP66f';

if (!apiKey) {
  console.error('ERROR: N8N_API_KEY no encontrada en variables de entorno ni en .env.local');
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

async function run() {
  console.log(`1. Obteniendo workflow de n8n (ID: ${workflowId})...`);
  const resGet = await api('GET', `/workflows/${workflowId}`);
  if (resGet.status !== 200) {
    console.error('Error al obtener workflow:', resGet);
    return;
  }

  const workflow = resGet.data;
  console.log(`Workflow obtenido: "${workflow.name}" (${workflow.nodes.length} nodos)`);

  // Guardar copia de seguridad local
  const backupPath = path.resolve(__dirname, 'backup_packing_workflow.json');
  fs.writeFileSync(backupPath, JSON.stringify(workflow, null, 2));
  console.log(`2. Copia de seguridad guardada en: ${backupPath}`);

  // 1. Actualizar nodo "Parser MOTI bloques"
  const motiNodeIndex = workflow.nodes.findIndex(n => n.name === 'Parser MOTI bloques');
  if (motiNodeIndex !== -1) {
    const fixedMotiCodePath = path.resolve(__dirname, 'scratch_moti_code_fixed.js');
    if (fs.existsSync(fixedMotiCodePath)) {
      console.log('3. Actualizando código de "Parser MOTI bloques" con la nueva lógica unificada por bloque y tallas Plus...');
      workflow.nodes[motiNodeIndex].parameters.jsCode = fs.readFileSync(fixedMotiCodePath, 'utf8');
    }
  }

  // 2. Actualizar nodo "Preparar Ollama" (prompt de IA con soporte de alias y colores compuestos)
  const prepNodeIndex = workflow.nodes.findIndex(n => n.name === 'Preparar Ollama');
  if (prepNodeIndex !== -1) {
    console.log('4. Actualizando prompt en "Preparar Ollama" para soportar traducción de colores compuestos y alias...');
    workflow.nodes[prepNodeIndex].parameters.jsCode = `// Preparar Ollama / OpenRouter Prompt
const parsed = $input.first().json;
const sampleProducts = (parsed.productos_para_editar || []).slice(0, 15);
const sampleCajas = (parsed.cajas_para_editar || []).slice(0, 10);
const sampleDetalles = (parsed.caja_detalles_para_editar || []).slice(0, 20);
const warnings = parsed.warnings || [];

const prompt = \`
Analiza la siguiente extracción de Packing List de ropa importada (proveedor MOTI u otro).

Productos extraídos:
\${JSON.stringify(sampleProducts, null, 2)}

Cajas extraídas (muestra):
\${JSON.stringify(sampleCajas, null, 2)}

Detalles de caja (muestra de variantes):
\${JSON.stringify(sampleDetalles, null, 2)}

Warnings del parser:
\${JSON.stringify(warnings, null, 2)}

Tu tarea es:
1. Traducir nombres de colores en inglés, chino o combinados a español estándar (ej: "BLACK" -> "Negro", "NAVY" -> "Marino", "CHOCOLATE" -> "Chocolate", "RED" -> "Rojo", "BRONZE" -> "Bronce", "GREEN" -> "Verde", "OFF WHITE" -> "Blanco Hueso", "D.BEIGE" -> "Beige Oscuro", "D.KHAKI" -> "Kaki Oscuro", "BLACK/STONE" -> "Negro/Piedra", "CHOCOLATE/L.BEIGE" -> "Chocolate/Beige Claro", "D.KHAKI/D.KHAKI" -> "Kaki Oscuro/Kaki Oscuro", "BLACK/BLACK" -> "Negro/Negro", "CAMEL/BEIGE" -> "Camel/Beige", "COFFEE/BEIGE" -> "Café/Beige", "SAND/SAND" -> "Arena/Arena", "PALE ROSE" -> "Rosa Pálido", "FRENCH ROAST" -> "Café Tostado").
2. Traducir/Estandarizar códigos de tallas (S/CH -> CH, M/M -> M, L/G -> G, XL/EG -> EG, 1X -> EG, 2X -> 2EG, 3X -> 3EG, 4X -> 4EG, 5X -> 5EG).
3. Si un producto tiene alias en sku_raw (ej: "1AK7986 / AND260007") o descripción incompleta, mantener exactamente el sku_base y devolver la descripción refinada en español claro.

Devuelve únicamente un objeto JSON con el siguiente formato:
{
  "translation_map": {
    "colores": {
      "BLACK": "Negro",
      "NAVY": "Marino",
      "CHOCOLATE": "Chocolate",
      "OFF WHITE": "Blanco Hueso",
      "D.BEIGE": "Beige Oscuro",
      "BLACK/STONE": "Negro/Piedra"
    },
    "tallas": {}
  },
  "correcciones_productos": [
    {
      "sku_base": "SKU",
      "descripcion": "descripción corregida si estaba vacía o mal redactada"
    }
  ],
  "warnings_adicionales": []
}
\`;

return [{ json: { original: parsed, prompt: prompt } }];`;
  }

  // 3. Mantener nodo "OpenRouter Packing Analizador"
  const httpNodeIndex = workflow.nodes.findIndex(n => 
    n.name === 'Ollama Packing Analizador' || n.name === 'OpenRouter Packing Analizador'
  );
  if (httpNodeIndex !== -1) {
    const oldNode = workflow.nodes[httpNodeIndex];
    const oldNodeName = oldNode.name;
    const newNodeName = 'OpenRouter Packing Analizador';
    
    // Preservar la API key si ya fue colocada por el usuario
    const existingAuth = oldNode.parameters?.headerParameters?.parameters?.find(p => p.name === 'Authorization')?.value;
    const authVal = (existingAuth && !existingAuth.includes('PON_AQUI')) ? existingAuth : 'Bearer PON_AQUI_TU_API_KEY_OPENROUTER';

    console.log(`5. Verificando nodo "${newNodeName}" con Gemini 2.5 Flash...`);
    workflow.nodes[httpNodeIndex] = {
      ...oldNode,
      name: newNodeName,
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      parameters: {
        method: 'POST',
        url: 'https://openrouter.ai/api/v1/chat/completions',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: 'Authorization',
              value: authVal
            },
            {
              name: 'Content-Type',
              value: 'application/json'
            },
            {
              name: 'HTTP-Referer',
              value: 'https://sistemaindumentaria.com'
            },
            {
              name: 'X-Title',
              value: 'Packing List Analizador'
            }
          ]
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: "={{ JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'system', content: 'Eres un asistente experto en importación y logística textil. Devuelve ÚNICAMENTE un objeto JSON válido con la estructura solicitada.' }, { role: 'user', content: $json.prompt }], temperature: 0.1, response_format: { type: 'json_object' } }) }}",
        options: {
          timeout: 60000
        }
      },
      onError: 'continueRegularOutput'
    };

    // Reenrutar conexiones si el nombre cambió
    if (oldNodeName !== newNodeName) {
      for (const [sourceNode, connGroup] of Object.entries(workflow.connections)) {
        if (connGroup.main) {
          connGroup.main.forEach(targets => {
            targets.forEach(target => {
              if (target.node === oldNodeName) target.node = newNodeName;
            });
          });
        }
      }
      if (workflow.connections[oldNodeName]) {
        workflow.connections[newNodeName] = workflow.connections[oldNodeName];
        delete workflow.connections[oldNodeName];
      }
    }
  }

  // 4. Actualizar nodo "Fusionar e Inteligencia"
  const fusionNodeIndex = workflow.nodes.findIndex(n => n.name === 'Fusionar e Inteligencia');
  if (fusionNodeIndex !== -1) {
    console.log('6. Asegurando extracción resiliente en "Fusionar e Inteligencia"...');
    workflow.nodes[fusionNodeIndex].parameters.jsCode = `// Fusionar e Inteligencia (OpenRouter / Gemini 2.5 Flash + Fallback resiliente)
const prep = $('Preparar Ollama').first()?.json || {};
const original = prep.original || {};

let aiData = {};
let aiStatus = 'exitoso';
let aiMessage = 'IA tradujo y estandarizó datos con Gemini 2.5 Flash (OpenRouter)';

try {
  const firstInput = $input.first()?.json || {};
  
  // Extraer texto tanto de OpenRouter (choices[0].message.content) como de Ollama (.response)
  let responseText = firstInput.choices?.[0]?.message?.content || firstInput.response || '';

  if (!responseText && firstInput.error) {
    const errMsg = typeof firstInput.error === 'object' ? JSON.stringify(firstInput.error) : String(firstInput.error);
    throw new Error(errMsg);
  }

  if (!responseText) {
    throw new Error('Respuesta vacía o error de autenticación/cuota de OpenRouter');
  }

  responseText = responseText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
  const a = responseText.indexOf('{');
  const b = responseText.lastIndexOf('}');
  
  if (a !== -1 && b !== -1 && b > a) {
    aiData = JSON.parse(responseText.slice(a, b + 1));
  } else {
    throw new Error('Respuesta JSON no válida');
  }
} catch (e) {
  aiStatus = 'fallback_timeout';
  aiMessage = 'No se pudo completar el refinamiento por IA (' + e.message + '), se entrega extracción base limpia.';
  aiData = { error: e.message };
}

const translationMap = aiData.translation_map || {};
const colorMap = translationMap.colores || {};
const tallaMap = translationMap.tallas || {};
const corrections = aiData.correcciones_productos || [];

// 1. Traducir colores en los detalles de las cajas
if (original.caja_detalles_para_editar && Object.keys(colorMap).length > 0) {
  original.caja_detalles_para_editar.forEach(d => {
    if (d.color_raw && colorMap[d.color_raw]) {
      d.color_raw = colorMap[d.color_raw];
      d.estado_temporal = 'pendiente_match_color';
    }
  });
}

// 2. Traducir colores y tallas en la lista de cajas
if (original.cajas_para_editar) {
  original.cajas_para_editar.forEach(c => {
    if (c.colores && Object.keys(colorMap).length > 0) {
      c.colores = c.colores.split('|').map(col => colorMap[col] || col).join('|');
    }
    if (c.tallas && Object.keys(tallaMap).length > 0) {
      c.tallas = c.tallas.split('|').map(t => tallaMap[t] || t).join('|');
    }
  });
}

// 3. Corregir descripciones de productos si existen
if (original.productos_para_editar && corrections.length > 0) {
  original.productos_para_editar.forEach(p => {
    const corr = corrections.find(c => c.sku_base === p.sku_base);
    if (corr && corr.descripcion) {
      p.descripcion = corr.descripcion;
    }
  });
}

// 4. Registrar estado del proceso para el frontend de Next.js
if (!original.metadata) original.metadata = {};
original.metadata.ai_processed = (aiStatus === 'exitoso');
original.metadata.ai_model = 'google/gemini-2.5-flash';
original.metadata.ai_status = aiStatus;
original.metadata.estado_ui = 'casi_listo';
original.metadata.mensaje_progreso = aiMessage;
original.metadata.colors_translated = Object.keys(colorMap).length;

return [{ json: original }];`;
  }

  // 5. Subir workflow actualizado a n8n
  console.log('7. Guardando cambios en n8n...');
  const resPut = await api('PUT', `/workflows/${workflowId}`, {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings
  });

  if (resPut.status === 200) {
    console.log('✅ Workflow actualizado exitosamente en n8n!');
  } else {
    console.error('❌ Error al actualizar workflow en n8n:', resPut);
  }
}

run().catch(console.error);
