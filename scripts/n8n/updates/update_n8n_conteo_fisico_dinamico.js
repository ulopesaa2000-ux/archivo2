// scripts/n8n/updates/update_n8n_conteo_fisico_dinamico.js
/**
 * Actualiza exclusivamente el workflow `OCR Conteo Físico Hojas de Libreta` (ETNssKuS5jNOHKvf)
 * con:
 *  - Carga dinámica de catálogo activo ("inv-tienda".productos + personas)
 *  - Glosario dinámico de prefijos en el prompt + modelo default "qwen/qwen3.7-flash"
 *  - Preservación de 2 columnas (Izq/Der) y aritmética manuscrita (1.1, 4+2)
 *  - Matcher 2-partes en memoria (sin Perplexity Decider)
 *
 * Uso:
 *   node scripts/n8n/updates/update_n8n_conteo_fisico_dinamico.js --dry-run
 *   node scripts/n8n/updates/update_n8n_conteo_fisico_dinamico.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');

let envConfig = {};
try {
  const envPath = path.resolve(__dirname, '../../../.env.local');
  if (fs.existsSync(envPath)) envConfig = dotenv.parse(fs.readFileSync(envPath));
} catch {}

const N8N_HOST = 'n8n.sistemaindumentaria.com';
const N8N_API_KEY = process.env.N8N_API_KEY || envConfig.N8N_API_KEY || '';
const WORKFLOW_ID = 'ETNssKuS5jNOHKvf';
const PG_CREDENTIAL = { id: 'TsUwT4B6laTQ6i9d', name: 'sandbox postsupa' };

if (!N8N_API_KEY) {
  console.error('ERROR: N8N_API_KEY no encontrada en entorno ni en .env.local');
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');

function api(method, apiPath, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: N8N_HOST,
        path: '/api/v1' + apiPath,
        method,
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          ...(payload
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
            : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const SQL_CARGAR_CATALOGO = `SELECT
  p.id,
  p.sku_base,
  coalesce(p.descripcion, p.nombre, '') AS descripcion,
  p.pz_en_caja,
  p.familia,
  p.persona_id,
  per.nombre_completo AS proveedor_nombre,
  per.prefijo AS proveedor_prefijo
FROM "inv-tienda".productos p
LEFT JOIN "inv-tienda".personas per ON per.id = p.persona_id
WHERE p.activo = true
ORDER BY p.id;`;

const CODE_CONSTRUIR_PROMPT = String.raw`// Construir prompt dinámico y payload para OpenRouter Vision
const meta = $('Normalizar imagen').first()?.json || {};
let webhookBody = {};
try { webhookBody = $('Webhook Conteo Físico').first()?.json?.body || {}; } catch (e) {}

const MODELO_VISION =
  String(webhookBody.modelo_vision || meta.modelo_vision || '').trim() ||
  'deepseek/deepseek-v4.1-flash';

const imageUrl = meta.comprobante_url;
if (!imageUrl) {
  throw new Error('No se encontro URL de imagen para el modelo de vision');
}

// Cargar catálogo activo desde Supabase ("inv-tienda".productos)
let catalogoRows = [];
try {
  catalogoRows = $('Cargar Catálogo Activo')
    .all()
    .map((x) => x.json)
    .filter((r) => r && r.sku_base);
} catch (e) {}

// Extraer prefijos, sufijos frecuentes y diccionario compacto agrupado por raíz
const grupos = new Map();
const sufijosFreq = new Map();

for (const r of catalogoRows) {
  const sku = String(r.sku_base || '').trim().toUpperCase().replace(/\s*([/-])\s*/g, '$1');
  if (!sku) continue;

  const slashIdx = sku.indexOf('/');
  const mAnd = sku.match(/^(AND\d{2})(\d+)$/);
  const mNum = sku.match(/^([13][A-Z]{2})(\d+.*)$/);
  const dashIdx = sku.indexOf('-');

  let raiz = 'OTROS';
  let resto = sku;

  if (slashIdx > 0) {
    raiz = sku.slice(0, slashIdx + 1);
    resto = sku.slice(slashIdx + 1);
    const ms = resto.match(/^\d{1,3}([A-Z0-9]+)$/);
    if (ms && ms[1]) sufijosFreq.set(ms[1], (sufijosFreq.get(ms[1]) || 0) + 1);
  } else if (mAnd) {
    raiz = mAnd[1];
    resto = mAnd[2];
  } else if (mNum) {
    raiz = mNum[1];
    resto = mNum[2];
  } else if (dashIdx > 0) {
    raiz = sku.slice(0, dashIdx + 1);
    resto = sku.slice(dashIdx + 1);
  } else {
    const mLet = sku.match(/^([A-Z]{2,4}\d{0,2})/);
    raiz = mLet ? mLet[1] : 'NUM';
    resto = sku;
  }

  if (!grupos.has(raiz)) grupos.set(raiz, []);
  grupos.get(raiz).push(resto);
}

const diccionarioCatalogo = Array.from(grupos.entries())
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([raiz, items]) => raiz + ': ' + items.join(','))
  .join(' | ');

const topSufijos = Array.from(sufijosFreq.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 24)
  .map(([s]) => s)
  .join(', ');

const PROMPT = [
  'Extractor experto de inventarios físicos manuscritos en hojas de libreta cuadriculada (sin columna de descripción, solo CÓDIGO SKU y CAJAS).',
  'Devuelve ÚNICAMENTE JSON válido (sin markdown ni texto extra). Si la foto viene rotada 90°/180°/270°, lee en su orientación real.',
  '',
  '1. ESTRUCTURA DE LA HOJA (2 COLUMNAS INDEPENDIENTES):',
  '   - COLUMNA 1 (IZQUIERDA): mitad izquierda de la página.',
  '   - COLUMNA 2 (DERECHA): mitad derecha de la página.',
  '   - Extrae renglón por renglón cada columna por separado. Cada renglón tiene un CÓDIGO/SKU a la izquierda y su CANTIDAD DE CAJAS enfrente a la derecha.',
  '   - ENCABEZADO OPCIONAL: solo si arriba hay ubicación/bodega o fecha, guárdalos en "encabezado" y "fecha_detectada" como contexto; si no hay o no es claro, déjalos en "" y prioriza 100% extraer SKU + cajas.',
  '',
  '2. ESTRUCTURA DE CÓDIGOS Y CATÁLOGO REAL (' + catalogoRows.length + ' SKUs ACTIVOS):',
  '   - Patrón general: [PREFIJO][AÑO/SERIE][/][CONSECUTIVO][GÉNERO+PRENDA][TELA].',
  '   - Series especiales: J219/3CAC, J908/3DCHL, BO244/3CAVTN, BO/1DSETFE, NR2509-FUR, AND260016 (AND sin \'/\').',
  '   - Sufijos estables: FE (Felpa), LYC (Licra), AF (Afelpado), FUR (Con fur), HC/CAC (Cab Chamarra), MC/DAC (Dama Chamarra), CAV (Cab Chaleco), HW (Cab Rompevientos), SW (Suéter), MA (Abrigo).',
  '   - Sufijos frecuentes en catálogo: ' + (topSufijos || 'HC, CAC, HW, DAC, MW, SW, DAS, MSTFE, GC, DACL, MSD, BC') + '.',
  '   - Formato compacto OBLIGATORIO sin espacios en \'/\' ni \'-\' y sin punto final (\'J219/3CAC\', \'NR2509-FUR\', \'MK26/13SW\', \'AND230020\').',
  '   - Diccionario compacto del catálogo activo (raíz: terminaciones válidas):',
  '     ' + diccionarioCatalogo,
  '   - REGLA DE LECTURA Y VARIANTES (UN MATCHER EN BD VALIDARÁ EL MATCH FINAL):',
  '     * "estilo_raw": transcribe LITERALMENTE lo escrito en la hoja.',
  '     * Si el código coincide claro con el catálogo: ponlo en "sku_candidato" y "estilo_raw", y deja "posibles_variantes": [].',
  '     * Si dudas en 1-2 trazos (0<->O<->D<->Q, U<->V, H<->M<->N, S<->5, 1<->I<->L, J<->Y, AN0/AU0->AND, B0->BO, Y5->YS, letra cortada): usa el diccionario del catálogo para poner la mejor lectura en "sku_candidato", mantén el trazo literal en "estilo_raw", agrega 2-3 alternativas del catálogo en "posibles_variantes" y pon confianza < 0.90.',
  '',
  '3. CANTIDADES Y OPERACIONES ARITMÉTICAS (REGLA CRÍTICA):',
  '   - "1.1" = 1 + 1 = 2 cajas. "1.1.1" = 3 cajas.',
  '   - "4+2" = 6 cajas. "1+6" = 7 cajas.',
  '   - Fracciones "1/2" / ".5" = 0.5. Número directo ("3", "18") = ese valor. Si hay tachadura, toma el número final.',
  '   - "cajas_raw": anotación visual exacta enfrente del código (ej: "4+2", "1.1", "18").',
  '   - "cajas": resultado numérico total calculado (ej: 6, 2, 18).',
  '',
  '4. FORMATO DE SALIDA JSON EXACTO:',
  '{',
  '  "encabezado": "",',
  '  "fecha_detectada": "",',
  '  "renglones": [',
  '    {',
  '      "columna": 1,',
  '      "renglon": 1,',
  '      "estilo_raw": "AU0230020",',
  '      "sku_candidato": "AND230020",',
  '      "posibles_variantes": ["AU0230020", "AND230020"],',
  '      "cajas_raw": "1.1",',
  '      "cajas": 2,',
  '      "confianza": 0.88',
  '    }',
  '  ]',
  '}',
].join('\n');

const body = {
  model: MODELO_VISION,
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: PROMPT },
        { type: 'image_url', image_url: { url: imageUrl } },
      ],
    },
  ],
  reasoning: { enabled: false },
  temperature: 0.1,
  max_tokens: 16384,
};

return [
  {
    json: {
      prompt_body: body,
      comprobante_url: imageUrl,
      numero_hoja: meta.numero_hoja || 1,
      total_hojas: meta.total_hojas || 1,
    },
  },
];`;

const CODE_PARSEAR_CONTEO = String.raw`const item = $input.first()?.json || {};
const meta = $('Construir Prompt Conteo').first()?.json || {};

let rawContent = '';
if (item.choices && item.choices[0]) {
  const msg = item.choices[0].message;
  rawContent = msg && typeof msg.content === 'string' ? msg.content : item.choices[0].text || '';
} else if (item.candidates && item.candidates[0]?.content?.parts?.[0]?.text) {
  rawContent = item.candidates[0].content.parts[0].text;
} else if (typeof item === 'string') {
  rawContent = item;
}

let jsonStr = rawContent
  .replace(new RegExp('\\x60{3}(?:json)?\\s*([\\s\\S]*?)\\s*\\x60{3}', 'gi'), '$1')
  .trim();

let parsed = {};
try {
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    parsed = JSON.parse(jsonStr.substring(firstBrace, lastBrace + 1));
  } else {
    parsed = JSON.parse(jsonStr);
  }
} catch (e1) {
  try {
    const lastObjClose = jsonStr.lastIndexOf('}');
    if (lastObjClose !== -1) {
      const repaired = jsonStr.substring(0, lastObjClose + 1) + '\n  ]\n}';
      const firstBrace = repaired.indexOf('{');
      const lastBrace = repaired.lastIndexOf('}');
      parsed = JSON.parse(repaired.substring(firstBrace, lastBrace + 1));
    }
  } catch (e2) {
    parsed = { renglones: [] };
  }
}

function compactarSkuOcr(value) {
  return String(value == null ? '' : value)
    .toUpperCase()
    .trim()
    .replace(/\s*([/-])\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]+$/g, '')
    .trim();
}

const RE_AND_SLASH = /^AND(\d{2})\s*\/\s*(\d{4})([A-Z]{0,4})$/i;
function canonicalizarAnd(v) {
  let raw = compactarSkuOcr(v);
  raw = raw.replace(/\bAND\s+([\d\s]{5,})\b/gi, (_m, digitos) => 'AND' + digitos.replace(/\s+/g, ''));
  const m = raw.match(RE_AND_SLASH);
  return m ? ('AND' + m[1] + m[2]).toUpperCase() : raw.replace(/\s+/g, '');
}

function evaluarCajas(rawStr, defaultNum) {
  if (rawStr === undefined || rawStr === null) return Number(defaultNum) || 0;
  const s = String(rawStr).trim();
  if (!s) return Number(defaultNum) || 0;

  if (s.includes('+')) {
    const partes = s.split('+').map((p) => parseFloat(p.trim())).filter((n) => !isNaN(n));
    if (partes.length > 0) return partes.reduce((acc, curr) => acc + curr, 0);
  }

  if (s.includes('.') && !s.startsWith('0.') && !s.startsWith('.')) {
    const partes = s.split('.').map((p) => p.trim()).filter(Boolean);
    const todosEnteros = partes.every((p) => /^\d+$/.test(p));
    if (todosEnteros && partes.length > 1) {
      return partes.map(Number).reduce((acc, curr) => acc + curr, 0);
    }
  }

  const n = parseFloat(s.replace(/,/g, '.'));
  return !isNaN(n) ? n : Number(defaultNum) || 0;
}

const renglonesOriginales = Array.isArray(parsed.renglones) ? parsed.renglones : [];
let totalCajasCol1 = 0;
let totalRenglonesCol1 = 0;
let totalCajasCol2 = 0;
let totalRenglonesCol2 = 0;

const renglonesProcesados = renglonesOriginales.map((r, idx) => {
  const col = r.columna === 2 || r.columna === '2' || r.columna === 'der' || r.columna === 'derecha' ? 2 : 1;
  const rawCajas = r.cajas_raw !== undefined ? String(r.cajas_raw) : r.cajas !== undefined ? String(r.cajas) : '1';
  const cajasFinales = evaluarCajas(rawCajas, r.cajas || 1);
  const estilo = String(r.estilo_raw || r.sku_candidato || '').trim();
  const sku = canonicalizarAnd(r.sku_candidato || r.estilo_raw || '');

  const vars = Array.isArray(r.posibles_variantes)
    ? Array.from(new Set(r.posibles_variantes.map((v) => canonicalizarAnd(v)).filter(Boolean)))
    : [];
  if (estilo) {
    const estiloCand = canonicalizarAnd(estilo);
    if (estiloCand && estiloCand !== sku && !vars.includes(estiloCand)) vars.push(estiloCand);
  }

  if (col === 1) {
    totalCajasCol1 += cajasFinales;
    totalRenglonesCol1++;
  } else {
    totalCajasCol2 += cajasFinales;
    totalRenglonesCol2++;
  }

  return {
    id: 'h' + (meta.numero_hoja || 1) + '_c' + col + '_r' + (r.renglon || idx + 1),
    numero_hoja: meta.numero_hoja || 1,
    columna: col,
    renglon: r.renglon || idx + 1,
    estilo_raw: estilo,
    sku_candidato: sku,
    posibles_variantes: vars,
    cajas_raw: rawCajas,
    cajas: cajasFinales,
    confianza: typeof r.confianza === 'number' ? r.confianza : 0.95,
  };
});

return [
  {
    json: {
      ok: true,
      numero_hoja: meta.numero_hoja || 1,
      total_hojas: meta.total_hojas || 1,
      comprobante_url: meta.comprobante_url,
      encabezado: parsed.encabezado || '',
      fecha_detectada: parsed.fecha_detectada || '',
      resumen: {
        columna_1: { renglones: totalRenglonesCol1, cajas: totalCajasCol1 },
        columna_2: { renglones: totalRenglonesCol2, cajas: totalCajasCol2 },
        total_hoja: {
          renglones: totalRenglonesCol1 + totalRenglonesCol2,
          cajas: totalCajasCol1 + totalCajasCol2,
        },
      },
      renglones: renglonesProcesados,
    },
  },
];`;

const CODE_MATCHER_2_PARTES = String.raw`const payload = $('Parsear y Calcular Conteo').first()?.json || {};
let catalogoRows = [];
try {
  catalogoRows = $('Cargar Catálogo Activo')
    .all()
    .map((x) => x.json)
    .filter((r) => r && r.sku_base);
} catch (e) {}

const OCR_PAIRS = [
  ['0','O',0.20], ['0','D',0.25], ['O','D',0.25], ['0','Q',0.25], ['O','Q',0.25],
  ['U','V',0.20], ['U','O',0.35], ['U','0',0.35], ['U','C',0.35],
  ['M','H',0.25], ['H','N',0.35], ['M','N',0.35],
  ['A','N',0.35], ['A','4',0.30], ['A','V',0.35],
  ['S','5',0.20], ['S','I',0.35], ['S','B',0.40], ['5','B',0.35],
  ['B','8',0.25], ['8','P',0.40],
  ['1','I',0.20], ['1','L',0.25], ['1','7',0.35], ['I','L',0.25],
  ['2','7',0.35], ['2','Z',0.25],
  ['C','G',0.35], ['C','W',0.35], ['G','6',0.30],
  ['J','Y',0.30], ['T','7',0.30], ['F','E',0.35],
  ['D','N',0.35], ['P','R',0.35], ['K','R',0.40], ['E','3',0.35], ['L','C',0.40]
];
const SUB_COST = new Map();
for (const [a, b, c] of OCR_PAIRS) { SUB_COST.set(a + b, c); SUB_COST.set(b + a, c); }

function compactarSkuOcr(v) {
  return String(v == null ? '' : v).toUpperCase().trim()
    .replace(/\s*([/-])\s*/g, '$1').replace(/\s+/g, ' ').replace(/[.,;:]+$/g, '').trim();
}
function normalizarSku(v) {
  return String(v == null ? '' : v).toUpperCase().replace(/[\s.,\-/]+/g, '').trim();
}
function charCost(ca, cb) {
  if (ca === cb) return 0;
  const k = SUB_COST.get(ca + cb);
  if (k !== undefined) return k;
  if (/\d/.test(ca) && /\d/.test(cb)) return 1.45;
  return 1.0;
}
function ocrDist(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Float64Array(n + 1));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const ca = a[i - 1], cb = b[j - 1];
      let best = Math.min(dp[i - 1][j] + 1.0, dp[i][j - 1] + 1.0, dp[i - 1][j - 1] + charCost(ca, cb));
      if (i > 1 && j > 1 && ca === b[j - 2] && a[i - 2] === cb) best = Math.min(best, dp[i - 2][j - 2] + 0.5);
      dp[i][j] = best;
    }
  }
  return dp[m][n];
}
function partirDosPartes(code) {
  const c = compactarSkuOcr(code);
  const idx = c.search(/[/-]/);
  if (idx > 0 && idx < c.length - 1) return { p1: normalizarSku(c.slice(0, idx)), p2: normalizarSku(c.slice(idx + 1)), hasSep: true };
  const mAnd = c.match(/^([A-Z0-9]{2,3})(\d{6})$/);
  if (mAnd) return { p1: mAnd[1] + mAnd[2].slice(0, 2), p2: mAnd[2].slice(2), hasSep: false };
  const mGen = c.match(/^([A-Z]{1,4}\d{2})(\d{2}[A-Z0-9]*)$/);
  if (mGen) return { p1: mGen[1], p2: mGen[2], hasSep: false };
  return { p1: normalizarSku(c), p2: '', hasSep: false };
}
function extraerTokens(sku) {
  const c = compactarSkuOcr(sku);
  if (!c) return [];
  const toks = [c];
  const sp = c.split(' ').filter(Boolean);
  if (sp.length > 1) sp.forEach((x) => { const cl = x.replace(/^\/+|\/+$/g, ''); if (cl) toks.push(cl); });
  return Array.from(new Set(toks));
}
function alinearDiffSpan(a, b) {
  const m = a.length, n = b.length;
  if (!m) return Array.from({ length: n }, (_, i) => i);
  if (!n) return [];
  const dp = Array.from({ length: m + 1 }, () => new Float64Array(n + 1));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1.0, dp[i][j - 1] + 1.0, dp[i - 1][j - 1] + charCost(a[i - 1], b[j - 1]));
    }
  }
  const diff = new Set();
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && Math.abs(dp[i][j] - (dp[i - 1][j - 1] + charCost(a[i - 1], b[j - 1]))) < 1e-6) {
      if (a[i - 1] !== b[j - 1]) diff.add(j - 1);
      i--; j--;
    } else if (j > 0 && (i === 0 || Math.abs(dp[i][j] - (dp[i][j - 1] + 1.0)) < 1e-6)) {
      diff.add(j - 1); j--;
    } else { i--; }
  }
  return Array.from(diff).sort((x, y) => x - y);
}

const catalogoIdx = catalogoRows.map((r) => {
  const sku_compacto = compactarSkuOcr(r.sku_base);
  const tokens = extraerTokens(r.sku_base);
  return {
    id: Number(r.id),
    sku_base: String(r.sku_base),
    descripcion: r.descripcion || '',
    pz_en_caja: r.pz_en_caja != null ? Number(r.pz_en_caja) : null,
    familia: r.familia || null,
    proveedor_nombre: r.proveedor_nombre || null,
    sku_compacto,
    sku_alnum: normalizarSku(sku_compacto),
    tokens_alnum: tokens.map(normalizarSku),
    partes_por_token: tokens.map(partirDosPartes),
  };
});

const renglonesEnriquecidos = (payload.renglones || []).map((r) => {
  const estiloCompacto = compactarSkuOcr(r.sku_candidato || r.estilo_raw || '');
  const inAlnum = normalizarSku(estiloCompacto);
  const inParts = partirDosPartes(estiloCompacto);
  const varSet = new Set();
  if (Array.isArray(r.posibles_variantes)) {
    for (const v of r.posibles_variantes) {
      const vn = normalizarSku(v);
      if (vn && vn !== inAlnum) varSet.add(vn);
    }
  }

  const cands = [];
  for (const prod of catalogoIdx) {
    if (inAlnum && prod.sku_alnum === inAlnum) {
      cands.push({
        producto_id: prod.id,
        sku: prod.sku_base,
        nombre: prod.descripcion,
        familia: prod.familia,
        pz_en_caja: prod.pz_en_caja,
        proveedor_nombre: prod.proveedor_nombre,
        score: 1.0,
        metodo: 'EXACTO',
        diff_indices: [],
      });
      continue;
    }

    let bestScore = 0, bestMetodo = 'OCR_EDIT';
    for (let t = 0; t < prod.tokens_alnum.length; t++) {
      const tAlnum = prod.tokens_alnum[t];
      if (!tAlnum) continue;
      if (inAlnum && tAlnum === inAlnum && 0.99 > bestScore) {
        bestScore = 0.99; bestMetodo = 'EXACTO_TOKEN'; continue;
      }
      const tParts = prod.partes_por_token[t];
      if (inParts.hasSep && tParts.hasSep && inParts.p1 && tParts.p1) {
        const d1 = ocrDist(inParts.p1, tParts.p1);
        const sim1 = Math.max(0, 1 - d1 / Math.max(inParts.p1.length, tParts.p1.length));
        if (sim1 >= 0.60) {
          let sim2 = 0;
          if (inParts.p2 && tParts.p2) {
            if (tParts.p2.startsWith(inParts.p2) && inParts.p2.length >= 2) {
              sim2 = 0.85 + 0.09 * (inParts.p2.length / tParts.p2.length);
            } else {
              const d2 = ocrDist(inParts.p2, tParts.p2);
              sim2 = Math.max(0, 1 - d2 / Math.max(inParts.p2.length, tParts.p2.length));
            }
          }
          const combined = (sim1 * 0.50 + sim2 * 0.50) * 0.96;
          if (combined > bestScore) { bestScore = combined; bestMetodo = 'CRUCE_2_PARTES'; }
        }
      }
      if (inAlnum && Math.abs(inAlnum.length - tAlnum.length) <= 4) {
        const d = ocrDist(inAlnum, tAlnum);
        const sim = Math.max(0, (1 - d / Math.max(inAlnum.length, tAlnum.length)) * 0.95);
        if (sim > bestScore) { bestScore = sim; bestMetodo = 'OCR_EDIT'; }
      }
      if (inParts.hasSep && inParts.p1.length >= 6 && tAlnum.length >= 6) {
        const d = ocrDist(inParts.p1, tAlnum);
        const sim = Math.max(0, (1 - d / Math.max(inParts.p1.length, tAlnum.length)) * 0.89);
        if (sim > bestScore) { bestScore = sim; bestMetodo = 'TOKEN_BASE'; }
      }
    }

    if (bestScore < 0.86 && varSet.size > 0 && (varSet.has(prod.sku_alnum) || prod.tokens_alnum.some((ta) => varSet.has(ta)))) {
      bestScore = 0.86; bestMetodo = 'PROPUESTA_VARIANTE_IA';
    }

    const finalScore = Number(bestScore.toFixed(4));
    if (finalScore >= 0.60) {
      cands.push({
        producto_id: prod.id,
        sku: prod.sku_base,
        nombre: prod.descripcion,
        familia: prod.familia,
        pz_en_caja: prod.pz_en_caja,
        proveedor_nombre: prod.proveedor_nombre,
        score: finalScore,
        metodo: bestMetodo,
        diff_indices: alinearDiffSpan(estiloCompacto, compactarSkuOcr(prod.sku_base)),
      });
    }
  }

  cands.sort((a, b) => b.score - a.score || a.producto_id - b.producto_id);
  const topCands = cands.slice(0, 5);
  const top = topCands[0] || null;
  const second = topCands[1] || null;
  const margin = top ? top.score - (second ? second.score : 0) : 0;

  const autoConfirmado = Boolean(top && (top.score >= 0.99 || (top.score >= 0.93 && margin >= 0.10)));
  const esPropuesta = Boolean(!autoConfirmado && top && top.score >= 0.70);

  return Object.assign({}, r, {
    producto_id: autoConfirmado ? top.producto_id : null,
    sku_match: autoConfirmado ? top.sku : null,
    descripcion: autoConfirmado ? top.nombre : null,
    familia: autoConfirmado ? top.familia : null,
    match_score: top ? top.score : 0,
    metodo_match: top ? top.metodo : null,
    es_propuesta: esPropuesta,
    propuesta_producto_id: esPropuesta ? top.producto_id : null,
    propuesta_sku: esPropuesta ? top.sku : null,
    propuesta_descripcion: esPropuesta ? top.nombre : null,
    propuesta_familia: esPropuesta ? top.familia : null,
    candidatos: topCands,
  });
});

return [
  {
    json: Object.assign({}, payload, {
      renglones: renglonesEnriquecidos,
    }),
  },
];`;

async function run() {
  console.log('Consultando workflow', WORKFLOW_ID, '...');
  const resGet = await api('GET', '/workflows/' + WORKFLOW_ID);
  if (resGet.status !== 200) {
    console.error('Error al obtener workflow:', resGet.status, resGet);
    process.exit(1);
  }
  const wf = resGet.data;

  // Backup previo
  const backupDir = path.resolve(__dirname, '../../../scripts/backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `workflow_${WORKFLOW_ID}_${ts}.json`);
  if (!dryRun) {
    fs.writeFileSync(backupPath, JSON.stringify(wf, null, 2), 'utf8');
    console.log('Backup guardado en:', backupPath);
  }

  // Verificar sintaxis JS antes de enviar
  for (const [name, code] of [
    ['Construir Prompt Conteo', CODE_CONSTRUIR_PROMPT],
    ['Parsear y Calcular Conteo', CODE_PARSEAR_CONTEO],
    ['Matcher 2-Partes', CODE_MATCHER_2_PARTES],
  ]) {
    try {
      new Function(code);
      console.log('✓ Sintaxis JS OK:', name);
    } catch (err) {
      console.error('✗ Sintaxis rota en', name, ':', err.message);
      process.exit(1);
    }
  }

  const keepNames = new Set([
    'Webhook Conteo Físico',
    'Normalizar imagen',
    'Subir imagen al bucket',
    'OpenRouter Vision',
    'Responder Webhook',
  ]);
  const preservedNodes = (wf.nodes || []).filter((n) => keepNames.has(n.name));

  // Ajustar posiciones
  const setPos = (name, pos) => {
    const n = preservedNodes.find((x) => x.name === name);
    if (n) n.position = pos;
  };
  setPos('Webhook Conteo Físico', [100, 300]);
  setPos('Normalizar imagen', [300, 300]);
  setPos('Subir imagen al bucket', [500, 300]);
  setPos('OpenRouter Vision', [1120, 300]);
  setPos('Responder Webhook', [1720, 300]);

  const nodoCatalogo = {
    id: crypto.randomUUID(),
    name: 'Cargar Catálogo Activo',
    type: 'n8n-nodes-base.postgres',
    typeVersion: 2.6,
    position: [700, 300],
    credentials: { postgres: PG_CREDENTIAL },
    parameters: {
      operation: 'executeQuery',
      query: SQL_CARGAR_CATALOGO,
      options: {},
    },
  };

  const nodoPrompt = {
    id: 'cf-prompt-node',
    name: 'Construir Prompt Conteo',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [910, 300],
    parameters: { jsCode: CODE_CONSTRUIR_PROMPT },
  };

  const nodoParse = {
    id: 'cf-parse-node',
    name: 'Parsear y Calcular Conteo',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1320, 300],
    parameters: { jsCode: CODE_PARSEAR_CONTEO },
  };

  const nodoMatcher = {
    id: crypto.randomUUID(),
    name: 'Matcher 2-Partes',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1520, 300],
    parameters: { mode: 'runOnceForAllItems', jsCode: CODE_MATCHER_2_PARTES },
  };

  const newNodes = [...preservedNodes, nodoCatalogo, nodoPrompt, nodoParse, nodoMatcher];

  const newConnections = {
    'Webhook Conteo Físico': { main: [[{ node: 'Normalizar imagen', type: 'main', index: 0 }]] },
    'Normalizar imagen': { main: [[{ node: 'Subir imagen al bucket', type: 'main', index: 0 }]] },
    'Subir imagen al bucket': { main: [[{ node: 'Cargar Catálogo Activo', type: 'main', index: 0 }]] },
    'Cargar Catálogo Activo': { main: [[{ node: 'Construir Prompt Conteo', type: 'main', index: 0 }]] },
    'Construir Prompt Conteo': { main: [[{ node: 'OpenRouter Vision', type: 'main', index: 0 }]] },
    'OpenRouter Vision': { main: [[{ node: 'Parsear y Calcular Conteo', type: 'main', index: 0 }]] },
    'Parsear y Calcular Conteo': { main: [[{ node: 'Matcher 2-Partes', type: 'main', index: 0 }]] },
    'Matcher 2-Partes': { main: [[{ node: 'Responder Webhook', type: 'main', index: 0 }]] },
  };

  if (dryRun) {
    console.log('DRY-RUN OK. Nodos totales:', newNodes.length);
    console.log('Pipeline:', newNodes.map((n) => n.name).join(' | '));
    return;
  }

  const resPut = await api('PUT', '/workflows/' + WORKFLOW_ID, {
    name: wf.name,
    nodes: newNodes,
    connections: newConnections,
    settings: wf.settings,
  });

  if (resPut.status !== 200) {
    console.error('Error al actualizar workflow:', resPut.status, JSON.stringify(resPut).slice(0, 1500));
    process.exit(1);
  }

  await api('POST', '/workflows/' + WORKFLOW_ID + '/activate');

  const verify = await api('GET', '/workflows/' + WORKFLOW_ID);
  console.log('Workflow actualizado:', {
    id: verify.data?.id,
    name: verify.data?.name,
    active: verify.data?.active,
    nodes: (verify.data?.nodes || []).map((n) => n.name),
  });
}

run().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
