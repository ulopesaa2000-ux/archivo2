// scripts/n8n/updates/update_n8n_jenny_17.js
// Fase intermedia: Jenny v2.1 (continuacion fusionada + colores) + IA
// (paleta Jenny + contrato raw/en/es + color_por_confirmar en Fusionar).
// Idempotente: si un parche ya existe, se omite. Sin --apply no sube nada.
// Uso:
//   node scripts/n8n/updates/update_n8n_jenny_17.js --local <workflow.json>
//   node scripts/n8n/updates/update_n8n_jenny_17.js --apply

const fs = require('fs');
const path = require('path');
const { JENNY_JS } = require('./jenny_parser_code.js');

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

// ---------- PATCH B3: Preparar Ollama (paleta Jenny + tripletes) ----------
const B3a_OLD = '2. Traducir/Estandarizar códigos de tallas';
const B3a_NEW = [
  '2b. COLORES CON DOBLE LLAVE raw/en/es (aplica a cualquier proveedor, en especial JENNY/SHISHI):',
  '   Para CADA color_raw distinto visto en productos/cajas/detalles devuelve un objeto { "raw": tal cual viene, "en": ingles canonico en MAYUSCULAS para matchear nombre_intern, "es": español sugerido para nombre }.',
  '   Canonicos EN -> ES sugerido: BLACK->Negro, NAVY->Marino, GREEN->Verde, CHOCOLATE->Chocolate, RED->Rojo, BRONZE->Bronce, PURPURA->PURPLE->Morado, ROSE->PINK->Rosa, CAFE/CAFÉ->BROWN->Café, LT BEIGE->LIGHT BEIGE->Beige Claro, BEIGE 04->BEIGE->Beige, PETROL y PATROL->PETROL->Petróleo, DENIM->DENIM->Denim, DK WINE->DARK WINE->Vino Tinto, VERDE MILITARY->MILITARY GREEN->Verde Militar, PIEDRA->STONE->Piedra, COFFEE->COFFEE->Café, CAMEL->CAMEL->Camel, TOBACCO->TOBACCO->Tabaco, HUNTER->HUNTER GREEN->Verde Cazador.',
  '   Si el raw ya es español valido (NEGRO, CAFE, BEIGE), repitelo en "es" y pon su equivalente ingles en "en". Si parece typo (PURPUPA->PURPLE, PATROL->PETROL), normalizalo y mencionalo en "motivo".',
  '   Manten ADEMAS el diccionario clasico "translation_map.colores" {RAW: ES} para compatibilidad.',
  '2. Traducir/Estandarizar códigos de tallas',
].join('\n');

const B3b_OLD = [
  '  "correcciones_productos": [',
  '    {',
  '      "sku_base": "SKU",',
  '      "descripcion": "descripción corregida si estaba vacía o mal redactada"',
  '    }',
  '  ],',
].join('\n');
const B3b_NEW = [
  '  "correcciones_productos": [',
  '    {',
  '      "sku_base": "SKU",',
  '      "descripcion": "descripción corregida si estaba vacía o mal redactada"',
  '    }',
  '  ],',
  '  "colores": [',
  '    { "raw": "PURPURA", "en": "PURPLE", "es": "Morado", "motivo": "opcional: typo o nota" }',
  '  ],',
].join('\n');

// ---------- PATCH C3: Fusionar (tripletes + por confirmar) ----------
const C3_OLD = '// 3b. Propagar alertas de calidad de la IA como warnings tipificados';
const C3_NEW = [
  '// 3a2. Colores: propagar tripletes IA + detectar por confirmar (fase intermedia, no reescribe)',
  'const tripletesColor = Array.isArray(aiData.colores) ? aiData.colores : [];',
  'if (tripletesColor.length > 0) original.colores_traducidos = tripletesColor;',
  'const cubiertos = new Set(Object.keys(colorMap || {}).map((k) => String(k).toUpperCase()));',
  'for (const t of tripletesColor) { if (t && t.raw != null) cubiertos.add(String(t.raw).toUpperCase()); }',
  'const porConfirmar = new Map();',
  'for (const d of (original.caja_detalles_para_editar || [])) {',
  '  const raw = String(d.color_raw || "").trim();',
  '  if (!raw || cubiertos.has(raw.toUpperCase())) continue;',
  '  if (!porConfirmar.has(raw)) porConfirmar.set(raw, new Set());',
  '  if (d.codigo_caja_temporal) porConfirmar.get(raw).add(d.codigo_caja_temporal);',
  '}',
  'if (!Array.isArray(original.colores_por_confirmar)) original.colores_por_confirmar = [];',
  'const vistosConf = new Set(original.colores_por_confirmar.map((x) => String(x.raw || "").toUpperCase()));',
  'for (const t of tripletesColor) {',
  '  const k = String((t && t.raw) || "").toUpperCase();',
  '  if (k && !vistosConf.has(k)) { vistosConf.add(k); original.colores_por_confirmar.push({ raw: t.raw, en: t.en || null, es: t.es || null, cajas: [], fuente: "ia" }); }',
  '}',
  'for (const [raw, boxes] of porConfirmar) {',
  '  (original.warnings = original.warnings || []).push({ tipo: "color_por_confirmar", severidad: "media", sku_base: null, codigo_caja_temporal: null, detalle: "Color \\"" + raw + "\\" sin traduccion IA. Verificar match en catalogo o crearlo en paso 4 (Fase 2).", color_raw: raw });',
  '  if (!vistosConf.has(raw.toUpperCase())) { vistosConf.add(raw.toUpperCase()); original.colores_por_confirmar.push({ raw: raw, en: null, es: null, cajas: [...boxes].slice(0, 25), fuente: "fallback_fusionar" }); }',
  '}',
  '',
  '// 3b. Propagar alertas de calidad de la IA como warnings tipificados',
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
  if (!JENNY_JS || !JENNY_JS.includes('v2.1-jenny-continuacion')) {
    throw new Error('jenny_parser_code.js no contiene v2.1 (revisar fuente versionada)');
  }
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

  console.log('2. Aplicando parches fase intermedia...');
  const jennyNode = getNode(wf, 'Parser Jenny multicolor-pack');
  const oldJenny = String(jennyNode.parameters.jsCode || '');
  if (oldJenny.includes('v2.1-jenny-continuacion')) {
    console.log('   - Parser Jenny: ya es v2.1, sin cambios.');
  } else if (!oldJenny.includes('v2.0-jenny-bloques')) {
    throw new Error('Parser Jenny con version inesperada (no es v2.0 ni v2.1): aborto por seguridad.');
  } else {
    jennyNode.parameters.jsCode = JENNY_JS;
    console.log('   - Parser Jenny: v2.0 -> v2.1 OK.');
  }

  const prepNode = getNode(wf, 'Preparar Ollama');
  let prepCode = String(prepNode.parameters.jsCode || '');
  if (prepCode.includes('COLORES CON DOBLE LLAVE')) {
    console.log('   - Preparar Ollama: paleta ya presente, sin cambios.');
  } else {
    prepCode = mustReplaced(prepCode, prepCode.split(B3a_OLD).join(B3a_NEW), 'B3a-paleta');
    prepNode.parameters.jsCode = prepCode;
    console.log('   - Preparar Ollama: paleta raw/en/es OK.');
  }
  prepCode = String(prepNode.parameters.jsCode || '');
  if (prepCode.includes('"colores": [')) {
    console.log('   - Preparar Ollama: contrato colores ya presente, sin cambios.');
  } else {
    prepNode.parameters.jsCode = mustReplaced(prepCode, prepCode.split(B3b_OLD).join(B3b_NEW), 'B3b-contrato');
    console.log('   - Preparar Ollama: contrato colores OK.');
  }

  const fusionNode = getNode(wf, 'Fusionar e Inteligencia');
  const fusionCode = String(fusionNode.parameters.jsCode || '');
  if (fusionCode.includes('colores_por_confirmar')) {
    console.log('   - Fusionar: detector colores ya presente, sin cambios.');
  } else {
    fusionNode.parameters.jsCode = mustReplaced(fusionCode, fusionCode.split(C3_OLD).join(C3_NEW), 'C3-colores');
    console.log('   - Fusionar: tripletes + por confirmar OK.');
  }

  console.log('3. Validando sintaxis...');
  checkSyntax('Parser Jenny', String(getNode(wf, 'Parser Jenny multicolor-pack').parameters.jsCode || ''));
  checkSyntax('Preparar Ollama', String(getNode(wf, 'Preparar Ollama').parameters.jsCode || ''));
  checkSyntax('Fusionar e Inteligencia', String(getNode(wf, 'Fusionar e Inteligencia').parameters.jsCode || ''));
  console.log('   Sintaxis OK en los 3 nodos.');

  const prevDir = path.resolve('C:/Users/uriel/AppData/Local/Temp/opencode/jenny_fase_preview');
  fs.mkdirSync(prevDir, { recursive: true });
  fs.writeFileSync(path.join(prevDir, 'parser_jenny_patched.js'), String(getNode(wf, 'Parser Jenny multicolor-pack').parameters.jsCode || ''));
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
  fs.writeFileSync(path.join(backupDir, WORKFLOW_ID + '_antes-jenny-fase-intermedia.json'), JSON.stringify(live, null, 2));
  console.log('5. Respaldo fresco en: ' + backupDir);

  console.log('6. Subiendo workflow parchado...');
  await api('PUT', '/workflows/' + WORKFLOW_ID, {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || {},
  });
  const check = await api('GET', '/workflows/' + WORKFLOW_ID);
  const jOk = String(check.nodes.find((n) => n.name === 'Parser Jenny multicolor-pack').parameters.jsCode || '').includes('v2.1-jenny-continuacion');
  const pOk = String(check.nodes.find((n) => n.name === 'Preparar Ollama').parameters.jsCode || '').includes('COLORES CON DOBLE LLAVE');
  const fOk = String(check.nodes.find((n) => n.name === 'Fusionar e Inteligencia').parameters.jsCode || '').includes('colores_por_confirmar');
  console.log('   Jenny v2.1: ' + jOk + ' | Prompt paleta: ' + pOk + ' | Fusionar colores: ' + fOk);
  if (!jOk || !pOk || !fOk) throw new Error('Verificacion fallida tras PUT.');
  console.log('LISTO: fase intermedia aplicada y verificada en n8n.');
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
