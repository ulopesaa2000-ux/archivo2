// scripts/n8n/updates/update_n8n_ocr_modo_cajas.js
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

const MODO_READ_SNIPPET = [
  "const _modoRaw = (typeof meta !== 'undefined' && meta !== null) ? (meta.modo_solo_cajas !== undefined && meta.modo_solo_cajas !== null ? meta.modo_solo_cajas : (meta.modoSoloCajas !== undefined ? meta.modoSoloCajas : (meta.body && meta.body.modo_solo_cajas !== undefined ? meta.body.modo_solo_cajas : null))) : null;",
  "const modoSoloCajas = (_modoRaw === null || _modoRaw === undefined || String(_modoRaw) === '') ? true : !(['false','0','no','off'].includes(String(_modoRaw).toLowerCase().trim()));"
].join('\n');

function patchUpstream(js) {
  let out = js;
  if (!out.includes('modoSoloCajas')) {
    out = out.replace(/const destinoHint = [^\n]*\n/, function (m) {
      return m + '  const _modoRawUp = meta.modo_solo_cajas ?? meta.modoSoloCajas ?? (meta.body ? meta.body.modo_solo_cajas : null) ?? null;\n  const modoSoloCajas = (_modoRawUp === null || _modoRawUp === undefined || String(_modoRawUp) === \'\') ? true : !([\'false\',\'0\',\'no\',\'off\'].includes(String(_modoRawUp).toLowerCase().trim()));\n';
    });
  }
  if (!out.includes('modo_solo_cajas: modoSoloCajas')) {
    out = out.replace(/destino_hint: destinoHint/, 'destino_hint: destinoHint,\n      modo_solo_cajas: modoSoloCajas');
  }
  return out;
}

function patchPrompt(js) {
  let out = js;
  if (!out.includes('const modoSoloCajas') && out.includes('const FECHA_LARGA')) {
    out = out.replace(
      "const FECHA_LARGA = _hoy.dd + ' de ' + MES_ACTUAL_NOMBRE + ' de ' + ANIO_ACTUAL;",
      "const FECHA_LARGA = _hoy.dd + ' de ' + MES_ACTUAL_NOMBRE + ' de ' + ANIO_ACTUAL;\n" + MODO_READ_SNIPPET
    );
  }
  if (!out.includes('modo_solo_cajas: modoSoloCajas') && out.includes('anio_actual: ANIO_ACTUAL,')) {
    out = out.replace('anio_actual: ANIO_ACTUAL,', 'anio_actual: ANIO_ACTUAL,\n    modo_solo_cajas: modoSoloCajas,');
  }
  const anchorPiezas = 'Si el campo de cantidad viene vacío o ilegible, asume 1.';
  if (out.includes(anchorPiezas) && !out.includes('el sistema las pondrá en 0 automáticamente')) {
    out = out.replace(
      anchorPiezas,
      anchorPiezas + ' Si detectas piezas sueltas (piezas_por_caja), repórtalas igual; el sistema las pondrá en 0 automáticamente cuando modo solo cajas esté activo (por defecto activo).'
    );
  }
  return out;
}

function patchParsear(js) {
  let out = js;
  if (!out.includes('modoSoloCajas') && out.includes('const hoyCDMX = obtenerHoyCDMX();')) {
    out = out.replace(
      'const hoyCDMX = obtenerHoyCDMX();',
      [
        'const hoyCDMX = obtenerHoyCDMX();',
        "let modoSoloCajas = true;",
        "try {",
        "  const _m = (typeof meta !== 'undefined' && meta !== null) ? (meta.modo_solo_cajas !== undefined && meta.modo_solo_cajas !== null ? meta.modo_solo_cajas : (meta.modoSoloCajas !== undefined ? meta.modoSoloCajas : null)) : null;",
        "  if (_m !== null && _m !== undefined && String(_m) !== '') {",
        "    const v = String(_m).toLowerCase().trim();",
        "    modoSoloCajas = !(v === 'false' || v === '0' || v === 'no' || v === 'off');",
        '  }',
        '} catch (e) {}',
        'let piezasIgnoradas = 0;',
        'let piezasDetalle = [];',
        'if (modoSoloCajas) {',
        '  for (const pl of processedLines) {',
        '    const v = pl.piezas_por_caja;',
        "    if (v !== null && v !== undefined && String(v).trim() !== '' && !isNaN(Number(v)) && Number(v) !== 0) {",
        '      piezasIgnoradas++;',
        "      piezasDetalle.push('L' + (pl.index + 1) + ':' + v);",
        '    }',
        '    pl.piezas_por_caja = null;',
        '    pl._piezas_detectadas = (v !== null && v !== undefined) ? v : null;',
        '  }',
        '}'
      ].join('\n')
    );
  }
  const anchorFecha = "if (resFecha.corregida) {\n  obsFecha = (obsFecha ? obsFecha + ' | ' : '') + resFecha.detalle;\n  confGlobal = Math.max(0.5, Number(confGlobal) - 0.05);\n}";
  if (out.includes(anchorFecha) && !out.includes('Pz ignoradas por modo solo cajas')) {
    out = out.replace(
      anchorFecha,
      anchorFecha + "\nif (typeof piezasIgnoradas !== 'undefined' && piezasIgnoradas > 0) {\n  obsFecha = (obsFecha ? obsFecha + ' | ' : '') + 'Pz ignoradas por modo solo cajas (IA detecto ' + piezasIgnoradas + ' linea(s): ' + piezasDetalle.join(', ') + '). Se envian en 0.';\n}"
    );
  }
  if (out.includes('_fecha_corregida: resFecha.corregida, _fecha_leida: resFecha.leido') && !out.includes('_modo_solo_cajas: modoSoloCajas')) {
    out = out.replace(
      '_fecha_corregida: resFecha.corregida, _fecha_leida: resFecha.leido',
      "_fecha_corregida: resFecha.corregida, _fecha_leida: resFecha.leido, _modo_solo_cajas: (typeof modoSoloCajas !== 'undefined' ? modoSoloCajas : true), _piezas_ignoradas: (typeof piezasIgnoradas !== 'undefined' ? piezasIgnoradas : 0)"
    );
  }
  return out;
}

function patchResolver(js) {
  let out = js;
  const anchorPriorizar = "const priorizarIa = meta.priorizar_ia !== false && meta.priorizar_ia !== 'false';";
  if (out.includes(anchorPriorizar) && !out.includes('modoSoloCajas')) {
    out = out.replace(
      anchorPriorizar,
      anchorPriorizar + '\n' + [
        "let modoSoloCajas = true;",
        "try {",
        "  const _m2 = (typeof meta !== 'undefined' && meta !== null) ? (meta.modo_solo_cajas !== undefined && meta.modo_solo_cajas !== null ? meta.modo_solo_cajas : (meta.modoSoloCajas !== undefined ? meta.modoSoloCajas : null)) : null;",
        "  if (_m2 !== null && _m2 !== undefined && String(_m2) !== '') {",
        "    const v2 = String(_m2).toLowerCase().trim();",
        "    modoSoloCajas = !(v2 === 'false' || v2 === '0' || v2 === 'no' || v2 === 'off');",
        '  }',
        '} catch (e) {}'
      ].join('\n')
    );
  }
  const anchorAdv = 'if (advertenciasDesempate.length > 0) {';
  if (out.includes(anchorAdv) && !out.includes('Pz ignoradas por modo solo cajas')) {
    out = out.replace(
      anchorAdv,
      [
        'if (typeof modoSoloCajas !== \'undefined\' && modoSoloCajas) {',
        '  let _pzN = 0;',
        '  let _pzD = [];',
        '  for (const _l of lineasResueltas) {',
        '    const _v = _l.piezas_por_caja;',
        "    if (_v !== null && _v !== undefined && String(_v).trim() !== '' && !isNaN(Number(_v)) && Number(_v) !== 0) {",
        '      _pzN++;',
        "      _pzD.push('L' + ((_l.index !== null && _l.index !== undefined ? _l.index : 0) + 1) + ':' + _v);",
        '    }',
        '    _l.piezas_por_caja = null;',
        '  }',
        "  if (_pzN > 0 && observacionesArr.join(' ').indexOf('modo solo cajas') === -1) {",
        "    observacionesArr.push('Pz ignoradas por modo solo cajas (IA detecto ' + _pzN + ' linea(s): ' + _pzD.join(', ') + '). Se envian en 0.');",
        '  }',
        '}',
        anchorAdv
      ].join('\n')
    );
  }
  return out;
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
  const backupPath = path.resolve(__dirname, '../../backups/backup_n8n_wf_' + workflowId + '_modocajas_prePUT_' + stamp + '.json');
  fs.writeFileSync(backupPath, JSON.stringify(wf, null, 2));
  console.log('Backup pre-PUT:', backupPath);

  let cUp = 0, cPrompt = 0, cParse = 0, cRes = 0;

  for (const n of wf.nodes) {
    if (n.name === 'Preparar upload' || n.name === 'Normalizar imagen2') {
      const before = n.parameters.jsCode || '';
      const after = patchUpstream(before);
      if (after !== before && after.includes('modo_solo_cajas: modoSoloCajas')) {
        n.parameters.jsCode = after;
        cUp++;
        console.log('✓ Upstream:', n.name);
      } else {
        console.warn('WARN upstream sin cambio:', n.name);
      }
    }
    if (n.name.startsWith('Construir prompt + body')) {
      const before = n.parameters.jsCode || '';
      const after = patchPrompt(before);
      if (after !== before && after.includes('modo_solo_cajas: modoSoloCajas')) {
        n.parameters.jsCode = after;
        cPrompt++;
        console.log('✓ Prompt:', n.name);
      } else {
        console.warn('WARN prompt sin cambio:', n.name);
      }
    }
    if (n.name === 'Parsear JSON1' || n.name === 'Parsear JSON3') {
      const before = n.parameters.jsCode || '';
      const after = patchParsear(before);
      if (after !== before && after.includes('Pz ignoradas por modo solo cajas')) {
        n.parameters.jsCode = after;
        cParse++;
        console.log('✓ Parsear:', n.name);
      } else {
        console.warn('WARN parsear sin cambio:', n.name);
      }
    }
    if (n.name.startsWith('Resolver bodegas')) {
      const before = n.parameters.jsCode || '';
      const after = patchResolver(before);
      if (after !== before && after.includes('Pz ignoradas por modo solo cajas')) {
        n.parameters.jsCode = after;
        cRes++;
        console.log('✓ Resolver:', n.name);
      } else {
        console.warn('WARN resolver sin cambio:', n.name);
      }
    }
  }

  console.log('Resumen patches — upstream:', cUp, 'prompt:', cPrompt, 'parsear:', cParse, 'resolver:', cRes);
  if (cUp < 2 || cPrompt < 3 || cParse < 2 || cRes < 1) {
    console.error('Faltan patches, no se hace PUT. Revisa WARN lines.');
    process.exit(1);
  }

  const putPayload = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings };
  const resPut = await api('PUT', '/workflows/' + workflowId, putPayload);
  if (resPut.status === 200) {
    console.log('🚀 WORKFLOW MODO-CAJAS OK (ID:', resPut.data.id, ')');
  } else {
    console.error('Error al actualizar:', resPut.status, JSON.stringify(resPut).slice(0, 2000));
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
