// scripts/n8n/tests/test_sku_variantes_e2e.js
//
// Prueba end-to-end del flujo OCR de SKUs usando el código REAL desplegado en n8n:
//   1. Descarga el workflow (Construir prompt + body / Parsear JSON1 / Resolver bodegas1).
//   2. Ejecuta `Parsear JSON1` en un sandbox con una respuesta LLM simulada (sin correcciones:
//      sku = estilo_raw y posibles_variantes = []), para probar solo el generador determinista.
//   3. Llama a la RPC real fn_buscar_candidatos_sku_ocr con `lineas_para_busqueda`.
//   4. Ejecuta `Resolver bodegas1` en un sandbox con los candidatos reales.
//   5. Reporta cuántas líneas quedan con producto_id (auto-resueltas).
//
// Casos:
//   A) Nota real de 19 líneas (propuesta b65a9368) que antes resolvía 14/19.
//   B) 5 lecturas fallidas del checkpoint (JA25/015D, QQ27/09HC, HF26/08SW, HF26/05OSD, QQ27/05HC).
//   C) OCR con espacios/AND canónico (JA25 / 015D, HF26 / 05 OSD, AND 26 0010, AND 26 0003, AND26/0016DC).
//
// Uso: node scripts/n8n/tests/test_sku_variantes_e2e.js

const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const env = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../../../.env.local')));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'inv-tienda' },
});
const n8nKey = env.N8N_API_KEY;
const workflowId = env.N8N_WORKFLOW_ID || 'DtZOqR4-9_DnULEjWW78b';

function n8nGet(apiPath) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'n8n.sistemaindumentaria.com',
      path: '/api/v1' + apiPath,
      method: 'GET',
      headers: { 'X-N8N-API-KEY': n8nKey },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function ejecutarParser(parserCode, llmResponse, meta) {
  const $input = {
    first: () => ({ json: { choices: [{ message: { content: JSON.stringify(llmResponse) } }] } }),
  };
  const $ = (name) => {
    const json = name === 'Construir prompt + body' ? (meta || {}) : {};
    const items = [{ json }];
    return { all: () => items, first: () => items[0] };
  };
  const fn = new Function('$input', '$', parserCode);
  const out = fn($input, $);
  const item = Array.isArray(out) ? out[0] : out;
  return item.json;
}

function ejecutarResolver(resolverCode, parserOut, candidateRows, meta) {
  const rawByName = {
    'Parsear JSON1': parserOut,
    'Candidatos SKU1': candidateRows,
    'Candidatos bodega1': [],
    'Construir prompt + body': meta || {},
  };
  const $ = (name) => {
    const raw = rawByName[name];
    let items;
    if (raw === undefined) items = [];
    else if (Array.isArray(raw)) items = raw.map((r) => ({ json: r }));
    else items = [{ json: raw }];
    return { all: () => items, first: () => items[0] };
  };
  const fn = new Function('$', resolverCode);
  const out = fn($);
  const item = Array.isArray(out) ? out[0] : out;
  return item.json;
}

function lineaSimulada(index, estiloRaw, descripcion) {
  return {
    index,
    sku: estiloRaw,
    estilo_raw: estiloRaw,
    posibles_variantes: [],
    descripcion_raw: estiloRaw,
    descripcion_texto: descripcion || '',
    cantidad_cajas: 1,
    piezas_por_caja: null,
  };
}

async function probarCaso(nombre, lineas, parserCode, resolverCode, meta) {
  const llmResponse = {
    folio: null,
    fecha: '2026-10-19',
    tipo_movimiento: 'ENT',
    origen: 'Bodega Test',
    destino: 'Bodega Test',
    lineas,
    confianza_global: 0.9,
  };

  const parserOut = ejecutarParser(parserCode, llmResponse, meta);
  const payload = parserOut.lineas_para_busqueda || [];

  const { data, error } = await supabase.rpc('fn_buscar_candidatos_sku_ocr', { p_lineas: payload });
  if (error) throw new Error('RPC: ' + error.message);
  const candidatos = Array.isArray(data) ? data : [];

  const resolverOut = ejecutarResolver(resolverCode, parserOut, candidatos, meta);
  const resueltas = resolverOut.payload_propuesta.lineas || [];

  console.log('\n=== ' + nombre + ' ===');
  let auto = 0;
  for (const l of resueltas) {
    const ok = l.producto_id != null;
    if (ok) auto += 1;
    const cands = (l.candidatos_sku || []).map((c) => c.sku_base + ' ' + Math.round(Number(c.score) * 100) + '%').join(', ');
    console.log(
      (l.index + 1).toString().padStart(2) + '.',
      String(l.estilo_raw).padEnd(16),
      ok ? '✅' : '❌',
      String(l.sku || '').padEnd(16),
      ok ? ('id ' + l.producto_id + ' @ ' + Math.round(Number(l.confianza) * 100) + '% ' + (l.metodo_match || '')) : '',
      cands ? ('| cands: ' + cands) : ''
    );
  }
  console.log(`Resultado: ${auto}/${resueltas.length} líneas con producto_id`);
  return { auto, total: resueltas.length, resueltas };
}

async function run() {
  const res = await n8nGet('/workflows/' + workflowId);
  if (res.status !== 200) throw new Error('No se pudo descargar el workflow: ' + res.status);
  const byName = Object.fromEntries((res.data.nodes || []).map((n) => [n.name, n.parameters.jsCode || '']));
  const parserCode = byName['Parsear JSON1'];
  const resolverCode = byName['Resolver bodegas1'];
  if (!parserCode || !resolverCode) throw new Error('Faltan nodos Parsear JSON1 / Resolver bodegas1');
  console.log('Workflow:', res.data.name, '| versionId:', res.data.versionId, '| updatedAt:', res.data.updatedAt);
  console.log('Parser tiene variantes deterministas:', parserCode.includes('FAMILIA_CONFUSIONES_OCR'));
  console.log('Resolver usa score real:', resolverCode.includes('score REAL de la base de datos'));

  const meta = { client_request_id: null, comprobante_url: null, modo_solo_cajas: true, usuario_id: 1 };

  // Caso A: nota real de 19 líneas (propuesta b65a9368)
  const notaReal = [
    ['Y526/07MCL', 'Cham. dama Berry'],
    ['QQ27/32HW', 'Chum, cab zen 1'],
    ['Y526/06MCL', 'Cham dama CoBerry'],
    ['AND260020', 'Cham cab'],
    ['JA25/05ISD', 'Sudadera niño Anevica'],
    ['QQ27/03HC', 'Rompe cab 1001'],
    ['QQ27/01HW', 'Rompe Corb upd'],
    ['JA26/01HSD', 'Sudadera cab Jod'],
    ['QQ27/08HC', 'Rompe cab ind'],
    ['MA26/03HSD', 'Sudadera'],
    ['TC26/04MST', 'Punts dama'],
    ['TC26/03MST', 'pants doma'],
    ['MK26/02SW', 'Sueter dama Duce'],
    ['MK26/04SW', 'Sueler doma Dolce'],
    ['MK26/11SW', 'Sueter clama Dulce'],
    ['MK26/08SW', 'Sueter dama Dulce'],
    ['MK26/07SW', 'Sueter dama Dulce'],
    ['HF26/08SW', 'Sueter dama Dulce'],
    ['HF26/05USD', 'Sudadera Unifer America'],
  ].map(([code, desc], i) => lineaSimulada(i, code, desc));
  const casoA = await probarCaso('CASO A: nota real 19 líneas (antes 14/19)', notaReal, parserCode, resolverCode, meta);

  // Caso B: fallos del checkpoint
  const fallos = ['JA25/015D', 'QQ27/09HC', 'HF26/08SW', 'HF26/05OSD', 'QQ27/05HC']
    .map((code, i) => lineaSimulada(i, code, ''));
  const casoB = await probarCaso('CASO B: 5 lecturas fallidas del checkpoint', fallos, parserCode, resolverCode, meta);

  // Caso C: OCR con espacios y AND
  const espacios = ['JA25 / 015D', 'HF26 / 05 OSD', 'AND 26 0010', 'AND 26 0003', 'AND26/0016DC']
    .map((code, i) => lineaSimulada(i, code, ''));
  const casoC = await probarCaso('CASO C: OCR con espacios / AND canónico', espacios, parserCode, resolverCode, meta);

  console.log('\nResumen: A ' + casoA.auto + '/' + casoA.total + ' | B ' + casoB.auto + '/' + casoB.total + ' | C ' + casoC.auto + '/' + casoC.total);
}

run().catch((e) => { console.error(e); process.exit(1); });
