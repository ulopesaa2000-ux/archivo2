// scripts/n8n/updates/update_n8n_tianyi_autocompletado.js
// Fase 1 Tianyi: autocompletado de huecos en "Parser Tianyi resumen".
// - Reglas bag en canonicalHeader (port del General): PCS/BAG->pcs_per_ctn, etc.
// - Mapeo posicional blank_11 (nº cartones) / blank_12 (TTL piezas).
// - Rango tri-celda carton_no..carton_no_3 combinado.
// - Fila de totales con primeras columnas vacias (fila 13) ya no crea caja fantasma.
// - pcs derivado ttl/ctns, floor 1 ultimo recurso + warning piezas_floor_1.
// - validateBox cableado (sin ruido de detalle).
// Parche quirurgico de 1 nodo con anclas estrictas + backup + verificacion.
// Uso:
//   node scripts/n8n/updates/update_n8n_tianyi_autocompletado.js --local <workflow.json>   (preview sin subir)
//   node scripts/n8n/updates/update_n8n_tianyi_autocompletado.js --apply                   (sube a n8n)

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

// ---------- T1: reglas bag en canonicalHeader + headerScore (port del General) ----------
const T1a_OLD = '  if (ns.some(x => /^(ctns|cartons|total ctn|total ctns|ttl ctn|ttl ctns)$/.test(x))) score += 5;';
const T1a_NEW = '  if (ns.some(x => /^(ctns|cartons|total ctn|total ctns|ttl ctn|ttl ctns|bags|total bags)$/.test(x))) score += 5;';

const T1b_OLD = "  if (/^(ctn no\\.?|ctn no,|carton no\\.?|carton no|ctn number|carton number|ctn)$/.test(n)) return 'carton_no';";
const T1b_NEW = "  if (/^(ctn no\\.?|ctn no,|carton no\\.?|carton no|ctn number|carton number|ctn|bag no\\.?|bag no|bag number|bolsa no\\.?|caja no\\.?)$/.test(n)) return 'carton_no';";

const T1c_OLD = "  if (/^(ctns|cartons|total ctn|total ctns|ttl ctn|ttl ctns|of ctns)$/.test(n)) return 'ctns';";
const T1c_NEW = "  if (/^(ctns|cartons|total ctn|total ctns|ttl ctn|ttl ctns|of ctns|bags|total bags|ttl bags|bolsas|cajas|bultos)$/.test(n)) return 'ctns';";

const T1d_OLD = "  if (/pcs\\s*\\/\\s*ctn|pc\\s*\\/\\s*ctn|pcs per ctn|pcs\\/carton|set per ctn|set\\/ctn|pcs per carton|sets per ctn/.test(n)) return 'pcs_per_ctn';";
const T1d_NEW = "  if (/pcs\\s*\\/(?:ctn|bag|carton)|pc\\s*\\/(?:ctn|bag)|pcs per (?:ctn|bag|carton)|set per (?:ctn|bag)|set\\/(?:ctn|bag)|sets per (?:ctn|bag)/.test(n)) return 'pcs_per_ctn';";

const T1e_OLD = "  if (/net weight\\/ctn|net weight per ctn|n\\.w\\/ctn|nw\\/ctn/.test(n)) return 'nw_per_ctn';";
const T1e_NEW = "  if (/net weight\\/(?:ctn|bag)|net weight per (?:ctn|bag)|n\\.w\\/(?:ctn|bag)|nw\\/(?:ctn|bag)/.test(n)) return 'nw_per_ctn';";

const T1f_OLD = "  if (/gross weight\\/ctn|gross weight per ctn|g\\.w\\/ctn|gw\\/ctn/.test(n)) return 'gw_per_ctn';";
const T1f_NEW = "  if (/gross weight\\/(?:ctn|bag)|gross weight per (?:ctn|bag)|g\\.w\\/(?:ctn|bag)|gw\\/(?:ctn|bag)/.test(n)) return 'gw_per_ctn';";

// ---------- T2: helpers Tianyi (total fila vacia + llaves de conteo posicionales) ----------
const T2_OLD = 'function parsePackingListTianyi(items, cfg = {}) {';
const T2_NEW = [
  'function isTotalRowTianyi(row, ctnsKey, ttlKey) {',
  '  if (cleanText(row.style_no) !== \'\') return false;',
  '  if (cleanText(row.carton_no) !== \'\' || cleanText(row.color) !== \'\' || cleanText(row.description) !== \'\') return false;',
  '  if (toNum(row.pcs_per_ctn) !== null) return false;',
  '  const nums = [ctnsKey ? row[ctnsKey] : null, ttlKey ? row[ttlKey] : null].map(toNum).filter(n => n !== null);',
  '  return nums.length > 0;',
  '}',
  'function tianyiCountKeys(canonicalHeaders) {',
  '  const ch = canonicalHeaders || [];',
  '  const pcsIdx = ch.indexOf(\'pcs_per_ctn\');',
  '  if (pcsIdx < 0) return { ctnsKey: null, ttlKey: null };',
  '  const a = ch[pcsIdx + 1], b = ch[pcsIdx + 2];',
  '  return {',
  '    ctnsKey: (a && String(a).startsWith(\'blank_\')) ? a : null,',
  '    ttlKey: (b && String(b).startsWith(\'blank_\')) ? b : null',
  '  };',
  '}',
  'function parsePackingListTianyi(items, cfg = {}) {',
].join('\n');

// ---------- T3: llaves de conteo tras reconstruct ----------
const T3_OLD = [
  '  const headerInfo = prepared.headerInfo;',
  "  const proveedorInput = cleanText(cfg.proveedor || cfg.provider || cfg.Proveedor || 'Tianyi') || 'Tianyi';",
].join('\n');
const T3_NEW = [
  '  const headerInfo = prepared.headerInfo;',
  '  const tianyiKeys = tianyiCountKeys(headerInfo.canonical_headers);',
  '  const tianyiCtnsKey = tianyiKeys.ctnsKey, tianyiTtlKey = tianyiKeys.ttlKey;',
  "  const proveedorInput = cleanText(cfg.proveedor || cfg.provider || cfg.Proveedor || 'Tianyi') || 'Tianyi';",
].join('\n');

// ---------- T4: rama de total Tianyi antes del total generico ----------
const T4_OLD = '    if (isTotalRow(row)) { totalesDetectados = extractTotals(row); continue; }';
const T4_NEW = [
  '    if (isTotalRowTianyi(row, tianyiCtnsKey, tianyiTtlKey)) {',
  '      totalesDetectados = {',
  '        total_cajas: tianyiCtnsKey ? toNum(row[tianyiCtnsKey]) : firstNum(row.ctns),',
  '        total_piezas: tianyiTtlKey ? toNum(row[tianyiTtlKey]) : firstNum(row.total_qty),',
  '        cbm_orden: firstNum(row.cbm_total) ?? parseCbmFromRow(row),',
  '        peso_bruto_total_kg: firstNum(row.total_gw, row.gw),',
  '        peso_neto_total_kg: firstNum(row.total_nw, row.nw)',
  '      };',
  '      continue;',
  '    }',
  '    if (isTotalRow(row)) { totalesDetectados = extractTotals(row); continue; }',
].join('\n');

// ---------- T5: carton tri-celda + ctns + pcs/ttl/floor ----------
const T5_OLD = [
  '    const pcsPerCtn = firstNum(row.pcs_per_ctn);',
  '    const carton = parseCartonRange(row.carton_no);',
  '    const ctns = firstNum(row.ctns) || carton.cantidad_cajas_from_range || null;',
  '    const totalPiezas = firstNum(row.total_qty) || (pcsPerCtn && ctns ? pcsPerCtn * ctns : null);',
].join('\n');
const T5_NEW = [
  '    const cartonRawTianyi = [row.carton_no, row.carton_no_2, row.carton_no_3].map(cleanText).filter(s => s !== \'\' && s !== \'_\').join(\'-\');',
  '    const carton = parseCartonRange(cartonRawTianyi || row.carton_no);',
  '    const ctnsCount = tianyiCtnsKey ? toNum(row[tianyiCtnsKey]) : null;',
  '    const ctns = firstNum(row.ctns) || ctnsCount || carton.cantidad_cajas_from_range || null;',
  '    if (ctnsCount !== null && carton.cantidad_cajas_from_range !== null && ctnsCount !== carton.cantidad_cajas_from_range) {',
  '      warnings.push({ tipo: \'tianyi_ctns_vs_rango\', severidad: \'media\', sku_base: parsed.sku_base, fila: row.__fila_origen, detalle: \'Conteo \' + ctnsCount + \' vs rango \' + carton.carton_no_raw + \' (\' + carton.cantidad_cajas_from_range + \'). Manda el conteo.\' });',
  '    }',
  '    const ttlCount = tianyiTtlKey ? toNum(row[tianyiTtlKey]) : null;',
  '    let pcsPerCtn = firstNum(row.pcs_per_ctn);',
  '    let pcsFuente = pcsPerCtn != null ? \'pcs_bag\' : null;',
  '    if (pcsPerCtn === null || pcsPerCtn <= 0) {',
  '      if (ttlCount != null && ctns) {',
  '        const divTianyi = ttlCount / ctns;',
  '        if (Number.isFinite(divTianyi) && divTianyi > 0 && Math.abs(divTianyi * ctns - ttlCount) < 0.01) {',
  '          pcsPerCtn = Math.round(divTianyi * 100) / 100;',
  '          pcsFuente = \'ttl_entre_ctns\';',
  '          warnings.push({ tipo: \'piezas_derivadas_ttl\', severidad: \'media\', sku_base: parsed.sku_base, fila: row.__fila_origen, detalle: \'PCS/BAG ausente: \' + ttlCount + \'/\' + ctns + \'=\' + pcsPerCtn + \' desde conteo. Verificar.\' });',
  '        }',
  '      }',
  '      if (pcsPerCtn === null || pcsPerCtn <= 0) {',
  '        pcsPerCtn = 1;',
  '        pcsFuente = \'floor_1\';',
  '        warnings.push({ tipo: \'piezas_floor_1\', severidad: \'media\', sku_base: parsed.sku_base, fila: row.__fila_origen, detalle: \'PCS/BAG no detectado ni derivable (formato Tianyi): 1 pza/caja temporal para no romper logica. Corregir valor real en el wizard.\' });',
  '      }',
  '    }',
  '    const totalPiezas = firstNum(row.total_qty) || ttlCount || (pcsPerCtn && ctns ? pcsPerCtn * ctns : null);',
].join('\n');

// ---------- T6: validateBox cableado (sin ruido de detalle ausente) ----------
const T6_OLD = [
  "      estado_temporal: 'requiere_revision',",
  "      validacion: { suma_detalle_por_caja: 0, issues: ['resumen_sin_detalle_color_talla'] }",
  '    });',
].join('\n');
const T6_NEW = [
  "      estado_temporal: 'requiere_revision',",
  "      validacion: { suma_detalle_por_caja: 0, issues: ['resumen_sin_detalle_color_talla'] }",
  '    });',
  '    const cajaObjTianyi = cajasMap.get(code);',
  '    const vIssuesTianyi = validateBox(cajaObjTianyi, []).filter(i => i !== \'sin_detalle_color_talla\');',
  '    cajaObjTianyi.validacion.issues = [\'resumen_sin_detalle_color_talla\', ...vIssuesTianyi];',
  '    cajaObjTianyi.validacion.pcs_fuente = pcsFuente;',
  '    for (const issue of vIssuesTianyi) warnings.push({ tipo: \'validacion_caja\', severidad: \'media\', sku_base: parsed.sku_base, fila: row.__fila_origen, codigo_caja_temporal: code, issue });',
].join('\n');

// ---------- T7: version ----------
const T7_OLD = "version_parser: 'mvp-n8n-code-v1.1-switch-separated-tianyi-summary',";
const T7_NEW = "version_parser: 'mvp-n8n-code-v1.2-tianyi-autocompletado',";

function patchTianyi(code) {
  let c = code;
  c = mustReplaced(c, c.split(T1a_OLD).join(T1a_NEW), 'T1a-score-ctns');
  c = mustReplaced(c, c.split(T1b_OLD).join(T1b_NEW), 'T1b-carton-bag');
  c = mustReplaced(c, c.split(T1c_OLD).join(T1c_NEW), 'T1c-ctns-bag');
  c = mustReplaced(c, c.split(T1d_OLD).join(T1d_NEW), 'T1d-pcs-bag');
  c = mustReplaced(c, c.split(T1e_OLD).join(T1e_NEW), 'T1e-nw-bag');
  c = mustReplaced(c, c.split(T1f_OLD).join(T1f_NEW), 'T1f-gw-bag');
  c = mustReplaced(c, c.split(T2_OLD).join(T2_NEW), 'T2-helpers');
  c = mustReplaced(c, c.split(T3_OLD).join(T3_NEW), 'T3-countkeys');
  c = mustReplaced(c, c.split(T4_OLD).join(T4_NEW), 'T4-total-tianyi');
  c = mustReplaced(c, c.split(T5_OLD).join(T5_NEW), 'T5-carton-pcs-ttl');
  c = mustReplaced(c, c.split(T6_OLD).join(T6_NEW), 'T6-validate');
  c = mustReplaced(c, c.split(T7_OLD).join(T7_NEW), 'T7-version');
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

  const tianyiNode = getNode(wf, 'Parser Tianyi resumen');
  console.log('2. Aplicando parche Fase 1 Tianyi...');
  tianyiNode.parameters.jsCode = patchTianyi(String(tianyiNode.parameters.jsCode || ''));
  console.log('   - Parser Tianyi resumen: OK (v1.2-autocompletado)');

  console.log('3. Validando sintaxis...');
  checkSyntax('Parser Tianyi resumen', tianyiNode.parameters.jsCode);
  console.log('   Sintaxis OK.');

  const prevDir = path.resolve('C:/Users/uriel/AppData/Local/Temp/opencode/tianyi_fase1_preview');
  fs.mkdirSync(prevDir, { recursive: true });
  fs.writeFileSync(path.join(prevDir, 'parser_tianyi_patched.js'), tianyiNode.parameters.jsCode);
  console.log('4. Preview guardado en: ' + prevDir);

  if (!APPLY) {
    console.log('5. Dry-run: sin --apply no se sube nada. Verifica el preview y corre:');
    console.log('   node scripts/n8n/tests/test_tianyi_autocompletado.js --mode patched --parser-file <preview>/parser_tianyi_patched.js');
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.resolve('scripts/backups', 'n8n_prefill_' + stamp);
  fs.mkdirSync(backupDir, { recursive: true });
  const live = await api('GET', '/workflows/' + WORKFLOW_ID);
  fs.writeFileSync(path.join(backupDir, WORKFLOW_ID + '_antes-tianyi-fase1.json'), JSON.stringify(live, null, 2));
  console.log('5. Respaldo fresco en: ' + backupDir);

  console.log('6. Subiendo workflow parchado...');
  await api('PUT', '/workflows/' + WORKFLOW_ID, {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || {},
  });
  const check = await api('GET', '/workflows/' + WORKFLOW_ID);
  const tOk = String(check.nodes.find((n) => n.name === 'Parser Tianyi resumen').parameters.jsCode || '').includes('v1.2-tianyi-autocompletado');
  const fOk = String(check.nodes.find((n) => n.name === 'Parser Tianyi resumen').parameters.jsCode || '').includes('piezas_floor_1');
  console.log('   Tianyi v1.2: ' + tOk + ' | Floor+warnings: ' + fOk);
  if (!tOk || !fOk) throw new Error('Verificacion fallida tras PUT.');
  console.log('LISTO: Fase 1 Tianyi aplicada y verificada en n8n.');
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
