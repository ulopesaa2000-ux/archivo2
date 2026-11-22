// scripts/n8n/updates/update_n8n_sandbox_ocr_dinamico.js
//
// Actualiza EXCLUSIVAMENTE el workflow sandbox `sandbox_ocr_nota` (ZNawDVYBg9RefbHARz0_R)
// con catálogo dinámico, cruce 2-partes en memoria y desempate vía Perplexity Decider
// (v1.3:free con fallback automático a v1.2 de pago ante error o rate-limit).
// NO modifica el workflow de producción (DtZOqR4-9_DnULEjWW78b).
//
// Uso:
//   node scripts/n8n/updates/update_n8n_sandbox_ocr_dinamico.js --dry-run
//   node scripts/n8n/updates/update_n8n_sandbox_ocr_dinamico.js

const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');

let envConfig = {};
try {
  const envPath = path.resolve(__dirname, '../../../.env.local');
  if (fs.existsSync(envPath)) envConfig = dotenv.parse(fs.readFileSync(envPath));
} catch (e) {}

const apiKey = process.env.N8N_API_KEY || envConfig.N8N_API_KEY || '';
const SANDBOX_WORKFLOW_ID = 'ZNawDVYBg9RefbHARz0_R';
const PROD_WORKFLOW_ID = 'DtZOqR4-9_DnULEjWW78b';

if (!apiKey) {
  console.error('ERROR: N8N_API_KEY no encontrada en entorno ni en .env.local');
  process.exit(1);
}

if (SANDBOX_WORKFLOW_ID === PROD_WORKFLOW_ID) {
  console.error('ABORTADO: El ID destino coincide con producción.');
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

// ── SQL de carga única de catálogo activo × proveedores ────────────────────
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

// ── Código del nodo: Construir prompt + body (glosario dinámico) ───────────
const CODE_CONSTRUIR_PROMPT = String.raw`// ── CONFIGURACION DE MODELO OPENROUTER ───────────────────────
const MODELO_VISION = "deepseek/deepseek-v4.1-flash";
  // Alternativa manual más reciente: "deepseek/deepseek-v4.1-flash-1017"
  // "google/gemini-2.5-flash";

const meta = $('Preparar upload').first()?.json || $('Normalizar entrada1').first()?.json || {};

// ── GLOSARIO DINAMICO DESDE CATALOGO ACTIVO ──────────────────
let catalogoRows = [];
try { catalogoRows = $('Cargar Catálogo Activo').all().map(x => x.json).filter(r => r && r.sku_base); } catch (e) {}

const prefijosPorProv = new Map();
const todosPrefijos = new Set();
for (const r of catalogoRows) {
  const sku = String(r.sku_base || '').trim().toUpperCase();
  const prov = String(r.proveedor_nombre || 'OTROS').trim().toUpperCase();
  const mSlash = sku.match(/^([A-Z]{1,4}\d{1,4}|[A-Z]{2,4})\//);
  const mAnd = sku.match(/^(AND\d{2})\d+/);
  const mNum = sku.match(/^([13][A-Z]{2})/);
  const mDash = sku.match(/^([A-Z]{2,4}\d{0,4})-/);
  const pref = mSlash ? mSlash[1] : (mAnd ? 'AND' : (mNum ? mNum[1] : (mDash ? mDash[1] : sku.slice(0, 2))));
  if (pref && pref.length >= 2) {
    todosPrefijos.add(pref);
    if (!prefijosPorProv.has(prov)) prefijosPorProv.set(prov, new Set());
    if (prefijosPorProv.get(prov).size < 10) prefijosPorProv.get(prov).add(pref);
  }
}
const lineasGlosario = [];
for (const [prov, prefs] of Array.from(prefijosPorProv.entries()).slice(0, 24)) {
  lineasGlosario.push('   - ' + prov + ': ' + Array.from(prefs).join(', '));
}
const glosarioDinamico = lineasGlosario.length > 0
  ? lineasGlosario.join('\n')
  : '   - TY (TIANYI), BO (BONNIE), FK (FINDAKERA), JA (JACKIE), AND|3VT|3JA|1AK (MOTI), JE (JENNY), JO|J (JOE), HT (HONTON), MK (MANKENI), KU (KUAILE), OE, YS, NR, QQ, HO';

// ── CONTEXTO TEMPORAL DINAMICO (America/Mexico_City) ───────────────────────
const MESES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function partesCDMX(d) {
  try {
    const p = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d);
    const g = function(t) { const f = p.find(function(x) { return x.type === t; }); return (f && f.value) || ''; };
    return { dd: parseInt(g('day'), 10) || d.getDate(), mm: parseInt(g('month'), 10) || (d.getMonth() + 1), yyyy: parseInt(g('year'), 10) || d.getFullYear() };
  } catch (e) { return { dd: d.getDate(), mm: d.getMonth() + 1, yyyy: d.getFullYear() }; }
}
const _hoy = partesCDMX(new Date());
const ANIO_ACTUAL = _hoy.yyyy;
const MES_ACTUAL_NUM = String(_hoy.mm).padStart(2, '0');
const MES_ACTUAL_NOMBRE = MESES_ES[_hoy.mm - 1];
const _mp = _hoy.mm === 1 ? 12 : _hoy.mm - 1;
const MES_PASADO_NUM = String(_mp).padStart(2, '0');
const MES_PASADO_NOMBRE = MESES_ES[_mp - 1];
const FECHA_CORTA = String(_hoy.dd).padStart(2, '0') + '/' + MES_ACTUAL_NUM + '/' + ANIO_ACTUAL;
const FECHA_LARGA = _hoy.dd + ' de ' + MES_ACTUAL_NOMBRE + ' de ' + ANIO_ACTUAL;
const _modoRaw = (typeof meta !== 'undefined' && meta !== null) ? (meta.modo_solo_cajas !== undefined && meta.modo_solo_cajas !== null ? meta.modo_solo_cajas : (meta.modoSoloCajas !== undefined ? meta.modoSoloCajas : (meta.body && meta.body.modo_solo_cajas !== undefined ? meta.body.modo_solo_cajas : null))) : null;
const modoSoloCajas = (_modoRaw === null || _modoRaw === undefined || String(_modoRaw) === '') ? true : !(['false','0','no','off'].includes(String(_modoRaw).toLowerCase().trim()));

const PROMPT = [
  "Eres un extractor experto de datos de 'ORDEN DE MOVIMIENTOS' y notas de inventario manuscritas de la industria textil (chamarras, chalecos, rompevientos, pants, gabardinas, abrigos, sudaderas, sets).",
  "Analiza la imagen escaneada/fotografiada y devuelve UNICAMENTE un JSON válido, sin markdown ni texto extra, con esta estructura exacta:",
  "",
  "{",
  '  "folio": string|null,',
  '  "fecha": string|null,',
  '  "tipo_movimiento": "ENT"|"DEV"|"SAL"|"TRF"|"AJU"|null,',
  '  "bodega_receptora_interna": string|null,',
  '  "entidad_externa_procedencia": string|null,',
  '  "origen": string|null,',
  '  "destino": string|null,',
  '  "lineas": [',
  "    {",
  '      "index": number,',
  '      "sku": string,',
  '      "estilo_raw": string,',
  '      "posibles_variantes": string[],',
  '      "descripcion_raw": string,',
  '      "descripcion_texto": string,',
  '      "cantidad_cajas": number,',
  '      "piezas_por_caja": number|null,',
  '      "proveedor_sugerido": string|null,',
  '      "prefijo": string|null,',
  '      "familia_sku": string|null,',
  '      "confianza": number',
  "    }",
  "  ],",
  '  "observaciones": string|null,',
  '  "confianza_global": number',
  "}",
  "",
  "═══════════════════════════════════════════════════════════════",
  "GUIA ORIENTATIVA DE PATRON TEXTIL (SINCRONIZADA CON CATALOGO REAL)",
  "═══════════════════════════════════════════════════════════════",
  "La estructura general sigue este orden de lectura habitual (NO es una ley rígida, sirve de guía para no inventar letras):",
  "[PROVEEDOR/SERIE] [AÑO/NÚMEROS] [/] [CONSECUTIVO] [GÉNERO + PRENDA] [EXTRA/TELA]",
  "",
  "1. PREFIJOS Y SERIES ACTIVAS REALES EN CATALOGO (" + catalogoRows.length + " productos):",
  glosarioDinamico,
  "",
  "2. AÑO / PEDIDO (FLEXIBLE):",
  "   - Habitualmente 2 dígitos (26, 25, 24) o 3-4 dígitos en series como 'J219/3CAC', 'J908/3DCHL', 'BO244/3CAVTN', 'JE318/1DTS'.",
  "   - En BONNIE puede ir directo con separador: 'BO/1DSETFE', 'BO/3DSETFE', 'BO/2CSETAF'.",
  "",
  "3. CONSECUTIVO DE MODELO:",
  "   - 1 o 2 dígitos del modelo (1, 2, 3, 01, 02, 05, 09, 13, 19, etc.).",
  "",
  "4. GÉNERO, PRENDA Y TELAS ESTABLES (CRUCIAL PARA DESAMBIGUAR):",
  "   - GÉNEROS: D o M o DA (Dama/Mujer), H o C o CA (Hombre/Caballero), B o I (Niño/Infantil), G (Niña), U (Unisex).",
  "   - PRENDAS: C (Chamarra), V (Chaleco), W o WB (Rompevientos), SD o SUD (Sudadera), ST o SET (Set), P (Pantalón), A (Abrigo), G (Gabardina), TS (Camisa/Playera), SW (Suéter).",
  "   - SUFIJOS ESTABLES (Nunca inventar caracteres raros):",
  "     * 'FE' = Felpa (ej: 'BO26/08MSTFE', 'BO/3DSETFE'). NUNCA 'SETRE' ni 'SETF3'.",
  "     * 'LYC' = Licra (ej: 'JA26/05MSDLYC').",
  "     * 'AF' = Afelpado (ej: 'BO/2CSETAF').",
  "     * 'FUR' = Con fur (ej: 'NR2509-FUR', nunca 'NR2509 - FUR').",
  "     * 'HC'/'CAC' = Caballero Chamarra / 'MC'/'DAC' = Dama Chamarra / 'CAV' = Caballero Chaleco.",
  "",
  "5. MARCAS Y NOMBRES COMERCIALES EN DESCRIPCIÓN:",
  "   - TORONTO, GREENFIELD, IDOL-NAVY, BULLSTAFF, GREEN-BERRY, DULCE-CAROLINE, LOVI-MEN,",
  "   - AIR-COMPANY, NR, POLAR-BEAR, AMERICAN-NICE, VENADO, SIRENA, LOBO, MALBORO, IXEL.",
  "",
  "6. REGLA ESTRICTA DE FORMATO SKU (LECTURA LITERAL COMPACTA vs CANONICO):",
  "   - NUNCA insertes espacios alrededor de '/' ni '-' ni en 'estilo_raw' ni en 'sku':",
  "     * Escribe SIEMPRE 'J219/3CAC', 'NR2509-FUR', '3VT8703-BOY' (JAMÁS 'J219 / 3CAC', 'NR2509 - FUR' ni '3VT8703- BOY').",
  "   - Elimina puntos, comas o dos puntos finales espurios (ej: 'MK26/13SW', nunca 'MK26/13SW.').",
  "   - 'estilo_raw' es tu lectura literal compacta en MAYÚSCULAS de los trazos visibles (sin completar letras que no ves).",
  "   - 'sku' es la versión canónica más probable sin espacios en separadores: con '/' en códigos modernos ('YS26/07MCL', 'J219/3CAC') y SIN '/' en AND ('AND26/0016DC' -> 'AND260016').",
  "   - Confusiones frecuentes a desambiguar usando la descripción escrita:",
  "     * AN0/ANO -> AND (ej: 'AN0250009' -> 'AND250009'), 0<->O<->D<->Q, U<->V, H<->M<->N, S<->5, 1<->I<->L, J<->Y, 00->QQ.",
  "     * En 'Cham cab Venado': sufijo 'CAC' (no 'CNC'); en 'Chaleco cab': 'CAV'; en 'Sueter dama': 'SW'; en 'Abrigo': 'MA'.",
  "   - Si dudas, pon la lectura literal compacta en 'estilo_raw', la mejor opción en 'sku' y 2-3 alternativas en 'posibles_variantes'.",
  "   - NUNCA inventes códigos sin relación con los trazos visibles.",
  "",
  "7. REGLAS DE ENCABEZADO, FECHA, CASILLAS DE MOVIMIENTO Y BODEGAS:",
  "   - En México el formato es DD/MM/AAAA o DD/MM/AA (ej: 09 NOV 2026 -> \"2026-11-09\").",
  "   - CONTEXTO TEMPORAL OBLIGATORIO (hoy en México):",
  "     Hoy es " + FECHA_LARGA + " (" + FECHA_CORTA + "). Año actual " + ANIO_ACTUAL + ", mes actual " + MES_ACTUAL_NOMBRE + "/" + MES_ACTUAL_NUM + " (" + ANIO_ACTUAL + "-" + MES_ACTUAL_NUM + "), mes pasado " + MES_PASADO_NOMBRE + "/" + MES_PASADO_NUM + ".",
  "     * Notas normales son de hoy, mes actual o mes pasado. NO las corrijas.",
  "     * Caligrafía confunde 6<>0<>4 y 1<>7. Si el año queda a más de 1 año de " + ANIO_ACTUAL + ", corrige SOLO el año al más cercano preservando DD/MM.",
  "     * Si mes leído > mes actual y estamos en Ene-Feb, usa año anterior. Nunca devuelvas fecha futura a más de 7 días de hoy.",
  "     * Si aplicaste corrección de año, baja confianza_global en 0.05 y agrega en \"observaciones\" \"Fecha corregida por proximidad: leído X -> Y\".",
  "   - CASILLAS DE MOVIMIENTO:",
  "     * ENTRADA marcada -> \"ENT\", SALIDA -> \"SAL\", TRASPASO -> \"TRF\", DEVOLUCION -> \"DEV\".",
  "   - REGLA CRÍTICA PARA BODEGAS (ORIGEN Y DESTINO):",
  "     * Normaliza nombres manuscritos:",
  "       - 'Cocina' ('Cosina', 'Casina', 'Cosinca', 'Cosina 1') -> \"Cocina\".",
  "       - 'San Diego 1' ('SD1'), 'San Diego 2' ('SD2'), 'Andrade', 'Toluca Bordado', 'Toluca Angel', 'Durazno' ('Durasno'), 'Tortilla', 'Zandunga 1/2/3' ('Sandunga'), 'Tulancingo', 'Vacas', 'Chiconcuac', 'Bodega Aux'.",
  "     * Si el recuadro está vacío o tachado, devuelve null.",
  "",
  "8. REGLA ESTRICTA PARA HOJAS EN MÚLTIPLES COLUMNAS:",
  "   - Si la hoja está dividida en columnas paralelas, CADA COLUMNA es independiente. Extrae toda la columna izquierda y luego la derecha en \"lineas\". Si no hay encabezado \"ORDEN DE MOVIMIENTOS\", asume \"ENT\".",
  "",
  "9. CANTIDADES DECIMALES Y PIEZAS POR CAJA:",
  "   - Fracciones '1/2', '.5', '0,5' -> 0.5 en 'cantidad_cajas'. Si cantidad vacía -> 1.",
  "   - SIEMPRE extrae el número de piezas por caja escrito junto a la descripción (ej: '90pcs' -> 90, '36' -> 36, '25' -> 25) en 'piezas_por_caja' para ayudar a desambiguar SKUs en catálogo (el sistema las pondrá en 0 al final si modo solo cajas está activo).",
  "",
  "10. MODO FALLBACK CONTEXTUAL (FORMATOS EXTERNOS, IMPRESOS O FOTOS ROTADAS):",
  "   - Si la imagen NO sigue el formato habitual de 'ORDEN DE MOVIMIENTOS' (ej. órdenes de salida/remisiones impresas como RI&KA u operadores logísticos, hojas desordenadas o fotografías rotadas 90°/180°/270°):",
  "     * ORIENTACIÓN: lee el texto siguiendo la orientación real de la hoja aunque la foto venga girada.",
  "     * ENCABEZADO FLEXIBLE: no abortes ni exijas casillas estándar. Toma 'No. de Control' o folio visible como 'folio' (o null), fecha si existe, y cualquier bodega manuscrita encima (ej. 'Cosina' -> 'Cocina') como 'bodega_receptora_interna'/'destino'. Si no hay casillas marcadas y el documento es una orden de salida logística con destino interno anotado, usa 'ENT' (o null si no es claro).",
  "     * PRIORIDAD ABSOLUTA EN LA TABLA (SKU + CAJAS): céntrate en la tabla principal y toma decisiones por contexto para extraer cada fila:",
  "       - SKU ('sku' y 'estilo_raw'): detecta en la fila el código con estructura textil del catálogo (ej. 'HT26/02HCP', 'YS26/04MCD', 'JE26/06MSD'). NUNCA tomes números de 'Recibo' ('006267'), 'Lote'/contenedor ('TCNU8379766', 4 letras + 7 dígitos) ni 'SELLOS' como SKU.",
  "       - CAJAS ('cantidad_cajas', modoSoloCajas=" + (modoSoloCajas ? "ACTIVO" : "INACTIVO") + "): toma el número lógico de la columna de cantidad/bultos enfrente de cada SKU. Con modoSoloCajas ACTIVO, NUNCA confundas piezas por caja o empaque ('C/24 PZAS', 'C/36 PZAS', '24pcs') con 'cantidad_cajas' (ese valor numérico de piezas por caja solo puede ir en 'piezas_por_caja' y 'descripcion_raw').",
  "       - VALIDACIÓN CON TOTAL: si al pie de la tabla aparece 'Total' (ej. 'Total: 96'), úsalo como guía para verificar que la suma de 'cantidad_cajas' de todas las filas coincida o se aproxime a ese total."
].join("\n");

const imageUrl = meta.comprobante_url || meta.image_url || $('Subir imagen al bucket1').first()?.json?.publicUrl;
if (!imageUrl) {
  throw new Error("No se encontro URL de imagen para el modelo de vision");
}

const body = {
  model: MODELO_VISION,
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: PROMPT },
        { type: "image_url", image_url: { url: imageUrl } }
      ]
    }
  ],
  temperature: 0.1,
  max_tokens: 32768
};

return [{
  json: {
    prompt_body: body,
    openrouter_body: body,
    body: body,
    client_request_id: meta.client_request_id || null,
    comprobante_url: imageUrl,
    usuario_id: meta.usuario_id || 1,
    origen_hint: meta.origen_hint || null,
    destino_hint: meta.destino_hint || null,
    tipo_hint: meta.tipo_hint || null,
    fecha_hint: meta.fecha_hint || null,
    folio_hint: meta.folio_hint || null,
    fecha_actual_cdmx: FECHA_CORTA,
    fecha_actual_larga: FECHA_LARGA,
    anio_actual: ANIO_ACTUAL,
    modo_solo_cajas: modoSoloCajas,
    priorizar_ia: meta.priorizar_ia !== false
  }
}];`;

// ── Código del nodo: Parsear JSON1 (compactación estricta + pz_ref) ────────
const CODE_PARSEAR_JSON = String.raw`const item = $input.first()?.json || {};

let rawContent = item;
if (item.choices && item.choices[0]) {
  const msg = item.choices[0].message;
  if (msg && typeof msg.content === 'string') rawContent = msg.content;
  else if (typeof item.choices[0].text === 'string') rawContent = item.choices[0].text;
} else if (item.candidates && item.candidates[0]?.content?.parts?.[0]?.text) {
  rawContent = item.candidates[0].content.parts[0].text;
} else if (Array.isArray(item.content) && item.content[0]?.text) {
  rawContent = item.content[0].text;
} else if (item.message && typeof item.message.content === 'string') {
  rawContent = item.message.content;
} else if (typeof item.response === 'string') {
  rawContent = item.response;
} else if (typeof item.data === 'string' || (typeof item.data === 'object' && item.data !== null)) {
  rawContent = item.data;
}

let data = {};
if (typeof rawContent === 'object' && rawContent !== null && Array.isArray(rawContent.lineas)) {
  data = rawContent;
} else if (typeof rawContent === 'string') {
  const str = rawContent.replace(new RegExp('\\x60{3}(?:json)?\\s*([\\s\\S]*?)\\s*\\x60{3}', 'gi'), '$1').trim();
  try {
    const firstBrace = str.indexOf('{');
    const lastBrace = str.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      data = JSON.parse(str.substring(firstBrace, lastBrace + 1));
    } else {
      data = JSON.parse(str);
    }
  } catch (e1) {
    try {
      const lastObjClose = str.lastIndexOf('}');
      if (lastObjClose !== -1) {
        const repaired = str.substring(0, lastObjClose + 1) + '\n  ],\n  "observaciones": "⚠️ JSON reparado automáticamente tras truncamiento",\n  "confianza_global": 0.8\n}';
        const firstBrace = repaired.indexOf('{');
        const lastBrace = repaired.lastIndexOf('}');
        data = JSON.parse(repaired.substring(firstBrace, lastBrace + 1));
      }
    } catch (e2) {
      data = {};
    }
  }
} else if (typeof rawContent === 'object' && rawContent !== null) {
  data = rawContent;
}

let meta = {};
try { meta = $('Construir prompt + body').first()?.json || {}; } catch (e) {}
if (!meta.usuario_id) {
  try { meta = $('Preparar upload').first()?.json || {}; } catch (e) {}
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
function normalizarSku(raw) {
  return String(raw == null ? '' : raw).toUpperCase().replace(/[\s.,\-/]+/g, '').trim();
}
const RE_AND_SLASH_OCR = /^AND(\d{2})\s*\/\s*(\d{4})([A-Z]{0,4})$/i;
function canonicalizarAnd(v) {
  const raw = compactarSkuOcr(v);
  const m = raw.match(RE_AND_SLASH_OCR);
  return m ? ('AND' + m[1] + m[2]).toUpperCase() : raw;
}

function obtenerHoyCDMX() {
  try {
    const p = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(new Date());
    const g = function(t) { const f = p.find(function(x) { return x.type === t; }); return (f && f.value) || ''; };
    return { dd: parseInt(g('day'), 10) || new Date().getDate(), mm: parseInt(g('month'), 10) || (new Date().getMonth() + 1), yyyy: parseInt(g('year'), 10) || new Date().getFullYear() };
  } catch (e) { const d = new Date(); return { dd: d.getDate(), mm: d.getMonth() + 1, yyyy: d.getFullYear() }; }
}
function esBisiesto(y) { return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0); }
function construirISO(yyyy, mm, dd) {
  if (!(mm >= 1 && mm <= 12)) return null;
  const dim = [31, esBisiesto(yyyy) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mm - 1];
  let d = Math.min(Math.max(dd, 1), dim);
  if (mm === 2 && dd === 29 && !esBisiesto(yyyy)) d = 28;
  return yyyy + '-' + String(mm).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}
function corregirAnioProximo(yyyy, mm, dd, hoy) {
  const orig = yyyy;
  let base = hoy.yyyy;
  if (hoy.mm <= 2 && mm > hoy.mm) base = hoy.yyyy - 1;
  if (Math.abs(yyyy - hoy.yyyy) > 1) yyyy = base;
  else if (yyyy !== base && Math.abs(yyyy - base) > 1) yyyy = base;
  let iso = construirISO(yyyy, mm, dd);
  if (!iso) return { yyyy, corregida: yyyy !== orig };
  try {
    const f = new Date(iso + 'T12:00:00Z').getTime();
    const h = new Date(hoy.yyyy + '-' + String(hoy.mm).padStart(2, '0') + '-' + String(hoy.dd).padStart(2, '0') + 'T12:00:00Z').getTime();
    let tries = 0;
    while (f > h + 7 * 86400000 && tries < 3) { yyyy -= 1; iso = construirISO(yyyy, mm, dd); tries++; }
  } catch (e) {}
  return { yyyy, corregida: yyyy !== orig };
}
function normalizarFecha(raw, hoyRef) {
  if (!raw) return { fecha: null, corregida: false, detalle: null, leido: null };
  const hoy = hoyRef || obtenerHoyCDMX();
  const s = String(raw).trim();
  let dd = null, mm = null, yyyy = null;
  const mIso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (mIso) {
    yyyy = parseInt(mIso[1], 10); mm = parseInt(mIso[2], 10); dd = parseInt(mIso[3], 10);
  } else {
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      dd = parseInt(m[1], 10); mm = parseInt(m[2], 10);
      yyyy = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
    } else {
      return { fecha: s, corregida: false, detalle: null, leido: s };
    }
  }
  if (!(mm >= 1 && mm <= 12) || !(dd >= 1 && dd <= 31)) return { fecha: s, corregida: false, detalle: null, leido: s };
  const leidoIso = construirISO(yyyy, mm, dd) || s;
  const corr = corregirAnioProximo(yyyy, mm, dd, hoy);
  const finalIso = construirISO(corr.yyyy, mm, dd);
  if (!finalIso) return { fecha: s, corregida: false, detalle: null, leido: s };
  if (corr.corregida) {
    return { fecha: finalIso, corregida: true, detalle: 'Fecha corregida por proximidad: leído ' + leidoIso + ' -> ' + finalIso, leido: leidoIso };
  }
  return { fecha: finalIso, corregida: false, detalle: null, leido: leidoIso };
}

const rawLines = Array.isArray(data.lineas) ? data.lineas : [];
const processedLines = rawLines.map((l, idx) => {
  const rawCompacto = canonicalizarAnd(l.estilo_raw || l.sku || l.descripcion_raw || '');
  const skuIaCompacto = canonicalizarAnd(l.sku || rawCompacto);
  const descripcionRaw = String(l.descripcion_raw || '').trim();
  const textoDescripcion = (descripcionRaw && normalizarSku(descripcionRaw) !== normalizarSku(rawCompacto))
    ? descripcionRaw
    : (l.descripcion_texto || descripcionRaw || rawCompacto);

  const variantesSet = new Set();
  const variantesLimpias = [];
  const pushVar = (v) => {
    const vc = canonicalizarAnd(v);
    const vn = normalizarSku(vc);
    if (vc && vn && vn !== normalizarSku(rawCompacto) && !variantesSet.has(vn)) {
      variantesSet.add(vn);
      variantesLimpias.push(vc);
    }
  };
  if (Array.isArray(l.posibles_variantes)) l.posibles_variantes.forEach(pushVar);
  if (skuIaCompacto && normalizarSku(skuIaCompacto) !== normalizarSku(rawCompacto)) pushVar(skuIaCompacto);

  let rawQty = l.cantidad_cajas;
  if (typeof rawQty === 'string') {
    rawQty = rawQty.trim().replace(',', '.');
    if (rawQty === '1/2' || rawQty === '.5') rawQty = '0.5';
    else if (rawQty === '1/4' || rawQty === '.25') rawQty = '0.25';
    else if (rawQty === '3/4' || rawQty === '.75') rawQty = '0.75';
  }
  let qty = Number(rawQty);
  if (rawQty == null || isNaN(qty) || qty <= 0) qty = 1;

  let pzRef = l.piezas_por_caja != null && !isNaN(Number(l.piezas_por_caja)) && Number(l.piezas_por_caja) > 0
    ? Number(l.piezas_por_caja)
    : null;
  if (!pzRef && textoDescripcion) {
    const mpz = textoDescripcion.toUpperCase().match(/\b(\d{2,3})\s*(?:PCS|PZ|PZS)?\b/);
    if (mpz) pzRef = Number(mpz[1]);
  }

  return {
    index: idx,
    estilo_raw: rawCompacto,
    sku: rawCompacto,
    sku_ia: skuIaCompacto,
    posibles_variantes: variantesLimpias,
    descripcion_raw: descripcionRaw || rawCompacto,
    descripcion_texto: textoDescripcion,
    cantidad_cajas: Number(qty),
    piezas_por_caja: l.piezas_por_caja ? Number(l.piezas_por_caja) : null,
    piezas_detectadas_ref: pzRef,
    confianza: l.confianza || 0.95,
    confianza_ia: l.confianza || 0.95,
    prefijo: l.prefijo || null,
    proveedor_sugerido: l.proveedor_sugerido || null,
    familia_sku: l.familia_sku || null
  };
});

const tipoRaw = String(data.tipo_movimiento || 'ENT').toUpperCase().trim();
let tipoDetectado = 'ENT';
if (tipoRaw.includes('SAL') || tipoRaw.includes('VENTA') || tipoRaw.includes('DESPACHO')) tipoDetectado = 'SAL';
else if (tipoRaw.includes('TRF') || tipoRaw.includes('TRA') || tipoRaw.includes('TRASPASO') || tipoRaw.includes('TRANSF') || tipoRaw.includes('ENVIO')) tipoDetectado = 'TRF';
else if (tipoRaw.includes('DEV')) tipoDetectado = 'DEV';
else if (tipoRaw.includes('AJU')) tipoDetectado = 'AJU';

const hoyCDMX = obtenerHoyCDMX();
let modoSoloCajas = true;
try {
  const _m = meta.modo_solo_cajas !== undefined && meta.modo_solo_cajas !== null ? meta.modo_solo_cajas : meta.modoSoloCajas;
  if (_m !== null && _m !== undefined && String(_m) !== '') {
    modoSoloCajas = !(['false','0','no','off'].includes(String(_m).toLowerCase().trim()));
  }
} catch (e) {}

const resFecha = normalizarFecha(data.fecha, hoyCDMX);
let obsFecha = data.observaciones || null;
let confGlobal = data.confianza_global || 0.95;
if (resFecha.corregida) {
  obsFecha = (obsFecha ? obsFecha + ' | ' : '') + resFecha.detalle;
  confGlobal = Math.max(0.5, Number(confGlobal) - 0.05);
}

const payload = {
  client_request_id: meta.client_request_id || null,
  comprobante_url: meta.comprobante_url || null,
  folio: data.folio || null,
  fecha: resFecha.fecha,
  tipo_movimiento: tipoDetectado,
  bodega_receptora_interna: data.bodega_receptora_interna || null,
  entidad_externa_procedencia: data.entidad_externa_procedencia || null,
  origen: data.origen || null,
  destino: data.destino || null,
  nota_referencia: data.nota_referencia || data.entidad_externa_procedencia || null,
  observaciones: obsFecha,
  lineas: processedLines,
  confianza_global: confGlobal,
  json_crudo: Object.assign({}, data, {
    _raw_llm_response: item,
    _fecha_corregida: resFecha.corregida,
    _fecha_leida: resFecha.leido,
    _modo_solo_cajas: modoSoloCajas
  })
};

return [{ json: payload }];`;

// ── Código del nodo: Matcher 2-Partes (idéntico a lib/inventario/sku-matcher.ts) ──
const CODE_MATCHER_2_PARTES = String.raw`const ocr = $('Parsear JSON1').first()?.json || {};
const meta = $('Construir prompt + body').first()?.json || {};
let catalogoRows = [];
try { catalogoRows = $('Cargar Catálogo Activo').all().map(x => x.json).filter(r => r && r.sku_base); } catch (e) {}

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

const STOP_WORDS = new Set([
  'CHAM','CHAMARRA','DAMA','MUJER','CAB','CABALLERO','HOMBRE','NINO','NINA',
  'PARA','TIPO','CON','GORRO','INTERIOR','MARCA','IDOL','NAVY','GREENFIELD',
  'BULLSTAFF','AMERICAN','NICE','TORONTO','UTILITY','BORDADO','ACOLCHADA',
  'COLORES','BASICA','TALLAS','LARGA','CORTA','CHALECO','SUDADERA','SUETER',
  'ABRIGO','GABARDINA','PANTS','FELPA','LICRA','PCS','PZS','UNISEX'
]);

function compactarSkuOcr(v) {
  return String(v == null ? '' : v).toUpperCase().trim()
    .replace(/\s*([/-])\s*/g, '$1').replace(/\s+/g, ' ').replace(/[.,;:]+$/g, '').trim();
}
function normalizarSku(v) {
  return String(v == null ? '' : v).toUpperCase().replace(/[\s.,\-/]+/g, '').trim();
}
function normalizarTexto(v) {
  return String(v == null ? '' : v).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
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
  if (sp.length > 1) sp.forEach(x => { const cl = x.replace(/^\/+|\/+$/g, ''); if (cl) toks.push(cl); });
  const sl = c.split('/');
  if (sl.length === 2 && /^(AND\d{5,6}|[13][A-Z]{2}\d{4})/i.test(sl[0]) && /^(AND\d{5,6}|[13][A-Z]{2}\d{4})/i.test(sl[1])) {
    toks.push(sl[0], sl[1]);
  }
  return Array.from(new Set(toks));
}
function extraerSenales(desc) {
  const d = normalizarTexto(desc);
  if (!d) return { gender: null, garment: null, pz: null, words: [] };
  const gender = /\b(DAMA|MUJER)\b/.test(d) ? 'F'
    : /\b(CAB|CABALLERO|HOMBRE)\b/.test(d) ? 'M'
    : /\b(NINO|BOY|INFANTIL)\b/.test(d) ? 'B'
    : /\b(NINA|GIRL)\b/.test(d) ? 'G'
    : /\b(UNISEX)\b/.test(d) ? 'U' : null;
  const garment = /\b(CHAM|CHAMARRA|CHAMARRACABALLERO)\b/.test(d) ? 'CHAMARRA'
    : /\b(CHALECO)\b/.test(d) ? 'CHALECO'
    : /\b(SUDADERA)\b/.test(d) ? 'SUDADERA'
    : /\b(SUETER)\b/.test(d) ? 'SUETER'
    : /\b(ABRIGO)\b/.test(d) ? 'ABRIGO'
    : /\b(GABARDINA)\b/.test(d) ? 'GABARDINA'
    : /\b(ROMPE|ROMPEVIENTOS)\b/.test(d) ? 'ROMPE'
    : /\b(PANTS|PANTALON|SET)\b/.test(d) ? 'SET'
    : /\b(CAMISA|PLAYERA)\b/.test(d) ? 'CAMISA' : null;
  const mpz = d.match(/\b(\d{2,3})\s*(?:PCS|PZ|PZS)?\b/);
  const words = d.split(/[^A-Z0-9]+/).filter(w => w.length >= 4 && !STOP_WORDS.has(w));
  return { gender, garment, pz: mpz ? Number(mpz[1]) : null, words };
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
function calcularDiffIndices(ocrCompacto, skuCand) {
  const a = compactarSkuOcr(ocrCompacto), b = compactarSkuOcr(skuCand);
  if (!a || !b || a === b) return [];
  const bTokens = extraerTokens(b);
  if (bTokens.length > 1) {
    const aBase = partirDosPartes(a).hasSep && a.includes('-') ? a.split('-')[0] : a;
    let bestTok = b, bestNorm = Infinity;
    for (const tok of bTokens.slice(1)) {
      const cmp = aBase.length >= 5 && tok.length >= 5 ? aBase : a;
      const nd = ocrDist(cmp, tok) / Math.max(cmp.length, tok.length);
      if (nd < bestNorm) { bestNorm = nd; bestTok = tok; }
    }
    const fullNorm = ocrDist(a, b) / Math.max(a.length, b.length);
    if (bestTok !== b && bestNorm + 0.15 < fullNorm) {
      const off = b.indexOf(bestTok);
      if (off >= 0) {
        const cmp = aBase.length >= 5 && bestTok.length >= 5 ? aBase : a;
        return alinearDiffSpan(cmp, bestTok).map(idx => idx + off);
      }
    }
  }
  return alinearDiffSpan(a, b);
}

const catalogoIdx = catalogoRows.map(r => {
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
    tokens,
    tokens_alnum: tokens.map(normalizarSku),
    partes_por_token: tokens.map(partirDosPartes),
    desc_sig: extraerSenales(r.descripcion)
  };
});

const lineasPre = [];
const lineasAmbiguas = [];

for (let idx = 0; idx < (ocr.lineas || []).length; idx++) {
  const l = ocr.lineas[idx];
  const itemIndex = l.index != null ? Number(l.index) : idx;
  const estiloCompacto = compactarSkuOcr(l.estilo_raw || l.sku || '');
  const inAlnum = normalizarSku(estiloCompacto);
  const inParts = partirDosPartes(estiloCompacto);
  const inSig = extraerSenales(l.descripcion_texto || l.descripcion_raw || '');
  const piezasObjetivo = l.piezas_detectadas_ref && l.piezas_detectadas_ref > 0 ? Number(l.piezas_detectadas_ref) : inSig.pz;
  const provHint = normalizarTexto(l.proveedor_sugerido);

  const varSet = new Set();
  if (l.sku_ia && normalizarSku(l.sku_ia) !== inAlnum) varSet.add(normalizarSku(l.sku_ia));
  if (Array.isArray(l.posibles_variantes)) {
    for (const v of l.posibles_variantes) {
      const vn = normalizarSku(v);
      if (vn && vn !== inAlnum) varSet.add(vn);
    }
  }

  const cands = [];
  for (const prod of catalogoIdx) {
    if (inAlnum && prod.sku_alnum === inAlnum) {
      cands.push({
        producto_id: prod.id, sku_base: prod.sku_base, descripcion: prod.descripcion,
        pz_en_caja: prod.pz_en_caja, familia: prod.familia, proveedor_nombre: prod.proveedor_nombre,
        score: 1.0, metodo: 'EXACTO', razon: 'EXACTO', diff_indices: []
      });
      continue;
    }

    let bestScore = 0, bestMetodo = 'OCR_EDIT', bestReason = '';
    for (let t = 0; t < prod.tokens_alnum.length; t++) {
      const tAlnum = prod.tokens_alnum[t];
      if (!tAlnum) continue;
      if (inAlnum && tAlnum === inAlnum) {
        if (0.99 > bestScore) { bestScore = 0.99; bestMetodo = 'EXACTO_TOKEN'; bestReason = 'EXACTO_TOKEN'; }
        continue;
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
          if (combined > bestScore) { bestScore = combined; bestMetodo = 'CRUCE_2_PARTES'; bestReason = 'PARTES'; }
        }
      }
      if (inAlnum && Math.abs(inAlnum.length - tAlnum.length) <= 4) {
        const d = ocrDist(inAlnum, tAlnum);
        const sim = Math.max(0, (1 - d / Math.max(inAlnum.length, tAlnum.length)) * 0.95);
        if (sim > bestScore) { bestScore = sim; bestMetodo = 'OCR_EDIT'; bestReason = 'OCR_EDIT'; }
      }
      if (inParts.hasSep && inParts.p1.length >= 6 && tAlnum.length >= 6) {
        const d = ocrDist(inParts.p1, tAlnum);
        const sim = Math.max(0, (1 - d / Math.max(inParts.p1.length, tAlnum.length)) * 0.89);
        if (sim > bestScore) { bestScore = sim; bestMetodo = 'TOKEN_BASE'; bestReason = 'BASE_TOKEN'; }
      }
    }

    if (bestScore < 0.86 && varSet.size > 0 && (varSet.has(prod.sku_alnum) || prod.tokens_alnum.some(ta => varSet.has(ta)))) {
      bestScore = 0.86; bestMetodo = 'PROPUESTA_VARIANTE_IA'; bestReason = 'VARIANTE_IA';
    }

    let finalScore = bestScore;
    if (bestScore >= 0.55 && bestScore < 0.99) {
      let boost = 0;
      if (inSig.gender && prod.desc_sig.gender) boost += (inSig.gender === prod.desc_sig.gender) ? 0.035 : -0.04;
      if (inSig.garment && prod.desc_sig.garment) boost += (inSig.garment === prod.desc_sig.garment) ? 0.035 : -0.03;
      if (piezasObjetivo && prod.pz_en_caja && piezasObjetivo === prod.pz_en_caja) boost += 0.02;
      if (inSig.words.length > 0 && prod.desc_sig.words.length > 0) {
        const ov = inSig.words.filter(w => prod.desc_sig.words.some(dw => dw.includes(w) || w.includes(dw))).length;
        if (ov > 0) boost += Math.min(0.04, ov * 0.02);
      }
      if (provHint && prod.proveedor_nombre && normalizarTexto(prod.proveedor_nombre).includes(provHint)) boost += 0.02;
      finalScore = Math.min(0.95, Math.max(0, bestScore + boost));
    }

    finalScore = Number(finalScore.toFixed(4));
    if (finalScore >= 0.60) {
      cands.push({
        producto_id: prod.id, sku_base: prod.sku_base, descripcion: prod.descripcion,
        pz_en_caja: prod.pz_en_caja, familia: prod.familia, proveedor_nombre: prod.proveedor_nombre,
        score: finalScore, metodo: bestMetodo, razon: bestReason,
        diff_indices: calcularDiffIndices(estiloCompacto, prod.sku_base)
      });
    }
  }

  cands.sort((a, b) => b.score - a.score || a.producto_id - b.producto_id);
  const topCands = cands.slice(0, 8);
  const top = topCands[0] || null;
  const second = topCands[1] || null;
  const margin = top ? top.score - (second ? second.score : 0) : 0;
  const exactos = cands.filter(c => c.score >= 0.99);
  const countAbove70 = cands.filter(c => c.score >= 0.70).length;

  let estado = 'SIN_COINCIDENCIA';
  let necesitaDecider = false;
  if (top && exactos.length === 1 && top.score >= 0.99) {
    estado = 'EXACTO';
    necesitaDecider = false;
  } else if (top && ((top.score >= 0.90 && margin >= 0.08) || (top.score >= 0.70 && countAbove70 === 1))) {
    estado = 'PROPUESTA_ALTA';
    necesitaDecider = !(top.score >= 0.93 && margin >= 0.10);
  } else if (top && top.score >= 0.70) {
    estado = 'AMBIGUO';
    necesitaDecider = true;
  } else {
    estado = 'SIN_COINCIDENCIA';
    necesitaDecider = cands.length > 0;
  }

  const entry = {
    item_index: itemIndex,
    linea: Object.assign({}, l, { estilo_raw: estiloCompacto, sku: estiloCompacto }),
    estilo_compacto: estiloCompacto,
    estado: estado,
    necesita_decider: necesitaDecider,
    margin: Number(margin.toFixed(4)),
    top: top,
    candidatos: topCands
  };
  lineasPre.push(entry);
  if (necesitaDecider && topCands.length > 0) lineasAmbiguas.push(entry);
}

const lineasParaDecider = lineasAmbiguas.slice(0, 20);
let deciderBodyFree = null;
let deciderBodyPaid = null;

if (lineasParaDecider.length > 0) {
  let prepUpload = {};
  try { prepUpload = $('Preparar upload').first()?.json || {}; } catch (e) {}
  const base64Img = prepUpload.base64Raw ? String(prepUpload.base64Raw) : '';
  const mimeImg = prepUpload.mimeType || 'image/jpeg';
  const dataUrlImg = base64Img && base64Img.length <= 1200000
    ? ('data:' + mimeImg + ';base64,' + base64Img)
    : null;

  const resumenTexto = 'ORDEN DE MOVIMIENTOS OCR. Elige el SKU real del catálogo para cada línea dudosa usando texto leído, descripción manuscrita, piezas por caja y confusiones caligráficas (0/O/D, U/V, M/H/N, A/N, S/5, 1/I/L, J/Y, 00/QQ).\n' +
    lineasParaDecider.map(x => {
      const sug = x.linea.sku_ia && x.linea.sku_ia !== x.estilo_compacto ? ' (sug_vision="' + x.linea.sku_ia + '")' : '';
      return '- L_' + x.item_index + ': leido="' + x.estilo_compacto + '"' + sug + ', desc="' + (x.linea.descripcion_texto || '') + '", pz_hoja=' + (x.linea.piezas_detectadas_ref || 'N/A');
    }).join('\n');

  const state = dataUrlImg
    ? [{ type: 'text', text: resumenTexto }, { type: 'image_url', image_url: { url: dataUrlImg } }]
    : resumenTexto;

  const questions = {};
  for (const x of lineasParaDecider) {
    const criteria = {};
    for (const c of x.candidatos.slice(0, 8)) {
      criteria[c.sku_base] = (c.descripcion || 'Sin desc') + ' | ' + (c.pz_en_caja != null ? c.pz_en_caja : '?') + ' pz/caja | Prov: ' + (c.proveedor_nombre || 'N/A') + ' | match=' + Math.round(c.score * 100) + '%';
    }
    criteria['NINGUNO'] = 'Ninguno de los candidatos anteriores corresponde con la línea manuscrita';
    questions['L_' + x.item_index] = {
      type: 'choice',
      instructions: 'Línea ' + (x.item_index + 1) + ': leído "' + x.estilo_compacto + '", desc "' + (x.linea.descripcion_texto || '') + '"' + (x.linea.piezas_detectadas_ref ? ', ' + x.linea.piezas_detectadas_ref + ' pz' : '') + '. Elige el SKU exacto del catálogo.',
      criteria
    };
  }

  deciderBodyFree = { model: 'perplexity/pplx-decider-v1.3:free', state, questions };
  deciderBodyPaid = { model: 'perplexity/pplx-decider-v1.2', state, questions };
}

return [{
  json: {
    hay_ambiguas: lineasParaDecider.length > 0,
    total_ambiguas: lineasParaDecider.length,
    lineas_pre: lineasPre,
    decider_body_free: deciderBodyFree,
    decider_body_paid: deciderBodyPaid
  }
}];`;

// ── Código del nodo: Resolver bodegas1 (fusión bodegas + Matcher + Decider) ─
const CODE_RESOLVER_BODEGAS = String.raw`let candsBodegas = [];
try { candsBodegas = $('Candidatos bodega1').all().map(x => x.json); } catch (e) {}

let ocr = {};
try { ocr = $('Parsear JSON1').first()?.json || {}; } catch (e) {}

let meta = {};
try { meta = $('Construir prompt + body').first()?.json || {}; } catch (e) {}
if (!meta.usuario_id) {
  try { meta = $('Preparar upload').first()?.json || {}; } catch (e) {}
}

let mData = {};
try { mData = $('Matcher 2-Partes').first()?.json || {}; } catch (e) {}

const inputJson = $input.first()?.json || {};
const deciderResp = (inputJson && inputJson.answers && typeof inputJson.answers === 'object' && Object.keys(inputJson.answers).length > 0)
  ? inputJson
  : null;
const deciderError = (!deciderResp && inputJson && inputJson.error) ? inputJson.error : null;
const deciderModelUsado = deciderResp?.model || null;

const usuarioId = Number(meta.usuario_id || 1);
const priorizarIa = meta.priorizar_ia !== false && meta.priorizar_ia !== 'false';
let modoSoloCajas = true;
try {
  const _m2 = meta.modo_solo_cajas !== undefined && meta.modo_solo_cajas !== null ? meta.modo_solo_cajas : meta.modoSoloCajas;
  if (_m2 !== null && _m2 !== undefined && String(_m2) !== '') {
    modoSoloCajas = !(['false','0','no','off'].includes(String(_m2).toLowerCase().trim()));
  }
} catch (e) {}

// ── 1. Catálogo Enriquecido de Bodegas ──────────────────────────────────────
const BODEGAS = [
  { id: 1,  codigo: "SUC001", nombre: "CHICONCUAC",     ciudad: "CHINCONCUAC",   es_matriz: true },
  { id: 2,  codigo: "SUC002", nombre: "VACAS",          ciudad: "CHINCONCUAC",   es_matriz: false },
  { id: 3,  codigo: "SUC003", nombre: "TOLUCA ANGEL",   ciudad: "TOLUCA",        es_matriz: false },
  { id: 4,  codigo: "SUC004", nombre: "TOLUCA BORDADO", ciudad: "TOLUCA",        es_matriz: true },
  { id: 5,  codigo: "SUC005", nombre: "DURAZNO",        ciudad: "SAN MARTIN",    es_matriz: false },
  { id: 6,  codigo: "SUC006", nombre: "SAN DIEGO 1",    ciudad: "SAN MARTIN",    es_matriz: false },
  { id: 7,  codigo: "SUC007", nombre: "TORTILLA",       ciudad: "SAN MARTIN",    es_matriz: false },
  { id: 8,  codigo: "SUC008", nombre: "SAN DIEGO 2",    ciudad: "SAN MARTIN",    es_matriz: false },
  { id: 9,  codigo: "SUC009", nombre: "ANDRADE",        ciudad: "SAN MARTIN",    es_matriz: false },
  { id: 10, codigo: "SUC010", nombre: "COCINA",         ciudad: "SAN MARTIN",    es_matriz: true },
  { id: 11, codigo: "SUC011", nombre: "PALOMAS",        ciudad: "NEZAHUALCOYOTL",es_matriz: false },
  { id: 12, codigo: "SUC012", nombre: "ZANDUNGA 1",     ciudad: "NEZAHUALCOYOTL",es_matriz: true },
  { id: 13, codigo: "SUC013", nombre: "ZANDUNGA 2",     ciudad: "NEZAHUALCOYOTL",es_matriz: false },
  { id: 14, codigo: "SUC014", nombre: "ZANDUNGA 3",     ciudad: "NEZAHUALCOYOTL",es_matriz: false },
  { id: 15, codigo: "SUC015", nombre: "TULANCINGO",     ciudad: "TULANCINGO",    es_matriz: true },
  { id: 16, codigo: "SUC016", nombre: "RI&KA",          ciudad: null,            es_matriz: false },
  { id: 17, codigo: "SUC017", nombre: "PANTACO",        ciudad: null,            es_matriz: false },
  { id: 18, codigo: "SUC0018",nombre: "GBG",            ciudad: null,            es_matriz: false },
  { id: 19, codigo: "SUC019", nombre: "SOR JUANA",      ciudad: "NEZAHUALCOYOTL",es_matriz: false },
  { id: 20, codigo: "SUC000", nombre: "BODEGA AUX",     ciudad: "MEXICO",        es_matriz: true }
];
const MATRICES_CIUDAD = {
  'TOLUCA': 4, 'SAN MARTIN': 10, 'TEXMELUCAN': 10, 'SAN MARTIN TEXMELUCAN': 10,
  'NEZAHUALCOYOTL': 12, 'NEZA': 12, 'CHICONCUAC': 1, 'CHINCONCUAC': 1,
  'TULANCINGO': 15, 'MEXICO': 20, 'CDMX': 20, 'GENERAL': 20
};
function similitudLevenshtein(s1, s2) {
  if (!s1 || !s2) return 0;
  const a = s1.toLowerCase(), b = s2.toLowerCase();
  const m = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] = b[i - 1] === a[j - 1] ? m[i - 1][j - 1] : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    }
  }
  return (Math.max(a.length, b.length) - m[b.length][a.length]) / Math.max(a.length, b.length);
}
function normalizarTextoBodega(raw) {
  if (!raw) return '';
  let s = String(raw).toUpperCase().trim();
  s = s.replace(/COSINA|COSINCA|COSINCI|CASINA|CASINCA|CASINCI|COZINA|COZINCA|COSINA 1|COCINA 1/g, 'COCINA');
  s = s.replace(/RIKA|RI Y KA|RI&KA/g, 'RI&KA');
  s = s.replace(/PANTACO|PANTACO 1/g, 'PANTACO');
  s = s.replace(/DURASNO/g, 'DURAZNO');
  s = s.replace(/SANDUNGA/g, 'ZANDUNGA');
  s = s.replace(/BORDADOS/g, 'BORDADO');
  s = s.replace(/CHICONKUAC/g, 'CHICONCUAC');
  s = s.replace(/SD1 |SD 1 |SAN DIEGO I /g, 'SAN DIEGO 1');
  s = s.replace(/SD2 |SD 2 |SAN DIEGO II /g, 'SAN DIEGO 2');
  return s;
}
function buscarBodega(texto) {
  if (!texto) return null;
  const limpio = normalizarTextoBodega(texto);
  if (/^\d+$/.test(limpio)) { const hit = BODEGAS.find(b => b.id === Number(limpio)); if (hit) return hit; }
  const exacto = BODEGAS.find(b => b.nombre === limpio || b.codigo === limpio);
  if (exacto) return exacto;
  const tokensIn = limpio.split(/[\s\-\/]+/).filter(Boolean);
  for (const b of BODEGAS) {
    const tokensB = b.nombre.split(/[\s\-\/]+/).filter(Boolean);
    if (tokensIn.length === tokensB.length && tokensB.every(t => tokensIn.includes(t))) return b;
  }
  if (limpio.includes('ZANDUNGA') || limpio.includes('SANDUNGA')) {
    if (limpio.includes('2')) return BODEGAS.find(b => b.id === 13);
    if (limpio.includes('3')) return BODEGAS.find(b => b.id === 14);
    return BODEGAS.find(b => b.id === 12);
  }
  if (limpio.includes('SAN DIEGO')) return limpio.includes('2') ? BODEGAS.find(b => b.id === 8) : BODEGAS.find(b => b.id === 6);
  if (limpio.includes('TOLUCA') || limpio.includes('BORDADO')) return limpio.includes('ANGEL') ? BODEGAS.find(b => b.id === 3) : BODEGAS.find(b => b.id === 4);
  for (const [ciudadKey, matrizId] of Object.entries(MATRICES_CIUDAD)) {
    if (limpio === ciudadKey || limpio.startsWith(ciudadKey) || ciudadKey.startsWith(limpio)) return BODEGAS.find(b => b.id === matrizId) || null;
  }
  const sub = BODEGAS.find(b => limpio.includes(b.nombre) || b.nombre.includes(limpio));
  if (sub) return sub;
  let mejor = null, maxSim = 0;
  for (const b of BODEGAS) {
    const sim = similitudLevenshtein(limpio, b.nombre);
    if (sim > maxSim && sim >= 0.70) { maxSim = sim; mejor = b; }
  }
  return mejor;
}
function resolverBodegaId(campo, rawTexto, hintTexto) {
  if (!priorizarIa && hintTexto) { const bh = buscarBodega(hintTexto); if (bh) return bh.id; }
  const directo = buscarBodega(rawTexto);
  if (directo) return directo.id;
  const c = candsBodegas.filter(r => r.campo === campo).sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0) || a.id - b.id);
  if (c.length > 0 && Number(c[0].score) >= 0.35) return c[0].id;
  if (hintTexto) { const bh = buscarBodega(hintTexto); if (bh) return bh.id; }
  return null;
}

const tipoDetectado = (ocr.tipo_movimiento || '').toUpperCase() || null;
let tipo = tipoDetectado || 'ENT';
if (!priorizarIa && meta.tipo_hint) {
  const hu = String(meta.tipo_hint).toUpperCase().trim();
  if (hu.includes('SAL')) tipo = 'SAL';
  else if (hu.includes('TRF') || hu.includes('TRA')) tipo = 'TRF';
  else if (hu.includes('DEV')) tipo = 'DEV';
  else if (hu.includes('AJU')) tipo = 'AJU';
  else if (hu.includes('ENT')) tipo = 'ENT';
}
if (!tipo || tipo === 'NULL') tipo = 'ENT';

const observacionesArr = [];
if (ocr.observaciones) observacionesArr.push(ocr.observaciones);
if (mData.hay_ambiguas && !deciderResp) {
  observacionesArr.push(deciderError ? 'Decider no disponible (fallback Matcher 2-Partes)' : 'Matcher 2-Partes directo sin Decider');
}

let bodega_origen_id = null, bodega_destino_id = null;
let textoOrigenParaBD = ocr.origen, textoDestinoParaBD = ocr.destino;
const hintOrigenValido = (meta.origen_hint && meta.origen_hint !== 'auto' && meta.origen_hint !== 'null') ? meta.origen_hint : null;
const hintDestinoValido = (meta.destino_hint && meta.destino_hint !== 'auto' && meta.destino_hint !== 'null') ? meta.destino_hint : null;

if (tipo === 'SAL') {
  textoOrigenParaBD = ocr.origen || ocr.bodega_origen_sugerida;
  bodega_origen_id = resolverBodegaId('origen', textoOrigenParaBD, hintOrigenValido);
  if (ocr.destino) observacionesArr.push('Destino/Cliente: ' + ocr.destino);
  textoDestinoParaBD = null; bodega_destino_id = null;
} else if (tipo === 'ENT' || tipo === 'DEV' || tipo === 'AJU') {
  textoOrigenParaBD = ocr.bodega_receptora_interna || ocr.origen || ocr.destino;
  bodega_origen_id = resolverBodegaId('origen', textoOrigenParaBD, hintOrigenValido);
  if (ocr.entidad_externa_procedencia || (ocr.origen && ocr.origen !== textoOrigenParaBD)) {
    observacionesArr.push('Procedencia: ' + (ocr.entidad_externa_procedencia || ocr.origen));
  }
  textoDestinoParaBD = null; bodega_destino_id = null;
} else if (tipo === 'TRF') {
  bodega_origen_id = resolverBodegaId('origen', ocr.origen, hintOrigenValido);
  bodega_destino_id = resolverBodegaId('destino', ocr.destino, hintDestinoValido);
  if (!bodega_destino_id && ocr.destino) observacionesArr.push('Destino especificado (no es bodega interna): ' + ocr.destino);
} else {
  bodega_origen_id = resolverBodegaId('origen', ocr.origen, hintOrigenValido);
  bodega_destino_id = ocr.destino ? resolverBodegaId('destino', ocr.destino, hintDestinoValido) : null;
}

if (!bodega_origen_id) {
  bodega_origen_id = 20; textoOrigenParaBD = 'BODEGA AUX';
  observacionesArr.push('⚠️ Asignada temporalmente a BODEGA AUX (ID 20) por falta de encabezado manuscrito.');
}
if (tipo === 'TRF' && !bodega_destino_id) {
  bodega_destino_id = 20; textoDestinoParaBD = 'BODEGA AUX';
  observacionesArr.push('⚠️ TRASPASO: Destino no identificado en nota física (leído: "' + (ocr.destino || 'en blanco') + '"). Asignado provisionalmente a BODEGA AUX (ID 20).');
}

const bObjOrigen = bodega_origen_id ? BODEGAS.find(b => b.id === bodega_origen_id) : null;
const nombreOrigenParaBD = bObjOrigen ? bObjOrigen.nombre : normalizarTextoBodega(textoOrigenParaBD);
const bObjDestino = bodega_destino_id ? BODEGAS.find(b => b.id === bodega_destino_id) : null;
const nombreDestinoParaBD = bObjDestino ? bObjDestino.nombre : null;

// ── 2. Fusión Matcher 2-Partes + Perplexity Decider ─────────────────────────
const advertenciasDesempate = [];
const entradasPre = Array.isArray(mData.lineas_pre) ? mData.lineas_pre : [];

const lineasResueltas = entradasPre.map((entry) => {
  const l = entry.linea;
  const itemIndex = entry.item_index;
  const rawCompacto = entry.estilo_compacto;

  let cands = (entry.candidatos || []).map(c => Object.assign({}, c));
  const ansKey = 'L_' + itemIndex;
  const ans = deciderResp && deciderResp.answers ? deciderResp.answers[ansKey] : null;
  let deciderChoice = null;
  let deciderProb = null;

  if (ans && ans.probabilities) {
    cands = cands.map(c => {
      const p = ans.probabilities[c.sku_base];
      return Object.assign({}, c, p != null ? { decider_prob: Number(Number(p).toFixed(4)) } : {});
    });
    if (ans.choice && ans.choice !== 'NINGUNO') {
      deciderChoice = ans.choice;
      deciderProb = Number(Number(ans.probabilities[ans.choice] ?? ans.confidence ?? 0).toFixed(4));
      if (deciderProb >= 0.65) {
        cands.sort((a, b) => {
          if (a.sku_base === deciderChoice) return -1;
          if (b.sku_base === deciderChoice) return 1;
          return (b.decider_prob || 0) - (a.decider_prob || 0) || b.score - a.score;
        });
      }
    }
  }

  const top = cands[0] || null;
  const topMatcher = entry.top || null;
  const margin = Number(entry.margin || 0);
  const deciderCand = deciderChoice ? cands.find(c => c.sku_base === deciderChoice) : null;

  let elegido = null;
  let metodoFinal = top ? top.metodo : null;
  let scoreFinal = top ? top.score : 0;

  if (entry.estado === 'EXACTO' && topMatcher && topMatcher.score >= 0.99) {
    elegido = topMatcher;
    scoreFinal = topMatcher.score;
    metodoFinal = topMatcher.metodo;
  } else if (
    topMatcher &&
    topMatcher.score >= 0.92 &&
    margin >= 0.10 &&
    (!deciderChoice || deciderChoice === topMatcher.sku_base || (deciderProb || 0) < 0.60)
  ) {
    elegido = topMatcher;
    scoreFinal = topMatcher.score;
    metodoFinal = topMatcher.metodo;
  } else if (deciderCand && (deciderProb || 0) >= 0.80 && deciderCand.score >= 0.75) {
    elegido = deciderCand;
    scoreFinal = deciderCand.score;
    metodoFinal = 'DECIDER_' + deciderCand.metodo;
  }

  const candsCompact = cands.slice(0, 4).map(c => ({
    producto_id: c.producto_id,
    sku_base: c.sku_base,
    descripcion: c.descripcion,
    pz_en_caja: c.pz_en_caja,
    familia: c.familia,
    proveedor_nombre: c.proveedor_nombre,
    score: Number(c.score),
    metodo: c.metodo,
    razon: c.razon,
    diff_indices: c.diff_indices,
    ...(c.decider_prob != null ? { decider_prob: c.decider_prob } : {})
  }));

  if (elegido) {
    if (elegido.sku_base !== rawCompacto && elegido.sku_base.replace(/[^A-Z0-9]/g, '') !== rawCompacto.replace(/[^A-Z0-9]/g, '')) {
      advertenciasDesempate.push('L' + (itemIndex + 1) + ': ' + rawCompacto + ' -> ' + elegido.sku_base + ' (' + Math.round(scoreFinal * 100) + '%' + (deciderProb ? ', Decider ' + Math.round(deciderProb * 100) + '%' : '') + ')');
    }
    return Object.assign({}, l, {
      estilo_raw: rawCompacto,
      sku: elegido.sku_base,
      producto_id: elegido.producto_id,
      variante_id: null,
      descripcion_texto: l.descripcion_texto || elegido.descripcion,
      piezas_por_caja: l.piezas_por_caja || elegido.pz_en_caja || null,
      piezas_detectadas_ref: l.piezas_detectadas_ref || null,
      confianza: Number(Number(scoreFinal).toFixed(2)),
      confianza_ia: l.confianza_ia != null ? l.confianza_ia : (l.confianza || null),
      metodo_match: metodoFinal,
      match_score: Number(scoreFinal),
      decider_prob: deciderProb,
      decider_model: deciderModelUsado,
      candidatos_sku: candsCompact
    });
  }

  if (candsCompact.length > 0) {
    advertenciasDesempate.push('L' + (itemIndex + 1) + ': ' + rawCompacto + ' pendiente (propuesta ' + candsCompact[0].sku_base + ' ' + Math.round(candsCompact[0].score * 100) + '%)');
  }

  // IMPORTANTE: sin confirmar -> producto_id=null y sku=rawCompacto para que Promover no auto-inserte guesses
  return Object.assign({}, l, {
    estilo_raw: rawCompacto,
    sku: rawCompacto,
    producto_id: null,
    propuesta_producto_id: top ? top.producto_id : null,
    propuesta_producto_sku: top ? top.sku_base : null,
    propuesta_producto_nombre: top ? top.descripcion : null,
    propuesta_producto_pz_en_caja: top ? top.pz_en_caja : null,
    piezas_detectadas_ref: l.piezas_detectadas_ref || null,
    match_score: top ? Number(top.score) : 0,
    metodo_match: top ? top.metodo : null,
    decider_prob: deciderProb,
    decider_model: deciderModelUsado,
    candidatos_sku: candsCompact
  });
});

if (modoSoloCajas) {
  let _pzN = 0;
  const _pzD = [];
  for (const _l of lineasResueltas) {
    const _v = _l.piezas_por_caja;
    if (_v !== null && _v !== undefined && String(_v).trim() !== '' && !isNaN(Number(_v)) && Number(_v) !== 0) {
      _pzN++;
      _pzD.push('L' + ((_l.index != null ? _l.index : 0) + 1) + ':' + _v);
    }
    _l.piezas_por_caja = null;
  }
  if (_pzN > 0 && observacionesArr.join(' ').indexOf('modo solo cajas') === -1) {
    observacionesArr.push('Pz ignoradas por modo solo cajas (IA detecto ' + _pzN + ' linea(s): ' + _pzD.join(', ') + '). Se envian en 0.');
  }
}
if (advertenciasDesempate.length > 0) {
  observacionesArr.push('⚠️ Cruce 2-Partes: ' + advertenciasDesempate.join('; '));
}

const fechaLimpia = (!priorizarIa && meta.fecha_hint) ? meta.fecha_hint : (ocr.fecha || null);
const folioLimpio = ocr.folio || null;
const observacionesFinal = observacionesArr.filter(Boolean).join(' | ');

const payloadPropuesta = {
  client_request_id: meta.client_request_id || ocr.client_request_id || null,
  comprobante_url: meta.comprobante_url || ocr.comprobante_url || null,
  folio: folioLimpio,
  folio_detectado: ocr.folio || null,
  fecha: fechaLimpia,
  fecha_detectada: ocr.fecha || null,
  tipo_movimiento: tipo,
  tipo_movimiento_detectado: tipoDetectado,
  origen: nombreOrigenParaBD || null,
  origen_detectado: ocr.origen || null,
  destino: nombreDestinoParaBD || null,
  destino_detectado: ocr.destino || null,
  bodega_origen_id: bodega_origen_id ? String(bodega_origen_id) : null,
  bodega_destino_id: bodega_destino_id ? String(bodega_destino_id) : null,
  lineas: lineasResueltas,
  json_crudo: Object.assign({}, ocr.json_crudo || ocr, {
    observaciones: observacionesFinal || null,
    priorizar_ia: priorizarIa,
    decider_model: deciderModelUsado,
    decider_usado: Boolean(deciderResp),
    decider_error: deciderError || null
  }),
  confianza_global: ocr.confianza_global != null ? String(ocr.confianza_global) : null,
  nota_referencia: ocr.nota_referencia || folioLimpio || null,
  observaciones: observacionesFinal || null,
  usuario_id: usuarioId
};

return [{
  json: {
    usuario_id: usuarioId,
    payload_propuesta: payloadPropuesta,
    payload_json: JSON.stringify(payloadPropuesta),
    resumen: {
      usuario_id: usuarioId,
      folio: folioLimpio,
      fecha: fechaLimpia,
      origen: nombreOrigenParaBD || null,
      destino: nombreDestinoParaBD || null,
      bodega_origen_id: bodega_origen_id,
      bodega_destino_id: bodega_destino_id,
      tipo_movimiento: tipo,
      priorizar_ia: priorizarIa,
      nota_referencia: ocr.nota_referencia || folioLimpio || null,
      observaciones: observacionesFinal || null,
      confianza_global: ocr.confianza_global || null,
      decider_model: deciderModelUsado,
      total_lineas: lineasResueltas.length
    }
  }
}];`;

function buildIfNode(id, name, position, conditions, combinator = 'and') {
  return {
    id,
    name,
    type: 'n8n-nodes-base.if',
    typeVersion: 2,
    position,
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
        },
        conditions,
        combinator,
      },
      options: {},
    },
  };
}

function buildOpenRouterDeciderNode(id, name, position, openRouterHeaders, jsonBodyExpr) {
  return {
    id,
    name,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position,
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: 'https://openrouter.ai/api/alpha/decisions',
      sendHeaders: true,
      headerParameters: {
        parameters: openRouterHeaders,
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: jsonBodyExpr,
      options: {
        timeout: 20000,
      },
    },
  };
}

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  console.log('Obteniendo workflow sandbox (ID:', SANDBOX_WORKFLOW_ID + ')...');
  const resGet = await api('GET', '/workflows/' + SANDBOX_WORKFLOW_ID);
  if (resGet.status !== 200) {
    console.error('Error al obtener workflow:', resGet.status, (resGet.raw || '').slice(0, 500));
    process.exit(1);
  }
  const wf = resGet.data;

  // Validar que sea efectivamente sandbox_ocr_nota y tenga webhook nota-sandbox
  const webhookNode = (wf.nodes || []).find((n) => n.type === 'n8n-nodes-base.webhook');
  if (!webhookNode || webhookNode.parameters?.path !== 'nota-sandbox') {
    console.error('ABORTADO: El workflow no tiene webhook path "nota-sandbox".');
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.resolve(
    __dirname,
    '../../backups/backup_n8n_sandbox_' + SANDBOX_WORKFLOW_ID + '_' + stamp + '.json'
  );
  fs.writeFileSync(backupPath, JSON.stringify(wf, null, 2));
  console.log('Backup pre-PUT:', backupPath);

  // Copiar credenciales Postgres Sandbox desde Candidatos bodega1
  const candBodegaNode = (wf.nodes || []).find((n) => n.name === 'Candidatos bodega1');
  if (!candBodegaNode || !candBodegaNode.credentials?.postgres) {
    console.error('No se encontró credencial Postgres en Candidatos bodega1.');
    process.exit(1);
  }
  const sandboxPgCredentials = JSON.parse(JSON.stringify(candBodegaNode.credentials));
  candBodegaNode.alwaysOutputData = true;

  // Copiar headers OpenRouter desde OpenRouter Vision (sin guardar claves en disco)
  const visionNode = (wf.nodes || []).find((n) => n.name === 'OpenRouter Vision');
  const visionHeaders = visionNode?.parameters?.headerParameters?.parameters || [];
  if (!visionHeaders.some((h) => String(h.name).toLowerCase() === 'authorization')) {
    console.error('No se encontró header Authorization en OpenRouter Vision.');
    process.exit(1);
  }
  const deciderHeaders = visionHeaders.map((h) =>
    String(h.name).toLowerCase() === 'x-title'
      ? { name: h.name, value: 'OCR Notas Decider' }
      : { name: h.name, value: h.value }
  );

  // Actualizar nodos de código existentes y eliminar Candidatos SKU1 + nodos nuevos previos (idempotencia)
  const nombresNuevos = new Set([
    'Cargar Catálogo Activo',
    'Matcher 2-Partes',
    'IF ¿Hay líneas ambiguas?',
    'Perplexity Decider v1.3 (free)',
    'IF ¿Error/Rate-limit Decider?',
    'Perplexity Decider v1.2 (pago)',
  ]);

  const preservedNodes = (wf.nodes || []).filter(
    (n) => n.name !== 'Candidatos SKU1' && !nombresNuevos.has(n.name)
  );

  const byName = new Map(preservedNodes.map((n) => [n.name, n]));
  const setCode = (name, jsCode, pos) => {
    const n = byName.get(name);
    if (!n) {
      console.error('Falta nodo esperado:', name);
      process.exit(1);
    }
    n.parameters = Object.assign({}, n.parameters, { mode: 'runOnceForAllItems', jsCode });
    if (pos) n.position = pos;
  };

  setCode('Construir prompt + body', CODE_CONSTRUIR_PROMPT, [640, 0]);
  setCode('Parsear JSON1', CODE_PARSEAR_JSON, [1088, 0]);
  setCode('Resolver bodegas1', CODE_RESOLVER_BODEGAS, [2320, 0]);

  if (byName.get('OpenRouter Vision')) byName.get('OpenRouter Vision').position = [864, 0];
  if (byName.get('Candidatos bodega1')) byName.get('Candidatos bodega1').position = [1312, 0];
  if (byName.get('Insertar propuesta1')) byName.get('Insertar propuesta1').position = [2544, 0];
  if (byName.get('Promover a nota (auto)2')) byName.get('Promover a nota (auto)2').position = [2768, 0];
  if (byName.get('Armar respuesta1')) byName.get('Armar respuesta1').position = [2992, 0];
  if (byName.get('Responder1')) byName.get('Responder1').position = [3216, 0];

  const nodoCatalogo = {
    id: crypto.randomUUID(),
    name: 'Cargar Catálogo Activo',
    type: 'n8n-nodes-base.postgres',
    typeVersion: 2.6,
    position: [448, 0],
    alwaysOutputData: true,
    credentials: sandboxPgCredentials,
    parameters: {
      operation: 'executeQuery',
      query: SQL_CARGAR_CATALOGO,
      options: {},
    },
  };

  const nodoMatcher = {
    id: crypto.randomUUID(),
    name: 'Matcher 2-Partes',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1536, 0],
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: CODE_MATCHER_2_PARTES,
    },
  };

  const nodoIfAmbiguas = buildIfNode(
    crypto.randomUUID(),
    'IF ¿Hay líneas ambiguas?',
    [1760, 0],
    [
      {
        id: 'cond-hay-ambiguas',
        leftValue: '={{ $json.hay_ambiguas }}',
        rightValue: true,
        operator: { type: 'boolean', operation: 'equals' },
      },
    ],
    'and'
  );

  const nodoDeciderFree = buildOpenRouterDeciderNode(
    crypto.randomUUID(),
    'Perplexity Decider v1.3 (free)',
    [1952, -160],
    deciderHeaders,
    '={{ JSON.stringify($json.decider_body_free) }}'
  );

  const nodoIfError = buildIfNode(
    crypto.randomUUID(),
    'IF ¿Error/Rate-limit Decider?',
    [2112, -160],
    [
      {
        id: 'cond-decider-error',
        leftValue: '={{ Boolean($json.error) }}',
        rightValue: true,
        operator: { type: 'boolean', operation: 'equals' },
      },
      {
        id: 'cond-decider-no-answers',
        leftValue: '={{ Boolean($json.answers && Object.keys($json.answers).length > 0) }}',
        rightValue: false,
        operator: { type: 'boolean', operation: 'equals' },
      },
    ],
    'or'
  );

  const nodoDeciderPaid = buildOpenRouterDeciderNode(
    crypto.randomUUID(),
    'Perplexity Decider v1.2 (pago)',
    [2240, -320],
    deciderHeaders,
    "={{ JSON.stringify($('Matcher 2-Partes').first().json.decider_body_paid) }}"
  );

  const newNodes = [
    ...preservedNodes,
    nodoCatalogo,
    nodoMatcher,
    nodoIfAmbiguas,
    nodoDeciderFree,
    nodoIfError,
    nodoDeciderPaid,
  ];

  // Reconstruir conexiones lineales y ramas de Decider (cero carreras)
  const newConnections = Object.assign({}, wf.connections || {});
  delete newConnections['Candidatos SKU1'];
  newConnections['Subir imagen al bucket1'] = { main: [[{ node: 'Cargar Catálogo Activo', type: 'main', index: 0 }]] };
  newConnections['Cargar Catálogo Activo'] = { main: [[{ node: 'Construir prompt + body', type: 'main', index: 0 }]] };
  newConnections['Construir prompt + body'] = { main: [[{ node: 'OpenRouter Vision', type: 'main', index: 0 }]] };
  newConnections['OpenRouter Vision'] = { main: [[{ node: 'Parsear JSON1', type: 'main', index: 0 }]] };
  newConnections['Parsear JSON1'] = { main: [[{ node: 'Candidatos bodega1', type: 'main', index: 0 }]] };
  newConnections['Candidatos bodega1'] = { main: [[{ node: 'Matcher 2-Partes', type: 'main', index: 0 }]] };
  newConnections['Matcher 2-Partes'] = { main: [[{ node: 'IF ¿Hay líneas ambiguas?', type: 'main', index: 0 }]] };
  newConnections['IF ¿Hay líneas ambiguas?'] = {
    main: [
      [{ node: 'Perplexity Decider v1.3 (free)', type: 'main', index: 0 }],
      [{ node: 'Resolver bodegas1', type: 'main', index: 0 }],
    ],
  };
  newConnections['Perplexity Decider v1.3 (free)'] = {
    main: [[{ node: 'IF ¿Error/Rate-limit Decider?', type: 'main', index: 0 }]],
  };
  newConnections['IF ¿Error/Rate-limit Decider?'] = {
    main: [
      [{ node: 'Perplexity Decider v1.2 (pago)', type: 'main', index: 0 }],
      [{ node: 'Resolver bodegas1', type: 'main', index: 0 }],
    ],
  };
  newConnections['Perplexity Decider v1.2 (pago)'] = {
    main: [[{ node: 'Resolver bodegas1', type: 'main', index: 0 }]],
  };

  // Chequeo de sintaxis JS de todos los nodos Code modificados/nuevos
  for (const name of ['Construir prompt + body', 'Parsear JSON1', 'Matcher 2-Partes', 'Resolver bodegas1']) {
    const n = newNodes.find((x) => x.name === name);
    try {
      new Function(n.parameters.jsCode);
      console.log('✓ Sintaxis JS OK:', name);
    } catch (err) {
      console.error('✗ Sintaxis rota en', name, ':', err.message);
      process.exit(1);
    }
  }

  if (dryRun) {
    console.log('DRY-RUN OK. Nodos totales:', newNodes.length, '| Credencial PG:', sandboxPgCredentials.postgres.name);
    return;
  }

  const putPayload = {
    name: wf.name,
    nodes: newNodes,
    connections: newConnections,
    settings: wf.settings,
  };
  const resPut = await api('PUT', '/workflows/' + SANDBOX_WORKFLOW_ID, putPayload);
  if (resPut.status !== 200) {
    console.error('Error al actualizar sandbox_ocr_nota:', resPut.status, JSON.stringify(resPut).slice(0, 2000));
    process.exit(1);
  }

  console.log('🚀 WORKFLOW SANDBOX ACTUALIZADO OK (ID:', resPut.data.id, ')');
  const verify = await api('GET', '/workflows/' + SANDBOX_WORKFLOW_ID);
  if (verify.status === 200) {
    const v = verify.data;
    const names = (v.nodes || []).map((n) => n.name);
    const pgNodes = (v.nodes || []).filter((n) => n.type === 'n8n-nodes-base.postgres');
    console.log('Verificación:', {
      active: v.active,
      webhookPath: (v.nodes || []).find((n) => n.type === 'n8n-nodes-base.webhook')?.parameters?.path,
      hasCatalogo: names.includes('Cargar Catálogo Activo'),
      hasMatcher: names.includes('Matcher 2-Partes'),
      hasDeciderFree: names.includes('Perplexity Decider v1.3 (free)'),
      hasDeciderPaid: names.includes('Perplexity Decider v1.2 (pago)'),
      pgCreds: pgNodes.map((n) => `${n.name}:${n.credentials?.postgres?.name}`),
      versionId: v.versionId,
    });
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
