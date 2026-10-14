// scripts/n8n/updates/update_n8n_colores_sanitize_18.js
// Colores Fase 1: prompt IA sanitizado (en/es MAYUS, sin Pantone/numeros,
// stopwords ALL/NEW, typos BONNIE, compuestos por lados, flag es_patron)
// + Fusionar propaga es_patron a colores_por_confirmar.
// Idempotente: si un parche ya existe, se omite. Sin --apply no sube nada.
// Uso:
//   node scripts/n8n/updates/update_n8n_colores_sanitize_18.js --local <workflow.json>
//   node scripts/n8n/updates/update_n8n_colores_sanitize_18.js --apply

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

// ---------- PATCH B5: Preparar Ollama (sanitizado Fase 1) ----------
const B5_OLD = [
  '   Las claves de "translation_map.colores" deben copiar el raw TAL CUAL viene del packing',
  '   (respetando sus mayusculas/minusculas), sin normalizar la llave.',
].join('\n');
const B5_NEW = [
  '   Las claves de "translation_map.colores" deben copiar el raw TAL CUAL viene del packing',
  '   (respetando sus mayusculas/minusculas), sin normalizar la llave.',
  '   SANITIZADO DE COLORES (Fase 1, obligatorio para cada triplete de "colores"):',
  '   "en" y "es" SIEMPRE en MAYUSCULAS, solo palabras de color, SIN numeros ni codigos:',
  '   quita Pantone ("16-1806TPX", sufijos TPX/TPG/TCX), parentesis con numero ("(120)", "(57)"),',
  '   numeros sueltos o pegados ("90850" se tira, "BELL119"->"BELL", "OTO670113" se tira completo).',
  '   Stopwords de cantidad al inicio se recortan ("ALL BLACK"->en BLACK es NEGRO).',
  '   Typos frecuentes: HEVEAN->HEAVEN, STROWBERRY->STRAWBERRY, FUSHIA->FUCHSIA,',
  '   FRANBOISE->FRAMBOISE, PLOX->PHLOX, PATROL->PETROL, PURPUPA->PURPLE.',
  '   Compuestos con "/" se conservan con "/" limpio por lado ("BLUE BELL119/GREY"',
  '   -> en "BLUE BELL/GREY" es "CAMPANILLA AZUL/GRIS").',
  '   Si el raw es patron/codigo puro sin letras ("11321-121") marca "es_patron": true',
  '   y deja en/es en null. La tela "FUR" NO es color: no la reportes en "colores".',
  '   Ejemplos BONNIE: "PALE MAUVE 16-1806TPX(120)"->{en:"PALE MAUVE",es:"MALVA PÁLIDO"},',
  '   "NIGHT WINE 19-1623(92)"->{en:"NIGHT WINE",es:"VINO NOCHE"},',
  '   "NEW WINE 90855"->{en:"NEW WINE",es:"VINO NUEVO"},',
  '   "RED CHERRY 90859(66)"->{en:"RED CHERRY",es:"ROJO CEREZA"},',
  '   "STROWBERRY(99)"->{en:"STRAWBERRY",es:"FRESA",motivo:"typo STROWBERRY"},',
  '   "DK PHLOX 19-2820 (47"->{en:"DARK PHLOX",es:"FLOX OSCURO"},',
  '   "LT OLIVE OTO670113"->{en:"LIGHT OLIVE",es:"OLIVO CLARO"},',
  '   "SAND 49 LAST YEAR"->{en:"SAND",es:"ARENA"}.',
].join('\n');

// ---------- PATCH B5b: contrato colores con es_patron ----------
const B5b_OLD = [
  '  "colores": [',
  '    { "raw": "PURPURA", "en": "PURPLE", "es": "Morado", "motivo": "opcional: typo o nota" }',
  '  ],',
].join('\n');
const B5b_NEW = [
  '  "colores": [',
  '    { "raw": "PURPURA", "en": "PURPLE", "es": "MORADO", "es_patron": false, "motivo": "opcional: typo o nota" }',
  '  ],',
].join('\n');

// ---------- PATCH C5: Fusionar (propagar es_patron de tripletes IA) ----------
const C5a_OLD = '  if (k && !vistosConf.has(k)) { vistosConf.add(k); original.colores_por_confirmar.push({ raw: t.raw, en: t.en || null, es: t.es || null, cajas: [], fuente: "ia" }); }';
const C5a_NEW = '  if (k && !vistosConf.has(k)) { vistosConf.add(k); original.colores_por_confirmar.push({ raw: t.raw, en: t.en || null, es: t.es || null, es_patron: t.es_patron === true, cajas: [], fuente: "ia" }); }';

const C5b_OLD = '  if (!vistosConf.has(rawKey)) { vistosConf.add(rawKey); original.colores_por_confirmar.push({ raw: raw, en: null, es: null, cajas: [...boxes].slice(0, 25), fuente: "fallback_fusionar" }); }';
const C5b_NEW = '  if (!vistosConf.has(rawKey)) { vistosConf.add(rawKey); const esPatFallback = /^[\\d\\s\\-\\/]+$/.test(raw); original.colores_por_confirmar.push({ raw: raw, en: null, es: null, es_patron: esPatFallback, cajas: [...boxes].slice(0, 25), fuente: "fallback_fusionar" }); }';

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

  console.log('2. Aplicando parches colores Fase 1 (sanitizado)...');
  const fusionPre = String(getNode(wf, 'Fusionar e Inteligencia').parameters.jsCode || '');
  if (!fusionPre.includes('colores_por_confirmar')) {
    throw new Error('Fusionar sin bloque C3 previo: corre update_n8n_jenny_17.js primero.');
  }

  const prepNode = getNode(wf, 'Preparar Ollama');
  let prepCode = String(prepNode.parameters.jsCode || '');
  if (prepCode.includes('SANITIZADO DE COLORES')) {
    console.log('   - Preparar Ollama: sanitizado ya presente, sin cambios.');
  } else {
    prepNode.parameters.jsCode = mustReplaced(prepCode, prepCode.split(B5_OLD).join(B5_NEW), 'B5-sanitizado');
    console.log('   - Preparar Ollama: regla sanitizado Fase 1 OK.');
  }
  prepCode = String(prepNode.parameters.jsCode || '');
  if (prepCode.includes(B5b_NEW)) {
    console.log('   - Preparar Ollama: contrato es_patron ya presente, sin cambios.');
  } else {
    prepNode.parameters.jsCode = mustReplaced(prepCode, prepCode.split(B5b_OLD).join(B5b_NEW), 'B5b-contrato');
    console.log('   - Preparar Ollama: contrato es_patron OK.');
  }

  const fusionNode = getNode(wf, 'Fusionar e Inteligencia');
  let fusionCode = String(fusionNode.parameters.jsCode || '');
  if (fusionCode.includes('es_patron')) {
    console.log('   - Fusionar: es_patron ya presente, sin cambios.');
  } else {
    fusionCode = mustReplaced(fusionCode, fusionCode.split(C5a_OLD).join(C5a_NEW), 'C5a-tripletes');
    fusionCode = mustReplaced(fusionCode, fusionCode.split(C5b_OLD).join(C5b_NEW), 'C5b-fallback');
    fusionNode.parameters.jsCode = fusionCode;
    console.log('   - Fusionar: propaga es_patron OK.');
  }

  console.log('3. Validando sintaxis...');
  checkSyntax('Preparar Ollama', String(getNode(wf, 'Preparar Ollama').parameters.jsCode || ''));
  checkSyntax('Fusionar e Inteligencia', String(getNode(wf, 'Fusionar e Inteligencia').parameters.jsCode || ''));
  console.log('   Sintaxis OK en los 2 nodos.');

  const prevDir = path.resolve('C:/Users/uriel/AppData/Local/Temp/opencode/colores_sanitize_preview');
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
  fs.writeFileSync(path.join(backupDir, WORKFLOW_ID + '_antes-colores-sanitize-fase1.json'), JSON.stringify(live, null, 2));
  console.log('5. Respaldo fresco en: ' + backupDir);

  console.log('6. Subiendo workflow parchado...');
  await api('PUT', '/workflows/' + WORKFLOW_ID, {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || {},
  });
  const check = await api('GET', '/workflows/' + WORKFLOW_ID);
  const pOk = String(check.nodes.find((n) => n.name === 'Preparar Ollama').parameters.jsCode || '').includes('SANITIZADO DE COLORES');
  const fOk = String(check.nodes.find((n) => n.name === 'Fusionar e Inteligencia').parameters.jsCode || '').includes('es_patron');
  console.log('   Prompt sanitizado: ' + pOk + ' | Fusionar es_patron: ' + fOk);
  if (!pOk || !fOk) throw new Error('Verificacion fallida tras PUT.');
  console.log('LISTO: colores sanitizado Fase 1 aplicado y verificado en n8n.');
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
