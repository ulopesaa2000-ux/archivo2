// scripts/n8n/updates/jackie_parser_code.js
// Codigo fuente del nodo "Parser Multi hoja Jackie/Venkat" (referencia versionada).
// BASELINE v1.3 live (2026-10-06): conversion mecanica a String.raw
// (5 template literals -> concatenacion; sin cambios de logica).
// NOTA String.raw: conserva escapes regex. Sin ${ ni backticks dentro.

const JACKIE_JS = String.raw`// scripts/n8n/updates/node_parser_jackie_complete.js
// Parser Multi-Hoja Jackie / Venkat / QingQing / Honor — inv-tienda n8n Workflow
const MAX_FILAS_PROCESAR = 2500;
const MAX_LINEAS_STAGING = 1200;
const TIME_BUDGET_MS = 25000;
const startedAt = Date.now();

function cleanText(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' && !Number.isFinite(v)) return '';
  if (typeof v === 'object') {
    if (v.result !== undefined) return cleanText(v.result);
    if (v.text !== undefined) return cleanText(v.text);
    if (v.richText) return v.richText.map(t => t.text).join('');
    return '';
  }
  return String(v).replace(/\u00a0/g, ' ').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function norm(v) {
  return cleanText(v)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\u00b3/g, '3')
    .replace(/[^a-z0-9\/\.\-#\s\u3400-\u9fff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasChinese(v) { return /[\u3400-\u9FFF]/.test(String(v || '')); }

function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'object') {
    if (v.result !== undefined) return toNum(v.result);
    return null;
  }
  let s = String(v).trim();
  if (!s) return null;
  if (/\d+\s*[-~～–—─]\s*\d+/.test(s) || /from\s*\d+/i.test(s)) return null;
  s = s.replace(/(pcs|ctns?|kgs?|kg|cm|m3|m³|pz|pzas?)\.?$/i, '').trim();
  if (/[a-zA-Z*×\/=+%]/u.test(s)) return null;
  s = s.replace(/,/g, '').replace(/[^0-9.\-]/g, '');
  if (!s || s === '-' || s === '.') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function round(n, d = 4) { const x = Number(n); return Number.isFinite(x) ? Number(x.toFixed(d)) : null; }
function firstNum(...vals) { for (const v of vals) { const n = toNum(v); if (n !== null) return n; } return null; }
function firstText(...vals) { for (const v of vals) { const s = cleanText(v); if (s) return s; } return ''; }

function safeCode(s) {
  return cleanText(s).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 42) || 'SIN-SKU';
}

function cleanSku(s) {
  const c = cleanText(s).replace(/\s+/g, '').replace(/\n/g, '').trim();
  if (/^styleno\.?$/i.test(c) || /^款号$/i.test(c) || /^style$/i.test(c)) return '';
  return c;
}

function skuKey(s) {
  return cleanText(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function packSan(p) {
  return cleanText(p).toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

// Separa 'JA25/01USD PACK A' (PACK en la misma celda del style, con o sin
// espacio: PACKA) en sku limpio + pack. Sin PACK explicito -> PACK UNICO.
function splitPackStyle(v) {
  const s = cleanText(v);
  const m = s.match(/^(.*?)\s*\bPACK\s*([A-Z0-9]+)\b\s*$/i);
  if (m && cleanText(m[1])) {
    return { sku: cleanSku(m[1]), pack: 'PACK ' + m[2].toUpperCase() };
  }
  return { sku: cleanSku(s), pack: null };
}

function shortHash(str) {
  let h = 0; const s = String(str || '');
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).toUpperCase().slice(0, 5).padStart(5, '0');
}

function parseCartonRange(v) {
  const s = cleanText(v);
  if (!s) return { carton_no_raw: null, carton_inicio: null, carton_fin: null, nota: null };
  const m = s.match(/(\d+)\s*[-~#～–—─]\s*(\d+)/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]);
    return { carton_no_raw: s, carton_inicio: Math.min(a, b), carton_fin: Math.max(a, b), nota: (s.indexOf('...') !== -1 ? 'abreviado' : null) };
  }
  const single = s.match(/(\d+)/);
  if (single) {
    const n = Number(single[1]);
    return { carton_no_raw: s, carton_inicio: n, carton_fin: n, nota: null };
  }
  return { carton_no_raw: s, carton_inicio: null, carton_fin: null, nota: null };
}

function enteroPositivo(v) {
  const n = toNum(v);
  return (typeof n === 'number' && isFinite(n) && Math.floor(n) === n && n > 0) ? n : null;
}

function parsePacksJackie(s) {
  const t = cleanText(s);
  const m = t.match(/(\d+)\s*[×*x]\s*(\d+)\s*packs?\s*=\s*(\d+)/i);
  if (!m) return null;
  return { porPack: Number(m[1]), packs: Number(m[2]), total: Number(m[3]) };
}

const tallaMap = {
  'xs': 'ECH', 'ech': 'ECH', 'exch': 'ECH', 'extra chica': 'ECH',
  's': 'CH', 'ch': 'CH', 'ch/s': 'CH', 's/ch': 'CH', 'chica': 'CH',
  'm': 'M', 'm/m': 'M', 'mediana': 'M',
  'l': 'G', 'g': 'G', 'g/l': 'G', 'l/g': 'G', 'grande': 'G',
  'xl': 'EG', 'eg': 'EG', 'xg': 'EG', 'egxl': 'EG', 'eg/xl': 'EG', 'xl/eg': 'EG', 'extra grande': 'EG',
  'xxl': '2EG', '2xl': '2EG', '2xg': '2EG', '2eg': '2EG', 'eeg': '2EG', 'xxl/2eg': '2EG',
  'xxxl': '3EG', '3xl': '3EG', '3xg': '3EG', '3eg': '3EG',
  '4xl': '4EG', '4xg': '4EG', '4eg': '4EG',
  '5xl': '5EG', '5xg': '5EG', '5eg': '5EG',
  '6xl': '6EG', '6xg': '6EG', '6eg': '6EG',
  'one size': 'UNITALLA', 'onesize': 'UNITALLA', 'unitalla': 'UNITALLA', 'u': 'UNITALLA',
  '0': '0', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '8': '8',
  '10': '10', '12': '12', '14': '14', '16': '16'
,
  // --- TALLAS DOBLES / COMPUESTAS ---
  'ch-m': 'CH-M', 'ch/m': 'CH-M', 's-m': 'CH-M', 's/m': 'CH-M', 'sm': 'CH-M', 'chm': 'CH-M',
  'm-g': 'M-G', 'm/g': 'M-G', 'm-l': 'M-G', 'm/l': 'M-G', 'ml': 'M-G', 'mg': 'M-G',
  'g-eg': 'G-EG', 'g/eg': 'G-EG', 'l-xl': 'G-EG', 'l/xl': 'G-EG', 'lxl': 'G-EG', 'geg': 'G-EG', 'g-xg': 'G-EG', 'g/xg': 'G-EG',
  'eg-2eg': 'EG-2EG', 'eg/2eg': 'EG-2EG', 'xl-2xl': 'EG-2EG', 'xl/2xl': 'EG-2EG', 'xl-xxl': 'EG-2EG', 'xl/xxl': 'EG-2EG',
};

function normalizarTalla(v) {
  const k = norm(v).replace(/\s+/g, '');
  if (!k) return null;
  return tallaMap[k] || tallaMap[norm(v)] || null;
}

function rowValues(row) {
  if (Array.isArray(row)) return row.map(cleanText);
  if (!row || typeof row !== 'object') return [];
  const keys = Object.keys(row).filter(k => !String(k).startsWith('__')).sort((a, b) => {
    const na = Number(a), nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  });
  return keys.map(k => cleanText(row[k]));
}

function findCol(row, matchers, fallback = null) {
  const ms = Array.isArray(matchers) ? matchers : [matchers];
  for (let i = 0; i < (row || []).length; i++) {
    const raw = cleanText(row[i]);
    const n = norm(raw);
    if (!n && !raw) continue;
    for (const m of ms) {
      if (typeof m === 'string' && (n === m || n.includes(m) || raw.includes(m))) return i;
      if (m instanceof RegExp && (m.test(n) || m.test(raw))) return i;
    }
  }
  return fallback;
}

function parseDims(row, dimStart, cbmCol) {
  const nums = [];
  if (dimStart === null || dimStart === undefined || dimStart < 0) return { largo_cm: null, ancho_cm: null, alto_cm: null };
  const end = cbmCol !== null && cbmCol !== undefined && cbmCol > dimStart ? cbmCol : Math.min(row.length, dimStart + 4);
  for (let c = dimStart; c < end; c++) {
    const s = cleanText(row[c]);
    if (!s) continue;
    const parts = s.match(/\d+(?:\.\d+)?/g);
    if (parts && parts.length >= 3) {
      return { largo_cm: round(Number(parts[0]), 2), ancho_cm: round(Number(parts[1]), 2), alto_cm: round(Number(parts[2]), 2) };
    }
    const n = toNum(s);
    if (n !== null) nums.push(n);
  }
  if (nums.length >= 3) {
    let [l, w, h] = nums;
    if (l <= 5 && w <= 5 && h <= 5) { l *= 100; w *= 100; h *= 100; }
    return { largo_cm: round(l, 2), ancho_cm: round(w, 2), alto_cm: round(h, 2) };
  }
  return { largo_cm: null, ancho_cm: null, alto_cm: null };
}

function validateBox(caja, detailsForBox) {
  const issues = [];
  if (!caja.piezas_por_caja || caja.piezas_por_caja <= 0) issues.push('sin_piezas_por_caja');
  if (!caja.cantidad_cajas || caja.cantidad_cajas <= 0) issues.push('sin_cantidad_cajas');
  if (!detailsForBox.length) issues.push('sin_detalle_color_talla');
  const sumaDetalle = detailsForBox.reduce((a, d) => a + (d.cantidad_por_caja || 0), 0);
  if (caja.piezas_por_caja && detailsForBox.length && Math.abs(sumaDetalle - caja.piezas_por_caja) > 0.0001) {
    issues.push('detalle_no_cuadra:' + sumaDetalle + '/' + caja.piezas_por_caja);
  }
  return issues;
}

function buildOrderProducts(boxes) {
  const bySku = new Map();
  for (const c of boxes) {
    if (c.es_resumen) continue;
    const key = c.sku_base;
    const prev = bySku.get(key) || {
      sku_base: c.sku_base,
      producto_id: null,
      piezas_pedidas: 0,
      cajas_pedidas: 0,
      cbm_detalle: 0,
      peso_bruto_kg: 0,
      estado_producto: 'Pendiente'
    };
    prev.piezas_pedidas += c.total_piezas || ((c.cantidad_cajas || 0) * (c.piezas_por_caja || 0));
    prev.cajas_pedidas += c.cantidad_cajas || 0;
    prev.cbm_detalle += c.cbm_total_linea || ((c.cbm_por_caja || 0) * (c.cantidad_cajas || 0));
    prev.peso_bruto_kg += c.peso_bruto_total_kg || ((c.peso_bruto_kg || 0) * (c.cantidad_cajas || 0));
    bySku.set(key, prev);
  }
  return [...bySku.values()].map(x => ({
    ...x,
    piezas_pedidas: round(x.piezas_pedidas, 2),
    cajas_pedidas: round(x.cajas_pedidas, 2),
    cbm_detalle: round(x.cbm_detalle, 4),
    peso_bruto_kg: round(x.peso_bruto_kg, 2)
  }));
}

function detectTotalsInRows(rows) {
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    const s0 = norm(row[0] || '');
    const s1 = norm(row[1] || '');
    const s2 = norm(row[2] || '');
    if (/^(total|total:|合计|合計)$/i.test(s0) || /^(total|total:|合计|合計)$/i.test(s1) || /^(total|total:|合计|合計)$/i.test(s2)) {
      const nums = row.map(toNum).filter(n => n !== null && n > 0);
      return {
        total_cajas: nums[0] || null,
        total_piezas: nums[1] || null,
        cbm_orden: nums.find(n => n < 100 && n > 0.05) || null,
        peso_bruto_total_kg: nums.find(n => n > 100) || null,
        peso_neto_total_kg: null
      };
    }
  }
  return null;
}

// ============================================================================
// PARSER MULTI-HOJA BILINGÜE JACKIE / VENKAT / QINGQING / HONOR v1.3
// ============================================================================
// === Bloque v2: columnas por encabezado normalizado (bilingüe, exacto) ===
// norm() ya minúsculas; se compara igualdad exacta (norm o raw) para no
// confundir 'ctn' con 'ctn no', 'g.w' con 'total g.w', 'cbm' con 'cbm/ctn'.
var JACKIE_COL_ALIASES = [
  ['style', ['style no.', 'style no', 'style', '款号']],
  ['pack', ['pack']],
  ['carton', ['carton no.', 'carton no', 'ctn no.', 'ctn no', '箱号']],
  ['color', ['colour', 'color', '颜色']],
  ['pcs', ['pcs', '件数']],
  ['ctns', ['ctns', '箱数']],
  ['pctn', ['pc/ctn', '件/箱', '件／箱', '件箱']],
  ['tpcs', ['t.pcs', 'total qty', 'total pcs', '总件数']],
  ['gw', ['g.w', '毛重']],
  ['nw', ['n.w', '净重']],
  ['tgw', ['t. g.w', 'total gw', '总毛重']],
  ['tnw', ['t. n.w', 'total nw', '总净重']],
  ['dims', ['meanscm', 'means', 'meas', 'measurement', '箱规cm', '箱规']],
  ['cbmper', ['cbm/ctn', '每箱立方 m3', '每箱立方']],
  ['cbmtotal', ['cbm', '立方数m3', '立方数', 'total cbm']]
];
function jcolMatch(cell, aliases) {
  const n = norm(cell);
  const r = cleanText(cell).toLowerCase();
  for (let k = 0; k < aliases.length; k++) {
    if (n === aliases[k] || r === aliases[k]) return true;
  }
  return false;
}
function resolveJackieCols(headersRow) {
  const out = { style: -1, pack: -1, carton: -1, color: -1, pcs: -1, ctns: -1, pctn: -1, tpcs: -1, gw: -1, nw: -1, tgw: -1, tnw: -1, dims: -1, cbmper: -1, cbmtotal: -1 };
  const row = headersRow || [];
  for (let i = 0; i < row.length; i++) {
    for (let a = 0; a < JACKIE_COL_ALIASES.length; a++) {
      const key = JACKIE_COL_ALIASES[a][0];
      if (out[key] >= 0) continue;
      if (jcolMatch(row[i], JACKIE_COL_ALIASES[a][1])) out[key] = i;
    }
  }
  return out;
}
function dimsVolume(dims) {
  if (!dims || !dims.largo_cm || !dims.ancho_cm || !dims.alto_cm) return null;
  return (dims.largo_cm * dims.ancho_cm * dims.alto_cm) / 1000000;
}
function parsePackingListJackieVenkatMultiSheet(sheets, cfg = {}, inputItemCount = 0) {
  const warnings = [];
  const proveedorInput = cleanText(cfg.proveedor || cfg.provider || cfg.Proveedor || 'Jackie/Venkat') || 'Jackie/Venkat';
  const clienteB2bId = firstNum(cfg.cliente_b2b_id, cfg['Cliente B2B ID']) || null;
  const proveedorId = firstNum(cfg.proveedor_id, cfg['Proveedor ID']) || null;
  const ordenId = firstNum(cfg.orden_id, cfg['Orden ID']) || null;

  function sheetLooksDetail(sheet) {
    const joined = (sheet.rows || []).slice(0, 8).map(r => (r || []).map(cleanText).join(' ')).join(' ').toLowerCase();
    const hasStyle = /style/.test(joined) || /款号/.test(joined);
    const hasCarton = /(carton|ctn)/.test(joined) || /箱号/.test(joined);
    const hasColor = /(colour|color)/.test(joined) || /颜色/.test(joined);
    const hasPc = /(pc\/ctn|ctn)/.test(joined) || /件\/箱|件／箱|件数|箱数/.test(joined);
    return hasStyle && (hasCarton || hasColor) && (hasPc || hasCarton);
  }

  function findDetailHeaderRow(rows) {
    for (let i = 0; i < Math.min(rows.length, 12); i++) {
      const j = (rows[i] || []).map(cleanText).join(' ').toLowerCase();
      const hasStyle = /style/.test(j) || /款号/.test(j);
      const hasCarton = /(carton|ctn)/.test(j) || /箱号/.test(j);
      const hasColor = /(colour|color)/.test(j) || /颜色/.test(j);
      const hasSpecs = /size/.test(j) || /规格|尺码/.test(j);
      if (hasStyle && (hasCarton || hasColor || hasSpecs)) return i;
    }
    return -1;
  }

  function parseMainMetadata(mainSheet) {
    const metaByKey = new Map();
    const coverSku = new Map();
    const coverTotals = { cajas: null, piezas: null, gw: null, nw: null, cbm: null, ctnsOk: false };
    if (!mainSheet || !mainSheet.rows) return { metaByKey: metaByKey, coverSku: coverSku, coverTotals: coverTotals };
    const rows = mainSheet.rows.filter(r => (r || []).some(v => cleanText(v) !== ''));

    let hIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const j = (rows[i] || []).map(cleanText).join(' ').toLowerCase();
      if ((/style\s*no|style|款号/.test(j)) && (/fabric|brand|item|standard|precio|price|ctn|品名|成份|唛头/.test(j))) {
        hIdx = i;
        break;
      }
    }
    if (hIdx < 0) return { metaByKey: metaByKey, coverSku: coverSku, coverTotals: coverTotals };

    const h = rows[hIdx];
    const colFabric = findCol(h, ['fabric', 'composition', 'composicion', 'compostion', '成份', '英文成份'], 0);
    const colBrand = findCol(h, ['brand', 'marca', '唛头'], 1);
    const colItem = findCol(h, ['item', 'standard', 'description', 'descripcion', 'descrip', '品名', '西班牙文品名'], 2);
    const colStyle = findCol(h, ['style no', 'style', '款号'], 3);
    const colPrice = findCol(h, ['precio usd', 'precio yuan', 'precio', 'price usd', 'price', '单价'], null);
    const jxc = resolveJackieCols(h);
    const colCtnsCov = jxc.ctns;
    const colTpcsCov = jxc.tpcs;
    const colTgwCov = jxc.tgw;
    const colTnwCov = jxc.tnw;
    const colCbmCov = jxc.cbmtotal;
    const colGwCov = jxc.gw;
    const colPcCov = jxc.pctn;
    coverTotals.ctnsOk = colCtnsCov >= 0;

    let currentComposition = '';
    let currentBrand = '';
    let lastCoverStyle = '';
    let lastCoverPack = 'PACK UNICO';

    for (let r = hIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      const s0 = norm(row[0] || '');
      const s1 = norm(row[1] || '');
      const s2 = norm(row[2] || '');
      const s3 = norm(row[3] || '');
      if (/^(total|total:|合计|合計)$/i.test(s0) || /^(total|total:|合计|合計)$/i.test(s1) || /^(total|total:|合计|合計)$/i.test(s2) || /^(total|total:|合计|合計)$/i.test(s3)) {
        if (colCtnsCov >= 0) coverTotals.cajas = toNum(row[colCtnsCov]);
        if (colTpcsCov >= 0) coverTotals.piezas = toNum(row[colTpcsCov]);
        if (colTgwCov >= 0) coverTotals.gw = toNum(row[colTgwCov]);
        if (colTnwCov >= 0) coverTotals.nw = toNum(row[colTnwCov]);
        if (colCbmCov >= 0) coverTotals.cbm = toNum(row[colCbmCov]);
        break;
      }

      const styleCellCov = splitPackStyle(row[colStyle]);
      if (styleCellCov.sku) {
        lastCoverStyle = styleCellCov.sku;
        lastCoverPack = styleCellCov.pack || 'PACK UNICO';
      }
      const style = styleCellCov.sku || lastCoverStyle;
      if (!style) continue;
      const packCov = styleCellCov.pack || (!styleCellCov.sku ? lastCoverPack : 'PACK UNICO');

      const ck = skuKey(style) + '||' + packCov;
      if (!coverSku.has(ck)) coverSku.set(ck, { sku_base: style, pack: packCov, ctnsVals: [], tpcsVals: [], huecosCtns: false });
      const cs = coverSku.get(ck);
      if (colCtnsCov >= 0) {
        const q = toNum(row[colCtnsCov]);
        if (q !== null) cs.ctnsVals.push(q);
        else if (cleanText(row[colCtnsCov]) === '' && (cleanText(row[colStyle]) !== '' || (colTpcsCov >= 0 && toNum(row[colTpcsCov]) !== null) || (colGwCov >= 0 && toNum(row[colGwCov]) !== null) || (colPcCov >= 0 && toNum(row[colPcCov]) !== null) || (colTgwCov >= 0 && toNum(row[colTgwCov]) !== null))) cs.huecosCtns = true;
      }
      if (colTpcsCov >= 0) {
        const t = toNum(row[colTpcsCov]);
        if (t !== null) cs.tpcsVals.push(t);
      }

      const composition = cleanText(row[colFabric]) || currentComposition;
      const brand = cleanText(row[colBrand]) || currentBrand;
      if (cleanText(row[colFabric])) currentComposition = cleanText(row[colFabric]);
      if (cleanText(row[colBrand])) currentBrand = cleanText(row[colBrand]);

      const meta = {
        sku_base: style,
        sku_raw: style,
        composicion: composition || null,
        marca: brand || null,
        descripcion: cleanText(row[colItem]) || (metaByKey.has(skuKey(style)) ? metaByKey.get(skuKey(style)).descripcion : null) || null,
        precio_usd: (colPrice !== null ? toNum(row[colPrice]) : null) || (metaByKey.has(skuKey(style)) ? metaByKey.get(skuKey(style)).precio_usd : null) || null,
        precio_yuan: null
      };
      metaByKey.set(skuKey(style), meta);
    }
    return { metaByKey: metaByKey, coverSku: coverSku, coverTotals: coverTotals };
  }

  const allSheets = Array.isArray(sheets) ? sheets : [];
  const mainSheet = allSheets[0] || null;
  const metaInfo = parseMainMetadata(mainSheet);
  const metaByKey = metaInfo.metaByKey;
  const coverSku = metaInfo.coverSku;
  const coverTotals = metaInfo.coverTotals;
  const detailSheets = allSheets.filter((s, idx) => idx > 0 && sheetLooksDetail(s));

  if (!detailSheets.length) {
    warnings.push({
      tipo: 'jackie_venkat_sin_hojas_detalle',
      severidad: 'alta',
      mensaje: 'No se encontraron hojas por SKU Jackie/Venkat con encabezados en chino o inglés.'
    });
  }

  const productosMap = new Map();
  const cajas = [];
  const detalles = [];
  const lineasStaging = [];
  var totalesPorHoja = [];
  var printedPorHoja = new Map();
  var sheetSkusPorHoja = new Map();
  var parseMsPorHoja = [];
  var cortadoPorTiempo = false;
  var avisoStagingLleno = false;

  function upsertProduct(sku, brandFromSheet = '') {
    const key = skuKey(sku);
    const meta = metaByKey.get(key) || {};
    if (!productosMap.has(key)) {
      productosMap.set(key, {
        sku_base: cleanSku(sku),
        sku_raw: cleanSku(sku),
        nombre: null,
        marca: meta.marca || brandFromSheet || null,
        descripcion: meta.descripcion || null,
        composicion: meta.composicion || null,
        precio_usd: meta.precio_usd || null,
        precio_yuan: meta.precio_yuan || null,
        precio_unitario_usd: meta.precio_usd || null,
        estado_temporal: 'pendiente_revision'
      });
    } else {
      const p = productosMap.get(key);
      if (!p.marca && (meta.marca || brandFromSheet)) p.marca = meta.marca || brandFromSheet;
      if (!p.descripcion && meta.descripcion) p.descripcion = meta.descripcion;
      if (!p.composicion && meta.composicion) p.composicion = meta.composicion;
      if (!p.precio_usd && meta.precio_usd) p.precio_usd = meta.precio_usd;
    }
  }

  function detectSizeColumnsVertical(rows, hIdx, colSizeBase, colColor, colQtyColor, colCtn, colPc) {
    const startCol = colSizeBase !== null ? colSizeBase : (colColor !== null ? colColor + 1 : 2);
    const endCol = colQtyColor !== null ? colQtyColor : (colCtn !== null ? colCtn : Math.min((rows[hIdx] || []).length, startCol + 10));

    let bestSizes = [];
    let bestPriority = 0;
    let sizeRowIdx = -1;

    for (let r = hIdx; r < Math.min(rows.length, hIdx + 6); r++) {
      const row = rows[r];
      const s0 = norm(row[0] || '');
      const s1 = norm(row[1] || '');
      const s2 = norm(row[2] || '');
      if (/^(total|total:|合计|合計)$/i.test(s0) || /^(total|total:|合计|合計)$/i.test(s1) || /^(total|total:|合计|合計)$/i.test(s2)) continue;

      const j = (row || []).map(cleanText).join(' ').toLowerCase();
      const isCustomer = j.includes('客户号码');
      const isFactory = j.includes('工厂号码');

      const hasLogisticsNums = (colCtn !== null && toNum(row[colCtn]) !== null) || (colPc !== null && toNum(row[colPc]) !== null);
      const hasHeaderWords = /style|color|ctn|pcs|size|颜色|箱号|款号/.test(j);

      if (hasLogisticsNums && !isCustomer && !hasHeaderWords) {
        continue;
      }

      const found = [];
      for (let c = startCol; c < endCol && c < row.length; c++) {
        const val = cleanText(row[c]);
        if (!val) continue;
        if (/^(size|规格|尺码|color|ctn|pcs|style|quantity|ctns|g\.w|n\.w|total)$/i.test(val)) continue;
        const t = normalizarTalla(val);
        if (t) {
          found.push({ col: c, talla: t, raw: val });
        }
      }

      if (found.length > 0) {
        let priority = 0;
        if (isCustomer) {
          priority = 10;
        } else if (hasHeaderWords && found.some(x => isNaN(Number(x.raw)))) {
          priority = 8;
        } else if (found.some(x => isNaN(Number(x.raw)))) {
          priority = 6;
        } else if (isFactory) {
          priority = 3;
        } else {
          priority = 1;
        }

        if (priority > bestPriority) {
          bestPriority = priority;
          bestSizes = found;
          sizeRowIdx = r;
        }
      }
    }

    return { sizeCols: bestSizes, sizeRowIdx, bestPriority };
  }

  for (const sheet of detailSheets) {
    if (cortadoPorTiempo) break;
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      warnings.push({ tipo: 'parser_cortado_por_tiempo', severidad: 'alta', hoja: sheet.name, detalle: 'Presupuesto de tiempo agotado; hoja omitida' });
      cortadoPorTiempo = true;
      break;
    }
    const rows = (sheet.rows || []).filter(r => (r || []).some(v => cleanText(v) !== ''));
    const hIdx = findDetailHeaderRow(rows);
    if (hIdx < 0) continue;

    const h = rows[hIdx];
    const colStyle = findCol(h, ['style no', 'style', '款号'], 0);
    const colCarton = findCol(h, ['carton no', 'ctn no', '箱号'], 1);
    const colColor = findCol(h, ['colour', 'color', '颜色'], 2);
    const colSizeBase = findCol(h, ['size', '规格', '尺码'], 3);
    const colQtyColor = findCol(h, ['quantity', '件数', 'pcs'], null);
    const colCtn = findCol(h, ['ctns', 'ctn', '箱数'], null);
    const colPc = findCol(h, ['pc/ctn', '件/箱', '件／箱'], null);
    const colTotalQty = findCol(h, ['total qty', 'total pcs', '总件数'], null);
    const colGw = findCol(h, ['total gw', 'g.w', '毛重kg', '毛重'], null);
    const colNw = findCol(h, ['total nw', 'n.w', '净重kg', '净重'], null);
    const colTotalGw = findCol(h, ['total gw', '总毛重kg', '总毛重'], null);
    const colTotalNw = findCol(h, ['total nw', '总净重kg', '总净重'], null);
    const colDims = findCol(h, ['means', 'meas', 'measurement', '箱规'], null);
    const colCbm = findCol(h, ['cbm', '立方', '每箱立方'], null);

    // Identificar SKU del modelo (limpio; el PACK va aparte)
    let currentSku = cleanSku(sheet.name);
    for (let r = hIdx + 1; r < Math.min(rows.length, hIdx + 5); r++) {
      const s = splitPackStyle(rows[r][colStyle]).sku;
      if (s && !s.includes('客户') && !s.includes('工厂') && !s.includes('STYLE')) {
        currentSku = s;
        break;
      }
    }
    upsertProduct(currentSku);

    const initialSizes = detectSizeColumnsVertical(rows, hIdx, colSizeBase, colColor, colQtyColor, colCtn, colPc);
    let sizeCols = initialSizes.sizeCols;
    let sizeRowIdx = initialSizes.sizeRowIdx;
    let currentCajaLegacy = null;
    let cajaIndexInSku = 0;

    function createOrGetCajaLegacy(cartonRaw, ctnVal, pcVal, totalQtyVal, gw, nw, dims, cbmTotal) {
      if (currentCajaLegacy) {
        const sameCarton = cartonRaw && currentCajaLegacy.carton_no_raw === cartonRaw;
        const samePc = pcVal !== null && currentCajaLegacy.piezas_por_caja === pcVal;
        if (sameCarton || (samePc && !cartonRaw)) {
          if (!currentCajaLegacy.cantidad_cajas && ctnVal) currentCajaLegacy.cantidad_cajas = ctnVal;
          if (!currentCajaLegacy.total_piezas && totalQtyVal) currentCajaLegacy.total_piezas = totalQtyVal;
          return currentCajaLegacy;
        }
      }

      cajaIndexInSku++;
      const cartonParsed = parseCartonRange(cartonRaw);
      const totalGw = gw && ctnVal ? gw * ctnVal : null;
      const totalNw = nw && ctnVal ? nw * ctnVal : null;
      let cbmPorCaja = null;
      if (cbmTotal !== null && ctnVal) cbmPorCaja = cbmTotal / ctnVal;
      else if (dims.largo_cm && dims.ancho_cm && dims.alto_cm) {
        cbmPorCaja = (dims.largo_cm * dims.ancho_cm * dims.alto_cm) / 1000000;
        if (ctnVal) cbmTotal = cbmPorCaja * ctnVal;
      }

      const boxCode = safeCode(currentSku) + '-CC-' + cajaIndexInSku;
      const newCaja = {
        codigo_caja_temporal: boxCode,
        sku_base: currentSku,
        sku_raw: currentSku,
        nombre_pack: pack,
        producto_id: null,
        proveedor_id: proveedorId,
        piezas_por_caja: pcVal,
        cantidad_cajas: ctnVal,
        total_piezas: totalQtyVal || (ctnVal && pcVal ? ctnVal * pcVal : null),
        carton_no_raw: cartonParsed.carton_no_raw || cartonRaw || null,
        carton_inicio: cartonParsed.carton_inicio,
        carton_fin: cartonParsed.carton_fin,
        peso_neto_kg: nw,
        peso_neto_total_kg: totalNw,
        peso_bruto_kg: gw,
        peso_bruto_total_kg: totalGw,
        largo_cm: dims.largo_cm,
        ancho_cm: dims.ancho_cm,
        alto_cm: dims.alto_cm,
        cbm_por_caja: cbmPorCaja ? round(cbmPorCaja, 6) : null,
        cbm_total_linea: cbmTotal ? round(cbmTotal, 6) : null,
        estado_temporal: 'pendiente_revision',
        hoja_origen: sheet.name
      };
      cajas.push(newCaja);
      currentCajaLegacy = newCaja;
      return newCaja;
    }

    // === Motor v2: bloques fisicos por CTNS (verdad = columna, no carton) ===
    // Un bloque = filas del mismo (Style, Pack, CTNS-grupo, PC/CTN). CTNS se
    // cuenta una sola vez; T.PCS valida; los colores suman la composicion.
    // Hojas fusionadas (CTNS solo en la primera fila del bloque) y planas
    // (CTNS repetido) usan la misma regla de corte.
    var jx = resolveJackieCols(h);
    function pickIx(a, b) { return a >= 0 ? a : ((b === null || b === undefined) ? -1 : b); }
    var ixStyle = pickIx(jx.style, colStyle);
    var ixPack = jx.pack;
    var ixColor = pickIx(jx.color, colColor);
    var ixPcs = pickIx(jx.pcs, colQtyColor);
    var ixCtns = jx.ctns;
    if (ixCtns < 0 && colCtn !== null && colCtn >= 0) {
      var hcCtn = cleanText(h[colCtn]);
      if (!/ctn\s*no\.?|carton\s*no\.?|箱号/i.test(hcCtn)) ixCtns = colCtn;
    }
    var ixPctn = pickIx(jx.pctn, colPc);
    var ixTpcs = pickIx(jx.tpcs, colTotalQty);
    var ixGw = jx.gw;
    var ixNw = jx.nw;
    var ixTgw = jx.tgw;
    var ixTnw = jx.tnw;
    var ixCarton = pickIx(jx.carton, colCarton);
    var ixDims = pickIx(jx.dims, colDims);
    var ixCbmPer = jx.cbmper;
    var ixCbmTotal = jx.cbmtotal;
    function vval(row, i) { return i >= 0 ? row[i] : undefined; }

    var style = currentSku || null;
    var pack = 'PACK UNICO';
    var bloque = null;
    var seqHoja = 0;
    var firstStyleHoja = null;
    var sheetSkus = {};
    var legacyCajasInicio = cajas.length;
    var calcHoja = { cajas: 0, piezas: 0, gw: 0, cbm: 0 };
    var printedHoja = { cajas: null, piezas: null, gw: null, cbm: null };
    var tHojaSheet = Date.now();
    var mergedSheet = false;
    for (var pr = hIdx + 1; pr < rows.length; pr++) {
      var prow = rows[pr] || [];
      var ps0 = norm(prow[0] || '');
      if (/^(total|total:|合计|合計)$/i.test(ps0)) break;
      var pcolor = ixColor >= 0 ? cleanText(vval(prow, ixColor)) : '';
      var pqty = !!pcolor;
      if (!pqty) {
        for (var ps = 0; ps < sizeCols.length; ps++) {
          if (toNum(prow[sizeCols[ps].col]) > 0) { pqty = true; break; }
        }
        if (!pqty && ixPcs >= 0 && cleanText(vval(prow, ixPcs)) !== '') pqty = true;
      }
      if ((pcolor || pqty) && ixCtns >= 0 && cleanText(vval(prow, ixCtns)) === '') { mergedSheet = true; break; }
    }

    function cerrarBloqueHoja() {
      if (!bloque) return;
      var suma = 0;
      for (var di = 0; di < bloque.detalles.length; di++) suma += bloque.detalles[di].cantidad_por_caja || 0;
      bloque.suma_detalle = suma;
      if (bloque.pc == null && bloque.tpcs != null && bloque.ctns) {
        bloque.pc = bloque.tpcs / bloque.ctns;
        bloque.fuente_piezas = 'tpcs_entre_ctns';
      }
      var total = bloque.tpcs != null ? bloque.tpcs : (bloque.pc != null ? bloque.pc * bloque.ctns : null);
      bloque.total = total;
      if (bloque.pc != null && suma !== bloque.pc) {
        warnings.push({ tipo: 'detalle_vs_piezas_por_caja', severidad: 'alta', hoja: sheet.name, fila: bloque.fila_excel, sku_base: bloque.sku, declarado: bloque.pc, detalle: suma });
      }
      if (bloque.tpcs != null && bloque.pc != null && bloque.pc * bloque.ctns !== bloque.tpcs) {
        warnings.push({ tipo: 'ctns_por_piezas_vs_tpcs', severidad: 'alta', hoja: sheet.name, fila: bloque.fila_excel, sku_base: bloque.sku, calculado: bloque.pc * bloque.ctns, declarado: bloque.tpcs });
      }
      if (bloque.pc == null) {
        warnings.push({ tipo: 'sin_piezas_por_caja', severidad: 'alta', hoja: sheet.name, fila: bloque.fila_excel, sku_base: bloque.sku, detalle: 'Sin piezas por caja ni T.PCS para derivar' });
      }
      if (bloque.ctns > 10000) {
        warnings.push({ tipo: 'cantidad_absurda', severidad: 'alta', hoja: sheet.name, fila: bloque.fila_excel, sku_base: bloque.sku, detalle: bloque.ctns + ' cajas excede tope 10000' });
      }
      var dimsVol = dimsVolume(bloque.dims);
      if (bloque.cbmper != null && dimsVol != null && Math.abs(bloque.cbmper - dimsVol) > 0.000001) {
        warnings.push({ tipo: 'cbm_vs_dims', severidad: 'media', hoja: sheet.name, fila: bloque.fila_excel, sku_base: bloque.sku, detalle: 'cbm/ctn ' + bloque.cbmper + ' vs dims ' + dimsVol });
      }
      var per = bloque.cbmper != null ? bloque.cbmper : dimsVol;
      var gwTot = bloque.gw != null ? +(bloque.gw * bloque.ctns).toFixed(2) : null;
      var cbmTot = per != null ? round(per * bloque.ctns, 6) : null;
      var provCode = safeCode(bloque.sku) + '-BLK-' + bloque.seq;
      var nc = {
        codigo_caja_temporal: provCode,
        sku_base: bloque.sku,
        sku_raw: bloque.sku,
        nombre_pack: bloque.pack,
        producto_id: null,
        proveedor_id: proveedorId,
        piezas_por_caja: bloque.pc,
        cantidad_cajas: bloque.ctns,
        total_piezas: total,
        carton_no_raw: bloque.carton,
        carton_inicio: bloque.cartonParsed ? bloque.cartonParsed.carton_inicio : null,
        carton_fin: bloque.cartonParsed ? bloque.cartonParsed.carton_fin : null,
        peso_neto_kg: bloque.nw,
        peso_neto_total_kg: bloque.nw != null ? +(bloque.nw * bloque.ctns).toFixed(2) : null,
        peso_bruto_kg: bloque.gw,
        peso_bruto_total_kg: gwTot,
        largo_cm: bloque.dims ? bloque.dims.largo_cm : null,
        ancho_cm: bloque.dims ? bloque.dims.ancho_cm : null,
        alto_cm: bloque.dims ? bloque.dims.alto_cm : null,
        cbm_por_caja: per != null ? round(per, 6) : null,
        cbm_total_linea: cbmTot,
        estado_temporal: 'pendiente_revision',
        hoja_origen: sheet.name,
        validacion: { suma_detalle_por_caja: suma, fila_excel: bloque.fila_excel }
      };
      cajas.push(nc);
      for (var dj = 0; dj < bloque.detalles.length; dj++) {
        bloque.detalles[dj].codigo_caja_temporal = provCode;
        bloque.detalles[dj].nombre_pack = bloque.pack;
        detalles.push(bloque.detalles[dj]);
      }
      calcHoja.cajas += bloque.ctns || 0;
      if (total != null) calcHoja.piezas += total;
      if (gwTot != null) calcHoja.gw += gwTot;
      if (cbmTot != null) calcHoja.cbm += cbmTot;
      bloque = null;
    }

    for (let r = hIdx + 1; r < rows.length; r++) {
      if (cortadoPorTiempo) break;
      if ((r % 200) === 0 && Date.now() - startedAt > TIME_BUDGET_MS) {
        warnings.push({ tipo: 'parser_cortado_por_tiempo', severidad: 'alta', hoja: sheet.name, fila: r + 1, detalle: 'Presupuesto de tiempo agotado; resto omitido' });
        cerrarBloqueHoja();
        cortadoPorTiempo = true;
        break;
      }
      const row = rows[r];
      const s0 = norm(row[0] || '');
      const s1 = norm(row[1] || '');
      const s2 = norm(row[2] || '');
      const s3 = norm(row[3] || '');
      if (/^(total|total:|合计|合計)$/i.test(s0) || /^(total|total:|合计|合計)$/i.test(s1) || /^(total|total:|合计|合計)$/i.test(s2) || /^(total|total:|合计|合計)$/i.test(s3)) {
        if (ixCtns >= 0) printedHoja.cajas = toNum(vval(row, ixCtns));
        if (ixTpcs >= 0) printedHoja.piezas = toNum(vval(row, ixTpcs));
        if (ixTgw >= 0) printedHoja.gw = toNum(vval(row, ixTgw));
        if (ixCbmTotal >= 0) printedHoja.cbm = toNum(vval(row, ixCbmTotal));
        cerrarBloqueHoja();
        break;
      }

      const j = (row || []).map(cleanText).join(' ');
      if (/衣服图片|吊牌|洗水标|胶带/.test(j)) { cerrarBloqueHoja(); break; }

      // Omitir cualquier fila de encabezado o subtítulo (filas antes o en la fila de tallas sin logística de caja)
      if (r <= sizeRowIdx) {
        const ctnVal = colCtn !== null ? toNum(row[colCtn]) : null;
        const pcVal = colPc !== null ? toNum(row[colPc]) : null;
        const totalQtyVal = colTotalQty !== null ? toNum(row[colTotalQty]) : null;
        // Solo si la fila de tallas trae logística directa de caja (ej. fila 客户号码 en QingQing)
        if (ctnVal && pcVal) {
          const cartonRaw = cleanText(row[colCarton]);
          const dims = parseDims(row, colDims, colCbm);
          const gw = colGw !== null ? toNum(row[colGw]) : null;
          const nw = colNw !== null ? toNum(row[colNw]) : null;
          const cbmTotal = colCbm !== null ? toNum(row[colCbm]) : null;
          createOrGetCajaLegacy(cartonRaw, ctnVal, pcVal, totalQtyVal, gw, nw, dims, cbmTotal);
        }
        continue;
      }

      // Omitir filas residuales con encabezados literales sin datos
      const cartonClean = cleanText(row[colCarton]);
      if (/^(style\s*no\.?|款号)$/i.test(cleanText(row[colStyle])) || /^(ctn\s*no\.?|carton\s*no\.?|箱号)$/i.test(cartonClean)) {
        continue;
      }

      // Detectar fila de tallas del cliente dinámica si aparece más abajo (ej. bloques secundarios con 客户号码)
      if (j.includes('客户号码') || (!sizeCols.length && j.includes('工厂号码'))) {
        const start = colSizeBase !== null ? colSizeBase : 2;
        const end = colQtyColor !== null ? colQtyColor : Math.min(row.length, start + 10);
        const newSizes = [];
        for (let c = start; c < end; c++) {
          const t = normalizarTalla(row[c]);
          if (t) newSizes.push({ col: c, talla: t, raw: cleanText(row[c]) });
        }
        if (newSizes.length > 0) sizeCols = newSizes;

        // Si la fila de tallas contiene logística de la caja (ej. fila 客户号码 en QingQing)
        const cartonRaw = cleanText(row[colCarton]);
        const ctnVal = colCtn !== null ? toNum(row[colCtn]) : null;
        const pcVal = colPc !== null ? toNum(row[colPc]) : null;
        const totalQtyVal = colTotalQty !== null ? toNum(row[colTotalQty]) : null;
        if (cartonRaw || (ctnVal && pcVal)) {
          const dims = parseDims(row, colDims, colCbm);
          const gw = colGw !== null ? toNum(row[colGw]) : null;
          const nw = colNw !== null ? toNum(row[colNw]) : null;
          const cbmTotal = colCbm !== null ? toNum(row[colCbm]) : null;
          createOrGetCajaLegacy(cartonRaw, ctnVal, pcVal, totalQtyVal, gw, nw, dims, cbmTotal);
        }
        continue;
      }

      // Omitir filas puras de numeración de fábrica si no son tallas de cliente
      if (j.includes('工厂号码')) continue;

      // === Via principal v2: style con herencia + PACK (celda o sufijo) + bloques ===
      const spCell = splitPackStyle(ixStyle >= 0 ? vval(row, ixStyle) : '');
      const styleCell = spCell.sku;
      const packFromStyle = spCell.pack;
      if (styleCell && styleCell !== style) {
        cerrarBloqueHoja();
        style = styleCell;
        currentSku = styleCell;
        pack = 'PACK UNICO';
        upsertProduct(style);
      }
      if (!style) continue;

      const packColCell = ixPack >= 0 ? cleanText(vval(row, ixPack)) : '';
      const packCell = packColCell || packFromStyle || '';
      if (packCell && packCell !== pack) {
        cerrarBloqueHoja();
        pack = packCell;
      }

      const colorRaw = ixColor >= 0 ? cleanText(vval(row, ixColor)) : '';
      const ctnsFilled = ixCtns >= 0 && cleanText(vval(row, ixCtns)) !== '';
      const ctns = enteroPositivo(vval(row, ixCtns));
      const pcsRowCell = ixPcs >= 0 ? cleanText(vval(row, ixPcs)) : '';
      const pcsRow = toNum(vval(row, ixPcs));
      const pcRawCell = ixPctn >= 0 ? cleanText(vval(row, ixPctn)) : '';
      const pcRow = toNum(vval(row, ixPctn));
      const pk = ixPctn >= 0 ? parsePacksJackie(vval(row, ixPctn)) : null;
      const tpcsVal = ixTpcs >= 0 ? toNum(vval(row, ixTpcs)) : null;
      const cartonRaw = cleanText(vval(row, ixCarton));

      // Tallas de la fila
      var filaTallas = [];
      var rowSum = 0;
      for (var ti = 0; ti < sizeCols.length; ti++) {
        var qq = toNum(row[sizeCols[ti].col]);
        if (qq !== null && qq > 0) { filaTallas.push({ talla: sizeCols[ti].talla, cantidad: qq }); rowSum += qq; }
      }
      var hasData = !!colorRaw || rowSum > 0 || pcsRowCell !== '' || ctnsFilled || !!cartonRaw;
      if (!hasData) continue;

      // Fila subtotal (sin color ni tallas, con logistica): checkpoint contra
      // lo cerrado + el bloque abierto. El style puede venir repetido
      // (subtotal rotulado) o vacio.
      if (!colorRaw && rowSum === 0 && (ctnsFilled || tpcsVal !== null)) {
        var tmpCajas = calcHoja.cajas;
        var tmpPiezas = calcHoja.piezas;
        if (bloque) {
          tmpCajas += bloque.ctns || 0;
          var bt0 = bloque.tpcs != null ? bloque.tpcs : (bloque.pc != null ? bloque.pc * bloque.ctns : null);
          if (bt0 != null) tmpPiezas += bt0;
        }
        var subBad = [];
        if (ctnsFilled && ctns !== null && ctns !== tmpCajas) subBad.push('cajas ' + tmpCajas + ' vs ' + ctns);
        if (tpcsVal !== null && tpcsVal !== tmpPiezas) subBad.push('piezas ' + tmpPiezas + ' vs ' + tpcsVal);
        if (subBad.length) warnings.push({ tipo: 'subtotal_vs_bloques', severidad: 'media', hoja: sheet.name, fila: r + 1, sku_base: style, detalle: subBad.join('; ') });
        continue;
      }

      if (ctns === null) {
        if (bloque && (colorRaw || rowSum > 0)) {
          for (var ai = 0; ai < filaTallas.length; ai++) {
            if (!colorRaw) continue;
            bloque.detalles.push({ codigo_caja_temporal: bloque.provCode, sku_base: bloque.sku, nombre_pack: bloque.pack, color_raw: colorRaw, color_id: null, talla_codigo: filaTallas[ai].talla, talla_id: null, cantidad_por_caja: filaTallas[ai].cantidad, estado_temporal: 'pendiente_match_color' });
            if (bloque.colores.indexOf(colorRaw) === -1) bloque.colores.push(colorRaw);
          }
          // En hojas fusionadas la continuacion sin CTNS es lo normal: silencio.
          if (!mergedSheet) warnings.push({ tipo: 'ctns_vacio_en_fila_datos', severidad: 'media', hoja: sheet.name, fila: r + 1, sku_base: style, detalle: 'Fila con datos sin CTNS: anexada al bloque abierto' });
        } else {
          warnings.push({ tipo: 'color_sin_bloque_ctns', severidad: 'alta', hoja: sheet.name, fila: r + 1, sku_base: style, color: colorRaw || null, detalle: 'Fila con datos sin CTNS ni bloque abierto: omitida' });
        }
        continue;
      }

      // Corte de bloque: cambia CTNS, PC/CTN, carton, o color repetido
      var start = !bloque;
      if (bloque) {
        if (ctns !== bloque.ctns) start = true;
        else if (pcRow !== null && bloque.pc !== null && pcRow !== bloque.pc) start = true;
        else if (cartonRaw && bloque.carton && cartonRaw !== bloque.carton) start = true;
        else if (colorRaw && bloque.colores.indexOf(colorRaw) !== -1) start = true;
      }
      if (start) {
        cerrarBloqueHoja();
        seqHoja++;
        if (!firstStyleHoja) firstStyleHoja = style;
        sheetSkus[skuKey(style)] = style;
        bloque = {
          hoja: sheet.name, fila_excel: r + 1, sku: style, pack: pack, seq: seqHoja,
          provCode: safeCode(style) + '-BLK-' + seqHoja,
          ctns: ctns, pc: null, tpcs: null, carton: cartonRaw || null,
          cartonParsed: cartonRaw ? parseCartonRange(cartonRaw) : null,
          gw: null, nw: null, dims: null, cbmper: null,
          colores: [], detalles: [], tienePacks: false, suma_detalle: 0, total: null, fuente_piezas: null
        };
      }
      if (tpcsVal !== null && bloque.tpcs === null) bloque.tpcs = tpcsVal;
      if (ixGw >= 0 && bloque.gw === null) { var g0 = toNum(vval(row, ixGw)); if (g0 !== null) bloque.gw = g0; }
      if (ixNw >= 0 && bloque.nw === null) { var n0 = toNum(vval(row, ixNw)); if (n0 !== null) bloque.nw = n0; }
      if (ixCbmPer >= 0 && bloque.cbmper === null) { var cb0 = toNum(vval(row, ixCbmPer)); if (cb0 !== null) bloque.cbmper = cb0; }
      if (!bloque.dims && ixDims >= 0) {
        var dd0 = parseDims(row, ixDims, ixCbmPer >= 0 ? ixCbmPer : ixCbmTotal);
        if (dd0.largo_cm) bloque.dims = dd0;
      }
      if (!bloque.carton && cartonRaw) { bloque.carton = cartonRaw; bloque.cartonParsed = parseCartonRange(cartonRaw); }

      var mult = 1;
      if (pk) {
        bloque.tienePacks = true;
        if (rowSum === pk.porPack) mult = pk.packs;
        else if (rowSum > 0) warnings.push({ tipo: 'packs_no_cuadra', severidad: 'media', hoja: sheet.name, fila: r + 1, sku_base: style, detalle: 'packs ' + pk.porPack + 'x' + pk.packs + ' vs tallas ' + rowSum });
        warnings.push({ tipo: 'pcs_no_numerico', severidad: 'media', hoja: sheet.name, fila: r + 1, sku_base: style, detalle: 'Pcs/Ctn con packs (' + pcRawCell + '): total desde T.PCS' });
      } else if (pcRawCell && pcRow === null) {
        warnings.push({ tipo: 'pcs_no_numerico', severidad: 'media', hoja: sheet.name, fila: r + 1, sku_base: style, detalle: 'Pcs/Ctn no numerico (' + pcRawCell + '): total desde T.PCS' });
      } else if (pcRow !== null && bloque.pc === null && !bloque.tienePacks) {
        bloque.pc = pcRow;
      }
      if (pcsRow !== null && rowSum > 0 && pcsRow !== rowSum) {
        warnings.push({ tipo: 'pcs_vs_tallas_fila', severidad: 'media', hoja: sheet.name, fila: r + 1, sku_base: style, detalle: 'PCS ' + pcsRow + ' vs tallas ' + rowSum });
      }
      if (colorRaw) {
        if (bloque.colores.indexOf(colorRaw) === -1) bloque.colores.push(colorRaw);
        for (var fi2 = 0; fi2 < filaTallas.length; fi2++) {
          bloque.detalles.push({ codigo_caja_temporal: bloque.provCode, sku_base: bloque.sku, nombre_pack: bloque.pack, color_raw: colorRaw, color_id: null, talla_codigo: filaTallas[fi2].talla, talla_id: null, cantidad_por_caja: filaTallas[fi2].cantidad * mult, estado_temporal: 'pendiente_match_color' });
        }
      } else if (rowSum > 0) {
        warnings.push({ tipo: 'fila_sin_color', severidad: 'media', hoja: sheet.name, fila: r + 1, sku_base: style, detalle: 'Tallas sin color: detalle omitido en fila' });
      }

      if (lineasStaging.length < MAX_LINEAS_STAGING) {
        lineasStaging.push({
          hoja_origen: sheet.name,
          fila_origen_aprox: r + 1,
          sku_base: style,
          sku_raw: style,
          nombre_pack: pack,
          codigo_caja_temporal: bloque.provCode,
          carton_no_raw: cartonRaw || null,
          cantidad_cajas: bloque.ctns,
          piezas_por_caja: bloque.pc,
          total_piezas: bloque.tpcs,
          color_raw: colorRaw || null,
          tallas_detectadas: sizeCols.map(function(x) { return x.talla; })
        });
      } else if (!avisoStagingLleno) {
        avisoStagingLleno = true;
        warnings.push({ tipo: 'staging_truncado', severidad: 'media', hoja: sheet.name, detalle: 'Tope ' + MAX_LINEAS_STAGING + ' lineas staging alcanzado' });
      }
    }
    cerrarBloqueHoja();

    // Validacion de hoja: calculado vs TOTAL impreso (verdad del documento)
    var diffsHoja = [];
    if (printedHoja.cajas !== null && printedHoja.cajas !== calcHoja.cajas) diffsHoja.push('cajas calc ' + calcHoja.cajas + ' vs impreso ' + printedHoja.cajas);
    if (printedHoja.piezas !== null && printedHoja.piezas !== calcHoja.piezas) diffsHoja.push('piezas calc ' + calcHoja.piezas + ' vs impreso ' + printedHoja.piezas);
    if (printedHoja.gw !== null && round(calcHoja.gw, 2) !== round(printedHoja.gw, 2)) diffsHoja.push('peso bruto calc ' + round(calcHoja.gw, 2) + ' vs impreso ' + printedHoja.gw);
    if (printedHoja.cbm !== null && round(calcHoja.cbm, 4) !== round(printedHoja.cbm, 4)) diffsHoja.push('cbm calc ' + round(calcHoja.cbm, 4) + ' vs impreso ' + printedHoja.cbm);
    if (diffsHoja.length) warnings.push({ tipo: 'total_hoja_vs_detalle', severidad: 'media', hoja: sheet.name, detalle: diffsHoja.join('; ') });
    totalesPorHoja.push({ hoja: sheet.name, sku_base: firstStyleHoja, cajas_calc: calcHoja.cajas, piezas_calc: calcHoja.piezas, cajas_impreso: printedHoja.cajas, piezas_impreso: printedHoja.piezas, cuadra: diffsHoja.length === 0 });
    parseMsPorHoja.push({ hoja: sheet.name, ms: Date.now() - tHojaSheet });
    printedPorHoja.set(sheet.name, printedHoja);
    sheetSkusPorHoja.set(sheet.name, sheetSkus);
  }

  // === Post-proceso: caja PADRE (resumen) + cajas COMPLETAS (CC) / REMANENTES (CR) ===
  function finalizarCaja(caja, ds) {
    const issues = validateBox(caja, ds);
    caja.estado_temporal = issues.length ? 'requiere_revision' : 'listo_para_revision';
    caja.validacion = {
      suma_detalle_por_caja: round(ds.reduce((a, d) => a + (d.cantidad_por_caja || 0), 0), 2),
      issues
    };
    for (const issue of issues) {
      warnings.push({
        tipo: 'validacion_caja',
        severidad: issue.startsWith('detalle_no_cuadra') ? 'alta' : 'media',
        sku_base: caja.sku_base,
        codigo_caja_temporal: caja.codigo_caja_temporal,
        issue
      });
    }
  }

  const cajasRaw = [...cajas];
  const detallesPorCaja = new Map();
  for (const d of detalles) {
    if (!detallesPorCaja.has(d.codigo_caja_temporal)) detallesPorCaja.set(d.codigo_caja_temporal, []);
    detallesPorCaja.get(d.codigo_caja_temporal).push(d);
  }

  const cajasPorSku = new Map();
  for (const c of cajasRaw) {
    const ds = detallesPorCaja.get(c.codigo_caja_temporal) || [];
    const key = skuKey(c.sku_base);
    if (!cajasPorSku.has(key)) {
      cajasPorSku.set(key, { sku_base: c.sku_base, completas: [], remanentes: [], paletaTallas: new Set(), paletaColores: new Set() });
    }
    const grp = cajasPorSku.get(key);
    if (ds.length) {
      grp.completas.push(c);
      for (const d of ds) {
        if (d.talla_codigo) grp.paletaTallas.add(d.talla_codigo);
        if (d.color_raw) grp.paletaColores.add(d.color_raw);
      }
    } else {
      grp.remanentes.push(c);
    }
  }

  const cajasFinales = [];
  const mapaCodigos = new Map();

  function reapuntarDetalles(viejo, nuevo) {
    const ds = detallesPorCaja.get(viejo) || [];
    for (const d of ds) d.codigo_caja_temporal = nuevo;
    detallesPorCaja.delete(viejo);
    detallesPorCaja.set(nuevo, ds);
    mapaCodigos.set(viejo, nuevo);
    return ds;
  }

  for (const [, grp] of cajasPorSku) {
    const skuCode = safeCode(grp.sku_base);

    // Caja Padre / Resumen virtual por SKU
    cajasFinales.push({
      codigo_caja_temporal: skuCode + '-CP',
      sku_base: grp.sku_base,
      sku_raw: grp.sku_base,
      nombre_pack: 'PACK UNICO',
      producto_id: null,
      proveedor_id: proveedorId,
      tipo_caja: 'padre_resumen',
      es_resumen: true,
      es_principal: true,
      piezas_por_caja: null,
      cantidad_cajas: 0,
      total_piezas: 0,
      carton_no_raw: null,
      carton_inicio: null,
      carton_fin: null,
      tallas: [...grp.paletaTallas].join('|') || null,
      colores: [...grp.paletaColores].join('|') || null,
      peso_neto_kg: null,
      peso_neto_total_kg: null,
      peso_bruto_kg: null,
      peso_bruto_total_kg: null,
      largo_cm: null,
      ancho_cm: null,
      alto_cm: null,
      cbm_por_caja: null,
      cbm_total_linea: null,
      estado_temporal: 'listo_para_revision',
      hoja_origen: null
    });

    // Contadores y sufijo por (SKU, pack): PACK A y PACK B del mismo SKU
    // generan series propias (SKU-PACKA-CC-1...), PACK UNICO sin sufijo.
    var contPack = {};
    function codigoPack(skuCode, pack, tipo) {
      var k = skuCode + '||' + pack;
      if (!contPack[k]) contPack[k] = { CC: 0, CR: 0 };
      contPack[k][tipo]++;
      var suf = (pack && pack !== 'PACK UNICO') ? '-' + packSan(pack) : '';
      return skuCode + suf + '-' + tipo + '-' + contPack[k][tipo];
    }
    let nCC = 0;
    for (const c of grp.completas) {
      const viejo = c.codigo_caja_temporal;
      const codigo = codigoPack(skuCode, c.nombre_pack, 'CC');
      nCC++;
      const ds = reapuntarDetalles(viejo, codigo);
      c.codigo_caja_temporal = codigo;
      c.tipo_caja = 'completa';
      c.es_resumen = false;
      c.es_principal = false;
      c.tallas = [...new Set(ds.map(d => d.talla_codigo).filter(Boolean))].join('|') || null;
      c.colores = [...new Set(ds.map(d => d.color_raw).filter(Boolean))].join('|') || null;
      finalizarCaja(c, ds);
      cajasFinales.push(c);
    }

    let nCR = 0;
    for (const c of grp.remanentes) {
      const viejo = c.codigo_caja_temporal;
      const codigo = codigoPack(skuCode, c.nombre_pack, 'CR');
      nCR++;
      reapuntarDetalles(viejo, codigo);
      c.codigo_caja_temporal = codigo;
      c.tipo_caja = 'remanente';
      c.es_resumen = false;
      c.es_principal = false;
      c.tallas = null;
      c.colores = null;
      finalizarCaja(c, []);
      cajasFinales.push(c);
    }
  }

  // Principal = bloque real con mas cajas por (SKU, pack): un principal por
  // pack para que PACK A y PACK B se distingan en plataforma.
  var mejorPorSku = {};
  for (var fi2 = 0; fi2 < cajasFinales.length; fi2++) {
    var cf2 = cajasFinales[fi2];
    if (cf2.es_resumen) continue;
    var kk2 = skuKey(cf2.sku_base) + '||' + (cf2.nombre_pack || 'PACK UNICO');
    if (!mejorPorSku[kk2] || (cf2.cantidad_cajas || 0) > (mejorPorSku[kk2].cantidad_cajas || 0)) mejorPorSku[kk2] = cf2;
  }
  for (var mk2 in mejorPorSku) mejorPorSku[mk2].es_principal = true;

  // Checkpoints portada vs detalle por (SKU, pack)
  var detPorSkuChk = {};
  for (var ci2 = 0; ci2 < cajasFinales.length; ci2++) {
    var cc2 = cajasFinales[ci2];
    if (cc2.es_resumen) continue;
    var kkc = skuKey(cc2.sku_base) + '||' + (cc2.nombre_pack || 'PACK UNICO');
    if (!detPorSkuChk[kkc]) detPorSkuChk[kkc] = { sku_base: cc2.sku_base, pack: cc2.nombre_pack || 'PACK UNICO', cajas: 0, piezas: 0 };
    detPorSkuChk[kkc].cajas += cc2.cantidad_cajas || 0;
    if (cc2.total_piezas != null) detPorSkuChk[kkc].piezas += cc2.total_piezas;
  }
  // Resuelve lista de valores repetidos de portada: si todos iguales es el
  // total repetido; si el maximo iguala la suma del resto es subtotal;
  // si no, son parciales por bloque y se suman.
  function coverResolveVals(vals) {
    if (!vals.length) return null;
    var allEq = true;
    for (var i = 1; i < vals.length; i++) if (vals[i] !== vals[0]) { allEq = false; break; }
    if (allEq) return vals[0];
    var mx = vals[0];
    var sum = 0;
    for (var j = 0; j < vals.length; j++) { sum += vals[j]; if (vals[j] > mx) mx = vals[j]; }
    if (mx === sum - mx) return mx;
    return sum;
  }
  coverSku.forEach(function(cs, key) {
    var dd = detPorSkuChk[key];
    if (!dd || !coverTotals.ctnsOk) return;
    // En portada fusionada los remanentes traen CTNS vacio: la suma es cota
    // inferior y no se puede validar por SKU (el TOTAL de orden si valida).
    if (cs.huecosCtns) return;
    var covCajas = coverResolveVals(cs.ctnsVals);
    var covPiezas = coverResolveVals(cs.tpcsVals);
    var bad = [];
    if (covCajas !== null && dd.cajas !== covCajas) bad.push('cajas detalle ' + dd.cajas + ' vs portada ' + covCajas);
    if (covPiezas !== null && dd.piezas !== covPiezas) bad.push('piezas detalle ' + dd.piezas + ' vs portada ' + covPiezas);
    if (bad.length) warnings.push({ tipo: 'cover_vs_detalle', severidad: 'media', sku_base: cs.sku_base, pack: cs.pack, detalle: bad.join('; ') });
  });

  // Lineas esperadas por (SKU, pack) para la plataforma: la portada manda;
  // sin portada se usa el detalle (siempre cuadra, solo informativo).
  var ordenProductosPack = [];
  coverSku.forEach(function(cs, key) {
    var dd = detPorSkuChk[key] || { cajas: 0, piezas: 0 };
    var cajasCov = coverResolveVals(cs.ctnsVals);
    var piezasCov = coverResolveVals(cs.tpcsVals);
    var conPortada = cajasCov !== null || piezasCov !== null;
    ordenProductosPack.push({
      sku_base: cs.sku_base,
      nombre_pack: cs.pack,
      cajas_pedidas: cajasCov !== null ? cajasCov : dd.cajas,
      piezas_pedidas: piezasCov !== null ? piezasCov : dd.piezas,
      fuente: conPortada ? 'portada' : 'detalle'
    });
  });
  for (var kdet in detPorSkuChk) {
    if (!coverSku.has(kdet)) {
      var dd2 = detPorSkuChk[kdet];
      ordenProductosPack.push({ sku_base: dd2.sku_base, nombre_pack: dd2.pack, cajas_pedidas: dd2.cajas, piezas_pedidas: dd2.piezas, fuente: 'detalle' });
    }
  }

  for (const ln of lineasStaging) {
    if (ln.codigo_caja_temporal && mapaCodigos.has(ln.codigo_caja_temporal)) {
      ln.codigo_caja_temporal = mapaCodigos.get(ln.codigo_caja_temporal);
    }
  }

  if (!productosMap.size) {
    warnings.push({ tipo: 'sin_productos_detectados', severidad: 'alta', mensaje: 'No se detectaron productos en hojas por SKU Jackie/Venkat.' });
  }
  if (!cajasFinales.length) {
    warnings.push({ tipo: 'sin_cajas_detectadas', severidad: 'alta', mensaje: 'No se detectaron cajas en hojas por SKU Jackie/Venkat.' });
  }

  const productos = [...productosMap.values()];
  const orden_productos = buildOrderProducts(cajasFinales);
  const finalTotals = {
    total_productos: productos.length,
    total_cajas: round(orden_productos.reduce((a, x) => a + (x.cajas_pedidas || 0), 0), 2),
    total_piezas: round(orden_productos.reduce((a, x) => a + (x.piezas_pedidas || 0), 0), 2),
    cbm_orden: round(orden_productos.reduce((a, x) => a + (x.cbm_detalle || 0), 0), 4),
    peso_bruto_total_kg: round(orden_productos.reduce((a, x) => a + (x.peso_bruto_kg || 0), 0), 2),
    peso_neto_total_kg: null
  };
  const estado = warnings.some(w => w.severidad === 'alta') ? 'Requiere revision alta' : (warnings.length ? 'Requiere revision' : 'Temporal');

  const totales_por_sku = [...cajasPorSku.keys()].map(key => {
    const grp = cajasPorSku.get(key);
    const cajasReales = cajasFinales.filter(c => !c.es_resumen && skuKey(c.sku_base) === key);
    const hojasDeSku = [];
    for (const entrySku of sheetSkusPorHoja) {
      if (entrySku[1][key]) hojasDeSku.push(entrySku[0]);
    }
    let imp = null;
    if (hojasDeSku.length === 1 && Object.keys(sheetSkusPorHoja.get(hojasDeSku[0]) || {}).length === 1) {
      imp = printedPorHoja.get(hojasDeSku[0]) || null;
    }
    const totalCajasFromCajas = cajasReales.reduce((a, c) => a + (c.cantidad_cajas || 0), 0);
    const totalPiezasFromCajas = cajasReales.reduce((a, c) => a + (c.total_piezas || 0), 0);
    const cuadra = imp ? ((imp.cajas === null || imp.cajas === totalCajasFromCajas) && (imp.piezas === null || imp.piezas === totalPiezasFromCajas)) : null;
    return {
      sku_base: grp.sku_base,
      total_cajas: totalCajasFromCajas,
      total_piezas: totalPiezasFromCajas,
      total_cajas_impreso: imp ? imp.cajas : null,
      total_piezas_impreso: imp ? imp.piezas : null,
      cuadra_impreso: cuadra,
      cbm_total: round(cajasReales.reduce((a, c) => a + (c.cbm_total_linea || 0), 0), 4),
      peso_bruto_kg: round(cajasReales.reduce((a, c) => a + (c.peso_bruto_total_kg || 0), 0), 2),
      peso_neto_kg: null,
      fuente_totales: imp ? 'fila_total_en_hoja' : 'sumatoria_cajas'
    };
  });

  const cajasReales = cajasFinales.filter(c => !c.es_resumen);
  const totales_calculados_desde_cajas = {
    total_cajas: cajasReales.reduce((a, c) => a + (c.cantidad_cajas || 0), 0),
    total_piezas: cajasReales.reduce((a, c) => a + (c.total_piezas || 0), 0),
    cbm_total: round(cajasReales.reduce((a, c) => a + (c.cbm_total_linea || 0), 0), 4),
    peso_bruto_total_kg: round(cajasReales.reduce((a, c) => a + (c.peso_bruto_total_kg || 0), 0), 2),
    peso_neto_total_kg: round(cajasReales.reduce((a, c) => a + (c.peso_neto_total_kg || 0), 0), 2),
  };

  const coverSheet = allSheets.find(function(s) { return /^(装箱单|packing list|resumen|summary)\s*$/i.test(cleanText(s.name)); }) || null;
  if (coverSheet && (coverTotals.cajas !== null || coverTotals.piezas !== null)) {
    if (!finalTotals.total_cajas && coverTotals.cajas) finalTotals.total_cajas = coverTotals.cajas;
    if (!finalTotals.total_piezas && coverTotals.piezas) finalTotals.total_piezas = coverTotals.piezas;
    var badOrd = [];
    if (coverTotals.cajas !== null && coverTotals.cajas !== totales_calculados_desde_cajas.total_cajas) badOrd.push('cajas calc ' + totales_calculados_desde_cajas.total_cajas + ' vs portada ' + coverTotals.cajas);
    if (coverTotals.piezas !== null && coverTotals.piezas !== totales_calculados_desde_cajas.total_piezas) badOrd.push('piezas calc ' + totales_calculados_desde_cajas.total_piezas + ' vs portada ' + coverTotals.piezas);
    if (coverTotals.gw !== null && round(totales_calculados_desde_cajas.peso_bruto_total_kg, 2) !== round(coverTotals.gw, 2)) badOrd.push('peso bruto calc ' + round(totales_calculados_desde_cajas.peso_bruto_total_kg, 2) + ' vs portada ' + coverTotals.gw);
    if (coverTotals.nw !== null && round(totales_calculados_desde_cajas.peso_neto_total_kg, 2) !== round(coverTotals.nw, 2)) badOrd.push('peso neto calc ' + round(totales_calculados_desde_cajas.peso_neto_total_kg, 2) + ' vs portada ' + coverTotals.nw);
    if (coverTotals.cbm !== null && round(totales_calculados_desde_cajas.cbm_total, 4) !== round(coverTotals.cbm, 4)) badOrd.push('cbm calc ' + round(totales_calculados_desde_cajas.cbm_total, 4) + ' vs portada ' + coverTotals.cbm);
    if (badOrd.length) warnings.push({ tipo: 'cover_totales', severidad: 'media', detalle: badOrd.join('; ') });
  }

  return {
    ok: true,
    version_parser: 'mvp-n8n-code-v2.0-jackie-bloques',
    metadata: {
      cliente_b2b_id: clienteB2bId,
      proveedor_id: proveedorId,
      proveedor: proveedorInput,
      orden_id: ordenId,
      formato_detectado: 'jackie_venkat_multi_sheet',
      fecha_parseo: new Date().toISOString(),
      hojas_recibidas: allSheets.length,
      hojas_detalle_detectadas: detailSheets.map(s => s.name),
      filas_recibidas_desde_extract: inputItemCount,
      filas_utiles_procesadas: detailSheets.reduce((a, s) => a + ((s.rows || []).length), 0),
      ms_parser: Date.now() - startedAt,
      parse_ms_por_hoja: parseMsPorHoja,
      uso: 'JSON temporal para Next.js/staging. Revisar antes de insertar definitivo en Supabase.'
    },
    resumen: { ...finalTotals, total_warnings: warnings.length, estado },
    totales_por_sku,
    totales_por_hoja: totalesPorHoja,
    totales_calculados_desde_cajas,
    orden_productos_pack: ordenProductosPack,
    productos_para_editar: productos,
    cajas_para_editar: cajasFinales,
    caja_detalles_para_editar: detalles,
    orden_preview: {
      orden_id: ordenId,
      cliente_b2b_id: clienteB2bId,
      proveedor_id: proveedorId,
      estado,
      total_productos: productos.length,
      total_cajas: finalTotals.total_cajas,
      total_piezas: finalTotals.total_piezas,
      cbm_orden: finalTotals.cbm_orden,
      peso_bruto_total_kg: finalTotals.peso_bruto_total_kg,
      orden_productos
    },
    staging_sugerido: {
      packing_imports: {
        cliente_b2b_id: clienteB2bId,
        proveedor_id: proveedorId,
        orden_id: ordenId,
        proveedor_detectado: proveedorInput,
        formato_detectado: 'jackie_venkat_multi_sheet',
        estado: warnings.length ? 'requiere_revision' : 'parseado',
        ...finalTotals,
        warnings
      },
      packing_lineas_staging: lineasStaging
    },
    warnings,
    nextjs_tabs: {
      productos_count: productos.length,
      cajas_count: cajasFinales.length,
      cajas_reales_count: cajasFinales.filter(c => !c.es_resumen).length,
      cajas_padre_count: cajasFinales.filter(c => c.es_resumen).length,
      detalles_count: detalles.length,
      warnings_count: warnings.length
    }
  };
}

// === Entry point n8n ===
const cfg = (() => {
  try { return $('Normalizar archivo + ruta').first().json.__config || {}; }
  catch (e) { try { return $('Formulario Packing List').first().json || {}; } catch (e2) { return {}; } }
})();

const item = $input.first();
const excelReaderJson = item.json || {};

function normalizeExcelReaderSheets(j) {
  const rawSheets = j.__workbook_sheets || j.sheets || j.workbook_sheets || j.data || [];
  if (!Array.isArray(rawSheets)) return [];
  return rawSheets.map((s, idx) => {
    const name = cleanText(s.name || s.sheet_name || s.sheetName || s.title || ('Hoja ' + (idx + 1)));
    const rows = Array.isArray(s.rows) ? s.rows : (Array.isArray(s.data) ? s.data : []);
    return {
      name,
      rows: rows.map(r => Array.isArray(r) ? r : rowValues(r))
    };
  });
}

const sheets = normalizeExcelReaderSheets(excelReaderJson);
if (!sheets.length) {
  return [{
    json: {
      ok: false,
      version_parser: 'mvp-n8n-code-v2.0-jackie-bloques',
      metadata: {
        proveedor: (cfg && cfg.proveedor) || 'Jackie/Venkat',
        formato_detectado: 'jackie_venkat_multi_sheet',
        loader: 'excel-reader',
        excel_reader_response_keys: Object.keys(excelReaderJson || {}),
        fecha_parseo: new Date().toISOString()
      },
      resumen: { total_productos: 0, total_cajas: 0, total_piezas: 0, cbm_orden: 0, peso_bruto_total_kg: 0, total_warnings: 1, estado: 'Error lectura workbook' },
      totales_por_sku: [],
      totales_calculados_desde_cajas: { total_cajas: 0, total_piezas: 0, cbm_total: 0, peso_bruto_total_kg: 0 },
      productos_para_editar: [],
      cajas_para_editar: [],
      caja_detalles_para_editar: [],
      orden_preview: { estado: 'Error lectura workbook', total_productos: 0, total_cajas: 0, total_piezas: 0, cbm_orden: 0, peso_bruto_total_kg: 0, orden_productos: [] },
      warnings: [{ tipo: 'excel_reader_sin_hojas', severidad: 'alta', mensaje: 'excel-reader no devolvio hojas. Revisa claves: ' + Object.keys(excelReaderJson || {}).join(', ') }],
      raw_excel_reader_preview: excelReaderJson
    }
  }];
}

return [{ json: parsePackingListJackieVenkatMultiSheet(sheets, cfg, sheets.length) }];
`;

module.exports = { JACKIE_JS };
