// scripts/n8n/updates/build_full_workflow_json.js
// Genera el JSON COMPLETO del packing parser con los cambios aplicados offline:
// 1. Nodo "Auditoría pre-salida" (igual que apply_audit_node.js).
// 2. IA validadora: modelo gemini-2.5-pro + prompt validador + alertas en
//    Fusionar (igual que update_ai_validator.js).
// 3. Cascada IA: flash siempre + escalado a PRO si hay alertas graves
//    (Switch "¿Escalar a PRO?" + clon "OpenRouter Packing PRO").
// 4. Camino Jenny: detección en Normalizar + regla en Switch + lector clonado
//    + nodo "Parser Jenny multicolor-pack" (requiere ./jenny_parser_code.js).
// Base: último respaldo completo previo a los cambios.
// Salida: scripts/backups/packing_workflow_con_auditoria_y_ia.json (listo
// para Importar en n8n como workflow NUEVO, probar y luego sustituir).
// Uso: node scripts/n8n/updates/build_full_workflow_json.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { JENNY_JS } = require('./jenny_parser_code.js');

const BASE = path.resolve(
  'scripts/backups',
  'n8n_2026-10-02T21-31-51',
  '9XsVokBIW5HW3Pe-XP66f_packing-parser-switch-excel-reader-v13-sin-env.json'
);
const OUT = path.resolve('scripts/backups', 'packing_workflow_con_auditoria_y_ia.json');

const MODELO_NUEVO = 'google/gemini-2.5-pro';
const MODELO_VIEJO = 'google/gemini-2.5-flash';

const AUDIT_JS = `// Auditoria pre-salida v1: normaliza, autocompleta huecos desde el detalle,
// calcula match lineas-vs-fisico y lo firma para la plataforma.
const input = $input.first().json;
const normSku = (s) => String(s || '').trim().toUpperCase().replace(/[-_/\\s]+/g, '');
const T = (v) => Number(v) || 0;
const cajas = input.cajas_para_editar || input.cajas || [];
const reales = cajas.filter((c) => c.tipo_caja !== 'padre_resumen');
const resumen = input.orden_preview || input.resumen || {};
const lineas = Array.isArray(resumen.orden_productos) ? resumen.orden_productos : [];
const fisico = {};
for (const c of reales) {
  const k = normSku(c.sku_base);
  if (!k) continue;
  fisico[k] = fisico[k] || { sku: String(c.sku_base || '').trim(), cajas: 0, piezas: 0 };
  fisico[k].cajas += T(c.cantidad_cajas);
  fisico[k].piezas += T(c.total_piezas != null ? c.total_piezas : (c.piezas_por_caja || 0) * (c.cantidad_cajas || 0));
}
const idx = {};
for (const l of lineas) {
  const k = normSku(l.sku != null ? l.sku : l.sku_base);
  if (k) idx[k] = { cajas: T(l.numero_cajas_reales != null ? l.numero_cajas_reales : l.cajas_pedidas) };
}
const rellenados = [];
const diffs = [];
const keys = new Set([...Object.keys(fisico), ...Object.keys(idx)]);
for (const k of keys) {
  const f = fisico[k] || { sku: k, cajas: 0, piezas: 0 };
  let lin = idx[k];
  if (!lin && f.cajas > 0) {
    const nuevo = { sku: f.sku, cantidad_total: f.piezas, numero_cajas_reales: f.cajas, cajas_pedidas: f.cajas, piezas_pedidas: f.piezas, _origen: 'autocompletado_n8n' };
    lineas.push(nuevo);
    rellenados.push({ sku: f.sku, cajas: f.cajas, piezas: f.piezas });
    lin = { cajas: f.cajas };
  }
  const dif = (lin ? lin.cajas : 0) - f.cajas;
  if (dif !== 0 || (!lin && f.cajas > 0)) {
    diffs.push({ sku: f.sku || k, cajas_linea: lin ? lin.cajas : 0, cajas_fisicas: f.cajas, dif });
  }
}
resumen.orden_productos = lineas;
if (input.orden_preview) input.orden_preview = resumen; else input.resumen = resumen;
input.auditoria_n8n = { match_ok: diffs.length === 0, rellenados, diffs, version: 'auditoria-presalida-v1' };
input.warnings = [...(input.warnings || []),
  ...diffs.map((d) => ({ tipo: 'match_cajas', severidad: 'alta', sku_base: d.sku, detalle: 'linea ' + d.cajas_linea + ' vs fisico ' + d.cajas_fisicas })),
  ...rellenados.map((r) => ({ tipo: 'linea_autocompletada', severidad: 'media', sku_base: r.sku, detalle: 'linea creada desde fisico: ' + r.cajas + ' cajas' }))];
return [{ json: input }];`;

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

function must(replaced, label) {
  if (!replaced) throw new Error(`Ancla no encontrada: ${label}`);
}

function main() {
  const wf = JSON.parse(fs.readFileSync(BASE, 'utf8'));
  const checks = [];

  // 1) Nodo auditoría
  if (!wf.nodes.some((n) => n.name === 'Auditoría pre-salida')) {
    wf.nodes.push({
      id: crypto.randomUUID(),
      name: 'Auditoría pre-salida',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [336, 4952],
      parameters: { jsCode: AUDIT_JS },
    });
    wf.connections['Fusionar e Inteligencia'] = {
      main: [[{ node: 'Auditoría pre-salida', type: 'main', index: 0 }]],
    };
    wf.connections['Auditoría pre-salida'] = {
      main: [[{ node: 'Salida JSON Next.js', type: 'main', index: 0 }]],
    };
  }
  checks.push(['audit-node', wf.nodes.some((n) => n.name === 'Auditoría pre-salida')]);

  // 2) Prompt validador
  const prep = wf.nodes.find((n) => n.name === 'Preparar Ollama');
  let prepCode = String(prep.parameters.jsCode || '');
  let c0 = prepCode;
  prepCode = prepCode.replace(
    'const warnings = parsed.warnings || [];',
    `const warnings = parsed.warnings || [];
const resumenAgg = parsed.orden_preview || parsed.resumen || {};
const resumenSkus = Array.isArray(resumenAgg.orden_productos) ? resumenAgg.orden_productos.map((o) => ({ sku: o.sku ?? o.sku_base ?? null, cajas: o.numero_cajas_reales ?? o.cajas_pedidas ?? null, piezas: o.cantidad_total ?? o.piezas_pedidas ?? null })) : [];`
  );
  must(prepCode !== c0, 'prep-warnings');
  c0 = prepCode;
  prepCode = prepCode.replace(
    'Warnings del parser:\n${JSON.stringify(warnings, null, 2)}',
    'Warnings del parser:\n${JSON.stringify(warnings, null, 2)}\n\nResumen agregado por SKU (líneas vs detalle):\n${JSON.stringify(resumenSkus, null, 2)}'
  );
  must(prepCode !== c0, 'prep-resumen');
  c0 = prepCode;
  prepCode = prepCode.replace(
    'Devuelve únicamente un objeto JSON con el siguiente formato:',
    `${BLOQUE_VALIDADOR}\nDevuelve únicamente un objeto JSON con el siguiente formato:`
  );
  must(prepCode !== c0, 'prep-formato');
  c0 = prepCode;
  prepCode = prepCode.replace(
    `  "correcciones_productos": [
    {
      "sku_base": "SKU",
      "descripcion": "descripción corregida si estaba vacía o mal redactada"
    }
  ],
  "warnings_adicionales": []`,
    `  "correcciones_productos": [
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
  "warnings_adicionales": []`
  );
  must(prepCode !== c0, 'prep-contrato');
  prep.parameters.jsCode = prepCode;
  checks.push(['prompt-validador', prepCode.includes('VALIDAR que los datos tengan sentido')]);

  // 3) Modelo pro
  const ana = wf.nodes.find((n) => n.name === 'OpenRouter Packing Analizador');
  const bodyStr = String(ana.parameters.jsonBody || '');
  must(bodyStr.includes(MODELO_VIEJO), 'modelo-actual');
  ana.parameters.jsonBody = bodyStr.split(MODELO_VIEJO).join(MODELO_NUEVO);
  checks.push(['modelo-pro', String(ana.parameters.jsonBody).includes(MODELO_NUEVO)]);

  // 4) Fusionar: propagar alertas + metadata modelo
  const fusion = wf.nodes.find((n) => n.name === 'Fusionar e Inteligencia');
  let fusionCode = String(fusion.parameters.jsCode || '');
  c0 = fusionCode;
  fusionCode = fusionCode.replace(
    '// 4. Registrar estado del proceso para el frontend de Next.js',
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
  must(fusionCode !== c0, 'fusion-alertas');
  c0 = fusionCode;
  fusionCode = fusionCode.replace(
    `original.metadata.ai_model = 'google/gemini-2.5-flash';`,
    `original.metadata.ai_model = '${MODELO_NUEVO}';`
  );
  must(fusionCode !== c0, 'fusion-modelo');
  fusion.parameters.jsCode = fusionCode;
  checks.push(['fusion-alertas', fusionCode.includes('alertas_calidad')]);

  // 5) Camino Jenny: detección en Normalizar + regla en Switch + lector + parser
  const normalizar = wf.nodes.find((n) => n.name === 'Normalizar archivo + ruta');
  let normCode = String(normalizar.parameters.jsCode || '');
  c0 = normCode;
  normCode = normCode.replace(
    `function cleanRoute(v) {`,
    `const RUTA_JENNY = 'jenny_multicolor_pack';
function cleanRoute(v) {`
  );
  must(normCode !== c0, 'norm-const');
  c0 = normCode;
  normCode = normCode.replace(
    `  if (s === 'tabla_bonnie' || /bonnie|tmb/.test(s)) return 'tabla_bonnie';`,
    `  if (s === RUTA_JENNY || s === 'jenny' || /jenny|beterlon|shishi/.test(s)) return RUTA_JENNY;
  if (s === 'tabla_bonnie' || /bonnie|tmb/.test(s)) return 'tabla_bonnie';`
  );
  must(normCode !== c0, 'norm-cleanroute');
  c0 = normCode;
  normCode = normCode.replace(
    `  if (s === 'general' || s === 'general_una_hoja' || s.includes('jenny') || s.includes('findakera') || s.includes('honton')) return 'general_una_hoja';`,
    `  if (s === 'general' || s === 'general_una_hoja' || s.includes('findakera') || s.includes('honton')) return 'general_una_hoja';`
  );
  must(normCode !== c0, 'norm-general');
  c0 = normCode;
  normCode = normCode.replace(
    `} else if (/bonnie|tmb|bo26/.test(signal)) {`,
    `} else if (/jenny|beterlon|shishi/.test(signal)) {
  ruta_final = RUTA_JENNY;
  metodo = 'nombre_o_proveedor';
} else if (/bonnie|tmb|bo26/.test(signal)) {`
  );
  must(normCode !== c0, 'norm-signal');
  normalizar.parameters.jsCode = normCode;
  checks.push(['norm-jenny', normCode.includes('jenny_multicolor_pack') && !normCode.includes("s.includes('jenny')")]);

  const sw = wf.nodes.find((n) => n.name === 'Seleccionar camino');
  if (!sw.parameters.rules.values.some((r) => r.outputKey === 'Jenny')) {
    sw.parameters.rules.values.push({
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [{
          leftValue: '={{ $json.ruta_final }}',
          rightValue: 'jenny_multicolor_pack',
          operator: { type: 'string', operation: 'equals' },
          id: 'jenny-route-switch-id',
        }],
        combinator: 'and',
      },
      renameOutput: true,
      outputKey: 'Jenny',
    });
    // El fallback ("extra") se recorre al índice 6: recablear
    const maze = wf.connections['Seleccionar camino'].main;
    must(Array.isArray(maze) && maze.length === 6, 'switch-outputs');
    maze.splice(5, 0, [{ node: 'Leer workbook Jenny', type: 'main', index: 0 }]);
  }
  checks.push(['switch-jenny', sw.parameters.rules.values.some((r) => r.outputKey === 'Jenny')]);

  if (!wf.nodes.some((n) => n.name === 'Leer workbook Jenny')) {
    const reader = wf.nodes.find((n) => n.name === 'Leer workbook completo excel-reader1');
    wf.nodes.push({
      id: crypto.randomUUID(),
      name: 'Leer workbook Jenny',
      type: reader.type,
      typeVersion: reader.typeVersion,
      position: [reader.position[0], reader.position[1] + 196],
      parameters: JSON.parse(JSON.stringify(reader.parameters)),
    });
  }
  checks.push(['reader-jenny', wf.nodes.some((n) => n.name === 'Leer workbook Jenny')]);

  if (!wf.nodes.some((n) => n.name === 'Parser Jenny multicolor-pack')) {
    wf.nodes.push({
      id: crypto.randomUUID(),
      name: 'Parser Jenny multicolor-pack',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [-1792, 4900],
      parameters: { jsCode: JENNY_JS },
    });
    wf.connections['Leer workbook Jenny'] = {
      main: [[{ node: 'Parser Jenny multicolor-pack', type: 'main', index: 0 }]],
    };
    wf.connections['Parser Jenny multicolor-pack'] = {
      main: [[{ node: 'Preparar Ollama', type: 'main', index: 0 }]],
    };
  }
  checks.push(['parser-jenny', wf.nodes.some((n) => n.name === 'Parser Jenny multicolor-pack')]);

  // 6) Cascada IA: flash siempre + escalado a PRO con alertas graves
  if (!wf.nodes.some((n) => n.name === '¿Escalar a PRO?')) {
    const openRouter = wf.nodes.find((n) => n.name === 'OpenRouter Packing Analizador');
    // El original vuelve a flash (rápido/barato); el clon PRO atiende escalados
    openRouter.parameters.jsonBody = String(openRouter.parameters.jsonBody).split(MODELO_NUEVO).join(MODELO_VIEJO);
    const ox = openRouter.position[0], oy = openRouter.position[1];
    wf.nodes.push({
      id: crypto.randomUUID(),
      name: '¿Escalar a PRO?',
      type: 'n8n-nodes-base.switch',
      typeVersion: 3.2,
      position: [ox + 256, oy],
      parameters: {
        rules: {
          values: [{
            conditions: {
              options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
              conditions: [{
                leftValue: "={{ ($json.alertas_calidad || []).filter(a => a.severidad === 'alta').length > 0 ? 'ESCALAR' : 'OK' }}",
                rightValue: 'ESCALAR',
                operator: { type: 'string', operation: 'equals' },
                id: 'escalar-pro-switch-id',
              }],
              combinator: 'and',
            },
            renameOutput: true,
            outputKey: 'Escalar',
          }],
        },
        options: { fallbackOutput: 'extra' },
      },
    });
    const proNode = JSON.parse(JSON.stringify(openRouter));
    proNode.id = crypto.randomUUID();
    proNode.name = 'OpenRouter Packing PRO';
    proNode.position = [ox + 512, oy - 96];
    proNode.parameters = JSON.parse(JSON.stringify(openRouter.parameters).split(MODELO_VIEJO).join(MODELO_NUEVO));
    // El clon hereda el body ya migrado a PRO por el paso 3; asegurar flash en el original
    wf.nodes.push(proNode);
    wf.connections['OpenRouter Packing Analizador'] = {
      main: [[{ node: '¿Escalar a PRO?', type: 'main', index: 0 }]],
    };
    wf.connections['¿Escalar a PRO?'] = {
      main: [
        [{ node: 'OpenRouter Packing PRO', type: 'main', index: 0 }],
        [{ node: 'Fusionar e Inteligencia', type: 'main', index: 0 }],
      ],
    };
    wf.connections['OpenRouter Packing PRO'] = {
      main: [[{ node: 'Fusionar e Inteligencia', type: 'main', index: 0 }]],
    };
    // Metadata honesta de la cascada (el paso 3 la había fijado a pro)
    const fusion2 = wf.nodes.find((n) => n.name === 'Fusionar e Inteligencia');
    let f2 = String(fusion2.parameters.jsCode || '');
    const f2c = f2;
    f2 = f2.replace(
      `original.metadata.ai_model = '${MODELO_NUEVO}';`,
      `original.metadata.ai_model = 'cascada-flash-pro';`
    );
    must(f2 !== f2c, 'fusion-modelo-cascada');
    fusion2.parameters.jsCode = f2;
  }
  checks.push(['cascada-ia', wf.nodes.some((n) => n.name === '¿Escalar a PRO?')]);
  checks.push(['flash-original', String(wf.nodes.find((n) => n.name === 'OpenRouter Packing Analizador').parameters.jsonBody).includes(MODELO_VIEJO)]);
  checks.push(['pro-clon', String(wf.nodes.find((n) => n.name === 'OpenRouter Packing PRO').parameters.jsonBody).includes(MODELO_NUEVO)]);

  fs.writeFileSync(OUT, JSON.stringify(wf, null, 2));
  console.log(`Nodos: ${wf.nodes.length}`);
  for (const [k, v] of checks) console.log(`- ${k}: ${v ? 'OK' : 'FALLO'}`);
  if (checks.some(([, v]) => !v)) throw new Error('Verificación fallida.');
  console.log(`Archivo completo en: ${OUT}`);
}

main();
