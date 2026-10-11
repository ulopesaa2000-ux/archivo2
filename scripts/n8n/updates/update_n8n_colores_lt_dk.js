// scripts/n8n/updates/update_n8n_colores_lt_dk.js
// Colores: modificadores genericos claro/oscuro (LT/DK/L/D/LIGHT/DARK +
// CLARO/OSCURO) en prompt IA + lookups insensibles en Fusionar.
// Idempotente: si un parche ya existe, se omite. Sin --apply no sube nada.
// Uso:
//   node scripts/n8n/updates/update_n8n_colores_lt_dk.js --local <workflow.json>
//   node scripts/n8n/updates/update_n8n_colores_lt_dk.js --apply

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
  return i !== -1 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith('--') ? process.argv[i + 1] : def;
}
const APPLY = process.argv.includes('--apply');
const LOCAL = arg('local', null);

function mustReplaced(before, after, label) {
  if (before === after) throw new Error('Ancla no encontrada (workflow intacto): ' + label);
  return after;
}

// ---------- PATCH B4: Preparar Ollama (regla generica claro/oscuro) ----------
const B4_OLD = '   Manten ADEMAS el diccionario clasico "translation_map.colores" {RAW: ES} para compatibilidad.';
const B4_NEW = [
  '   Manten ADEMAS el diccionario clasico "translation_map.colores" {RAW: ES} para compatibilidad.',
  '   MODIFICADORES CLARO/OSCURO (genericos, aplican a CUALQUIER base, no solo a la paleta de arriba):',
  '   prefijos EN LT, DK, L., D., LIGHT, DARK (con o sin punto: "LT BLUE", "D.GREY") y sufijos ES',
  '   CLARO, CLARA, OSCURO, OSCURA, OBSCURO, OBSCURA ("AZUL CLARO", "VERDE OBSCURO") se normalizan a',
  '   LIGHT/DARK + base en "en" (ej "LT BLUE"->"LIGHT BLUE", "AZUL CLARO"->"LIGHT BLUE") y a "BASE CLARO/OSCURO"',
  '   en "es" (ej "AZUL CLARO"). OJO: palabras completas como DENIM o DEEP no llevan modificador.',
  '   Las claves de "translation_map.colores" deben copiar el raw TAL CUAL viene del packing',
  '   (respetando sus mayusculas/minusculas), sin normalizar la llave.',
].join('\n');

// ---------- PATCH C4: Fusionar (lookups + dedup insensibles) ----------
const C4a_OLD = 'const corrections = aiData.correcciones_productos || [];';
const C4a_NEW = [
  'const corrections = aiData.correcciones_productos || [];',
  '// Normalizacion de llaves de color: case + acentos + espacios (evita que',
  '// "BLACK"/"black" o "Cafe Claro"/"CAFE CLARO" se traten como distintos).',
  'const normColorKey = (s) => String(s || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toUpperCase().replace(/\\s+/g, " ").trim();',
  'const colorMapNorm = {};',
  'for (const [k, v] of Object.entries(colorMap || {})) { const nk = normColorKey(k); if (!(nk in colorMapNorm)) colorMapNorm[nk] = v; }',
  'const tradColor = (raw) => colorMapNorm[normColorKey(raw)];',
].join('\n');

const C4b_OLD = [
  '    if (d.color_raw && colorMap[d.color_raw]) {',
  '      d.color_raw = colorMap[d.color_raw];',
].join('\n');
const C4b_NEW = [
  '    if (d.color_raw && tradColor(d.color_raw)) {',
  '      d.color_raw = tradColor(d.color_raw);',
].join('\n');

const C4c_OLD = "      c.colores = c.colores.split('|').map(col => colorMap[col] || col).join('|');";
const C4c_NEW = "      c.colores = c.colores.split('|').map(col => tradColor(col) || col).join('|');";

const C4d_OLD = 'const cubiertos = new Set(Object.keys(colorMap || {}).map((k) => String(k).toUpperCase()));';
const C4d_NEW = 'const cubiertos = new Set([...Object.keys(colorMapNorm || {}), ...Object.values(colorMap || {}).map((v) => normColorKey(v))]);';

const C4e_OLD = 'for (const t of tripletesColor) { if (t && t.raw != null) cubiertos.add(String(t.raw).toUpperCase()); }';
const C4e_NEW = 'for (const t of tripletesColor) { if (t && t.raw != null) cubiertos.add(normColorKey(t.raw)); }';

const C4f_OLD = [
  '  const raw = String(d.color_raw || "").trim();',
  '  if (!raw || cubiertos.has(raw.toUpperCase())) continue;',
  '  if (!porConfirmar.has(raw)) porConfirmar.set(raw, new Set());',
  '  if (d.codigo_caja_temporal) porConfirmar.get(raw).add(d.codigo_caja_temporal);',
].join('\n');
const C4f_NEW = [
  '  const raw = String(d.color_raw || "").trim();',
  '  const rawKey = normColorKey(raw);',
  '  if (!raw || cubiertos.has(rawKey)) continue;',
  '  if (!porConfirmar.has(rawKey)) porConfirmar.set(rawKey, { raw, boxes: new Set() });',
  '  if (d.codigo_caja_temporal) porConfirmar.get(rawKey).boxes.add(d.codigo_caja_temporal);',
].join('\n');

const C4g_OLD = 'const vistosConf = new Set(original.colores_por_confirmar.map((x) => String(x.raw || "").toUpperCase()));';
const C4g_NEW = 'const vistosConf = new Set(original.colores_por_confirmar.map((x) => normColorKey(x.raw || "")));';

const C4h_OLD = '  const k = String((t && t.raw) || "").toUpperCase();';
const C4h_NEW = '  const k = normColorKey((t && t.raw) || "");';

const C4i_OLD = [
  'for (const [raw, boxes] of porConfirmar) {',
  '  (original.warnings = original.warnings || []).push({ tipo: "color_por_confirmar", severidad: "media", sku_base: null, codigo_caja_temporal: null, detalle: "Color \\"" + raw + "\\" sin traduccion IA. Verificar match en catalogo o crearlo en paso 4 (Fase 2).", color_raw: raw });',
  '  if (!vistosConf.has(raw.toUpperCase())) { vistosConf.add(raw.toUpperCase()); original.colores_por_confirmar.push({ raw: raw, en: null, es: null, cajas: [...boxes].slice(0, 25), fuente: "fallback_fusionar" }); }',
  '}',
].join('\n');
const C4i_NEW = [
  'for (const [rawKey, entry] of porConfirmar) {',
  '  const raw = entry.raw;',
  '  const boxes = entry.boxes;',
  '  (original.warnings = original.warnings || []).push({ tipo: "color_por_confirmar", severidad: "media", sku_base: null, codigo_caja_temporal: null, detalle: "Color \\"" + raw + "\\" sin traduccion IA. Verificar match en catalogo o crearlo en paso 4 (Fase 2).", color_raw: raw });',
  '  if (!vistosConf.has(rawKey)) { vistosConf.add(rawKey); original.colores_por_confirmar.push({ raw: raw, en: null, es: null, cajas: [...boxes].slice(0, 25), fuente: "fallback_fusionar" }); }',
  '}',
].join('\n');

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
    if (!API_KEY) throw new Error('Falta N8N_API_KEY (usa --local o define la key)');
    console.log('1. Descargando workflow en vivo ' + WORKFLOW_ID + '...');
    wf = await api('GET', '/workflows/' + WORKFLOW_ID);
    console.log('   Workflow: "' + wf.name + '" (' + wf.nodes.length + ' nodos)');
  }

  console.log('2. Aplicando parches colores LT/DK...');
  const prepNode = getNode(wf, 'Preparar Ollama');
  let prepCode = String(prepNode.parameters.jsCode || '');
  if (prepCode.includes('MODIFICADORES CLARO/OSCURO')) {
    console.log('   - Preparar Ollama: regla ya presente, sin cambios.');
  } else {
    prepNode.parameters.jsCode = mustReplaced(prepCode, prepCode.split(B4_OLD).join(B4_NEW), 'B4-modificadores');
    console.log('   - Preparar Ollama: regla claro/oscuro OK.');
  }

  const fusionNode = getNode(wf, 'Fusionar e Inteligencia');
  let fusionCode = String(fusionNode.parameters.jsCode || '');
  if (fusionCode.includes('normColorKey')) {
    console.log('   - Fusionar: normalizacion ya presente, sin cambios.');
  } else {
    if (!fusionCode.includes('// 3a2. Colores: propagar tripletes IA')) {
      throw new Error('Fusionar sin bloque C3 previo: corre update_n8n_jenny_17.js primero.');
    }
    fusionCode = mustReplaced(fusionCode, fusionCode.split(C4a_OLD).join(C4a_NEW), 'C4a-helper');
    fusionCode = mustReplaced(fusionCode, fusionCode.split(C4b_OLD).join(C4b_NEW), 'C4b-detalles');
    fusionCode = mustReplaced(fusionCode, fusionCode.split(C4c_OLD).join(C4c_NEW), 'C4c-cajas');
    fusionCode = mustReplaced(fusionCode, fusionCode.split(C4d_OLD).join(C4d_NEW), 'C4d-cubiertos');
    fusionCode = mustReplaced(fusionCode, fusionCode.split(C4e_OLD).join(C4e_NEW), 'C4e-tripletes');
    fusionCode = mustReplaced(fusionCode, fusionCode.split(C4f_OLD).join(C4f_NEW), 'C4f-porconfirmar');
    fusionCode = mustReplaced(fusionCode, fusionCode.split(C4g_OLD).join(C4g_NEW), 'C4g-vistos');
    fusionCode = mustReplaced(fusionCode, fusionCode.split(C4h_OLD).join(C4h_NEW), 'C4h-triplete-key');
    fusionCode = mustReplaced(fusionCode, fusionCode.split(C4i_OLD).join(C4i_NEW), 'C4i-warnings');
    fusionNode.parameters.jsCode = fusionCode;
    console.log('   - Fusionar: lookups + dedup insensibles OK.');
  }

  console.log('3. Validando sintaxis...');
  checkSyntax('Preparar Ollama', String(getNode(wf, 'Preparar Ollama').parameters.jsCode || ''));
  checkSyntax('Fusionar e Inteligencia', String(getNode(wf, 'Fusionar e Inteligencia').parameters.jsCode || ''));
  console.log('   Sintaxis OK en los 2 nodos.');

  const prevDir = path.resolve('C:/Users/uriel/AppData/Local/Temp/opencode/colores_ltdk_preview');
  fs.mkdirSync(prevDir, { recursive: true });
  fs.writeFileSync(path.join(prevDir, 'preparar_ollama_patched.js'), String(getNode(wf, 'Preparar Ollama').parameters.jsCode || ''));
  fs.writeFileSync(path.join(prevDir, 'fusionar_patched.js'), String(getNode(wf, 'Fusionar e Inteligencia').parameters.jsCode || ''));
  console.log('4. Preview guardado en: ' + prevDir);

  if (!APPLY) {
    console.log('5. Dry-run: sin --apply no se sube nada.');
    return;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.resolve('scripts/backups', 'n8n_prefill_' + stamp);
  fs.mkdirSync(backupDir, { recursive: true });
  const live = await api('GET', '/workflows/' + WORKFLOW_ID);
  fs.writeFileSync(path.join(backupDir, WORKFLOW_ID + '_antes-colores-ltdk.json'), JSON.stringify(live, null, 2));
  console.log('5. Respaldo fresco en: ' + backupDir);

  console.log('6. Subiendo workflow parchado...');
  await api('PUT', '/workflows/' + WORKFLOW_ID, {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || {},
  });
  const check = await api('GET', '/workflows/' + WORKFLOW_ID);
  const pOk = String(check.nodes.find((n) => n.name === 'Preparar Ollama').parameters.jsCode || '').includes('MODIFICADORES CLARO/OSCURO');
  const fOk = String(check.nodes.find((n) => n.name === 'Fusionar e Inteligencia').parameters.jsCode || '').includes('normColorKey');
  console.log('   Prompt modificadores: ' + pOk + ' | Fusionar insensible: ' + fOk);
  if (!pOk || !fOk) throw new Error('Verificacion fallida tras PUT.');
  console.log('LISTO: colores LT/DK aplicado y verificado en n8n.');
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
