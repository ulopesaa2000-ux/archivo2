// scripts/n8n/updates/update_ai_validator.js
// Mejora el rol de IA del packing parser vía API pública:
// 1. Modelo google/gemini-2.5-flash -> google/gemini-2.5-pro (más capaz).
// 2. Prompt validador: compara parseo vs hojas, detecta absurdos y SKUs fantasma.
// 3. Fusionar e Inteligencia propaga alertas_calidad a warnings.
// Hace respaldo fresco antes de modificar. Uso:
//   node scripts/n8n/updates/update_ai_validator.js [--apply]

const fs = require('fs');
const path = require('path');

const API_BASE = process.env.N8N_API_BASE || 'https://n8n.sistemaindumentaria.com/api/v1';
const API_KEY =
  process.env.N8N_PUBLIC_API_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZmQ1MzZjYy03M2I1LTQyMmQtOWQyOC02NzE4NzIzNzM2ZWIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzg0MDUzNjcwfQ.QfyrrtYrKyfUaPXMnjSJb78Q_D4mUMjN1_fE0pGc4Xg';
const WORKFLOW_ID = process.env.N8N_WORKFLOW_ID || '9XsVokBIW5HW3Pe-XP66f';
const DRY_RUN = !process.argv.includes('--apply');

const MODELO_NUEVO = 'google/gemini-2.5-pro';
const MODELO_VIEJO = 'google/gemini-2.5-flash';

const BLOQUE_VALIDADOR = `
4. VALIDAR que los datos tengan sentido (rol auditor, NO inventes cantidades):
   - SKU fantasma: si un sku_base parece nombre de hoja/pestaña (corto, sin formato de estilo como "02MW", "09 10") y no aparece en columnas Style del detalle, márcalo.
   - Cantidades absurdas: más de 10000 cajas de un SKU, una sola caja con más del 50% del total ("remanente fantasma"), peso o cbm imposibles.
   - Cajas sin piezas_por_caja (nulo o 0) con cantidad mayor a 0.
   - Resumen que no cuadra con el detalle ya calculado.
   Para cada hallazgo agrega un objeto a "alertas_calidad":
   { "severidad": "alta|media", "sku_base": "SKU o null", "codigo_caja": "código o null", "detalle": "explicación corta" }.
   Si todo cuadra, devuelve "alertas_calidad": [].
`;

const CONTRATO_ALERTAS = `
  "correcciones_productos": [
    {
      "sku_base": "SKU",
      "descripcion": "descripción corregida si estaba vacía o mal redactada"
    }
  ],
  "alertas_calidad": [
    {
      "severidad": "alta",
      "sku_base": "SKU o null",
      "codigo_caja": "código de caja o null",
      "detalle": "qué no tiene sentido y por qué"
    }
  ],
  "warnings_adicionales": []`;

async function api(pathname, method = 'GET', body) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: {
      'X-N8N-API-KEY': API_KEY,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${pathname} -> HTTP ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

function getNode(wf, name) {
  const n = wf.nodes.find((n) => n.name === name);
  if (!n) throw new Error(`Nodo no encontrado: ${name}`);
  return n;
}

async function main() {
  console.log('1. Descargando workflow en vivo...');
  const wf = await api(`/workflows/${WORKFLOW_ID}`);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.resolve('scripts/backups', `n8n_prefill_${stamp}`);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(backupDir, `${WORKFLOW_ID}_antes-ia-validador.json`), JSON.stringify(wf, null, 2));
  console.log(`2. Respaldo fresco en: ${backupDir}`);

  // --- A. Prompt validador (Preparar Ollama) ---
  const prep = getNode(wf, 'Preparar Ollama');
  let prepCode = String(prep.parameters.jsCode || '');
  if (!prepCode.includes('VALIDAR que los datos tengan sentido')) {
    // 1) Alimentar al prompt con el resumen agregado por SKU para que juzgue absurdos
    prepCode = prepCode.replace(
      'const warnings = parsed.warnings || [];',
      `const warnings = parsed.warnings || [];
const resumenAgg = parsed.orden_preview || parsed.resumen || {};
const resumenSkus = Array.isArray(resumenAgg.orden_productos) ? resumenAgg.orden_productos.map((o) => ({ sku: o.sku ?? o.sku_base ?? null, cajas: o.numero_cajas_reales ?? o.cajas_pedidas ?? null, piezas: o.cantidad_total ?? o.piezas_pedidas ?? null })) : [];`
    );
    prepCode = prepCode.replace(
      'Warnings del parser:\n${JSON.stringify(warnings, null, 2)}',
      'Warnings del parser:\n${JSON.stringify(warnings, null, 2)}\n\nResumen agregado por SKU (líneas vs detalle):\n${JSON.stringify(resumenSkus, null, 2)}'
    );
    // 2) Agregar rol validador antes del formato de salida
    prepCode = prepCode.replace(
      'Devuelve únicamente un objeto JSON con el siguiente formato:',
      `${BLOQUE_VALIDADOR}\nDevuelve únicamente un objeto JSON con el siguiente formato:`
    );
    // 3) Extender contrato con alertas_calidad
    prepCode = prepCode.replace(
      `  "correcciones_productos": [
    {
      "sku_base": "SKU",
      "descripcion": "descripción corregida si estaba vacía o mal redactada"
    }
  ],
  "warnings_adicionales": []`,
      CONTRATO_ALERTAS
    );
    prep.parameters.jsCode = prepCode;
    console.log('3. Prompt validador preparado (Preparar Ollama).');
  } else {
    console.log('3. El prompt validador YA existe. Sin cambios.');
  }

  // --- B. Modelo más capaz (OpenRouter Packing Analizador) ---
  const analizador = getNode(wf, 'OpenRouter Packing Analizador');
  const bodyStr = String(analizador.parameters.jsonBody || '');
  if (bodyStr.includes(MODELO_NUEVO)) {
    console.log('4. El modelo YA es ' + MODELO_NUEVO + '. Sin cambios.');
  } else if (!bodyStr.includes(MODELO_VIEJO)) {
    console.log('4. Modelo actual distinto al esperado, NO se toca por seguridad.');
  } else {
    analizador.parameters.jsonBody = bodyStr.split(MODELO_VIEJO).join(MODELO_NUEVO);
    console.log(`4. Modelo ${MODELO_VIEJO} -> ${MODELO_NUEVO}.`);
  }

  // --- C. Propagar alertas_calidad en Fusionar e Inteligencia ---
  const fusion = getNode(wf, 'Fusionar e Inteligencia');
  let fusionCode = String(fusion.parameters.jsCode || '');
  if (!fusionCode.includes('alertas_calidad')) {
    fusionCode = fusionCode.replace(
      `// 4. Registrar estado del proceso para el frontend de Next.js`,
      `// 3b. Propagar alertas de calidad de la IA como warnings tipificados
const alertasCalidad = aiData.alertas_calidad || [];
for (const a of alertasCalidad) {
  (original.warnings = original.warnings || []).push({
    tipo: 'ia_calidad',
    severidad: a.severidad || 'media',
    sku_base: a.sku_base || null,
    codigo_caja_temporal: a.codigo_caja || null,
    detalle: a.detalle || '',
  });
}

// 4. Registrar estado del proceso para el frontend de Next.js`
    );
    fusionCode = fusionCode.replace(
      `original.metadata.ai_model = 'google/gemini-2.5-flash';`,
      `original.metadata.ai_model = '${MODELO_NUEVO}';`
    );
    fusion.parameters.jsCode = fusionCode;
    console.log('5. Fusionar propagará alertas_calidad.');
  } else {
    console.log('5. Fusionar YA propaga alertas. Sin cambios.');
  }

  console.log(`6. Dry-run: ${DRY_RUN}`);
  if (DRY_RUN) {
    console.log('   Sin --apply no se modifica nada.');
    return;
  }

  console.log('7. Aplicando PUT...');
  await api(`/workflows/${WORKFLOW_ID}`, 'PUT', {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || {},
  });
  const check = await api(`/workflows/${WORKFLOW_ID}`);
  const prepOk = String(check.nodes.find((n) => n.name === 'Preparar Ollama')?.parameters.jsCode || '').includes('VALIDAR que los datos tengan sentido');
  const modelOk = String(check.nodes.find((n) => n.name === 'OpenRouter Packing Analizador')?.parameters.jsonBody || '').includes(MODELO_NUEVO);
  const fusionOk = String(check.nodes.find((n) => n.name === 'Fusionar e Inteligencia')?.parameters.jsCode || '').includes('alertas_calidad');
  console.log(`   Prompt validador: ${prepOk}, modelo pro: ${modelOk}, alertas en Fusionar: ${fusionOk}`);
  if (!prepOk || !modelOk || !fusionOk) throw new Error('Verificación fallida.');
  console.log('LISTO: IA validadora aplicada y verificada.');
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
