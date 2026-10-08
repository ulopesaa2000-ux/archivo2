// scripts/n8n/updates/update_n8n_moti_split.js
// Fase 1: Parser MOTI + IA solo NOTIFICAN pegados (sku_conjoinado_dudoso,
// pack_duplicado_dudoso) via warnings + separacion_sugerida. NO auto-dividen.
// Parche quirurgico de 3 nodos con anclas estrictas + backup + verificacion.
// Uso:
//   node scripts/n8n/updates/update_n8n_moti_split.js --local <workflow.json>   (preview sin subir)
//   node scripts/n8n/updates/update_n8n_moti_split.js --apply                   (sube a n8n)

const fs = require('fs');
const path = require('path');

const API_BASE = process.env.N8N_API_BASE || 'https://n8n.sistemaindumentaria.com/api/v1';
const WORKFLOW_ID = process.env.N8N_WORKFLOW_ID || '9XsVokBIW5HW3Pe-XP66f';
let API_KEY = process.env.N8N_API_KEY || process.env.N8N_PUBLIC_API_KEY || '';
if (!API_KEY) {
  try {
    const dotenv = require('dotenv');
    for (const p of [path.resolve('.env.local'), path.resolve(__dirname, '../../../.env.local')]) {
      if (fs.existsSync(p)) {
        const parsed = dotenv.parse(fs.readFileSync(p));
        if (parsed.N8N_API_KEY) { API_KEY = parsed.N8N_API_KEY; break; }
        if (parsed.N8N_PUBLIC_API_KEY) { API_KEY = parsed.N8N_PUBLIC_API_KEY; break; }
      }
    }
  } catch (e) {}
}

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : def;
}
const APPLY = process.argv.includes('--apply');
const LOCAL = arg('local', null);

function mustReplaced(before, after, label) {
  if (before === after) throw new Error('Ancla no encontrada (workflow intacto): ' + label);
  return after;
}

// ---------- PATCH A: Parser MOTI bloques (deteccion sin division) ----------
// A0: bug preexistente — /ttl(ctns)/ nunca coincide con "TTL(ctns)" (parentesis sin escapar).
// La fila TTL creaba una caja fantasma (filtrada despues, pero contaminaba conteos).
const A0a_OLD = '      if (/ttl(ctns)|ttl ctns|ctn\\s*size/.test(c0)) { ttlIdx = r; break; }';
const A0a_NEW = '      if (/ttl\\s*\\(?ctns\\)?|ctn\\s*size/.test(c0)) { ttlIdx = r; break; }';
const A0b_OLD = '      if (/ttl(ctns)|ttl ctns|total|ctn\\s*size|ctn\\s*w\\/?t/i.test(c0Text)) continue;';
const A0b_NEW = '      if (/ttl\\s*\\(?ctns\\)?|total|ctn\\s*size|ctn\\s*w\\/?t/i.test(c0Text)) continue;';
const A1a_OLD = '    // Recolectar metadatos del bloque (un bloque MOTI = 1 producto)\n    const skusEnBloque = [];';
const A1a_NEW = '    // Recolectar metadatos del bloque (un bloque MOTI = 1 producto; v1.1-detect: si hay 2+ AND se NOTIFICA, no se divide)\n    const skusEnBloque = [];\n    const skuApariciones = [];\n    const packsVistosBloque = [];';

const A1b_OLD = [
  '    for (let r = subIdx + 1; r < ttlIdx; r++) {',
  '      const row = rawRows[r];',
  '      const styleText = rawCellText(row, map.styleIdx);',
  '      if (looksLikeMotiSku(styleText) && !skusEnBloque.includes(styleText)) {',
  '        skusEnBloque.push(styleText);',
  '      }',
].join('\n');
const A1b_NEW = [
  '    for (let r = subIdx + 1; r < ttlIdx; r++) {',
  '      const row = rawRows[r];',
  '      const styleText = rawCellText(row, map.styleIdx);',
  '      if (looksLikeMotiSku(styleText)) {',
  '        if (!skusEnBloque.includes(styleText)) skusEnBloque.push(styleText);',
  '        skuApariciones.push({ sku: styleText, fila: r + 1 + (cfg.__row_offset || 0), carton: rawCellText(row, map.cartonIdx), ctns: firstNum(rawCell(row, map.ctnsIdx)) });',
  '      }',
  '      if (isPackLabel(styleText)) packsVistosBloque.push({ pack: normalizePack(styleText), fila: r + 1 + (cfg.__row_offset || 0), carton: rawCellText(row, map.cartonIdx) });',
].join('\n');

const A2_OLD = [
  '    const skuBloque = buildUnifiedMotiSku(skusEnBloque);',
  '    const skuRawBloque = skuBloque;',
].join('\n');
const A2_NEW = [
  '    const skuBloque = buildUnifiedMotiSku(skusEnBloque);',
  '    const skuRawBloque = skuBloque;',
  '    // v1.1-detect Fase 1: NOTIFICAR pegados multi-producto sin dividir cajas ni SKUs',
  '    const andTokensBloque = [...new Set(skusEnBloque.map(function (s) { return String(s || "").trim(); }).filter(function (s) { return /^AND\\d+$/i.test(s); }).map(function (s) { return s.toUpperCase(); }))];',
  '    const secTokensBloque = [...new Set(skusEnBloque.map(function (s) { return String(s || "").trim(); }).filter(function (s) { return /^(3JA|3VT|1AK|1VT)\\d+$/i.test(s); }).map(function (s) { return s.toUpperCase(); }))];',
  '    let separacionBloque = null;',
  '    if (andTokensBloque.length >= 2 || secTokensBloque.length >= 2) {',
  '      const candidatosBloque = andTokensBloque.map(function (andSku, idx) {',
  '        const secSku = secTokensBloque[idx] || secTokensBloque[0] || null;',
  '        const apar = skuApariciones.filter(function (a) { return a.sku.toUpperCase() === andSku || (secSku && a.sku.toUpperCase() === secSku); });',
  '        return { sku_base: andSku, alias: secSku, filas: apar.map(function (a) { return a.fila; }), cartones: apar.map(function (a) { return a.carton; }).filter(function (x) { return !!x; }) };',
  '      });',
  '      warnings.push({ tipo: "sku_conjoinado_dudoso", severidad: "alta", sku_base: skuBloque, detalle: "Bloque con " + andTokensBloque.length + " AND distintos (" + andTokensBloque.join(", ") + ") y " + secTokensBloque.length + " secundarios (" + secTokensBloque.join(", ") + "). Posibles productos: " + candidatosBloque.map(function (c) { return c.sku_base; }).join(" + ") + ". Revisar y separar en interfaz (Fase 2).", header_row: headerIdx + 1 + (cfg.__row_offset || 0), skus_detectados: skusEnBloque.slice(), productos_candidatos: candidatosBloque.map(function (c) { return c.sku_base; }) });',
  '      separacionBloque = { tipo: "sku_conjoinado_dudoso", sku_base_original: skuBloque, header_row: headerIdx + 1 + (cfg.__row_offset || 0), productos_candidatos: candidatosBloque, packs_candidatos: [], cajas_para_revisar: [], confianza: "alta", motivo: "Bloque con " + andTokensBloque.length + " AND distintos (" + andTokensBloque.join(", ") + "); se deja junto y se notifica." };',
  '      separacionesSugeridas.push(separacionBloque);',
  '    }',
  '    const packsExplBloque = packsVistosBloque.filter(function (p) { return p.pack !== "PACK UNICO"; });',
  '    const nombresPackBloque = [...new Set(packsExplBloque.map(function (p) { return p.pack; }))];',
  '    for (const nmPack of nombresPackBloque) {',
  '      const cartonesPack = [...new Set(packsExplBloque.filter(function (p) { return p.pack === nmPack; }).map(function (p) { return p.carton; }).filter(function (x) { return !!x; }))];',
  '      if (cartonesPack.length >= 2) {',
  '        warnings.push({ tipo: "pack_duplicado_dudoso", severidad: "media", sku_base: skuBloque, detalle: "Pack " + nmPack + " aparece en " + cartonesPack.length + " rangos de carton distintos (" + cartonesPack.join(", ") + "). Si es error de dedo (ej. PACK A vs PACK B), dividir/renombrar en interfaz.", header_row: headerIdx + 1 + (cfg.__row_offset || 0), pack: nmPack, cartones: cartonesPack });',
  '        if (separacionBloque) separacionBloque.packs_candidatos.push({ nombre_actual: nmPack, sugerido: nmPack, cartones: cartonesPack });',
  '        else separacionesSugeridas.push({ tipo: "pack_duplicado_dudoso", sku_base_original: skuBloque, header_row: headerIdx + 1 + (cfg.__row_offset || 0), productos_candidatos: [], packs_candidatos: [{ nombre_actual: nmPack, sugerido: nmPack, cartones: cartonesPack }], cajas_para_revisar: [], confianza: "media", motivo: "Mismo pack en rangos distintos." });',
  '      }',
  '    }',
].join('\n');

const A3_OLD = '    blockSummaries.push({ header_row: headerIdx + 1 + (cfg.__row_offset || 0), cajas_detectadas: blockBoxes.length, total_ctns_bloque: meta.total_ctns, total_pcs_bloque: meta.total_pcs, total_cbm_bloque: meta.total_cbm, total_gw_bloque: meta.total_gw });';
const A3_NEW = '    if (separacionBloque) separacionBloque.cajas_para_revisar = blockCajaCodes.slice();\n    blockSummaries.push({ header_row: headerIdx + 1 + (cfg.__row_offset || 0), cajas_detectadas: blockBoxes.length, total_ctns_bloque: meta.total_ctns, total_pcs_bloque: meta.total_pcs, total_cbm_bloque: meta.total_cbm, total_gw_bloque: meta.total_gw, skus_detectados: skusEnBloque.slice(), posible_pegado: !!separacionBloque });';

const A4_OLD = '  let boxSeq = 0;';
const A4_NEW = '  let boxSeq = 0;\n  const separacionesSugeridas = [];';

const A5_OLD = '    warnings,\n    nextjs_tabs: { productos_count: productos.length, cajas_count: cajas.length, detalles_count: detalles.length, warnings_count: warnings.length }';
const A5_NEW = '    warnings,\n    separacion_sugerida: separacionesSugeridas,\n    nextjs_tabs: { productos_count: productos.length, cajas_count: cajas.length, detalles_count: detalles.length, warnings_count: warnings.length }';

const A6_OLD = "version_parser: 'mvp-n8n-code-v1.0-selector-general-moti-jackie-venkat',";
const A6_NEW = "version_parser: 'mvp-n8n-code-v1.1-moti-detect-pegados',";

// ---------- PATCH B: Preparar Ollama ----------
const B1_OLD = '3. Si un producto tiene alias en sku_raw (ej: "1AK7986 / AND260007") o descripción incompleta, mantener exactamente el sku_base y devolver la descripción refinada en español claro.';
const B1_NEW = B1_OLD + '\n\n6. DETECTAR PEGADOS (rol auditor, NO reescribas SKUs ni muevas cajas):\n   - Si un sku_base contiene 2+ codigos AND distintos (ej "AND260030 ... AND260029") o 2+ secundarios distintos (ej "3JA8969 ... 3JA8970"), es "sku_conjoinado_dudoso": el parser lo dejo junto a proposito y el humano lo separara en el wizard.\n   - Si el mismo nombre_pack aparece en rangos de carton distintos (ej PACK B en "1--70" y en "1--72"), es "pack_duplicado_dudoso" (posible error de dedo PACK A vs PACK B).\n   - NO propongas reasignar cajas ni crear productos: solo describe en "separacion_sugerida" (array; [] si no hay pegados) con { "tipo", "sku_base_original", "productos_candidatos": [{ "sku_base", "alias" }], "cajas_para_revisar": [], "confianza": "alta|media", "motivo" }.\n   - Ademas agrega el hallazgo a "alertas_calidad" (alta para SKU, media para packs).';

const B2_OLD = '  "warnings_adicionales": []';
const B2_NEW = [
  '  "separacion_sugerida": [',
  '    {',
  '      "tipo": "sku_conjoinado_dudoso",',
  '      "sku_base_original": "SKU conjunto tal como viene",',
  '      "productos_candidatos": [{ "sku_base": "AND260030", "alias": "3JA8969" }],',
  '      "cajas_para_revisar": [],',
  '      "confianza": "alta",',
  '      "motivo": "por que parece pegado"',
  '    }',
  '  ],',
  '  "warnings_adicionales": []',
].join('\n');

// ---------- PATCH C: Fusionar e Inteligencia ----------
const C1_OLD = '// 4. Registrar estado del proceso para el frontend de Next.js';
const C1_NEW = [
  '// 3c. Detector de pegados Fase 1 (notifica, no reescribe cajas ni SKUs)',
  'const extraerAnds = (s) => [...new Set((String(s || "").match(/AND\\d+/gi) || []).map((x) => x.toUpperCase()))];',
  'const extraerSecs = (s) => [...new Set((String(s || "").match(/(3JA|3VT|1AK|1VT)\\d+/gi) || []).map((x) => x.toUpperCase()))];',
  'if (Array.isArray(aiData.separacion_sugerida) && aiData.separacion_sugerida.length > 0) {',
  '  original.separacion_sugerida = aiData.separacion_sugerida;',
  '  for (const sg of aiData.separacion_sugerida) {',
  '    (original.warnings = original.warnings || []).push({ tipo: sg.tipo || "sku_conjoinado_dudoso", severidad: "alta", sku_base: sg.sku_base_original || null, codigo_caja_temporal: null, detalle: "IA: " + (sg.motivo || "posible pegado, separar en interfaz") });',
  '  }',
  '} else {',
  '  const hallados = [];',
  '  for (const p of (original.productos_para_editar || [])) {',
  '    const a = extraerAnds(p.sku_base); const s2 = extraerSecs(p.sku_base);',
  '    if (a.length >= 2 || s2.length >= 2) hallados.push({ sku: p.sku_base, ands: a, secs: s2 });',
  '  }',
  '  if (hallados.length > 0) {',
  '    if (!Array.isArray(original.separacion_sugerida)) original.separacion_sugerida = [];',
  '    for (const h of hallados) {',
  '      (original.warnings = original.warnings || []).push({ tipo: "sku_conjoinado_dudoso", severidad: "alta", sku_base: h.sku, codigo_caja_temporal: null, detalle: "Fallback: contiene " + h.ands.length + " AND (" + h.ands.join(", ") + ") y " + h.secs.length + " secundarios (" + h.secs.join(", ") + "). Separar en interfaz (Fase 2)." });',
  '      original.separacion_sugerida.push({ tipo: "sku_conjoinado_dudoso", sku_base_original: h.sku, header_row: null, productos_candidatos: h.ands.map((andSku) => ({ sku_base: andSku, alias: null })), packs_candidatos: [], cajas_para_revisar: (original.cajas_para_editar || []).filter((c) => String(c.sku_base || "") === String(h.sku || "")).map((c) => c.codigo_caja_temporal), confianza: "alta", motivo: "Fallback determinista en Fusionar (IA sin propuesta).", fuente: "fallback_fusionar" });',
  '    }',
  '  } else if (!Array.isArray(original.separacion_sugerida)) { original.separacion_sugerida = []; }',
  '}',
  '',
  '// 4. Registrar estado del proceso para el frontend de Next.js',
].join('\n');

const C2_OLD = 'original.metadata.colors_translated = Object.keys(colorMap).length;';
const C2_NEW = 'original.metadata.colors_translated = Object.keys(colorMap).length;\noriginal.metadata.requiere_revision_manual = (original.warnings || []).some((w) => w.tipo === "sku_conjoinado_dudoso" || w.tipo === "pack_duplicado_dudoso");\noriginal.metadata.ai_split_aplicado = false;';

function patchParser(code) {
  let c = code;
  c = mustReplaced(c, c.split(A0a_OLD).join(A0a_NEW), 'A0a-ttl-boundary');
  c = mustReplaced(c, c.split(A0b_OLD).join(A0b_NEW), 'A0b-ttl-skip');
  c = mustReplaced(c, c.split(A4_OLD).join(A4_NEW), 'A4-separacionesSugeridas');
  c = mustReplaced(c, c.split(A1a_OLD).join(A1a_NEW), 'A1a-declaraciones');
  c = mustReplaced(c, c.split(A1b_OLD).join(A1b_NEW), 'A1b-apariciones');
  c = mustReplaced(c, c.split(A2_OLD).join(A2_NEW), 'A2-deteccion');
  c = mustReplaced(c, c.split(A3_OLD).join(A3_NEW), 'A3-cajasParaRevisar');
  c = mustReplaced(c, c.split(A5_OLD).join(A5_NEW), 'A5-return-separacion');
  c = mustReplaced(c, c.split(A6_OLD).join(A6_NEW), 'A6-version');
  return c;
}

function patchPreparar(code) {
  let c = code;
  c = mustReplaced(c, c.split(B1_OLD).join(B1_NEW), 'B1-regla6');
  c = mustReplaced(c, c.split(B2_OLD).join(B2_NEW), 'B2-contrato');
  return c;
}

function patchFusionar(code) {
  let c = code;
  c = mustReplaced(c, c.split(C1_OLD).join(C1_NEW), 'C1-detector');
  c = mustReplaced(c, c.split(C2_OLD).join(C2_NEW), 'C2-metadata');
  return c;
}

function checkSyntax(label, code) {
  try {
    new Function('$input', '$', code);
  } catch (e) {
    throw new Error('Sintaxis invalida en ' + label + ': ' + e.message);
  }
}

async function api(method, apiPath, body) {
  const payload = body ? JSON.stringify(body) : null;
  const res = await fetch(API_BASE + apiPath, {
    method,
    headers: {
      'X-N8N-API-KEY': API_KEY,
      Accept: 'application/json',
      ...(payload ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(payload ? { body: payload } : {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(method + ' ' + apiPath + ' -> HTTP ' + res.status + ': ' + text.slice(0, 300));
  return text ? JSON.parse(text) : null;
}

function getNode(wf, name) {
  const n = wf.nodes.find((n) => n.name === name);
  if (!n) throw new Error('Nodo no encontrado: ' + name);
  return n;
}

async function main() {
  let wf;
  if (LOCAL) {
    wf = JSON.parse(fs.readFileSync(path.resolve(LOCAL), 'utf8'));
    console.log('1. Workflow cargado local: ' + wf.name + ' (' + wf.nodes.length + ' nodos)');
  } else {
    if (!API_KEY) throw new Error('Falta N8N_API_KEY para descargar el workflow (usa --local o define la key)');
    console.log('1. Descargando workflow en vivo ' + WORKFLOW_ID + '...');
    wf = await api('GET', '/workflows/' + WORKFLOW_ID);
    console.log('   Workflow: "' + wf.name + '" (' + wf.nodes.length + ' nodos)');
  }

  const parserNode = getNode(wf, 'Parser MOTI bloques');
  const prepNode = getNode(wf, 'Preparar Ollama');
  const fusionNode = getNode(wf, 'Fusionar e Inteligencia');

  console.log('2. Aplicando parches Fase 1...');
  parserNode.parameters.jsCode = patchParser(String(parserNode.parameters.jsCode || ''));
  console.log('   - Parser MOTI bloques: OK (v1.1-detect)');
  prepNode.parameters.jsCode = patchPreparar(String(prepNode.parameters.jsCode || ''));
  console.log('   - Preparar Ollama: OK (regla 6 + contrato separacion_sugerida)');
  fusionNode.parameters.jsCode = patchFusionar(String(fusionNode.parameters.jsCode || ''));
  console.log('   - Fusionar e Inteligencia: OK (detector 3c + metadata)');

  console.log('3. Validando sintaxis...');
  checkSyntax('Parser MOTI bloques', parserNode.parameters.jsCode);
  checkSyntax('Preparar Ollama', prepNode.parameters.jsCode);
  checkSyntax('Fusionar e Inteligencia', fusionNode.parameters.jsCode);
  console.log('   Sintaxis OK en los 3 nodos.');

  const prevDir = path.resolve('C:/Users/uriel/AppData/Local/Temp/opencode/moti_fase1_preview');
  fs.mkdirSync(prevDir, { recursive: true });
  fs.writeFileSync(path.join(prevDir, 'parser_moti_patched.js'), parserNode.parameters.jsCode);
  fs.writeFileSync(path.join(prevDir, 'preparar_ollama_patched.js'), prepNode.parameters.jsCode);
  fs.writeFileSync(path.join(prevDir, 'fusionar_patched.js'), fusionNode.parameters.jsCode);
  console.log('4. Preview guardado en: ' + prevDir);

  if (!APPLY) {
    console.log('5. Dry-run: sin --apply no se sube nada. Verifica el preview y corre:');
    console.log('   node scripts/n8n/tests/test_moti_separacion_15-2026.js --mode patched --parser-file <preview>/parser_moti_patched.js');
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.resolve('scripts/backups', 'n8n_prefill_' + stamp);
  fs.mkdirSync(backupDir, { recursive: true });
  const live = await api('GET', '/workflows/' + WORKFLOW_ID);
  fs.writeFileSync(path.join(backupDir, WORKFLOW_ID + '_antes-moti-fase1.json'), JSON.stringify(live, null, 2));
  console.log('5. Respaldo fresco en: ' + backupDir);

  console.log('6. Subiendo workflow parchado...');
  await api('PUT', '/workflows/' + WORKFLOW_ID, {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || {},
  });
  const check = await api('GET', '/workflows/' + WORKFLOW_ID);
  const pOk = String(check.nodes.find((n) => n.name === 'Parser MOTI bloques').parameters.jsCode || '').includes('sku_conjoinado_dudoso');
  const prOk = String(check.nodes.find((n) => n.name === 'Preparar Ollama').parameters.jsCode || '').includes('separacion_sugerida');
  const fOk = String(check.nodes.find((n) => n.name === 'Fusionar e Inteligencia').parameters.jsCode || '').includes('ai_split_aplicado');
  console.log('   Parser detecta: ' + pOk + ' | Prompt con separacion: ' + prOk + ' | Fusionar con flags: ' + fOk);
  if (!pOk || !prOk || !fOk) throw new Error('Verificacion fallida tras PUT.');
  console.log('LISTO: Fase 1 aplicada y verificada en n8n.');
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
