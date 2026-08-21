// scripts/update_n8n_ocr.js
const https = require('https');

const apiKey = process.env.N8N_API_KEY || '';
const workflowId = process.env.N8N_WORKFLOW_ID || 'DtZOqR4-9_DnULEjWW78b';

function api(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'n8n.sistemaindumentaria.com',
      path: '/api/v1' + path,
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
  console.log('Obteniendo workflow de n8n...');
  const resGet = await api('GET', '/workflows/' + workflowId);
  if (resGet.status !== 200) {
    console.error('Error al obtener workflow:', resGet);
    return;
  }
  const wf = resGet.data;

  // 1. SQL Robusto con COALESCE en fecha, folio, origen, destino y ON CONFLICT completo
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
      console.log(`✓ Nodo Postgres ${ins.name} actualizado con mapeo de fecha_detectada y ON CONFLICT completo.`);
    }
  }

  // 2. Actualizar Resolver bodegas con fecha y fecha_detectada explícitas
  const resolverNodes = wf.nodes.filter(n => n.name.startsWith('Resolver bodegas'));
  for (const resolver of resolverNodes) {
    resolver.parameters.jsCode = `const cands = $input.all().map(x => x.json);

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
if (!meta.usuario_id) {
  try { meta = $('Preparar').first()?.json || {}; } catch(e) {}
}

const usuarioId = Number(meta.usuario_id || 1);
const priorizarIa = meta.priorizar_ia === true || meta.priorizar_ia === 'true';

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
  const hit = BODEGAS.find(b => 
    b.nombre === limpio || 
    b.codigo === limpio || 
    limpio.includes(b.nombre) || 
    b.nombre.includes(limpio)
  );
  return hit || null;
}

function top(campo) {
  return cands.filter(r => r.campo === campo).sort((a, b) => b.score - a.score || a.id - b.id);
}

function resolverBodegaId(campo, rawTexto, hintTexto) {
  if (!priorizarIa && hintTexto) {
    const b = buscarBodega(hintTexto);
    if (b) return b.id;
  }
  const directo = buscarBodega(rawTexto);
  if (directo) return directo.id;
  const c = top(campo);
  if (c.length > 0 && c[0].score >= 0.25) {
    return c[0].id;
  }
  if (hintTexto) {
    const b = buscarBodega(hintTexto);
    if (b) return b.id;
  }
  if (c.length > 0) return c[0].id;
  return null;
}

const tipo = (ocr.tipo_movimiento || meta.tipo_hint || 'ENT').toUpperCase();

let textoOrigenParaBD = ocr.origen;
let textoDestinoParaBD = ocr.destino;
let referenciaFinal = ocr.nota_referencia || '';

if (tipo === 'DEV' || tipo === 'ENT') {
  textoOrigenParaBD = ocr.bodega_receptora_interna || ocr.destino || ocr.origen;
  textoDestinoParaBD = null;
  referenciaFinal = ocr.entidad_externa_procedencia || (ocr.origen !== textoOrigenParaBD ? ocr.origen : ocr.nota_referencia) || '';
} else if (tipo === 'SAL') {
  textoOrigenParaBD = ocr.bodega_origen_sugerida || ocr.origen;
  textoDestinoParaBD = null;
  referenciaFinal = ocr.entidad_destino_externa || ocr.destino || ocr.nota_referencia || '';
}

const bodega_origen_id = resolverBodegaId('origen', textoOrigenParaBD, meta.origen_hint);
const bodega_destino_id = textoDestinoParaBD ? resolverBodegaId('destino', textoDestinoParaBD, meta.destino_hint) : null;

const bObjOrigen = bodega_origen_id ? BODEGAS.find(b => b.id === bodega_origen_id) : null;
const nombreOrigenParaBD = bObjOrigen ? bObjOrigen.nombre : normalizarTextoBodega(textoOrigenParaBD);

const fechaLimpia = ocr.fecha || null;
const folioLimpio = ocr.folio || null;

const payloadPropuesta = {
  client_request_id: meta.client_request_id || ocr.client_request_id || null,
  comprobante_url: meta.comprobante_url || ocr.comprobante_url || null,
  folio: folioLimpio,
  folio_detectado: folioLimpio,
  fecha: fechaLimpia,
  fecha_detectada: fechaLimpia,
  tipo_movimiento: tipo,
  tipo_movimiento_detectado: tipo,
  origen: nombreOrigenParaBD || null,
  origen_detectado: nombreOrigenParaBD || null,
  destino: textoDestinoParaBD || null,
  destino_detectado: textoDestinoParaBD || null,
  bodega_origen_id: bodega_origen_id ? String(bodega_origen_id) : null,
  bodega_destino_id: bodega_destino_id ? String(bodega_destino_id) : null,
  lineas: ocr.lineas || [],
  json_crudo: ocr.json_crudo || ocr,
  confianza_global: ocr.confianza_global != null ? String(ocr.confianza_global) : null,
  nota_referencia: referenciaFinal || null,
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
      destino: textoDestinoParaBD || null,
      bodega_origen_id: bodega_origen_id,
      bodega_destino_id: bodega_destino_id,
      tipo_movimiento: tipo,
      nota_referencia: referenciaFinal || null,
      confianza_global: ocr.confianza_global || null
    }
  }
}];`;
    console.log(`✓ Nodo ${resolver.name} actualizado con fecha_detectada y folio_detectado.`);
  }

  // 3. Guardar en n8n
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
