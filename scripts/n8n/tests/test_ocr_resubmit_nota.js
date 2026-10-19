// scripts/n8n/tests/test_ocr_resubmit_nota.js
//
// Reenvia una nota de movimiento al webhook de OCR de n8n y reporta el resultado
// (propuesta creada + lineas resueltas) comparandolo contra la corrida previa.
//
// Reutiliza la imagen ya subida a Supabase Storage de la corrida original y replica
// exactamente los mismos campos multipart/form-data que recibio el webhook
// (client_request_id, usuario_id, tipo_hint, origen_hint, destino_hint,
// modo_solo_cajas + binario 'foto'), de modo que la comparacion sea justa.
//
// Uso: node scripts/n8n/tests/test_ocr_resubmit_nota.js [--nota 959b8e48-ca1c-4d30-9871-fa2b77e6ddfe] [--dry-run]

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
const webhookUrl = env.N8N_OCR_WEBHOOK_URL || 'https://n8n.sistemaindumentaria.com/webhook/nota-movimiento-local';

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const soloAnalisis = argv.includes('--solo-analisis');
const idxNota = argv.indexOf('--nota');
const NOTA_PREVIA = idxNota >= 0 ? argv[idxNota + 1] : '959b8e48-ca1c-4d30-9871-fa2b77e6ddfe';

function httpsReq(opts, bodyBuf) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        try { resolve({ status: res.statusCode, data: JSON.parse(raw.toString('utf8')), raw }); }
        catch (e) { resolve({ status: res.statusCode, raw }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(280000, () => req.destroy(new Error('request timeout')));
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

function n8nGet(apiPath) {
  return httpsReq({
    hostname: 'n8n.sistemaindumentaria.com',
    path: '/api/v1' + apiPath,
    method: 'GET',
    headers: { 'X-N8N-API-KEY': n8nKey },
  });
}

// ── multipart/form-data ──
function construirMultipart(campos, archivo) {
  const boundary = '----formdata-opencode-' + Date.now().toString(16);
  const partes = [];
  for (const [k, v] of Object.entries(campos)) {
    partes.push(Buffer.from(
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="' + k + '"\r\n\r\n' +
      String(v) + '\r\n', 'utf8'));
  }
  partes.push(Buffer.from(
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="foto"; filename="' + archivo.nombre + '"\r\n' +
    'Content-Type: ' + archivo.mime + '\r\n\r\n', 'utf8'));
  partes.push(archivo.buffer);
  partes.push(Buffer.from('\r\n--' + boundary + '--\r\n', 'utf8'));
  return { body: Buffer.concat(partes), contentType: 'multipart/form-data; boundary=' + boundary };
}

function descargar(url) {
  return httpsReq({ hostname: new URL(url).hostname, path: new URL(url).pathname + new URL(url).search, method: 'GET' }, null);
}

async function run() {
  console.log('=== CONTEXTO ===');
  console.log('webhook:', webhookUrl);
  console.log('nota previa (referencia):', NOTA_PREVIA);

  const { data: previa, error: errPrevia } = await supabase
    .from('nota_ocr_propuestas')
    .select('id, creado_en, estado, nota_id, lineas, comprobante_url')
    .eq('id', NOTA_PREVIA)
    .maybeSingle();
  if (errPrevia) throw errPrevia;
  if (!previa) throw new Error('No se encontro la nota previa ' + NOTA_PREVIA);
  console.log('imagen previa:', previa.comprobante_url);
  console.log('lineas previas:', (previa.lineas || []).length, '| estado:', previa.estado);

  const img = await descargar(previa.comprobante_url);
  if (!img.raw || !img.raw.length) throw new Error('No se pudo descargar la imagen: ' + img.status);
  console.log('imagen descargada bytes:', img.raw.length);

  const campos = {
    client_request_id: 'ocr-resubmit-' + Date.now(),
    usuario_id: '12',
    tipo_hint: 'salida',
    origen_hint: 'COCINA',
    destino_hint: 'ZANDUNGA 2',
    modo_solo_cajas: 'true',
  };
  const mp = construirMultipart(campos, { nombre: 'nota.jpg', mime: 'image/jpeg', buffer: img.raw });

  if (dryRun) {
    console.log('DRY-RUN: no se envia. campos:', JSON.stringify(campos));
    return;
  }

  if (soloAnalisis) {
    console.log('SOLO-ANALISIS: no se vuelve a enviar el webhook.');
  } else {

  console.log('');
  console.log('=== POST webhook ===');
  const t0 = Date.now();
  const res = await httpsReq({
    hostname: new URL(webhookUrl).hostname,
    path: new URL(webhookUrl).pathname,
    method: 'POST',
    headers: { 'Content-Type': mp.contentType, 'Content-Length': mp.body.length },
  }, mp.body);
  console.log('status:', res.status, '| ms:', Date.now() - t0);
  if (res.data) console.log('respuesta:', JSON.stringify(res.data).slice(0, 1200));
  else console.log('respuesta raw:', res.raw.toString('utf8').slice(0, 600));

  }

  // ── Ejecución nueva ──
  console.log('');
  console.log('=== EJECUCIONES (workflow ' + workflowId + ') ===');
  const execs = await n8nGet('/executions?limit=4');
  const lista = (execs.data && execs.data.data) || [];
  for (const e of lista) console.log(e.id, '|', e.status, '|', e.mode, '|', e.startedAt, '->', e.stoppedAt);
  const nueva = lista.slice().sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)))[0];
  if (!nueva) { console.log('No se encontro ejecucion nueva'); return; }
  console.log('ejecucion nueva:', nueva.id, nueva.status);

  const ex = await n8nGet('/executions/' + nueva.id + '?includeData=true');
  const runData = ex.data && ex.data.data && ex.data.data.resultData && ex.data.data.resultData.runData;
  if (!runData) { console.log('sin runData'); return; }

  const vision = (runData['OpenRouter Vision'] || [])[0];
  if (vision) {
    const msg = (vision.data.main[0][0].json.choices || [])[0];
    const content = (msg && msg.message && msg.message.content) || '';
    console.log('');
    console.log('--- LLM ---');
    console.log('finish:', msg && msg.finish_reason, '| content chars:', content.length);
    const meta = (vision.data.main[0][0].json.usage) || {};
    console.log('usage:', JSON.stringify(meta));
    if (!content) console.log('!!! CONTENIDO VACIO (modelo razonador agoto max_tokens)');
  }

  const parser = (runData['Parsear JSON1'] || [])[0];
  if (parser) {
    const pj = parser.data.main[0][0].json;
    console.log('');
    console.log('--- LECTURA (Parsear JSON1) ---');
    for (const l of (pj.lineas || [])) {
      console.log(String(l.index + 1).padStart(2) + '.', String(l.estilo_raw || '').padEnd(16), '->', String(l.sku || '').padEnd(16), '| vars:', JSON.stringify(l.posibles_variantes || []).slice(0, 76));
    }
  }

  const resolver = (runData['Resolver bodegas1'] || [])[0];
  if (resolver) {
    const rj = resolver.data.main[0][0].json;
    const lineas = (rj.payload_propuesta && rj.payload_propuesta.lineas) || [];
    console.log('');
    console.log('--- RESOLUCION ---');
    let auto = 0;
    for (const l of lineas) {
      const ok = l.producto_id != null;
      if (ok) auto += 1;
      const cands = (l.candidatos_sku || []).map((c) => c.sku_base + ' ' + Math.round(Number(c.score) * 100) + '%').join(', ');
      console.log(String(l.index + 1).padStart(2) + '.', String(l.estilo_raw || '').padEnd(16), ok ? 'MATCH  ' : 'SIN MATCH', String(l.sku || '').padEnd(16), ok ? ('id ' + l.producto_id + ' @ ' + Math.round(Number(l.confianza) * 100) + '% ' + (l.metodo_match || '')) : '', cands ? ('| cands: ' + cands) : '');
    }
    console.log('Resultado: ' + auto + '/' + lineas.length + ' lineas con producto_id');
  }

  console.log('');
  console.log('=== PROPUESTA CREADA ===');
  const { data: nuevas } = await supabase
    .from('nota_ocr_propuestas')
    .select('id, creado_en, estado, nota_id, lineas')
    .gt('creado_en', previa.creado_en)
    .order('creado_en', { ascending: false })
    .limit(3);
  for (const p of (nuevas || [])) {
    console.log(p.id, '|', p.creado_en, '| estado:', p.estado, '| nota:', p.nota_id, '| lineas:', (p.lineas || []).length);
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
