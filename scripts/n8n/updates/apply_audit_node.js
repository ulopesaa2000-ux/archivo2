// scripts/n8n/updates/apply_audit_node.js
// Inserta el nodo "Auditoría pre-salida" entre "Fusionar e Inteligencia" y
// "Salida JSON Next.js" en el workflow del packing parser, vía API pública.
// Hace respaldo fresco antes de modificar. Uso:
//   N8N_PUBLIC_API_KEY=<key> node scripts/n8n/updates/apply_audit_node.js [--apply]
// Sin --apply solo muestra el diff planeado (dry-run).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const API_BASE = process.env.N8N_API_BASE || 'https://n8n.sistemaindumentaria.com/api/v1';
const API_KEY =
  process.env.N8N_PUBLIC_API_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZmQ1MzZjYy03M2I1LTQyMmQtOWQyOC02NzE4NzIzNzM2ZWIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzg0MDUzNjcwfQ.QfyrrtYrKyfUaPXMnjSJb78Q_D4mUMjN1_fE0pGc4Xg';
const WORKFLOW_ID = process.env.N8N_WORKFLOW_ID || '9XsVokBIW5HW3Pe-XP66f';
const DRY_RUN = !process.argv.includes('--apply');

const AUDIT_JS = `// Auditoria pre-salida v1: normaliza, autocompleta huecos desde el detalle,
// calcula match lineas-vs-fisico y lo firma para la plataforma.
const input = $input.first().json;
const normSku = (s) => String(s || '').trim().toUpperCase().replace(/[-_/\\s]+/g, '');
const T = (v) => Number(v) || 0;
const cajas = input.cajas_para_editar || input.cajas || [];
const reales = cajas.filter((c) => c.tipo_caja !== 'padre_resumen');
const resumen = input.orden_preview || input.resumen || {};
const lineas = Array.isArray(resumen.orden_productos) ? resumen.orden_productos : [];
const fisico = {};
for (const c of reales) {
  const k = normSku(c.sku_base);
  if (!k) continue;
  fisico[k] = fisico[k] || { sku: String(c.sku_base || '').trim(), cajas: 0, piezas: 0 };
  fisico[k].cajas += T(c.cantidad_cajas);
  fisico[k].piezas += T(c.total_piezas != null ? c.total_piezas : (c.piezas_por_caja || 0) * (c.cantidad_cajas || 0));
}
const idx = {};
for (const l of lineas) {
  const k = normSku(l.sku != null ? l.sku : l.sku_base);
  if (k) idx[k] = { cajas: T(l.numero_cajas_reales != null ? l.numero_cajas_reales : l.cajas_pedidas) };
}
const rellenados = [];
const diffs = [];
const keys = new Set([...Object.keys(fisico), ...Object.keys(idx)]);
for (const k of keys) {
  const f = fisico[k] || { sku: k, cajas: 0, piezas: 0 };
  let lin = idx[k];
  if (!lin && f.cajas > 0) {
    const nuevo = { sku: f.sku, cantidad_total: f.piezas, numero_cajas_reales: f.cajas, cajas_pedidas: f.cajas, piezas_pedidas: f.piezas, _origen: 'autocompletado_n8n' };
    lineas.push(nuevo);
    rellenados.push({ sku: f.sku, cajas: f.cajas, piezas: f.piezas });
    lin = { cajas: f.cajas };
  }
  const dif = (lin ? lin.cajas : 0) - f.cajas;
  if (dif !== 0 || (!lin && f.cajas > 0)) {
    diffs.push({ sku: f.sku || k, cajas_linea: lin ? lin.cajas : 0, cajas_fisicas: f.cajas, dif });
  }
}
resumen.orden_productos = lineas;
if (input.orden_preview) input.orden_preview = resumen; else input.resumen = resumen;
input.auditoria_n8n = { match_ok: diffs.length === 0, rellenados, diffs, version: 'auditoria-presalida-v1' };
input.warnings = [...(input.warnings || []),
  ...diffs.map((d) => ({ tipo: 'match_cajas', severidad: 'alta', sku_base: d.sku, detalle: 'linea ' + d.cajas_linea + ' vs fisico ' + d.cajas_fisicas })),
  ...rellenados.map((r) => ({ tipo: 'linea_autocompletada', severidad: 'media', sku_base: r.sku, detalle: 'linea creada desde fisico: ' + r.cajas + ' cajas' }))];
return [{ json: input }];`;

async function api(pathname, method = 'GET', body) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: {
      'X-N8N-API-KEY': API_KEY,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${pathname} -> HTTP ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  console.log('1. Descargando workflow en vivo...');
  const wf = await api(`/workflows/${WORKFLOW_ID}`);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.resolve('scripts/backups', `n8n_prefill_${stamp}`);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(backupDir, `${WORKFLOW_ID}_antes-auditoria.json`), JSON.stringify(wf, null, 2));
  console.log(`2. Respaldo fresco en: ${backupDir}`);

  if (wf.nodes.some((n) => n.name === 'Auditoría pre-salida')) {
    console.log('3. El nodo Auditoría pre-salida YA existe. Nada que hacer.');
    return;
  }

  const fusion = wf.nodes.find((n) => n.name === 'Fusionar e Inteligencia');
  const salida = wf.nodes.find((n) => n.name === 'Salida JSON Next.js');
  if (!fusion || !salida) throw new Error('No se encontraron los nodos Fusionar/Salida.');

  const nuevoNodo = {
    id: crypto.randomUUID(),
    name: 'Auditoría pre-salida',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [336, 4952],
    parameters: { jsCode: AUDIT_JS },
  };

  const nodes = [...wf.nodes, nuevoNodo];
  const connections = JSON.parse(JSON.stringify(wf.connections));
  // Re-cablear: Fusionar -> Auditoría -> Salida
  connections['Fusionar e Inteligencia'] = {
    main: [[{ node: 'Auditoría pre-salida', type: 'main', index: 0 }]],
  };
  connections['Auditoría pre-salida'] = {
    main: [[{ node: 'Salida JSON Next.js', type: 'main', index: 0 }]],
  };

  console.log(`3. Nodos: ${wf.nodes.length} -> ${nodes.length} (dry-run: ${DRY_RUN})`);
  if (DRY_RUN) {
    console.log('   Modo consulta: sin --apply no se modifica nada. Nodo listo para insertar.');
    return;
  }

  console.log('4. Aplicando PUT al workflow...');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updated = await api(`/workflows/${WORKFLOW_ID}`, 'PUT', {
    name: wf.name,
    nodes,
    connections,
    settings: wf.settings || {},
  });
  console.log('5. PUT ok. Verificando...');
  const check = await api(`/workflows/${WORKFLOW_ID}`);
  const ok = check.nodes.some((n) => n.name === 'Auditoría pre-salida');
  const linkOk =
    JSON.stringify(check.connections['Fusionar e Inteligencia']).includes('Auditoría pre-salida') &&
    JSON.stringify(check.connections['Auditoría pre-salida']).includes('Salida JSON Next.js');
  console.log(`   Nodo presente: ${ok}, cableado correcto: ${linkOk}`);
  if (!ok || !linkOk) throw new Error('Verificación fallida: revisar en n8n.');
  console.log('LISTO: Auditoría pre-salida insertada y verificada.');
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
