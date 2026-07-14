// scratch/apply_workflow_updates.js
const fs = require('fs');

const token = 'JWT_REPLACED_FOR_SECURITY';
const workflowId = 'DtZOqR4-9_DnULEjWW78b';
const serviceRoleKey = 'JWT_REPLACED_FOR_SECURITY';
const supabaseUrl = 'https://supabase.sistemaindumentaria.com';

async function main() {
  console.log("Reading workflow_current.json...");
  const workflow = JSON.parse(fs.readFileSync('scratch/workflow_current.json', 'utf8'));

  console.log("Updating node parameters...");
  workflow.nodes.forEach(node => {
    // 1. Update any Supabase Service Role Key placeholders in HTTP headers
    if (node.parameters && node.parameters.headerParameters && node.parameters.headerParameters.parameters) {
      node.parameters.headerParameters.parameters.forEach(p => {
        if (p.value === 'Bearer SERVICE_ROLE_KEY_REEMPLAZA') {
          p.value = `Bearer ${serviceRoleKey}`;
          console.log(`Updated authorization header in node: ${node.name}`);
        } else if (p.value === 'SERVICE_ROLE_KEY_REEMPLAZA') {
          p.value = serviceRoleKey;
          console.log(`Updated apikey header in node: ${node.name}`);
        }
      });
    }

    // 2. Update any Supabase URL placeholders in httpRequest nodes
    if (node.parameters && node.parameters.url) {
      if (node.parameters.url.includes('TU-SUPABASE.supabase.co')) {
        node.parameters.url = node.parameters.url.replace('TU-SUPABASE.supabase.co', 'supabase.sistemaindumentaria.com');
        console.log(`Updated Supabase URL in node: ${node.name}`);
      }
    }

    // 3. Rename the Ollama Webhook path to avoid conflicts
    if (node.name === "Webhook (sitio/telefono)") {
      node.parameters.path = "nota-movimiento-local";
      console.log(`Updated path in Ollama trigger "${node.name}" to "nota-movimiento-local"`);
    }

    // 4. Update JS code in Normalizar imagen2 to handle both Form and Webhook inputs
    if (node.name === "Normalizar imagen2") {
      node.parameters.jsCode = `// Unifica la imagen (Webhook o Form), produce data URL base64 para OpenRouter
// y precalcula la ruta + URL PUBLICA del bucket de Supabase.
// Usa getBinaryDataBuffer para que funcione tambien en binaryDataMode=database.
const SUPABASE_URL = 'https://supabase.sistemaindumentaria.com';
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
  const base64 = buffer.toString('base64');
  const mimeType = bin[key].mimeType || 'image/jpeg';
  const meta = item.json || {};
  const ext = (mimeType.indexOf('png') >= 0) ? 'png' : ((mimeType.indexOf('webp') >= 0) ? 'webp' : 'jpg');
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = ('0' + (now.getMonth() + 1)).slice(-2);
  const rand = Math.floor(Math.random() * 1000000);
  const storagePath = yyyy + '/' + mm + '/nota_' + now.getTime() + '_' + rand + '.' + ext;
  const comprobanteUrl = SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + storagePath;
  
  // Extract body values if webhook
  const body = meta.body || {};
  const clientRequestId = meta.client_request_id || meta['client_request_id (opcional)'] || body.client_request_id || null;
  const tipoHint = meta.tipo || meta['Tipo (opcional)'] || body.tipo || body.tipo_hint || null;

  out.push({
    json: {
      mimeType: mimeType,
      dataUrl: 'data:' + mimeType + ';base64,' + base64,
      storage_path: storagePath,
      comprobante_url: comprobanteUrl,
      client_request_id: clientRequestId,
      tipo_hint: tipoHint
    },
    binary: { foto: bin[key] }
  });
}
return out;`;
      console.log(`Updated JS code in node: ${node.name}`);
    }

    // 5. Update Armar respuesta2 JS code to return proposal ID
    if (node.name === "Armar respuesta2") {
      node.parameters.jsCode = `const parsed = $('Parsear JSON2').first().json;
let prom = {};
try { prom = $('Promover a nota (auto)').first().json; } catch (e) { prom = {}; }
const res = prom.resultado || prom || {};
let propuestaId = null;
try { propuestaId = $('Insertar propuesta staging').first().json.id; } catch(e) {}
return [{ json: {
  ok: true,
  nota_id: (res && res.nota_id) || null,
  propuesta_id: propuestaId,
  comprobante_url: parsed.comprobante_url,
  propuesta: {
    folio: parsed.folio,
    fecha: parsed.fecha,
    tipo_movimiento: parsed.tipo_movimiento,
    origen: parsed.origen,
    destino: parsed.destino,
    confianza_global: parsed.confianza_global
  },
  lineas: parsed.lineas,
  advertencias: (res && res.advertencias) || [],
  mensaje: 'Nota creada como BORRADOR (PEND) en notas_inventario. Un admin debe aprobarla para que el trigger ajuste el inventario.'
} }];`;
      console.log(`Updated JS code in node: ${node.name} to return propuesta_id`);
    }
  });

  console.log("Updating connections...");
  // Disconnect "Analyze image" from "Normalizar imagen2" to prevent Ollama errors from crashing the flow
  if (workflow.connections && workflow.connections["Normalizar imagen2"] && workflow.connections["Normalizar imagen2"].main) {
    const mainConnections = workflow.connections["Normalizar imagen2"].main[0];
    const filtered = mainConnections.filter(conn => conn.node !== "Analyze image");
    if (filtered.length !== mainConnections.length) {
      workflow.connections["Normalizar imagen2"].main[0] = filtered;
      console.log("Disconnected 'Analyze image' from 'Normalizar imagen2' main connections.");
    }
  }

  // Prepare payload for n8n API (WITHOUT the read-only active property)
  const payload = {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings
  };

  console.log("Updating workflow via n8n Public API...");
  try {
    const res = await fetch(`https://n8n.sistemaindumentaria.com/api/v1/workflows/${workflowId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': token
      },
      body: JSON.stringify(payload)
    });

    console.log("Response Status:", res.status);
    const responseText = await res.text();
    if (res.ok) {
      console.log("Workflow updated successfully!");
      fs.writeFileSync('scratch/workflow_updated_response.json', responseText);
    } else {
      console.error("Failed to update workflow:", responseText);
    }
  } catch (err) {
    console.error("Request failed:", err);
  }
}

main().catch(console.error);
