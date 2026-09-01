// scripts\n8n\updates\update_n8n_ocr.js
const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables desde .env.local si existen
let envConfig = {};
try {
  const envPath = fs.existsSync(path.resolve(__dirname, '../../../.env.local'))
    ? path.resolve(__dirname, '../../../.env.local')
    : path.resolve(__dirname, '../../.env.local');
  if (fs.existsSync(envPath)) {
    envConfig = dotenv.parse(fs.readFileSync(envPath));
  }
} catch (e) {}

const apiKey = process.env.N8N_API_KEY || envConfig.N8N_API_KEY || '';
const workflowId = process.env.N8N_WORKFLOW_ID || 'DtZOqR4-9_DnULEjWW78b';

if (!apiKey) {
  console.error('ERROR: N8N_API_KEY no encontrada en variables de entorno ni en .env.local');
  process.exit(1);
}

function api(method, apiPath, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'n8n.sistemaindumentaria.com',
      path: '/api/v1' + apiPath,
      method: method,
      headers: {
        'X-N8N-API-KEY': apiKey,
        ...(payload ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── 1. PROMPT OPTIMIZADO CON GUÍA TEXTIL DINÁMICA, SUFIJOS ESTABLES Y VARIANTES DE DUDA ──
const JS_CODE_PROMPT_BODY = `// ── CONFIGURACION DE MODELO OPENROUTER ───────────────────────
const MODELO_VISION = "google/gemini-2.5-flash";

const meta = $('Preparar upload').first()?.json || $('Normalizar imagen2').first()?.json || $('Normalizar entrada1').first()?.json || {};

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

7. REGLAS DE ENCABEZADO Y FECHA:
   - En México el formato es DD/MM/AAAA o DD/MM/AA (ej: 20/08/26 es 20 de Agosto de 2026 -> "2026-08-20").
   - tipo_movimiento: Si la nota dice "ORDEN DE MOVIMIENTOS", revisa las casillas marcadas (ENTRADA -> "ENT", SALIDA -> "SAL", TRASPASO -> "TRF", DEVOLUCION -> "DEV").

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
    priorizar_ia: meta.priorizar_ia !== false
  }
}];`;

// ── 2. PARSEAR JSON CON EXTRACCIÓN DE VARIANTES PARA BÚSQUEDA ───────────────────
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
  let str = rawContent.replace(/\`\`\`(?:json)?\\s*([\\s\\S]*?)\\s*\`\`\`/gi, '$1').trim();
  try {
    const firstBrace = str.indexOf('{');
    const lastBrace = str.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      data = JSON.parse(str.substring(firstBrace, lastBrace + 1));
    } else {
      data = JSON.parse(str);
    }
  } catch (e1) {
    // Si falla el parseo por truncamiento (MAX_TOKENS), intentar reparar cerrando el arreglo 'lineas'
    try {
      let repaired = str;
      const lastObjClose = repaired.lastIndexOf('}');
      if (lastObjClose !== -1) {
        repaired = repaired.substring(0, lastObjClose + 1) + '\\n  ],\\n  "observaciones": "⚠️ JSON reparado automáticamente tras truncamiento",\\n  "confianza_global": 0.8\\n}';
        const firstBrace = repaired.indexOf('{');
        const lastBrace = repaired.lastIndexOf('}');
        data = JSON.parse(repaired.substring(firstBrace, lastBrace + 1));
      }
    } catch (e2) {
      // Si aún falla, extraer objetos de líneas individuales con Regex
      try {
        const lineMatches = str.match(/\\{\\s*"index"[\\s\\S]*?\\}/g) || [];
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
  s = s.replace(/[\\s\\.\\,\\-]+$/g, '');
  s = s.replace(/\\s+/g, '');
  return s;
}

function normalizarFecha(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return s;
  const m = s.match(/^(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{2,4})$/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    let yyyy = m[3];
    if (yyyy.length === 2) yyyy = '20' + yyyy;
    return \`\${yyyy}-\${mm}-\${dd}\`;
  }
  return s;
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

  // Agregar consulta principal
  if (skuLimpio) {
    searchPayload.push({
      index: idx,
      sku: skuLimpio,
      estilo_raw: skuLimpio,
      descripcion_texto: textoDescripcion
    });
  }

  // Agregar consultas de variantes alternativas para el SP
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

const fechaFormateada = normalizarFecha(data.fecha);

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
  observaciones: data.observaciones || null,
  lineas: processedLines,
  lineas_para_busqueda: searchPayload,
  confianza_global: data.confianza_global || 0.95,
  json_crudo: Object.assign({}, data, { _raw_llm_response: item })
};

return [{
  json: Object.assign({}, payload, {
    payload_json: JSON.stringify(payload),
    lineas_json: JSON.stringify(processedLines),
    lineas_para_busqueda_json: JSON.stringify(searchPayload)
  })
}];`;

// ── 3. RESOLVER BODEGAS Y RANKING JERÁRQUICO CON ADVERTENCIAS EN OBSERVACIONES ──
const JS_CODE_RESOLVER_HIERARCHICAL = `// Candidatos Bodegas de Postgres
let candsBodegas = [];
try { candsBodegas = $('Candidatos bodega1').all().map(x => x.json); } catch(e) {}
if (!candsBodegas.length) {
  try { candsBodegas = $('Candidatos bodega').all().map(x => x.json); } catch(e) {}
}

// Candidatos SKUs de Postgres (resultado de fn_buscar_candidatos_sku_ocr)
let candsSkus = [];
try { candsSkus = $('Candidatos SKU1').all().map(x => x.json); } catch(e) {}

let ocr = {};
try { ocr = $('Parsear JSON1').first()?.json || {}; } catch(e) {}
if (!ocr.lineas) {
  try { ocr = $('Parsear JSON').first()?.json || {}; } catch(e) {}
}
if (!ocr.lineas) {
  try { ocr = $('Parsear JSON3').first()?.json || {}; } catch(e) {}
}
if (!ocr.lineas) {
  try { ocr = $('Parsear JSON2').first()?.json || {}; } catch(e) {}
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

const usuarioId = Number(meta.usuario_id || 1);
const priorizarIa = meta.priorizar_ia !== false && meta.priorizar_ia !== 'false';

// ── 1. Catálogo Enriquecido de Bodegas con Relación Matriz/Ciudad ──
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
  { id: 16, codigo: "SUC016", nombre: "RI&KA",         ciudad: null,            es_matriz: false },
  { id: 17, codigo: "SUC017", nombre: "PANTACO",        ciudad: null,            es_matriz: false },
  { id: 18, codigo: "SUC0018",nombre: "GBG",            ciudad: null,            es_matriz: false },
  { id: 19, codigo: "SUC019", nombre: "SOR JUANA",      ciudad: "NEZAHUALCOYOTL",es_matriz: false },
  { id: 20, codigo: "SUC000", nombre: "BODEGA AUX",     ciudad: "MEXICO",        es_matriz: true }
];

const MATRICES_CIUDAD = {
  'TOLUCA': 4,              // TOLUCA BORDADO
  'SAN MARTIN': 10,         // COCINA
  'TEXMELUCAN': 10,         // COCINA
  'SAN MARTIN TEXMELUCAN': 10,
  'NEZAHUALCOYOTL': 12,     // ZANDUNGA 1
  'NEZA': 12,               // ZANDUNGA 1
  'CHICONCUAC': 1,          // CHICONCUAC
  'CHINCONCUAC': 1,
  'TULANCINGO': 15,         // TULANCINGO
  'MEXICO': 20,             // BODEGA AUX
  'CDMX': 20,
  'GENERAL': 20
};

function normalizarTextoBodega(raw) {
  if (!raw) return '';
  let s = String(raw).toUpperCase().trim();
  s = s.replace(/COSINA/g, 'COCINA');
  s = s.replace(/RIKA|RI Y KA|RI&KA/g, 'RI&KA');
  s = s.replace(/PANTACO|PANTACO 1/g, 'PANTACO');
  s = s.replace(/DURASNO/g, 'DURAZNO');
  s = s.replace(/SANDUNGA/g, 'ZANDUNGA');
  s = s.replace(/BORDADOS/g, 'BORDADO');
  s = s.replace(/CHICONKUAC/g, 'CHICONCUAC');
  return s;
}

function buscarBodega(texto) {
  if (!texto) return null;
  const limpio = normalizarTextoBodega(texto);

  // Si ya es un ID directo numérico
  if (/^\\d+$/.test(limpio)) {
    const bId = Number(limpio);
    const hit = BODEGAS.find(b => b.id === bId);
    if (hit) return hit;
  }

  // Nivel 1: Match Exacto por Nombre o Código
  const exacto = BODEGAS.find(b => b.nombre === limpio || b.codigo === limpio);
  if (exacto) return exacto;

  // Nivel 2: Token Matching (Palabras desordenadas, ej: "BORDADO TOLUCA" <-> "TOLUCA BORDADO")
  const tokensInput = limpio.split(/[\\s\\-\\/]+/).filter(Boolean);
  for (const b of BODEGAS) {
    const tokensB = b.nombre.split(/[\\s\\-\\/]+/).filter(Boolean);
    if (tokensInput.length === tokensB.length && tokensB.every(t => tokensInput.includes(t))) {
      return b;
    }
  }

  // Nivel 3: Desambiguación de Nombres Parciales con Defaults a Matriz / Sucursal 1
  // Zandunga / Sandunga (default Zandunga 1 a menos que especifique 2 o 3)
  if (limpio.includes('ZANDUNGA') || limpio.includes('SANDUNGA')) {
    if (limpio.includes('2')) return BODEGAS.find(b => b.id === 13);
    if (limpio.includes('3')) return BODEGAS.find(b => b.id === 14);
    return BODEGAS.find(b => b.id === 12); // Default ZANDUNGA 1
  }

  // San Diego (default San Diego 1 a menos que especifique 2)
  if (limpio.includes('SAN DIEGO')) {
    if (limpio.includes('2')) return BODEGAS.find(b => b.id === 8);
    return BODEGAS.find(b => b.id === 6); // Default SAN DIEGO 1
  }

  // Toluca (default Toluca Bordado a menos que especifique Angel)
  if (limpio.includes('TOLUCA') || limpio.includes('BORDADO')) {
    if (limpio.includes('ANGEL')) return BODEGAS.find(b => b.id === 3);
    return BODEGAS.find(b => b.id === 4); // Default TOLUCA BORDADO (Matriz)
  }

  // Nivel 4: Resolución por Ciudad / Bodega Matriz (Padre)
  for (const [ciudadKey, matrizId] of Object.entries(MATRICES_CIUDAD)) {
    if (limpio === ciudadKey || limpio.startsWith(ciudadKey) || ciudadKey.startsWith(limpio)) {
      return BODEGAS.find(b => b.id === matrizId) || null;
    }
  }

  // Nivel 5: Contención simple de subcadena
  return BODEGAS.find(b => 
    limpio.includes(b.nombre) || 
    b.nombre.includes(limpio)
  ) || null;
}

function resolverBodegaId(campo, rawTexto, hintTexto) {
  if (!priorizarIa && hintTexto) {
    const bHint = buscarBodega(hintTexto);
    if (bHint) return bHint.id;
  }
  const directo = buscarBodega(rawTexto);
  if (directo) return directo.id;
  
  const c = candsBodegas.filter(r => r.campo === campo).sort((a, b) => b.score - a.score || a.id - b.id);
  if (c.length > 0 && c[0].score >= 0.35) {
    return c[0].id;
  }
  if (hintTexto) {
    const bHint = buscarBodega(hintTexto);
    if (bHint) return bHint.id;
  }
  return null;
}

// ── Determinar Tipo de Movimiento ──
const tipoDetectado = (ocr.tipo_movimiento || '').toUpperCase() || null;
let tipo = tipoDetectado || 'ENT';
if (!priorizarIa && meta.tipo_hint) {
  const hintUpper = String(meta.tipo_hint).toUpperCase().trim();
  if (hintUpper.includes('SAL')) tipo = 'SAL';
  else if (hintUpper.includes('TRF') || hintUpper.includes('TRA')) tipo = 'TRF';
  else if (hintUpper.includes('DEV')) tipo = 'DEV';
  else if (hintUpper.includes('AJU')) tipo = 'AJU';
  else if (hintUpper.includes('ENT')) tipo = 'ENT';
}

// Default a Entrada (ENT) si no se pudo determinar
if (!tipo || tipo === 'NULL') {
  tipo = 'ENT';
}

let observacionesArr = [];
if (ocr.observaciones) observacionesArr.push(ocr.observaciones);

let bodega_origen_id = null;
let bodega_destino_id = null;
let textoOrigenParaBD = ocr.origen;
let textoDestinoParaBD = ocr.destino;

// Si viene hint explícito de bodega origen desde el webhook
const hintOrigenValido = (meta.origen_hint && meta.origen_hint !== 'auto' && meta.origen_hint !== 'null') ? meta.origen_hint : null;
const hintDestinoValido = (meta.destino_hint && meta.destino_hint !== 'auto' && meta.destino_hint !== 'null') ? meta.destino_hint : null;

if (tipo === 'SAL') {
  textoOrigenParaBD = ocr.origen || ocr.bodega_origen_sugerida;
  bodega_origen_id = resolverBodegaId('origen', textoOrigenParaBD, hintOrigenValido);
  if (ocr.destino) {
    observacionesArr.push('Destino/Cliente: ' + ocr.destino);
  }
  textoDestinoParaBD = null;
  bodega_destino_id = null;
} else if (tipo === 'ENT' || tipo === 'DEV' || tipo === 'AJU') {
  textoOrigenParaBD = ocr.bodega_receptora_interna || ocr.origen || ocr.destino;
  bodega_origen_id = resolverBodegaId('origen', textoOrigenParaBD, hintOrigenValido);
  if (ocr.entidad_externa_procedencia || (ocr.origen && ocr.origen !== textoOrigenParaBD)) {
    observacionesArr.push('Procedencia: ' + (ocr.entidad_externa_procedencia || ocr.origen));
  }
  textoDestinoParaBD = null;
  bodega_destino_id = null;
} else if (tipo === 'TRF') {
  bodega_origen_id = resolverBodegaId('origen', ocr.origen, hintOrigenValido);
  bodega_destino_id = resolverBodegaId('destino', ocr.destino, hintDestinoValido);
  if (!bodega_destino_id && ocr.destino) {
    observacionesArr.push('Destino especificado (no es bodega interna): ' + ocr.destino);
  }
} else {
  bodega_origen_id = resolverBodegaId('origen', ocr.origen, hintOrigenValido);
  bodega_destino_id = ocr.destino ? resolverBodegaId('destino', ocr.destino, hintDestinoValido) : null;
}

// ── Fallback Seguro: Si no se detectó origen ni por OCR ni por Webhook ──
if (!bodega_origen_id) {
  bodega_origen_id = 20; // BODEGA AUX (ID 20)
  textoOrigenParaBD = 'BODEGA AUX';
  observacionesArr.push('⚠️ Asignada temporalmente a BODEGA AUX (ID 20) por falta de encabezado manuscrito.');
}

const bObjOrigen = bodega_origen_id ? BODEGAS.find(b => b.id === bodega_origen_id) : null;
const nombreOrigenParaBD = bObjOrigen ? bObjOrigen.nombre : normalizarTextoBodega(textoOrigenParaBD);

const bObjDestino = bodega_destino_id ? BODEGAS.find(b => b.id === bodega_destino_id) : null;
const nombreDestinoParaBD = bObjDestino ? bObjDestino.nombre : null;

// ── 2. RANKING JERÁRQUICO (Proveedor > Género > Marca > Año) + ADVERTENCIAS ──
const advertenciasDesempate = [];

const lineasResueltas = (ocr.lineas || []).map((l, idx) => {
  const rawSku = (l.sku || l.estilo_raw || '').trim().toUpperCase();
  const desc = (l.descripcion_texto || l.descripcion_raw || '').toLowerCase();
  const itemIndex = l.index != null ? l.index : idx;

  const candidatosDeEstaLinea = candsSkus.filter(c => c.linea_index === itemIndex);

  // Extraer prefijo de proveedor buscado (ej: TY, FK, BO, AND, JA, KB)
  const prefijoMatch = rawSku.match(/^([A-Z0-9]+?)(\\d{2}|\\/|$)/);
  const prefijoBuscado = prefijoMatch ? prefijoMatch[1] : '';

  const esCaballero = desc.includes('cab') || desc.includes('hombre');
  const esDama = desc.includes('dama') || desc.includes('mujer');

  let mejorCand = null;
  let maxScore = -999;

  for (const cand of candidatosDeEstaLinea) {
    let score = Number(cand.score || 0) * 10;
    const cSku = (cand.sku_base || '').toUpperCase();
    const cDesc = (cand.descripcion || '').toLowerCase();

    // 1. Prioridad Proveedor (+50 / -30)
    if (prefijoBuscado && cSku.startsWith(prefijoBuscado)) {
      score += 50;
    } else if (prefijoBuscado && !cSku.startsWith(prefijoBuscado)) {
      score -= 30;
    }

    // 2. Prioridad Género (+30 / -50)
    if (esCaballero) {
      if (cSku.includes('HC') || cSku.includes('CA') || cSku.endsWith('H')) score += 30;
      if (cSku.includes('MC') || cSku.includes('DA') || cSku.endsWith('M')) score -= 50;
    } else if (esDama) {
      if (cSku.includes('MC') || cSku.includes('DA') || cSku.endsWith('M') || cSku.includes('DSET')) score += 30;
      if (cSku.includes('HC') || cSku.includes('CA') || cSku.endsWith('H')) score -= 50;
    }

    // 3. Marca / Modelo en Descripción (+35)
    if (desc.includes('toronto') && cDesc.includes('toronto')) score += 35;
    if (desc.includes('greenfield') && cDesc.includes('greenfield')) score += 35;
    if (desc.includes('idol') && cDesc.includes('idol')) score += 35;
    if (desc.includes('bullstaff') && cDesc.includes('bullstaff')) score += 35;
    if (desc.includes('felpa') && (cDesc.includes('felpa') || cSku.includes('FE'))) score += 35;

    // 4. Coincidencia Exacta con SKU (+40)
    if (cSku === rawSku || cSku.replace(/[^A-Z0-9]/g, '') === rawSku.replace(/[^A-Z0-9]/g, '')) {
      score += 40;
    }

    if (score > maxScore) {
      maxScore = score;
      mejorCand = { cand, score };
    }
  }

  // Si supera umbral de 50 puntos jerárquicos:
  if (mejorCand && mejorCand.score >= 50) {
    const resueltoSku = mejorCand.cand.sku_base;
    if (resueltoSku !== rawSku && resueltoSku.replace(/[^A-Z0-9]/g, '') !== rawSku.replace(/[^A-Z0-9]/g, '')) {
      advertenciasDesempate.push(\`Línea \${itemIndex + 1}: Resuelto a \${resueltoSku} (leído: \${rawSku})\`);
    }

    return Object.assign({}, l, {
      sku: resueltoSku,
      producto_id: mejorCand.cand.producto_id,
      variante_id: mejorCand.cand.variante_id || null,
      descripcion_texto: l.descripcion_texto || mejorCand.cand.descripcion,
      piezas_por_caja: l.piezas_por_caja || mejorCand.cand.pz_en_caja || null,
      confianza: Math.min(0.99, Number((mejorCand.score / 130).toFixed(2))),
      metodo_match: mejorCand.cand.metodo
    });
  }

  return l;
});

if (advertenciasDesempate.length > 0) {
  observacionesArr.push('⚠️ Ajuste visual: ' + advertenciasDesempate.join('; '));
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
    meta_enviada: meta
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
      total_lineas: lineasResueltas.length
    }
  }
}];`;

// ── 4. SQL SEGURO EN 2 FASES CON TIMEZONE 12:00:00 UTC PARA PROMOVER A NOTA ──────
const SQL_PROMOVER_SEGURO_2_PASOS = `DO $$
DECLARE
  v_propuesta_id UUID := $1::uuid;
  v_usuario_id INT := COALESCE($2::integer, 1);
  v_prop RECORD;
  v_nota_id INT;
  v_num_nota TEXT;
  v_linea JSONB;
  v_p_id INT;
  v_cajas NUMERIC;
  v_pzas INT;
  v_omitidas TEXT[] := ARRAY[]::TEXT[];
  v_obs TEXT;
  v_count_ins INT := 0;
  v_req_dest BOOLEAN := FALSE;
BEGIN
  -- 1. Obtener datos de la propuesta
  SELECT * INTO v_prop 
  FROM "inv-tienda".nota_ocr_propuestas 
  WHERE id = v_propuesta_id;

  IF NOT FOUND THEN
    RAISE NOTICE 'Propuesta no encontrada: %', v_propuesta_id;
    RETURN;
  END IF;

  -- Si ya fue promovida, salir sin duplicar
  IF v_prop.nota_id IS NOT NULL THEN
    RAISE NOTICE 'Propuesta ya promovida a nota_id: %', v_prop.nota_id;
    RETURN;
  END IF;

  -- Validar requerimientos mínimos (bodega origen y tipo de movimiento)
  IF v_prop.bodega_origen_id IS NULL OR v_prop.tipo_movimiento_id IS NULL THEN
    RAISE NOTICE 'Propuesta incompleta (falta origen o tipo movimiento)';
    RETURN;
  END IF;

  -- Validar si el tipo de movimiento requiere destino (ej. Transferencia TRF)
  SELECT COALESCE(requiere_destino, false) INTO v_req_dest
  FROM "inv-tienda".cat_tipos_movimiento
  WHERE id = v_prop.tipo_movimiento_id;

  IF v_req_dest AND v_prop.bodega_destino_id IS NULL THEN
    RAISE NOTICE 'Propuesta requiere bodega destino pendiente de asignar: %', v_propuesta_id;
    RETURN;
  END IF;

  -- 2. Inspeccionar líneas y compilar omitidas con resolución en 2 Fases (ID + Fallback String)
  FOR v_linea IN SELECT * FROM jsonb_array_elements(COALESCE(v_prop.lineas, '[]'::jsonb))
  LOOP
    v_p_id := NULL;
    
    -- Fase A: Viene con producto_id asignado desde n8n
    IF (v_linea->>'producto_id') IS NOT NULL AND (v_linea->>'producto_id') != '' THEN
      v_p_id := (v_linea->>'producto_id')::integer;
    END IF;

    -- Fase B1: Búsqueda por coincidencia exacta de sku_base
    IF v_p_id IS NULL AND (v_linea->>'sku') IS NOT NULL AND (v_linea->>'sku') != '' THEN
      SELECT id INTO v_p_id 
      FROM "inv-tienda".productos 
      WHERE sku_base = UPPER(TRIM(v_linea->>'sku')) 
      LIMIT 1;
    END IF;

    -- Fase B2: Búsqueda por coincidencia exacta de estilo_raw
    IF v_p_id IS NULL AND (v_linea->>'estilo_raw') IS NOT NULL AND (v_linea->>'estilo_raw') != '' THEN
      SELECT id INTO v_p_id 
      FROM "inv-tienda".productos 
      WHERE sku_base = UPPER(TRIM(v_linea->>'estilo_raw')) 
      LIMIT 1;
    END IF;

    -- Fase B3: Búsqueda normalizada eliminando separadores (espacios, diagonales, puntos, guiones)
    IF v_p_id IS NULL AND (v_linea->>'sku') IS NOT NULL AND (v_linea->>'sku') != '' THEN
      SELECT id INTO v_p_id 
      FROM "inv-tienda".productos 
      WHERE regexp_replace(UPPER(sku_base), '[^A-Z0-9]', '', 'g') = regexp_replace(UPPER(v_linea->>'sku'), '[^A-Z0-9]', '', 'g')
         OR regexp_replace(UPPER(sku_base), '[^A-Z0-9]', '', 'g') = regexp_replace(UPPER(COALESCE(v_linea->>'estilo_raw', '')), '[^A-Z0-9]', '', 'g')
      LIMIT 1;
    END IF;

    -- Si tras ambas fases no existe en catálogo, se agrega a omitidas
    IF v_p_id IS NULL THEN
      v_omitidas := array_append(v_omitidas, COALESCE(v_linea->>'sku', v_linea->>'estilo_raw', 'Item') || ' (' || COALESCE(v_linea->>'cantidad_cajas', '1') || ' cj)');
    END IF;
  END LOOP;

  -- Armar observaciones
  v_obs := COALESCE(v_prop.json_crudo->>'observaciones', '');
  IF array_length(v_omitidas, 1) > 0 THEN
    IF v_obs != '' THEN
      v_obs := v_obs || ' | ⚠️ OCR no vinculó: ' || array_to_string(v_omitidas, ', ');
    ELSE
      v_obs := '⚠️ OCR no vinculó: ' || array_to_string(v_omitidas, ', ');
    END IF;
  END IF;

  -- 3. Crear cabecera de la nota vía sp_crear_nota con parámetros nombrados tipados en integer
  SELECT nota_id, numero_nota INTO v_nota_id, v_num_nota
  FROM "inv-tienda".sp_crear_nota(
    p_tipo_movimiento_id := v_prop.tipo_movimiento_id::integer,
    p_bodega_origen_id   := v_prop.bodega_origen_id::integer,
    p_bodega_destino_id  := v_prop.bodega_destino_id::integer,
    p_usuario_id         := v_usuario_id::integer,
    p_nota_referencia    := v_prop.folio_detectado::character varying,
    p_observaciones      := v_obs::text
  );

  IF v_nota_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo crear la nota para propuesta %', v_propuesta_id;
  END IF;

  -- Actualizar fecha_nota (12:00:00 UTC = 06:00 AM hora México) y comprobante_url
  UPDATE "inv-tienda".notas_inventario
  SET 
    fecha_nota = CASE 
      WHEN v_prop.fecha_detectada IS NOT NULL 
      THEN (v_prop.fecha_detectada::text || ' 12:00:00')::timestamp
      ELSE fecha_nota
    END,
    comprobante_url = COALESCE(v_prop.comprobante_url, comprobante_url)
  WHERE id = v_nota_id;

  -- 4. Insertar sólo las líneas válidas (Fase A o Fase B)
  FOR v_linea IN SELECT * FROM jsonb_array_elements(COALESCE(v_prop.lineas, '[]'::jsonb))
  LOOP
    v_p_id := NULL;
    
    -- Fase A: producto_id existente
    IF (v_linea->>'producto_id') IS NOT NULL AND (v_linea->>'producto_id') != '' THEN
      v_p_id := (v_linea->>'producto_id')::integer;
    END IF;

    -- Fase B1: sku exacto
    IF v_p_id IS NULL AND (v_linea->>'sku') IS NOT NULL AND (v_linea->>'sku') != '' THEN
      SELECT id INTO v_p_id 
      FROM "inv-tienda".productos 
      WHERE sku_base = UPPER(TRIM(v_linea->>'sku')) 
      LIMIT 1;
    END IF;

    -- Fase B2: estilo_raw exacto
    IF v_p_id IS NULL AND (v_linea->>'estilo_raw') IS NOT NULL AND (v_linea->>'estilo_raw') != '' THEN
      SELECT id INTO v_p_id 
      FROM "inv-tienda".productos 
      WHERE sku_base = UPPER(TRIM(v_linea->>'estilo_raw')) 
      LIMIT 1;
    END IF;

    -- Fase B3: match alfanumérico sin separadores
    IF v_p_id IS NULL AND (v_linea->>'sku') IS NOT NULL AND (v_linea->>'sku') != '' THEN
      SELECT id INTO v_p_id 
      FROM "inv-tienda".productos 
      WHERE regexp_replace(UPPER(sku_base), '[^A-Z0-9]', '', 'g') = regexp_replace(UPPER(v_linea->>'sku'), '[^A-Z0-9]', '', 'g')
         OR regexp_replace(UPPER(sku_base), '[^A-Z0-9]', '', 'g') = regexp_replace(UPPER(COALESCE(v_linea->>'estilo_raw', '')), '[^A-Z0-9]', '', 'g')
      LIMIT 1;
    END IF;

    -- Si se resolvió el producto_id, se inserta en detalle
    IF v_p_id IS NOT NULL THEN
      v_cajas := COALESCE(NULLIF(TRIM(v_linea->>'cantidad_cajas'), '')::numeric, 1.0);
      v_pzas := COALESCE(NULLIF(TRIM(v_linea->>'piezas_por_caja'), '')::numeric::integer, 0);

      PERFORM "inv-tienda".sp_agregar_producto_nota(
        p_caja_id         := NULL::integer,
        p_cajas           := v_cajas::numeric,
        p_codigo_original := NULL::character varying,
        p_nota_id         := v_nota_id::integer,
        p_piezas_sueltas  := v_pzas::integer,
        p_producto_id     := v_p_id::integer,
        p_variante_id     := NULL::integer
      );
      v_count_ins := v_count_ins + 1;
    END IF;
  END LOOP;

  -- 5. Actualizar propuesta vinculada a la nueva nota
  UPDATE "inv-tienda".nota_ocr_propuestas
  SET 
    nota_id = v_nota_id,
    estado = CASE WHEN array_length(v_omitidas, 1) > 0 THEN 'PENDIENTE_REVISION' ELSE 'REVISADO' END,
    revisado_por = v_usuario_id,
    revisado_en = NOW()
  WHERE id = v_propuesta_id;

END $$;`;

async function run() {
  console.log('Obteniendo workflow de n8n (ID:', workflowId, ')...');
  const resGet = await api('GET', '/workflows/' + workflowId);
  if (resGet.status !== 200) {
    console.error('Error al obtener workflow:', resGet);
    return;
  }
  const wf = resGet.data;

  // 1. Actualizar nodos "Construir prompt + body"
  const promptNodes = wf.nodes.filter(n => n.name.startsWith('Construir prompt + body'));
  for (const pNode of promptNodes) {
    pNode.parameters = pNode.parameters || {};
    pNode.parameters.jsCode = JS_CODE_PROMPT_BODY;
    console.log(`✓ Nodo "${pNode.name}" actualizado con Prompt dinámico y guía en 5 zonas.`);
  }

  // 2. Actualizar nodos "Parsear JSON"
  const parsearNodes = wf.nodes.filter(n => n.name.startsWith('Parsear JSON'));
  for (const pJson of parsearNodes) {
    pJson.parameters = pJson.parameters || {};
    pJson.parameters.jsCode = JS_CODE_PARSEAR_JSON;
    console.log(`✓ Nodo "${pJson.name}" actualizado con extractor de variantes.`);
  }

  // 3. Actualizar "Candidatos SKU1" para consultar lineas_para_busqueda
  const candSkuNode = wf.nodes.find(n => n.name === 'Candidatos SKU1');
  if (candSkuNode) {
    candSkuNode.parameters = candSkuNode.parameters || {};
    candSkuNode.parameters.operation = 'executeQuery';
    candSkuNode.parameters.query = 'SELECT * FROM "inv-tienda".fn_buscar_candidatos_sku_ocr($1::jsonb);';
    candSkuNode.parameters.options = candSkuNode.parameters.options || {};
    candSkuNode.parameters.options.queryReplacement = "={{ [ JSON.stringify($('Parsear JSON1').first()?.json?.lineas_para_busqueda || $('Parsear JSON1').first()?.json?.lineas || [] ) ] }}";
    console.log(`✓ Nodo "Candidatos SKU1" actualizado con búsqueda de variantes múltiples.`);
  }

  // 3b. Actualizar "Candidatos bodega1" con expresión correcta
  const candBodegaNode = wf.nodes.find(n => n.name === 'Candidatos bodega1');
  if (candBodegaNode) {
    candBodegaNode.parameters = candBodegaNode.parameters || {};
    candBodegaNode.parameters.options = candBodegaNode.parameters.options || {};
    candBodegaNode.parameters.options.queryReplacement = "={{ [ $('Parsear JSON1').first()?.json?.bodega_receptora_interna || $('Parsear JSON1').first()?.json?.origen || '', $('Parsear JSON1').first()?.json?.destino || '' ] }}";
    console.log(`✓ Nodo "Candidatos bodega1" actualizado con queryReplacement evaluable.`);
  }

  // 3c. Actualizar "OpenRouter Vision"
  const openRouterNode = wf.nodes.find(n => n.name === 'OpenRouter Vision');
  if (openRouterNode) {
    openRouterNode.parameters = openRouterNode.parameters || {};
    openRouterNode.parameters.jsonBody = '={{ JSON.stringify($json.prompt_body || $json.openrouter_body || $json.body) }}';
    console.log(`✓ Nodo "OpenRouter Vision" actualizado con fallback resiliente en jsonBody.`);
  }

  // 4. Actualizar nodos "Resolver bodegas"
  const resolverNodes = wf.nodes.filter(n => n.name.startsWith('Resolver bodegas'));
  for (const resolver of resolverNodes) {
    resolver.parameters = resolver.parameters || {};
    resolver.parameters.jsCode = JS_CODE_RESOLVER_HIERARCHICAL;
    console.log(`✓ Nodo "${resolver.name}" actualizado con Ranking Jerárquico y defaults de bodega.`);
  }

  // 5. Actualizar nodos "Promover a nota (auto)"
  const promoverNodes = wf.nodes.filter(n => n.name.toLowerCase().includes('promover'));
  for (const prom of promoverNodes) {
    if (prom.type.includes('postgres')) {
      prom.parameters = prom.parameters || {};
      prom.parameters.operation = 'executeQuery';
      prom.parameters.query = SQL_PROMOVER_SEGURO_2_PASOS;
      prom.parameters.options = prom.parameters.options || {};
      prom.parameters.options.queryReplacement = "={{ [ $json.id, $('Resolver bodegas1').first()?.json?.usuario_id || $('Resolver bodegas').first()?.json?.usuario_id || 1 ] }}";
      console.log(`✓ Nodo "${prom.name}" actualizado con validación de requiere_destino e inserción en 2 fases.`);
    }
  }

  // 6. Guardar workflow en n8n
  const putPayload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  };

  const resPut = await api('PUT', '/workflows/' + workflowId, putPayload);
  if (resPut.status === 200) {
    console.log('\n🚀 WORKFLOW ACTUALIZADO Y RE-DESPLEGADO CON ÉXITO EN N8N (ID:', resPut.data.id, ')');
  } else {
    console.error('Error al actualizar en n8n:', resPut);
  }
}

run().catch(console.error);
