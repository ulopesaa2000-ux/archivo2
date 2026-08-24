// scripts/update_n8n_ocr.js
const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables desde .env.local si existen
let envConfig = {};
try {
  const envPath = path.resolve(__dirname, '../.env.local');
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

async function run() {
  console.log('Obteniendo workflow de n8n (ID:', workflowId, ')...');
  const resGet = await api('GET', '/workflows/' + workflowId);
  if (resGet.status !== 200) {
    console.error('Error al obtener workflow:', resGet);
    return;
  }
  const wf = resGet.data;

  // 1. Agregar o actualizar el nodo Postgres "Candidatos SKU1"
  let skuNode = wf.nodes.find(n => n.name === 'Candidatos SKU1');
  if (!skuNode) {
    skuNode = {
      parameters: {
        operation: "executeQuery",
        query: "SELECT * FROM \"inv-tienda\".fn_buscar_candidatos_sku_ocr($1::jsonb);",
        options: {
          queryReplacement: "={{ [ JSON.stringify($('Parsear JSON1').first()?.json?.lineas || $('Parsear JSON').first()?.json?.lineas || $('Parsear JSON3').first()?.json?.lineas || [] ) ] }}"
        }
      },
      id: "candidatos-sku-1-ocr-node",
      name: "Candidatos SKU1",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.6,
      position: [ 2016, 1688 ],
      credentials: {
        postgres: {
          id: "YgDwsBMSmHIX6EeX",
          name: "Postgres account"
        }
      }
    };
    wf.nodes.push(skuNode);
    console.log('✓ Nodo Postgres "Candidatos SKU1" creado.');
  } else {
    skuNode.parameters.query = "SELECT * FROM \"inv-tienda\".fn_buscar_candidatos_sku_ocr($1::jsonb);";
    skuNode.parameters.options = {
      queryReplacement: "={{ [ JSON.stringify($('Parsear JSON1').first()?.json?.lineas || $('Parsear JSON').first()?.json?.lineas || $('Parsear JSON3').first()?.json?.lineas || [] ) ] }}"
    };
    console.log('✓ Nodo Postgres "Candidatos SKU1" actualizado.');
  }

  // 2. Conectar Parsear JSON1 con Candidatos SKU1 y Candidatos SKU1 con Resolver bodegas1
  wf.connections['Parsear JSON1'] = wf.connections['Parsear JSON1'] || { main: [[]] };
  const pConns = wf.connections['Parsear JSON1'].main[0];
  if (!pConns.some(c => c.node === 'Candidatos SKU1')) {
    pConns.push({ node: 'Candidatos SKU1', type: 'main', index: 0 });
  }

  wf.connections['Candidatos SKU1'] = {
    main: [[{ node: 'Resolver bodegas1', type: 'main', index: 0 }]]
  };

  // 3. SQL de Inserción robusto
  const sqlRobustInsert = `WITH src AS (SELECT $1::jsonb AS j)
INSERT INTO "inv-tienda".nota_ocr_propuestas (
  client_request_id,
  comprobante_url,
  folio_detectado,
  fecha_detectada,
  tipo_movimiento_detectado,
  origen_detectado,
  destino_detectado,
  lineas,
  json_crudo,
  confianza_global,
  tipo_movimiento_id,
  bodega_origen_id,
  bodega_destino_id,
  estado
)
SELECT
  NULLIF(j->>'client_request_id', ''),
  j->>'comprobante_url',
  NULLIF(COALESCE(j->>'folio_detectado', j->>'folio', ''), ''),
  NULLIF(COALESCE(j->>'fecha_detectada', j->>'fecha', ''), '')::date,
  NULLIF(COALESCE(j->>'tipo_movimiento_detectado', j->>'tipo_movimiento', ''), ''),
  NULLIF(COALESCE(j->>'origen_detectado', j->>'origen', ''), ''),
  NULLIF(COALESCE(j->>'destino_detectado', j->>'destino', ''), ''),
  COALESCE(j->'lineas', '[]'::jsonb),
  COALESCE(j->'json_crudo', '{}'::jsonb),
  NULLIF(j->>'confianza_global', '')::numeric,
  (SELECT id FROM "inv-tienda".cat_tipos_movimiento WHERE codigo = NULLIF(COALESCE(j->>'tipo_movimiento_detectado', j->>'tipo_movimiento', ''), '')),
  NULLIF(j->>'bodega_origen_id', '')::bigint,
  NULLIF(j->>'bodega_destino_id', '')::bigint,
  'PENDIENTE_REVISION'
FROM src
ON CONFLICT (client_request_id) DO UPDATE SET
  comprobante_url = EXCLUDED.comprobante_url,
  folio_detectado = EXCLUDED.folio_detectado,
  fecha_detectada = EXCLUDED.fecha_detectada,
  tipo_movimiento_detectado = EXCLUDED.tipo_movimiento_detectado,
  origen_detectado = EXCLUDED.origen_detectado,
  destino_detectado = EXCLUDED.destino_detectado,
  json_crudo = EXCLUDED.json_crudo,
  lineas = EXCLUDED.lineas,
  confianza_global = EXCLUDED.confianza_global,
  tipo_movimiento_id = EXCLUDED.tipo_movimiento_id,
  bodega_origen_id = EXCLUDED.bodega_origen_id,
  bodega_destino_id = EXCLUDED.bodega_destino_id
RETURNING id;`;

  const insertNodes = wf.nodes.filter(n => n.name.includes('Insertar propuesta') || n.name.includes('Insertar'));
  for (const ins of insertNodes) {
    if (ins.type.includes('postgres')) {
      ins.parameters.query = sqlRobustInsert;
      ins.parameters.options = ins.parameters.options || {};
      ins.parameters.options.queryReplacement = "={{ [ $json.payload_json ] }}";
      console.log(`✓ Nodo Postgres ${ins.name} actualizado.`);
    }
  }

  // 4. Actualizar Construir prompt + body para propagar todos los metadatos
  const promptNodes = wf.nodes.filter(n => n.name.includes('Construir prompt'));
  for (const pr of promptNodes) {
    if (pr.parameters && pr.parameters.jsCode) {
      pr.parameters.jsCode = pr.parameters.jsCode.replace(
        /return \[\{\s*json: \{[\s\S]*?\}\s*\}\];/,
        `return [{
  json: {
    usuario_id: meta.usuario_id || 1,
    priorizar_ia: meta.priorizar_ia,
    openrouter_body: openrouterBody,
    client_request_id: meta.client_request_id,
    comprobante_url: meta.comprobante_url,
    storage_path: meta.storage_path,
    tipo_hint: meta.tipo_hint,
    origen_hint: meta.origen_hint,
    destino_hint: meta.destino_hint,
    fecha_hint: meta.fecha_hint
  }
}];`
      );
    }
  }

  // 5. Actualizar Parsear JSON
  const parsearNodes = wf.nodes.filter(n => n.name.startsWith('Parsear JSON'));
  for (const pNode of parsearNodes) {
    pNode.parameters.jsCode = `const item = $input.first()?.json || {};
let data = item.data || item;

if (typeof data === 'string') {
  try {
    let clean = data.replace(/^[\\s\\S]*?\\{/, '{').replace(/\\}[\\s\\S]*?$/, '}');
    data = JSON.parse(clean);
  } catch(e) {
    try {
      const match = data.match(/\\{[\\s\\S]*\\}/);
      if (match) data = JSON.parse(match[0]);
    } catch(e2) {}
  }
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
  const m = s.match(/^(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    const yyyy = m[3];
    return \`\${yyyy}-\${mm}-\${dd}\`;
  }
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return \`\${yyyy}-\${mm}-\${dd}\`;
    }
  } catch(e) {}
  return s;
}

const rawLines = Array.isArray(data.lineas) ? data.lineas : [];
const processedLines = rawLines.map((l, idx) => {
  const rawCandidate = (l.sku || l.estilo_raw || l.descripcion_raw || '').trim();
  const skuLimpio = normalizarSku(rawCandidate);
  const textoDescripcion = (l.descripcion_raw && l.descripcion_raw !== rawCandidate) 
    ? l.descripcion_raw 
    : (l.descripcion_texto || skuLimpio || rawCandidate);
  let qty = l.cantidad_cajas;
  if (qty == null || isNaN(qty) || Number(qty) <= 0) { qty = 1; }
  
  return {
    index: idx,
    estilo_raw: skuLimpio || rawCandidate,
    sku: skuLimpio || rawCandidate,
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
  confianza_global: data.confianza_global || 0.95,
  json_crudo: data
};

return [{
  json: Object.assign({}, payload, {
    payload_json: JSON.stringify(payload),
    lineas_json: JSON.stringify(processedLines)
  })
}];`;
    console.log(`✓ Nodo ${pNode.name} actualizado.`);
  }

  // 6. Actualizar Resolver bodegas y SKUs con gestión de Priorizar IA vs Usuario
  const resolverNodes = wf.nodes.filter(n => n.name.startsWith('Resolver bodegas'));
  for (const resolver of resolverNodes) {
    resolver.parameters.jsCode = `// Candidatos Bodegas de Postgres
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

// ── 1. Catálogo Fijo de Bodegas con Normalización ──
const BODEGAS = [
  { id: 1, codigo: "SUC001", nombre: "CHICONCUAC" },
  { id: 2, codigo: "SUC002", nombre: "VACAS" },
  { id: 3, codigo: "SUC003", nombre: "TOLUCA ANGEL" },
  { id: 4, codigo: "SUC004", nombre: "TOLUCA BORDADO" },
  { id: 5, codigo: "SUC005", nombre: "DURAZNO" },
  { id: 6, codigo: "SUC006", nombre: "SAN DIEGO 1" },
  { id: 7, codigo: "SUC007", nombre: "TORTILLA" },
  { id: 8, codigo: "SUC008", nombre: "SAN DIEGO 2" },
  { id: 9, codigo: "SUC009", nombre: "ANDRADE" },
  { id: 10, codigo: "SUC010", nombre: "COCINA" },
  { id: 11, codigo: "SUC011", nombre: "PALOMAS" },
  { id: 12, codigo: "SUC012", nombre: "ZANDUNGA 1" },
  { id: 13, codigo: "SUC013", nombre: "ZANDUNGA 2" },
  { id: 14, codigo: "SUC014", nombre: "ZANDUNGA 3" },
  { id: 15, codigo: "SUC015", nombre: "TULANCINGO" },
  { id: 16, codigo: "SUC016", nombre: "RI&KA" },
  { id: 17, codigo: "SUC017", nombre: "PANTACO" },
  { id: 18, codigo: "SUC0018", nombre: "GBG" },
  { id: 19, codigo: "SUC019", nombre: "SOR JUANA" }
];

function normalizarTextoBodega(raw) {
  if (!raw) return '';
  let s = String(raw).toUpperCase().trim();
  s = s.replace(/COSINA/g, 'COCINA');
  s = s.replace(/RIKA|RI Y KA|RI&KA/g, 'RI&KA');
  s = s.replace(/PANTACO|PANTACO 1/g, 'PANTACO');
  s = s.replace(/DURASNO/g, 'DURAZNO');
  s = s.replace(/SANDUNGA/g, 'ZANDUNGA');
  s = s.replace(/CHICONKUAC/g, 'CHICONCUAC');
  return s;
}

function buscarBodega(texto) {
  if (!texto) return null;
  const limpio = normalizarTextoBodega(texto);
  if (/^\\d+$/.test(limpio)) {
    const bId = Number(limpio);
    const hit = BODEGAS.find(b => b.id === bId);
    if (hit) return hit;
  }
  return BODEGAS.find(b => 
    b.nombre === limpio || 
    b.codigo === limpio || 
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

// ── Determinar Tipo de Movimiento según Prioridad (IA vs Usuario) ──
const tipoDetectado = (ocr.tipo_movimiento || 'ENT').toUpperCase();
let tipo = tipoDetectado;
if (!priorizarIa && meta.tipo_hint) {
  const hintUpper = String(meta.tipo_hint).toUpperCase().trim();
  if (hintUpper.includes('SAL')) tipo = 'SAL';
  else if (hintUpper.includes('TRF') || hintUpper.includes('TRA')) tipo = 'TRF';
  else if (hintUpper.includes('DEV')) tipo = 'DEV';
  else if (hintUpper.includes('AJU')) tipo = 'AJU';
  else tipo = 'ENT';
}

let observacionesArr = [];
if (ocr.observaciones) observacionesArr.push(ocr.observaciones);

let bodega_origen_id = null;
let bodega_destino_id = null;
let textoOrigenParaBD = ocr.origen;
let textoDestinoParaBD = ocr.destino;

if (tipo === 'SAL') {
  textoOrigenParaBD = ocr.origen || ocr.bodega_origen_sugerida;
  bodega_origen_id = resolverBodegaId('origen', textoOrigenParaBD, meta.origen_hint);
  if (ocr.destino) {
    observacionesArr.push('Destino/Cliente: ' + ocr.destino);
  }
  textoDestinoParaBD = null;
  bodega_destino_id = null;
} else if (tipo === 'ENT' || tipo === 'DEV') {
  textoOrigenParaBD = ocr.bodega_receptora_interna || ocr.origen || ocr.destino;
  bodega_origen_id = resolverBodegaId('origen', textoOrigenParaBD, meta.origen_hint);
  if (ocr.entidad_externa_procedencia || (ocr.origen && ocr.origen !== textoOrigenParaBD)) {
    observacionesArr.push('Procedencia: ' + (ocr.entidad_externa_procedencia || ocr.origen));
  }
  textoDestinoParaBD = null;
  bodega_destino_id = null;
} else if (tipo === 'TRF') {
  bodega_origen_id = resolverBodegaId('origen', ocr.origen, meta.origen_hint);
  bodega_destino_id = resolverBodegaId('destino', ocr.destino, meta.destino_hint);
  if (!bodega_destino_id && ocr.destino) {
    observacionesArr.push('Destino especificado (no es bodega interna): ' + ocr.destino);
  }
} else {
  bodega_origen_id = resolverBodegaId('origen', ocr.origen, meta.origen_hint);
  bodega_destino_id = ocr.destino ? resolverBodegaId('destino', ocr.destino, meta.destino_hint) : null;
}

const bObjOrigen = bodega_origen_id ? BODEGAS.find(b => b.id === bodega_origen_id) : null;
const nombreOrigenParaBD = bObjOrigen ? bObjOrigen.nombre : normalizarTextoBodega(textoOrigenParaBD);

const bObjDestino = bodega_destino_id ? BODEGAS.find(b => b.id === bodega_destino_id) : null;
const nombreDestinoParaBD = bObjDestino ? bObjDestino.nombre : null;

// ── 2. Algoritmo de Resolución Inteligente de SKUs (Desglose + Cruce con Descripción + Ponderación) ──
const lineasResueltas = (ocr.lineas || []).map((l, idx) => {
  const rawSku = (l.sku || l.estilo_raw || '').toUpperCase().replace(/[\\s\\.\\,\\-]+/g, '');
  const desc = (l.descripcion_texto || l.descripcion_raw || '').toLowerCase();
  
  // Extraer componentes
  const match = rawSku.match(/^([A-Z0-9]+?)(\\d{2})[\\/\\-]?(\\d{1,3})([A-Z0-9]*)$/);
  const prefijo = match ? match[1] : '';
  const anio = match ? match[2] : '';
  const consecutivo = match ? match[3] : '';
  const sufijo = match ? match[4] : '';
  
  // Pistas de descripción
  const esCaballero = desc.includes('cab') || desc.includes('hombre') || desc.includes('cale');
  const esDama = desc.includes('dama') || desc.includes('dema') || desc.includes('mujer');
  const esRompeviento = desc.includes('rompe') || desc.includes('wind');
  const esPantsLicra = desc.includes('pants') || desc.includes('licra') || desc.includes('lucra');
  const esBorrega = desc.includes('borreg');
  
  // Filtrar candidatos que devolvió Postgres para este índice o SKU
  const candidatosDeEstaLinea = candsSkus.filter(c => c.linea_index === idx || c.sku_buscado === l.sku);
  
  let mejorCandidato = null;
  let maxScore = -1;

  for (const cand of candidatosDeEstaLinea) {
    let score = 0;
    const candSku = (cand.sku_base || '').toUpperCase().replace(/[\\s\\.\\,\\-]+/g, '');
    const candDesc = (cand.descripcion || '').toLowerCase();
    
    // A. Match Exacto Total
    if (candSku === rawSku || (cand.sku_completo && cand.sku_completo.toUpperCase().replace(/[\\s\\.\\,\\-]+/g, '') === rawSku)) {
      score += 100;
    }
    
    // B. Mismo Consecutivo de Modelo (ej: '12' o '05')
    if (consecutivo && (candSku.includes('/' + consecutivo) || candSku.includes(consecutivo))) {
      score += 35;
    }
    
    // C. Mismo Prefijo de Marca (ej: 'FK', 'TY', 'BO')
    if (prefijo && candSku.startsWith(prefijo)) {
      score += 25;
    }
    
    // D. Mismo Año (ej: '26') o año contiguo ('25' vs '26')
    if (anio && candSku.includes(anio)) {
      score += 15;
    } else if (anio && (candSku.includes('25') || candSku.includes('26'))) {
      score += 8;
    }
    
    // E. Concordancia de Género (Descripción vs SKU)
    if (esCaballero && (candSku.includes('H') || candSku.includes('C'))) {
      score += 20;
    } else if (esDama && (candSku.includes('M') || candSku.includes('D'))) {
      score += 20;
    }
    
    // F. Concordancia de Prenda / Tela
    if (esRompeviento && candSku.includes('W')) score += 10;
    if (esPantsLicra && (candSku.includes('LYC') || candSku.includes('ST'))) score += 15;
    if (esBorrega && (candDesc.includes('borreg') || candSku.includes('HC') || candSku.includes('MC'))) score += 15;

    // Bonus por score base de Postgres
    score += (Number(cand.score || 0) * 10);

    if (score > maxScore) {
      maxScore = score;
      mejorCandidato = { cand, score };
    }
  }

  // Si supera umbral de 60 puntos, asignamos el producto_id y sku resuelto
  if (mejorCandidato && mejorCandidato.score >= 55) {
    return Object.assign({}, l, {
      sku: mejorCandidato.cand.sku_base,
      producto_id: mejorCandidato.cand.producto_id,
      variante_id: mejorCandidato.cand.variante_id || null,
      piezas_por_caja: l.piezas_por_caja || mejorCandidato.cand.pz_en_caja || null,
      confianza: Math.min(0.99, Number((mejorCandidato.score / 120).toFixed(2))),
      metodo_match: mejorCandidato.cand.metodo
    });
  }

  return l;
});

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
    console.log(`✓ Nodo ${resolver.name} actualizado con soporte de Priorizar IA vs Usuario.`);
  }

  // 7. Guardar en n8n
  const putPayload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  };

  const resPut = await api('PUT', '/workflows/' + workflowId, putPayload);
  if (resPut.status === 200) {
    console.log('🚀 WORKFLOW RE-DESPLEGADO CON ÉXITO EN N8N (ID:', resPut.data.id, ')');
  } else {
    console.error('Error al actualizar en n8n:', resPut);
  }
}

run().catch(console.error);
