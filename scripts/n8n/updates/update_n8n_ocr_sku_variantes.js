// scripts/n8n/updates/update_n8n_ocr_sku_variantes.js
//
// Alinea el OCR de notas con el resolver de la UI:
//  - Prompt: lectura literal vs SKU canónico y variantes por confusiones de caligrafía.
//  - Parsear JSON1: conserva estilo_raw, canonicaliza AND, genera variantes y las manda
//    como `posibles_variantes` (score 0.85 en la RPC) en vez de como SKU exacto.
//  - Resolver bodegas1: autopromueve solo con score real de BD >= 0.85 y único,
//    o un único exacto >= 0.99. Nunca con score aumentado por heurísticas.
//
// Uso: node scripts/n8n/updates/update_n8n_ocr_sku_variantes.js

const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

let envConfig = {};
try {
  const envPath = fs.existsSync(path.resolve(__dirname, '../../../.env.local'))
    ? path.resolve(__dirname, '../../../.env.local')
    : path.resolve(__dirname, '../../.env.local');
  if (fs.existsSync(envPath)) envConfig = dotenv.parse(fs.readFileSync(envPath));
} catch (e) {}

const apiKey = process.env.N8N_API_KEY || envConfig.N8N_API_KEY || '';
const workflowId = process.env.N8N_WORKFLOW_ID || envConfig.N8N_WORKFLOW_ID || 'DtZOqR4-9_DnULEjWW78b';

if (!apiKey) {
  console.error('ERROR: N8N_API_KEY no encontrada');
  process.exit(1);
}

function api(method, apiPath, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'n8n.sistemaindumentaria.com',
      path: '/api/v1' + apiPath,
      method,
      headers: {
        'X-N8N-API-KEY': apiKey,
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Prompt: reemplaza la regla 6 por una versión con confusiones reales ──
const PROMPT_VIEJO = `6. REGLA DE GENERACION DE 'posibles_variantes' ANTE DUDAS DE CALIGRAFIA:
   - Si un trazo rápido puede ser un '1' o un '7' (ej: 'TY26/07HC' vs 'TY26/01HC'): pon el más probable en 'sku' e incluye el alternativo en 'posibles_variantes': ["TY26/01HC"].
   - Si dudas entre 'H' o 'M' en el género: incluye la alternativa en 'posibles_variantes': ["TY26/01MC"].
   - Si dudas entre '0' y 'D' en sets: incluye la alternativa en 'posibles_variantes': ["BO/3DSETFE"].`;

const PROMPT_NUEVO = `6. REGLA DE SKU: LECTURA LITERAL vs CANONICO Y VARIANTES ANTE DUDAS:
   - 'estilo_raw' SIEMPRE es la lectura literal de la caligrafía (no la corrijas ni la completes).
   - 'sku' es la versión canónica más probable: mayúsculas, sin espacios, con diagonal en códigos modernos (ej. 'YS26/07MCL') y SIN diagonal en AND (ej. 'AND26/0016DC' -> 'AND260016').
   - Confusiones frecuentes de caligrafía que debes resolver apoyándote en la descripción escrita:
     * 5<->S<->U, 0<->U<->O, O<->U, U<->V.
     * H<->M, M<->H, C<->W, W<->C.
     * Sufijos: HC/MC/HW/MW (género + chamarra/rompevientos), SW (suéter), USD/MSD/HSD (unisex/sudadera).
   - Si dudas, pon la lectura literal en 'estilo_raw', la opción más probable en 'sku' y TODAS las alternativas razonables en 'posibles_variantes' (ej: estilo_raw 'JA25/015D', sku 'JA25/01USD', posibles_variantes ['JA25/01SD','JA25/015D']).
   - Usa la descripción escrita para desempatar: 'Sueter dama' -> sufijo SW; 'Rompe cab' -> HW/HC; 'Sudadera' -> MSD/USD/HSD.
   - NUNCA inventes un código que no corresponda a trazos visibles; si no estás seguro, deja 'sku' con la lectura literal y llena 'posibles_variantes'.`;

function patchPrompt(js) {
  if (!js.includes(PROMPT_VIEJO)) return { code: js, changed: false };
  return { code: js.replace(PROMPT_VIEJO, PROMPT_NUEVO), changed: true };
}

// ── Parsear JSON1: funciones de normalización/variantes + payload ──
const PARSEAR_HELPERS = String.raw`function normalizarSku(raw) {
  if (!raw) return '';
  let s = String(raw).trim().toUpperCase();
  s = s.replace(/[\s\.\,\-]+$/g, '');
  s = s.replace(/\s+/g, '');
  return s;
}

const RE_AND_SLASH_OCR = /^AND(\d{2})\s*\/\s*(\d{4})([A-Z]{0,4})$/i;
// Un codigo con espacios alrededor de la barra NO debe fragmentarse:
// "B0248 / 1CAC" -> "B0248/1CAC", "MK26 / 08 SW" -> "MK26/08SW".
// La familia debe empezar por letra para no absorber dos codigos distintos.
const RE_CODIGO_CON_BARRA_OCR = /^[A-Z][A-Z0-9]{0,7}\/[A-Z0-9]{1,10}$/;
function canonicalizarAndOcr(v) {
  const raw = String(v || '').trim();
  const m = raw.match(RE_AND_SLASH_OCR);
  if (m) return ('AND' + m[1] + m[2]).toUpperCase();
  return raw;
}
function separarCodigosOcr(v) {
  let raw = String(v || '').trim();
  if (!raw) return [];
  if (RE_AND_SLASH_OCR.test(raw)) return [canonicalizarAndOcr(raw)];
  raw = raw.replace(/\bAND\s+([\d\s]{5,})\b/gi, function(_m, d) { return 'AND' + d.replace(/\s+/g, ''); });
  raw = raw.replace(/\bAND\s*(\d{2})\s*\/\s*(\d{4})\s*([A-Z]{0,4})\b/gi, function(_m, a, f) { return 'AND' + a + f; });
  // Si TODO el texto (sin espacios) es un unico codigo con barra, no lo fragmentes.
  const _compacto = raw.replace(/\s+/g, '').toUpperCase();
  if (RE_CODIGO_CON_BARRA_OCR.test(_compacto)) return [_compacto];

  raw = raw.replace(/\b([A-Z]{2,4}\d{2})\s*\/\s*([A-Z0-9]{1,8})\b/gi, function(_m, fam, mod) { return fam + '/' + mod; });
  return raw.split(/\s+/).map(function(t) { return t.replace(/^\/+/, '').replace(/\/+$/, ''); }).filter(Boolean).map(canonicalizarAndOcr);
}

const SUFIJOS_OCR = ['MW','USD','MSD','HC','HW','MC','HSD','SW','MST','MSTLY','MCL','MCD','HD','MD','MAL','WBH','H','M','D','SD','OSD','MSDLYC','HCCLOVI'];
const CONFUSIONES_OCR = {
  '0': ['O','U'], '1': ['I','U'], '2': ['Z'], '4': ['A'], '5': ['S','U'], '6': ['G'], '7': ['T'], '8': ['B'],
  'A': ['4'], 'B': ['8'], 'C': ['G','W'], 'D': ['O'], 'G': ['6','C'], 'H': ['M'], 'I': ['1'], 'M': ['H'],
  'O': ['U','0'], 'S': ['5'], 'T': ['7'], 'U': ['O','V'], 'V': ['U'], 'W': ['C'], 'Z': ['2']
};
// Confusiones de OCR dentro de la familia (prefijo). Caso real: Y5 -> YS, B0 -> BO.
const FAMILIA_CONFUSIONES_OCR = { '5': 'S', '0': 'O' };
function generarVariantesSkuOcr(raw, variantesIa) {
  const out = [];
  const vistos = new Set();
  const baseNorm = normalizarSku(raw);
  const add = function(v) {
    const t = String(v || '').trim();
    const k = normalizarSku(t);
    if (t && k && k !== baseNorm && !vistos.has(k)) { vistos.add(k); out.push(t); }
  };
  (Array.isArray(variantesIa) ? variantesIa : []).forEach(add);
  for (const codigo of separarCodigosOcr(raw)) {
    const m = codigo.match(/^([A-Z0-9]{1,5})(\d{2})\/(\d{2})([A-Z0-9]*)$/i);
    if (!m) {
      if (/^AND\d{6}$/.test(normalizarSku(codigo)) && codigo.endsWith('00')) add(codigo.slice(0, -2) + '10');
      continue;
    }
    const familia = m[1].toUpperCase();
    const prefijo = familia + m[2] + '/' + m[3];
    const modelo = m[4].toUpperCase();

    // Correcciones de familia (Y5 -> YS, B0 -> BO) con el mismo modelo: van primero.
    const prefijos = [prefijo];
    for (let i = 0; i < familia.length; i += 1) {
      const repFam = FAMILIA_CONFUSIONES_OCR[familia[i]];
      if (!repFam) continue;
      prefijos.push(familia.slice(0, i) + repFam + familia.slice(i + 1) + m[2] + '/' + m[3]);
    }
    for (const pref of prefijos) {
      if (pref !== prefijo) add(pref + modelo);
    }

    for (const pref of prefijos) {
      for (const sufijo of SUFIJOS_OCR) { if (sufijo !== modelo) add(pref + sufijo); }
      for (let i = 0; i < modelo.length; i += 1) {
        const ch = modelo[i];
        const reps = CONFUSIONES_OCR[ch] || [];
        for (const rep of reps) add(pref + modelo.slice(0, i) + rep + modelo.slice(i + 1));
      }
    }
  }
  return out.slice(0, 40);
}`;

const PARSEAR_BLOQUE = String.raw`const rawLines = Array.isArray(data.lineas) ? data.lineas : [];
const searchPayload = [];

const processedLines = rawLines.map((l, idx) => {
  const rawOriginal = String(l.estilo_raw || l.sku || l.descripcion_raw || '').trim();
  const descripcionRaw = String(l.descripcion_raw || '').trim();
  const principales = separarCodigosOcr(rawOriginal);
  const skuCanonico = principales[0] || normalizarSku(rawOriginal);
  const textoDescripcion = (descripcionRaw && normalizarSku(descripcionRaw) !== normalizarSku(rawOriginal))
    ? descripcionRaw
    : (l.descripcion_texto || descripcionRaw || rawOriginal);
  const variantesIa = Array.isArray(l.posibles_variantes) ? l.posibles_variantes.slice() : [];
  if (l.sku && normalizarSku(l.sku) !== normalizarSku(rawOriginal)) variantesIa.push(String(l.sku));
  const variantes = generarVariantesSkuOcr(rawOriginal, variantesIa);

  if (principales.length > 0) {
    searchPayload.push(Object.assign({
      index: idx,
      sku: principales[0],
      estilo_raw: rawOriginal,
      descripcion_texto: textoDescripcion
    }, variantes.length > 0 ? { posibles_variantes: variantes } : {}));
    for (let k = 1; k < principales.length; k += 1) {
      searchPayload.push({ index: idx, sku: principales[k], estilo_raw: rawOriginal, descripcion_texto: textoDescripcion });
    }
  }

  let rawQty = l.cantidad_cajas;
  if (typeof rawQty === 'string') {
    rawQty = rawQty.trim().replace(',', '.');
    if (rawQty === '1/2' || rawQty === '.5') rawQty = '0.5';
    else if (rawQty === '1/4' || rawQty === '.25') rawQty = '0.25';
    else if (rawQty === '3/4' || rawQty === '.75') rawQty = '0.75';
  }
  let qty = Number(rawQty);
  if (rawQty == null || isNaN(qty) || qty <= 0) { qty = 1; }

  return {
    index: idx,
    estilo_raw: rawOriginal,
    sku: skuCanonico,
    posibles_variantes: variantes,
    descripcion_raw: descripcionRaw || rawOriginal,
    descripcion_texto: textoDescripcion,
    cantidad_cajas: Number(qty),
    piezas_por_caja: l.piezas_por_caja ? Number(l.piezas_por_caja) : null,
    confianza: l.confianza || 0.95,
    confianza_ia: l.confianza || 0.95,
    prefijo: l.prefijo || null,
    proveedor_sugerido: l.proveedor_sugerido || null,
    familia_sku: l.familia_sku || null
  };
});`;

function patchParsear(js) {
  // El workflow quedó con doble backslash en regexes (\s, \d, \{...). Se restauran
  // a un solo backslash antes de parchear la sección de SKU.
  let out = js.replace(/\\\\/g, '\\');

  const genStart = out.indexOf('function generarVariantesSkuOcr(raw, variantesIa) {');
  if (genStart >= 0) {
    // Ya existe la versión anterior del bloque de SKU: se reemplaza por esta versión.
    const genEndMarker = '  return out.slice(0, 40);\n}';
    const genEnd = out.indexOf(genEndMarker, genStart);
    if (genEnd < 0) return { code: js, changed: false };
    const normStart = out.lastIndexOf('function normalizarSku(raw) {', genStart);
    const start = normStart >= 0 ? normStart : genStart;
    // Idempotente: si el bloque ya es identico al desired, no se reescribe.
    const yaAplicado = out.slice(start, genEnd + genEndMarker.length) === PARSEAR_HELPERS;
    if (yaAplicado) return { code: js, changed: false };
    out = out.slice(0, start) + PARSEAR_HELPERS + out.slice(genEnd + genEndMarker.length);
    return { code: out, changed: true };
  }

  // Código original (sin bloque de SKU): insertar helpers y reemplazar el bloque de líneas.
  const start = out.indexOf('function normalizarSku(raw) {');
  const endMarker = '  return s;\n}';
  const end = out.indexOf(endMarker, start);
  if (start < 0 || end < 0) return { code: js, changed: false };
  out = out.slice(0, start) + PARSEAR_HELPERS + out.slice(end + endMarker.length);

  const blockStart = out.indexOf('const rawLines = Array.isArray(data.lineas) ? data.lineas : [];');
  const blockEnd = out.indexOf('const tipoRaw = String(data.tipo_movimiento');
  if (blockStart < 0 || blockEnd < 0 || blockEnd <= blockStart) return { code: js, changed: false };
  out = out.slice(0, blockStart) + PARSEAR_BLOQUE + '\n\n' + out.slice(blockEnd);
  return { code: out, changed: true };
}

// ── Resolver bodegas1: score real de BD, 0.85 único ──
const RESOLVER_NUEVO = String.raw`const lineasResueltas = (ocr.lineas || []).map((l, idx) => {
  const rawSku = (l.estilo_raw || l.sku || '').trim().toUpperCase();
  const itemIndex = l.index != null ? l.index : idx;

  const candidatosDeEstaLinea = candsSkus.filter(c => c.linea_index === itemIndex);

  // Deduplicar por producto y ordenar por score REAL de la base de datos (0-1).
  const porProducto = new Map();
  for (const cand of candidatosDeEstaLinea) {
    const productoId = Number(cand.producto_id);
    if (!Number.isFinite(productoId)) continue;
    const score = Number(cand.score) || 0;
    const previo = porProducto.get(productoId);
    if (!previo || score > (Number(previo.score) || 0)) {
      porProducto.set(productoId, Object.assign({}, cand, { score: score }));
    }
  }
  const dedup = Array.from(porProducto.values()).sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
  const exactos = dedup.filter(c => Number(c.score) >= 0.99);
  const elegibles = dedup.filter(c => Number(c.score) >= 0.85);

  // Auto solo con un único exacto o un único candidato >= 0.85.
  // Si hay 2+ exactos o 2+ elegibles, se deja pendiente de elección manual.
  let elegido = null;
  if (exactos.length === 1) elegido = exactos[0];
  else if (exactos.length === 0 && elegibles.length === 1) elegido = elegibles[0];

  if (elegido) {
    const resueltoSku = elegido.sku_base;
    if (resueltoSku !== rawSku && resueltoSku.replace(/[^A-Z0-9]/g, '') !== rawSku.replace(/[^A-Z0-9]/g, '')) {
      advertenciasDesempate.push('Línea ' + (itemIndex + 1) + ': Resuelto a ' + resueltoSku + ' (leído: ' + rawSku + ', ' + Math.round(Number(elegido.score) * 100) + '% ' + (elegido.metodo || '') + ')');
    }
    return Object.assign({}, l, {
      sku: resueltoSku,
      producto_id: elegido.producto_id,
      variante_id: elegido.variante_id || null,
      descripcion_texto: l.descripcion_texto || elegido.descripcion,
      piezas_por_caja: l.piezas_por_caja || elegido.pz_en_caja || null,
      confianza: Number(Number(elegido.score).toFixed(2)),
      confianza_ia: l.confianza_ia != null ? l.confianza_ia : (l.confianza != null ? l.confianza : null),
      metodo_match: elegido.metodo,
      match_score: Number(elegido.score),
      candidatos_sku: dedup.slice(0, 5).map(c => ({ producto_id: c.producto_id, sku_base: c.sku_base, score: Number(c.score), metodo: c.metodo }))
    });
  }

  if (elegibles.length > 1) {
    advertenciasDesempate.push('Línea ' + (itemIndex + 1) + ': ' + elegibles.length + ' candidatos >=85% para ' + rawSku + '; queda pendiente de elección manual');
  }
  return l;
});`;

function patchResolver(js) {
  if (js.includes('match_score: Number(elegido.score)')) return { code: js, changed: false };
  const start = js.indexOf('const lineasResueltas = (ocr.lineas || []).map((l, idx) => {');
  const end = js.indexOf("if (typeof modoSoloCajas !== 'undefined' && modoSoloCajas) {");
  if (start < 0 || end < 0 || end <= start) return { code: js, changed: false };
  return { code: js.slice(0, start) + RESOLVER_NUEVO + '\n\n' + js.slice(end), changed: true };
}

async function run() {
  console.log('Obteniendo workflow (ID:', workflowId, ')...');
  const resGet = await api('GET', '/workflows/' + workflowId);
  if (resGet.status !== 200) {
    console.error('Error al obtener workflow:', resGet.status, (resGet.raw || '').slice(0, 500));
    process.exit(1);
  }
  const wf = resGet.data;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.resolve(__dirname, '../../backups/backup_n8n_wf_' + workflowId + '_sku_variantes_prePUT_' + stamp + '.json');
  fs.writeFileSync(backupPath, JSON.stringify(wf, null, 2));
  console.log('Backup pre-PUT:', backupPath);

  let cPrompt = 0, cParse = 0, cRes = 0;

  for (const n of wf.nodes) {
    if (n.name === 'Construir prompt + body') {
      const r = patchPrompt(n.parameters.jsCode || '');
      if (r.changed) n.parameters.jsCode = r.code;
      if (r.code.includes('LECTURA LITERAL vs CANONICO')) {
        cPrompt++;
        console.log('✓ Prompt:', n.name, r.changed ? '(parcheado)' : '(ya estaba)');
      } else {
        console.warn('WARN prompt sin cambio:', n.name);
      }
    }
    if (n.name === 'Parsear JSON1') {
      const r = patchParsear(n.parameters.jsCode || '');
      if (r.changed) n.parameters.jsCode = r.code;
      if (r.code.includes('FAMILIA_CONFUSIONES_OCR')) {
        cParse++;
        console.log('✓ Parsear:', n.name, r.changed ? '(parcheado)' : '(ya estaba)');
      } else {
        console.warn('WARN parsear sin cambio:', n.name);
      }
    }
    if (n.name === 'Resolver bodegas1') {
      const r = patchResolver(n.parameters.jsCode || '');
      if (r.changed) n.parameters.jsCode = r.code;
      if (r.code.includes('score REAL de la base de datos')) {
        cRes++;
        console.log('✓ Resolver:', n.name, r.changed ? '(parcheado)' : '(ya estaba)');
      } else {
        console.warn('WARN resolver sin cambio:', n.name);
      }
    }
  }

  console.log('Resumen patches — prompt:', cPrompt, 'parsear:', cParse, 'resolver:', cRes);
  if (cPrompt < 1 || cParse < 1 || cRes < 1) {
    console.error('Faltan patches, no se hace PUT. Revisa WARN lines.');
    process.exit(1);
  }

  // Chequeo de sintaxis del código parcheado (no lo ejecuta, solo compila).
  for (const name of ['Parsear JSON1', 'Resolver bodegas1', 'Construir prompt + body']) {
    const n = wf.nodes.find((x) => x.name === name);
    const code = n && n.parameters && n.parameters.jsCode;
    if (code) {
      try {
        new Function(code);
        console.log('✓ Sintaxis OK:', name);
      } catch (err) {
        console.error('✗ Sintaxis rota en', name, ':', err.message);
        process.exit(1);
      }
    }
  }

  if (process.argv.includes('--dry-run')) {
    console.log('DRY-RUN: patches listos, no se hace PUT.');
    return;
  }

  const putPayload = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings };
  const resPut = await api('PUT', '/workflows/' + workflowId, putPayload);
  if (resPut.status !== 200) {
    console.error('Error al actualizar:', resPut.status, JSON.stringify(resPut).slice(0, 2000));
    process.exit(1);
  }
  console.log('🚀 WORKFLOW SKU-VARIANTES OK (ID:', resPut.data.id, ')');

  // Verificación posterior
  const resVerify = await api('GET', '/workflows/' + workflowId);
  if (resVerify.status === 200) {
    const byName = Object.fromEntries((resVerify.data.nodes || []).map((n) => [n.name, n]));
    const promptOk = (byName['Construir prompt + body']?.parameters?.jsCode || '').includes('LECTURA LITERAL vs CANONICO');
    const parseOk = (byName['Parsear JSON1']?.parameters?.jsCode || '').includes('FAMILIA_CONFUSIONES_OCR');
    const resolverOk = (byName['Resolver bodegas1']?.parameters?.jsCode || '').includes('score REAL de la base de datos');
    console.log('Verificación:', { promptOk, parseOk, resolverOk, versionId: resVerify.data.versionId, updatedAt: resVerify.data.updatedAt });
    if (!promptOk || !parseOk || !resolverOk) process.exit(1);
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
