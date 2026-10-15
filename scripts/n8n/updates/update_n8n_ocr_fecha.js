// scripts/n8n/updates/update_n8n_ocr_fecha.js
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
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
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

// ── 1. PROMPT CON CONTEXTO TEMPORAL DINÁMICO ──
const JS_CODE_PROMPT_BODY = `// ── CONFIGURACION DE MODELO OPENROUTER ───────────────────────
const MODELO_VISION = "google/gemini-2.5-flash";

const meta = $('Preparar upload').first()?.json || $('Normalizar imagen2').first()?.json || $('Normalizar entrada1').first()?.json || {};

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

const PROMPT = \`Eres un extractor experto de datos de 'ORDEN DE MOVIMIENTOS' y notas de inventario manuscritas de la industria textil (chamarras, chalecos, rompevientos, pants, gabardinas, abrigos, sudaderas, sets).
Analiza la imagen escaneada/fotografiada y devuelve UNICAMENTE un JSON válido, sin markdown ni texto extra, con esta estructura exacta:

{
  "folio": string|null,
  "fecha": string|null,
  "tipo_movimiento": "ENT"|"DEV"|"SAL"|"TRF"|"AJU"|null,
  "bodega_receptora_interna": string|null,
  "entidad_externa_procedencia": string|null,
  "origen": string|null,
  "destino": string|null,
  "lineas": [
    {
      "index": number,
      "sku": string,
      "estilo_raw": string,
      "posibles_variantes": string[],
      "descripcion_raw": string,
      "descripcion_texto": string,
      "cantidad_cajas": number,
      "piezas_por_caja": number|null,
      "proveedor_sugerido": string|null,
      "prefijo": string|null,
      "familia_sku": string|null,
      "confianza": number
    }
  ],
  "observaciones": string|null,
  "confianza_global": number
}

═══════════════════════════════════════════════════════════════
GUIA ORIENTATIVA DE PATRON TEXTIL (ORIENTACION ANTI-ALUCINACION)
═══════════════════════════════════════════════════════════════
La estructura general sigue este orden de lectura habitual (NO es una ley rígida, sirve de guía para no inventar letras):
[PROVEEDOR] [AÑO/NÚMEROS] [/] [CONSECUTIVO] [GÉNERO + PRENDA] [EXTRA/TELA]

1. PROVEEDORES Y PREFIJOS CONOCIDOS:
   - TY (TIANYI), BO (BONNIE), FK (FINDAKERA), JA (JACKIE), AND|3VT|3JA|1AK|1VT (MOTI),
   - KB (KOBY), LW (LAWRENCE), LI (LILY), JE (JENNY), JO (JOE), VE (VENKAT), YI (YIMAY),
   - JM (JEMES), HT (HONTON), MA (Marvel), AL (ALIA), HO (HONOR), QQ (QUING QUING),
   - KU (KUAILE), HF (HAIZENFENG), MK (MANKENI), TC (TOCAS), 85 (858).

2. AÑO / PEDIDO (FLEXIBLE):
   - Habitualmente 2 dígitos (26, 25, 24) o 3 dígitos en códigos de proveedor (324, 329).
   - En BONNIE puede ir directamente el separador: 'BO/1DSETFE', 'BO/3DSETFE', 'BO/4DSETFE'.

3. CONSECUTIVO DE MODELO:
   - 1 o 2 dígitos del modelo (01, 02, 03, 04, 05, 07, 10, 15, etc.). Rara vez supera 20.

4. GÉNERO, PRENDA Y TELAS ESTABLES (CRUCIAL PARA DESAMBIGUAR):
   - GÉNEROS: D o M o DA (Dama/Mujer), H o C o CA (Hombre/Caballero), B (Niño), G (Niña), U (Unisex).
   - PRENDAS: C (Chamarra), V (Chaleco), W o WB (Rompevientos), SD o SUD (Sudadera), ST o SET (Set), P (Pantalón), A (Abrigo), G (Gabardina), TS (Camisa/Playera), SW (Suéter).
   - SUFIJOS DE TELA ESTABLES (Nunca inventar caracteres raros):
     * 'FE' = Felpa (ej: 'BO/1DSETFE', 'BO/3DSETFE', 'BO/4DSETFE'). NUNCA transcribir 'SETRE' ni 'SETF3'.
     * 'LYC' o 'PLYC' = Licra (ej: 'BO/2DPLYC', 'JA26/05MSDLYC'). NUNCA transcribir 'LY6'.
     * 'AF' = Afelpado (ej: 'BO/1DSETAF').
     * 'HC' = Hombre Chamarra / 'MC' = Mujer Chamarra.

5. MARCAS Y NOMBRES COMERCIALES DE REFERENCIA EN DESCRIPCIÓN:
   - TORONTO, GREENFIELD, IDOL NAVY, BULLSTAFF, GREEN-BERRY, DULCE-CAROLINE, LOVI-MEN,
   - AIR COMPANY, SEALDON, NR, POLAR-BEAR, ROCK-SUGAR, AMERICAN-NICE, SILVER-SPOON, SAKERS&CO.

6. REGLA DE GENERACION DE 'posibles_variantes' ANTE DUDAS DE CALIGRAFIA:
   - Si un trazo rápido puede ser un '1' o un '7' (ej: 'TY26/07HC' vs 'TY26/01HC'): pon el más probable en 'sku' e incluye el alternativo en 'posibles_variantes': ["TY26/01HC"].
   - Si dudas entre 'H' o 'M' en el género: incluye la alternativa en 'posibles_variantes': ["TY26/01MC"].
   - Si dudas entre '0' y 'D' en sets: incluye la alternativa en 'posibles_variantes': ["BO/3DSETFE"].

7. REGLAS DE ENCABEZADO, FECHA, CASILLAS DE MOVIMIENTO Y BODEGAS:
   - En México el formato es DD/MM/AAAA o DD/MM/AA (ej: 20/08/26 es 20 de Agosto de 2026 -> "2026-08-20").
   - CONTEXTO TEMPORAL OBLIGATORIO (hoy en México):
     Hoy es \${FECHA_LARGA} (\${FECHA_CORTA}). Año actual \${ANIO_ACTUAL}, mes actual \${MES_ACTUAL_NOMBRE}/\${MES_ACTUAL_NUM} (\${ANIO_ACTUAL}-\${MES_ACTUAL_NUM}), mes pasado \${MES_PASADO_NOMBRE}/\${MES_PASADO_NUM}.
     Ejemplos con hoy 15 de Octubre de 2026 (15/10/2026): año actual 2026, mes actual Octubre/10, mes pasado Septiembre/09.
     * Nota de hoy (ej: 15/10/26 con hoy 15/10/2026) -> devuelve "2026-10-15" sin corrección, confianza alta. Las notas normales son de hoy, del mes actual o del mes pasado. NO las corrijas.
     * Caligrafía rápida confunde 6<>0<>4 y 1<>7. Si lees 2076, 2016, 2024 o 2020 con DD/MM plausible pero el año queda a más de 1 año de \${ANIO_ACTUAL}, corrige SOLO el año al más cercano a hoy preservando DD/MM y devuelve ya corregido en "fecha" (YYYY-MM-DD). Ej: 19/09/2016 con hoy Octubre 2026 -> "2026-09-19". 18/09/2076 -> "2026-09-18". 24/09/2024 -> "2026-09-24".
     * Fin de año: si hoy es Enero de 2027 (01/2027) y lees mes 12 u 11 (Diciembre/Noviembre), el año es 2026 (año anterior), no 2027. Regla general: si mes leído > mes actual y estamos en Ene-Feb, usa año anterior.
     * Nunca devuelvas fecha futura a más de 7 días de hoy. Si queda futura, retrocede el año hasta que no sea futura.
     * Si aplicaste corrección de año, baja confianza_global en 0.05 y agrega en "observaciones" el texto "Fecha corregida por proximidad: leído X -> Y".
   - CASILLAS DE MOVIMIENTO:
     * Revisa atentamente las casillas impresas: [ENTRADA], [SALIDA], [TRASPASO], [DEVOLUCION].
     * Si una casilla tiene marca (cruz 'X', paloma '✓', raya o relleno manuscrito), clasifícala:
       - ENTRADA marcada -> "ENT"
       - SALIDA marcada -> "SAL"
       - TRASPASO marcada -> "TRF"
       - DEVOLUCION marcada -> "DEV"
   - REGLA CRÍTICA PARA TRASPASO (ORIGEN Y DESTINO OBLIGATORIOS):
     * Si la casilla TRASPASO está marcada, es OBLIGATORIO inspeccionar con máxima atención los recuadros 'Origen:' y 'Destino:'.
     * Los nombres de bodegas se escriben a mano con caligrafía rápida. Usa la lista canónica para normalizar trazos dudosos:
       - 'Cocina': habitualmente escrito como 'Cosina', 'Casina', 'Cosinca', 'Cosinci', 'Casinci', 'Cosina 1' -> transcribe como "Cocina".
       - 'San Diego 1': escrito como 'San Diego 1', 'San Diego I', 'SD1', 'SD 1' -> transcribe como "San Diego 1".
       - 'San Diego 2': escrito como 'San Diego 2', 'San Diego II', 'SD2', 'SD 2' -> transcribe como "San Diego 2".
       - 'Andrade': escrito como 'Andrade', 'Andrad' -> transcribe como "Andrade".
       - 'Toluca Bordado': escrito como 'Toluca Bordado', 'Bordado Toluca', 'Bordado', 'Toluca Bord' -> transcribe como "Toluca Bordado".
       - 'Toluca Angel': escrito como 'Toluca Angel', 'Angel' -> transcribe como "Toluca Angel".
       - 'Durazno': escrito como 'Durazno', 'Durasno' -> transcribe como "Durazno".
       - 'Tortilla': escrito como 'Tortilla' -> transcribe como "Tortilla".
       - 'Zandunga 1 / 2 / 3': escrito como 'Zandunga', 'Sandunga' (1, 2 o 3) -> transcribe como "Zandunga 1", "Zandunga 2", etc.
       - 'Tulancingo': escrito como 'Tulancingo', 'Tolancingo' -> transcribe como "Tulancingo".
       - 'Vacas': escrito como 'Vacas' -> transcribe como "Vacas".
       - 'Chiconcuac': escrito como 'Chiconcuac', 'Chiconkuac' -> transcribe como "Chiconcuac".
       - 'Bodega Aux': escrito como 'Bodega Aux', 'Auxiliar', 'General' -> transcribe como "Bodega Aux".
     * Si lees trazos fonéticamente correspondientes a estas bodegas, transcribe el nombre canónico.
     * Si el recuadro de origen o destino está completamente vacío o tachado, devuelve null.

8. REGLA ESTRICTA PARA HOJAS EN MÚLTIPLES COLUMNAS (HOJAS DE LIBRETA / CONTEOS / AJUSTES):
   - Si la hoja manuscrita está dividida en dos o más columnas de texto escritas en paralelo (por ejemplo: Columna 1 a la izquierda con sus cantidades, y Columna 2 a la derecha con sus cantidades):
   - CADA COLUMNA REPRESENTA PRODUCTOS TOTALMENTE INDEPENDIENTES.
   - NUNCA tomes el texto o código de la columna derecha como la "descripción" de la columna izquierda.
   - Extrae secuencialmente TODOS los renglones de la Columna Izquierda y luego TODOS los de la Columna Derecha (o renglón por renglón) como elementos SEPARADOS en el arreglo "lineas".
   - Si la hoja no tiene encabezado impreso "ORDEN DE MOVIMIENTOS", asume tipo_movimiento: "ENT".

9. CANTIDADES DECIMALES Y FRACCIONES (MEDIAS CAJAS):
   - Si en la columna de cantidad (cajas) viene un número decimal o fracción como '0.5', '1/2', '0,5', '.5', o '1.5', conviértelo a su valor numérico decimal en 'cantidad_cajas' (ej: 0.5).
   - Si el campo de cantidad viene vacío o ilegible, asume 1.\`;

const imageUrl = meta.comprobante_url || meta.image_url || $('Subir imagen al bucket1').first()?.json?.publicUrl || $('Subir imagen al bucket').first()?.json?.publicUrl;

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
  max_tokens: 8192
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
    priorizar_ia: meta.priorizar_ia !== false
  }
}];`;

// ── 2. PARSEAR JSON CON CORRECCIÓN DE AÑO POR PROXIMIDAD ──
const JS_CODE_PARSEAR_JSON = `const item = $input.first()?.json || {};

// 1. Extraer el contenido textual según el proveedor / formato
let rawContent = item;
if (item.choices && item.choices[0]) {
  const msg = item.choices[0].message;
  if (msg && typeof msg.content === 'string') {
    rawContent = msg.content;
  } else if (typeof item.choices[0].text === 'string') {
    rawContent = item.choices[0].text;
  }
} else if (item.candidates && item.candidates[0]?.content?.parts?.[0]?.text) {
  rawContent = item.candidates[0].content.parts[0].text;
} else if (Array.isArray(item.content) && item.content[0]?.text) {
  rawContent = item.content[0].text;
} else if (item.message && typeof item.message.content === 'string') {
  rawContent = item.message.content;
} else if (typeof item.response === 'string') {
  rawContent = item.response;
} else if (typeof item.data === 'string') {
  rawContent = item.data;
} else if (typeof item.data === 'object' && item.data !== null) {
  rawContent = item.data;
}

// 2. Parsear el JSON limpiando posibles bloques markdown con auto-reparación si viene truncado
let data = {};
if (typeof rawContent === 'object' && rawContent !== null && Array.isArray(rawContent.lineas)) {
  data = rawContent;
} else if (typeof rawContent === 'string') {
  let str = rawContent.replace(/\\\`\\\`\\\`(?:json)?\\\\s*([\\\\s\\\\S]*?)\\\\s*\\\`\\\`\\\`/gi, '$1').trim();
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
      let repaired = str;
      const lastObjClose = repaired.lastIndexOf('}');
      if (lastObjClose !== -1) {
        repaired = repaired.substring(0, lastObjClose + 1) + '\\\\n  ],\\\\n  "observaciones": "⚠️ JSON reparado automáticamente tras truncamiento",\\\\n  "confianza_global": 0.8\\\\n}';
        const firstBrace = repaired.indexOf('{');
        const lastBrace = repaired.lastIndexOf('}');
        data = JSON.parse(repaired.substring(firstBrace, lastBrace + 1));
      }
    } catch (e2) {
      try {
        const lineMatches = str.match(/\\\\{\\\\s*"index"[\\\\s\\\\S]*?\\\\}/g) || [];
        const recoveredLines = [];
        for (const lm of lineMatches) {
          try { recoveredLines.push(JSON.parse(lm)); } catch(e3) {}
        }
        if (recoveredLines.length > 0) {
          data = {
            tipo_movimiento: "ENT",
            lineas: recoveredLines,
            observaciones: "⚠️ Líneas recuperadas mediante extractor de emergencia",
            confianza_global: 0.75
          };
        } else {
          data = {};
        }
      } catch (e4) {
        data = {};
      }
    }
  }
} else if (typeof rawContent === 'object' && rawContent !== null) {
  data = rawContent;
}

let meta = {};
try { meta = $('Construir prompt + body').first()?.json || {}; } catch(e) {}
if (!meta.usuario_id) {
  try { meta = $('Construir prompt + body1').first()?.json || {}; } catch(e) {}
}
if (!meta.usuario_id) {
  try { meta = $('Construir prompt + body2').first()?.json || {}; } catch(e) {}
}
if (!meta.usuario_id) {
  try { meta = $('Preparar upload').first()?.json || {}; } catch(e) {}
}

function normalizarSku(raw) {
  if (!raw) return '';
  let s = String(raw).trim().toUpperCase();
  s = s.replace(/[\\\\s\\\\.\\\\,\\\\-]+$/g, '');
  s = s.replace(/\\\\s+/g, '');
  return s;
}

// ── FECHA: corrección determinística por proximidad a hoy (CDMX) ──
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
  const mmS = String(mm).padStart(2, '0');
  const ddS = String(d).padStart(2, '0');
  return yyyy + '-' + mmS + '-' + ddS;
}
function corregirAnioProximo(yyyy, mm, dd, hoy) {
  const orig = yyyy;
  let base = hoy.yyyy;
  if (hoy.mm <= 2 && mm > hoy.mm) base = hoy.yyyy - 1;
  if (Math.abs(yyyy - hoy.yyyy) > 1) yyyy = base;
  else if (yyyy !== base && Math.abs(yyyy - base) > 1) yyyy = base;
  let iso = construirISO(yyyy, mm, dd);
  if (!iso) return { yyyy: yyyy, corregida: yyyy !== orig };
  try {
    const f = new Date(iso + 'T12:00:00Z').getTime();
    const h = new Date(hoy.yyyy + '-' + String(hoy.mm).padStart(2, '0') + '-' + String(hoy.dd).padStart(2, '0') + 'T12:00:00Z').getTime();
    let tries = 0;
    while (f > h + 7 * 86400000 && tries < 3) { yyyy = yyyy - 1; iso = construirISO(yyyy, mm, dd); tries++; }
  } catch (e) {}
  return { yyyy: yyyy, corregida: yyyy !== orig };
}
function normalizarFecha(raw, hoyRef) {
  if (!raw) return { fecha: null, corregida: false, detalle: null, leido: null };
  const hoy = hoyRef || obtenerHoyCDMX();
  const s = String(raw).trim();
  let dd = null, mm = null, yyyy = null;
  const mIso = s.match(/^(\\\\d{4})-(\\\\d{1,2})-(\\\\d{1,2})/);
  if (mIso) {
    yyyy = parseInt(mIso[1], 10); mm = parseInt(mIso[2], 10); dd = parseInt(mIso[3], 10);
  } else {
    const m = s.match(/^(\\\\d{1,2})[\\\\/\\\\-](\\\\d{1,2})[\\\\/\\\\-](\\\\d{2,4})$/);
    if (m) {
      dd = parseInt(m[1], 10); mm = parseInt(m[2], 10);
      let y = m[3];
      yyyy = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
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
const searchPayload = [];

const processedLines = rawLines.map((l, idx) => {
  const rawCandidate = (l.sku || l.estilo_raw || l.descripcion_raw || '').trim();
  const skuLimpio = normalizarSku(rawCandidate);
  const textoDescripcion = (l.descripcion_raw && l.descripcion_raw !== rawCandidate)
    ? l.descripcion_raw
    : (l.descripcion_texto || skuLimpio || rawCandidate);
  let rawQty = l.cantidad_cajas;
  if (typeof rawQty === 'string') {
    rawQty = rawQty.trim().replace(',', '.');
    if (rawQty === '1/2' || rawQty === '.5') rawQty = '0.5';
    else if (rawQty === '1/4' || rawQty === '.25') rawQty = '0.25';
    else if (rawQty === '3/4' || rawQty === '.75') rawQty = '0.75';
  }
  let qty = Number(rawQty);
  if (rawQty == null || isNaN(qty) || qty <= 0) { qty = 1; }

  const variantes = Array.isArray(l.posibles_variantes) ? l.posibles_variantes : [];

  if (skuLimpio) {
    searchPayload.push({
      index: idx,
      sku: skuLimpio,
      estilo_raw: skuLimpio,
      descripcion_texto: textoDescripcion
    });
  }

  for (const v of variantes) {
    const vClean = normalizarSku(v);
    if (vClean && vClean !== skuLimpio) {
      searchPayload.push({
        index: idx,
        sku: vClean,
        estilo_raw: vClean,
        descripcion_texto: textoDescripcion
      });
    }
  }

  return {
    index: idx,
    estilo_raw: skuLimpio || rawCandidate,
    sku: skuLimpio || rawCandidate,
    posibles_variantes: variantes,
    descripcion_raw: skuLimpio || rawCandidate,
    descripcion_texto: textoDescripcion,
    cantidad_cajas: Number(qty),
    piezas_por_caja: l.piezas_por_caja ? Number(l.piezas_por_caja) : null,
    confianza: l.confianza || 0.95,
    prefijo: l.prefijo || null,
    proveedor_sugerido: l.proveedor_sugerido || null,
    familia_sku: l.familia_sku || null
  };
});

const tipoRaw = String(data.tipo_movimiento || 'ENT').toUpperCase().trim();
let tipoDetectado = 'ENT';
if (tipoRaw.includes('SAL') || tipoRaw.includes('VENTA') || tipoRaw.includes('DESPACHO')) {
  tipoDetectado = 'SAL';
} else if (tipoRaw.includes('TRF') || tipoRaw.includes('TRA') || tipoRaw.includes('TRASPASO') || tipoRaw.includes('TRANSF') || tipoRaw.includes('ENVIO')) {
  tipoDetectado = 'TRF';
} else if (tipoRaw.includes('DEV')) {
  tipoDetectado = 'DEV';
} else if (tipoRaw.includes('AJU')) {
  tipoDetectado = 'AJU';
} else {
  tipoDetectado = 'ENT';
}

const hoyCDMX = obtenerHoyCDMX();
const resFecha = normalizarFecha(data.fecha, hoyCDMX);
const fechaFormateada = resFecha.fecha;
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
  fecha: fechaFormateada,
  tipo_movimiento: tipoDetectado,
  bodega_receptora_interna: data.bodega_receptora_interna || null,
  entidad_externa_procedencia: data.entidad_externa_procedencia || null,
  origen: data.origen || null,
  destino: data.destino || null,
  nota_referencia: data.nota_referencia || data.entidad_externa_procedencia || null,
  observaciones: obsFecha,
  lineas: processedLines,
  lineas_para_busqueda: searchPayload,
  confianza_global: confGlobal,
  json_crudo: Object.assign({}, data, { _raw_llm_response: item, _fecha_corregida: resFecha.corregida, _fecha_leida: resFecha.leido })
};

return [{
  json: Object.assign({}, payload, {
    payload_json: JSON.stringify(payload),
    lineas_json: JSON.stringify(processedLines),
    lineas_para_busqueda_json: JSON.stringify(searchPayload)
  })
}];`;

async function run() {
  console.log('Obteniendo workflow (ID:', workflowId, ')...');
  const resGet = await api('GET', '/workflows/' + workflowId);
  if (resGet.status !== 200) {
    console.error('Error al obtener workflow:', resGet.status, (resGet.raw || '').slice(0, 500));
    process.exit(1);
  }
  const wf = resGet.data;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.resolve(__dirname, '../../backups/backup_n8n_wf_' + workflowId + '_fecha_prePUT_' + stamp + '.json');
  fs.writeFileSync(backupPath, JSON.stringify(wf, null, 2));
  console.log('Backup pre-PUT:', backupPath);

  let nPrompt = 0;
  for (const n of wf.nodes.filter(n => n.name.startsWith('Construir prompt + body'))) {
    n.parameters = n.parameters || {};
    n.parameters.jsCode = JS_CODE_PROMPT_BODY;
    nPrompt++;
    console.log('✓ Prompt actualizado:', n.name);
  }

  let nParse = 0;
  for (const n of wf.nodes.filter(n => n.name.startsWith('Parsear JSON'))) {
    if (n.name === 'Parsear JSON1' || n.name === 'Parsear JSON3') {
      n.parameters = n.parameters || {};
      n.parameters.jsCode = JS_CODE_PARSEAR_JSON;
      nParse++;
      console.log('✓ Parsear actualizado:', n.name);
    }
  }

  if (nPrompt === 0) console.warn('WARN: 0 nodos prompt encontrados');
  if (nParse === 0) console.warn('WARN: 0 nodos parsear encontrados');

  const putPayload = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings };
  const resPut = await api('PUT', '/workflows/' + workflowId, putPayload);
  if (resPut.status === 200) {
    console.log('🚀 WORKFLOW ACTUALIZADO OK (ID:', resPut.data.id, ') prompts:', nPrompt, 'parsers:', nParse);
  } else {
    console.error('Error al actualizar:', resPut.status, JSON.stringify(resPut).slice(0, 2000));
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
