// scripts/n8n/updates/jenny_parser_code.js
// Código fuente del nodo "Parser Jenny multicolor-pack" (referencia versionada).
// Se incrusta en build_full_workflow_json.js para generar el workflow completo.
// Formato Jenny (SHISHI BETERLON), reglas validadas contra TOTALES de hoja:
// - Verdad = columna Style No. (nunca nombre de hoja; sin style = SIN_STYLE).
// - PACK opcional/posicional; filas = color×pack; tallas entre Color y Pcs.
// - Cajas por pack: UNION de cartones entre colores; por color vale etiqueta
//   (共N箱) si existe; si no, union de rangos ("a-b" solo + Ctns, "a-b..c-d"
//   expande min..max de primeros, resto union de primeros); sin rango y con
//   Ctns = SUM(Ctns) + warning; sin nada = 0.
// - Pcs/Ctn solo numérico plano (fórmulas/ttexto = null + warning).
// - Resumen siempre del detalle; TOTAL de hoja solo contraste.
// - Sin cajas remanente: descuadre = warning, nunca relleno fantasma.
// NOTA String.raw: conserva escapes regex. Sin ${ ni backticks dentro.

const JENNY_JS = String.raw`// Parser Jenny multicolor-pack v1.0 — SHISHI BETERLON / JENNY
const T0 = Date.now();
const NBSP = String.fromCharCode(160);
function cleanText(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (typeof v === 'object') {
    if (v.result !== undefined) return cleanText(v.result);
    if (v.text !== undefined) return cleanText(v.text);
    if (v.richText) return v.richText.map(t => t.text).join('');
    return '';
  }
  return String(v).split(NBSP).join(' ').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function toNumJenny(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s || s === '-' || s === '—') return null;
  if (/[a-zA-Z*×\/=+%]/u.test(s)) return null;
  if (/\d+\s*[-~#]\s*\d+/.test(s)) return null;
  const c = s.replace(/,/g, '').replace(/[^0-9.\-]/g, '');
  if (!c || c === '-' || c === '.') return null;
  const n = Number(c);
  return Number.isFinite(n) ? n : null;
}
function normKey(v) { return cleanText(v).toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function etiquetaCajas(colorRaw) {
  const m = String(colorRaw || '').match(/[（(]\s*共\s*(\d+)\s*箱\s*[）)]/);
  return m ? Number(m[1]) : null;
}
function parseRangeJenny(s, ctns) {
  const t = cleanText(s);
  const pairs = [...t.matchAll(/(\d+)\s*[-~#]\s*(\d+)/g)].map(m => [Number(m[1]), Number(m[2])]);
  if (!pairs.length) return { set: new Set(), cruda: t, modo: 'vacio' };
  const firsts = pairs.map(p => p[0]);
  if (pairs.length === 1) {
    const a = pairs[0][0], b = pairs[0][1];
    if ((ctns || 0) > 1 && b - a + 1 === ctns) {
      const set = new Set();
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) set.add(i);
      return { set: set, cruda: t, modo: 'rango' };
    }
    return { set: new Set([a]), cruda: t, modo: 'uno' };
  }
  if (t.indexOf('...') !== -1) {
    const lo = Math.min(...firsts), hi = Math.max(...firsts);
    const set = new Set();
    for (let i = lo; i <= hi; i++) set.add(i);
    return { set: set, cruda: t, modo: 'abreviado' };
  }
  return { set: new Set(firsts), cruda: t, modo: 'lista' };
}
function rowValuesJenny(r) {
  if (Array.isArray(r)) return r;
  if (r && typeof r === 'object') {
    return Object.keys(r).filter(k => k !== '__rowNum__').sort((a, b) => {
      const na = parseInt(String(a).replace(/\D/g, ''), 10), nb = parseInt(String(b).replace(/\D/g, ''), 10);
      return (isNaN(na) ? 9999 : na) - (isNaN(nb) ? 9999 : nb);
    }).map(k => r[k]);
  }
  return [];
}
const cfg = (() => {
  try { return $('Normalizar archivo + ruta').first().json.__config || {}; }
  catch (e) { try { return $('Formulario Packing List').first().json || {}; } catch (e2) { return {}; } }
})();
const item = $input.first();
const ej = item.json || {};
const rawSheets = ej.__workbook_sheets || ej.sheets || ej.workbook_sheets || ej.data || [];
const warnings = [];
const hojas = (Array.isArray(rawSheets) ? rawSheets : []).map((s, idx) => ({
  name: cleanText(s.name || s.sheet_name || s.sheetName || s.title || ('Hoja ' + (idx + 1))),
  rows: (Array.isArray(s.rows) ? s.rows : (Array.isArray(s.data) ? s.data : [])).map(rowValuesJenny)
}));
const productos = new Map();
const grupos = new Map();
const detalles = [];
const parseMsPorHoja = [];
function colIdx(headers, tests) {
  for (let i = 0; i < headers.length; i++) {
    for (const t of tests) { try { if (t.test(headers[i])) return i; } catch (e) {} }
  }
  return -1;
}
const H = {
  style: [/style/i],
  pack: [/^pack$/i],
  color: [/^colou?r$/i],
  pcs: [/^(pcs|sets)\s*\/\s*(ctn|bag)$/i],
  ctnno: [/^(ctn|bag)\s*no\.?$/i],
  ctns: [/^ctns$/i],
  ttl: [/^ttl\.?qty$/i],
  precio: [/^precio$/i],
  descr: [/^descripcion/],
  nw: [/^n\.w$/i],
  gw: [/^g\.w$/i],
  cbm: [/cbm/i]
};
for (const hoja of hojas) {
  const tHoja = Date.now();
  const filas = hoja.rows.filter(r => (r || []).some(v => cleanText(v) !== ''));
  let hIdx = -1;
  for (let i = 0; i < Math.min(filas.length, 12); i++) {
    const j = (filas[i] || []).map(cleanText).join(' ').toLowerCase();
    if (j.indexOf('style') !== -1) { hIdx = i; break; }
  }
  if (hIdx < 0) { warnings.push({ tipo: 'hoja_sin_header', severidad: 'media', hoja: hoja.name, detalle: 'Sin fila Style: hoja omitida' }); continue; }
  const headers = (filas[hIdx] || []).map(cleanText);
  const ix = {
    style: colIdx(headers, H.style), pack: colIdx(headers, H.pack), color: colIdx(headers, H.color),
    pcs: colIdx(headers, H.pcs), ctnno: colIdx(headers, H.ctnno), ctns: colIdx(headers, H.ctns),
    ttl: colIdx(headers, H.ttl), precio: colIdx(headers, H.precio), descr: colIdx(headers, H.descr),
    nw: colIdx(headers, H.nw), gw: colIdx(headers, H.gw), cbm: colIdx(headers, H.cbm)
  };
  if (ix.style < 0) { warnings.push({ tipo: 'hoja_sin_style', severidad: 'alta', hoja: hoja.name, detalle: 'Sin columna Style No.' }); continue; }
  const tallaIdx = [];
  const finTallas = ix.pcs >= 0 ? ix.pcs : headers.length;
  if (ix.color >= 0) {
    for (let i = ix.color + 1; i < finTallas; i++) {
      const h = cleanText(headers[i]);
      if (h) tallaIdx.push({ i: i, nombre: h });
    }
  }
  let totalHoja = null;
  for (let r = hIdx + 1; r < filas.length; r++) {
    const row = filas[r] || [];
    const styleRaw = cleanText(row[ix.style]);
    if (/^total$/i.test(styleRaw)) {
      totalHoja = { cajas: toNumJenny(row[ix.ctns]), piezas: toNumJenny(row[ix.ttl]) };
      continue;
    }
    if (!styleRaw) {
      const conDatos = tallaIdx.some(t => toNumJenny(row[t.i]) != null) || toNumJenny(row[ix.ctns]) != null;
      if (conDatos) warnings.push({ tipo: 'sin_style', severidad: 'alta', hoja: hoja.name, fila: r + 1, detalle: 'Fila con datos sin Style No.: omitida, no se inventa SKU' });
      continue;
    }
    const style = styleRaw;
    if (!productos.has(style)) {
      productos.set(style, { sku_base: style, descripcion: cleanText(row[ix.descr]) || null, composicion: null, precio: toNumJenny(row[ix.precio]), hoja: hoja.name });
    } else {
      const p = productos.get(style);
      if (!p.descripcion && ix.descr >= 0) p.descripcion = cleanText(row[ix.descr]) || null;
      if (p.precio == null && ix.precio >= 0) p.precio = toNumJenny(row[ix.precio]);
    }
    const pack = ix.pack >= 0 ? (cleanText(row[ix.pack]) || 'PACK UNICO') : 'PACK UNICO';
    const color = ix.color >= 0 ? cleanText(row[ix.color]) : '';
    const tallaCells = tallaIdx.map(t => ({ nombre: t.nombre, cantidad: toNumJenny(row[t.i]) }));
    const sumaTallas = tallaCells.reduce((s, t) => s + (t.cantidad || 0), 0);
    const pcsRaw = ix.pcs >= 0 ? cleanText(row[ix.pcs]) : '';
    let pzc = toNumJenny(row[ix.pcs]);
    if (pcsRaw && pzc == null) warnings.push({ tipo: 'pcs_no_numerico', severidad: 'media', sku_base: style, hoja: hoja.name, fila: r + 1, detalle: 'Pcs/Ctn no numérico: se usa suma de tallas' });
    if (pzc == null) pzc = sumaTallas > 0 ? sumaTallas : null;
    const ctns = toNumJenny(row[ix.ctns]);
    const rango = parseRangeJenny(ix.ctnno >= 0 ? row[ix.ctnno] : '', ctns);
    const gk = style + '||' + pack;
    if (!grupos.has(gk)) grupos.set(gk, { style: style, pack: pack, colores: new Map(), piezas: [], tallas: new Set(), nw: null, gw: null, cbm: null, hoja: hoja.name, sinPzc: 0, mezclas: [], sub: new Map() });
    const g = grupos.get(gk);
    // Subgrupo por piezas/caja: cada tipo de caja homogéneo (evita modo con empate)
    const sk = pzc == null ? 'null' : String(pzc);
    if (!g.sub.has(sk)) g.sub.set(sk, { pzc: pzc, cartones: new Set(), setByColor: new Map(), colores: new Set(), tallas: new Set(), nw: null, gw: null, cbm: null, dets: [] });
    const sb = g.sub.get(sk);
    const ck = color || '_SIN_COLOR';
    if (!g.colores.has(ck)) g.colores.set(ck, { set: new Set(), ctnsSuma: 0, etiqueta: null, etiquetas: new Set() });
    const cb = g.colores.get(ck);
    for (const n of rango.set) cb.set.add(n);
    const et = etiquetaCajas(color);
    // Cartones por (color, subgrupo) para no mezclar tipos de caja
    const sbck = ck + '||' + sk;
    if (!sb.setByColor.has(sbck)) sb.setByColor.set(sbck, { color: color, set: new Set(), ctnsSuma: 0, etiquetas: new Set() });
    const sbc = sb.setByColor.get(sbck);
    for (const n of rango.set) sbc.set.add(n);
    sbc.ctnsSuma += ctns || 0;
    if (et != null) { cb.etiquetas.add(et); sbc.etiquetas.add(et); }
    if (pzc != null) g.piezas.push(pzc); else g.sinPzc++;
    for (const t of tallaCells) if (t.nombre) g.tallas.add(t.nombre);
    if (g.nw == null && ix.nw >= 0) g.nw = toNumJenny(row[ix.nw]);
    if (g.gw == null && ix.gw >= 0) g.gw = toNumJenny(row[ix.gw]);
    if (g.cbm == null && ix.cbm >= 0) g.cbm = toNumJenny(row[ix.cbm]);
    for (const t of tallaCells) {
      sb.dets.push({ color: color, talla: t.nombre, cantidad: t.cantidad || 0 });
      if (t.nombre && !sb.tallas.has(t.nombre)) sb.tallas.add(t.nombre);
      if (color) sb.colores.add(color);
    }
  }
  parseMsPorHoja.push({ hoja: hoja.name, ms: Date.now() - tHoja, totalHoja: totalHoja });
}
function cajasColor(cb) {
  if (cb.etiquetas.size > 0) {
    const vals = [...cb.etiquetas];
    if (vals.length > 1) return { n: Math.max(...vals), nota: 'etiquetas_mixtas' };
    return { n: vals[0], nota: null };
  }
  if (cb.set.size > 0) return { n: cb.set.size, nota: null };
  if (cb.ctnsSuma > 0) return { n: cb.ctnsSuma, nota: 'rango_ilegible' };
  return { n: 0, nota: null };
}
const cajasFinales = [];
const totalesPorSku = {};
for (const entry of grupos) {
  const gk = entry[0], g = entry[1];
  const hayEtiqueta = [...g.colores.values()].some(cb => cb.etiquetas.size > 0);
  // Asignación: con etiquetas, cartones independientes por color (clave color#n);
  // sin etiquetas, cartones compartidos (clave hoja#n).
  const asignados = new Set();
  const subKeys = [...g.sub.keys()];
  const multiSub = subKeys.length > 1;
  // Validar etiquetas contra rangos propios del color
  if (hayEtiqueta) {
    for (const cb of g.colores.values()) {
      if (cb.etiquetas.size === 0) continue;
      const vals = [...cb.etiquetas];
      const n = vals.length > 1 ? Math.max(...vals) : vals[0];
      if (cb.set.size !== n) {
        warnings.push({ tipo: 'etiqueta_vs_rango', severidad: 'media', sku_base: g.style, detalle: 'Etiqueta ' + n + ' vs rangos ' + cb.set.size + ' en un color' });
      }
    }
  }
  for (const sk of subKeys) {
    const sb = g.sub.get(sk);
    let cantidad = 0;
    for (const sbc of sb.setByColor.values()) {
      const r = cajasColor(sbc);
      const color = sbc.color;
      for (const n of sbc.set) {
        const key = hayEtiqueta ? (color + '#' + n) : (g.hoja + '#' + n);
        if (!asignados.has(key)) { asignados.add(key); cantidad++; }
      }
      if (r.nota === 'etiquetas_mixtas') warnings.push({ tipo: 'etiqueta_mixta', severidad: 'media', sku_base: g.style, detalle: 'Color con etiquetas distintas, se toma la mayor' });
      if (r.nota === 'rango_ilegible') warnings.push({ tipo: 'rango_ilegible', severidad: 'media', sku_base: g.style, detalle: 'Rango ilegible: se usa suma de Ctns' });
    }
    const pzc = sb.pzc;
    const tieneRangos = [...sb.setByColor.values()].some(sbc => sbc.set.size > 0);
    if (cantidad === 0) {
      // Cartones ya asignados a otro subgrupo (compartidos): se omite sin ruido.
      // Solo se avisa si el subgrupo no trae ningún rango (filas sin Ctn no.).
      if (!tieneRangos) {
        warnings.push({ tipo: 'subgrupo_sin_cartones', severidad: 'media', sku_base: g.style, detalle: 'Subgrupo ' + g.pack + '/' + (pzc == null ? 's/pz' : pzc + 'pz') + ' sin cartones asignables' });
      }
      continue;
    }
    const codigoBase = g.style.replace(/[^A-Z0-9]+/gi, '-') + '-' + g.pack.replace(/[^A-Z0-9]+/gi, '') + '-GP';
    const codigo = multiSub ? codigoBase + '-P' + (pzc == null ? 'X' : pzc) : codigoBase;
    for (const dd of sb.dets) {
      detalles.push({ codigo_caja_temporal: codigo, sku_base: g.style, nombre_pack: g.pack, color_raw: dd.color || null, color_id: null, talla_codigo: dd.talla, talla_id: null, cantidad_por_caja: dd.cantidad || 0, estado_temporal: 'pendiente_match_color' });
    }
    if (pzc == null) warnings.push({ tipo: 'sin_piezas_por_caja', severidad: 'alta', sku_base: g.style, codigo_caja_temporal: codigo, detalle: 'Sin piezas por caja en ' + codigo });
    if (cantidad > 10000) warnings.push({ tipo: 'cantidad_absurda', severidad: 'alta', sku_base: g.style, codigo_caja_temporal: codigo, detalle: cantidad + ' cajas excede tope 10000' });
    cajasFinales.push({
      codigo_caja_temporal: codigo, sku_base: g.style, sku_raw: g.style, nombre_pack: g.pack,
      producto_id: null, proveedor_id: null, tipo_caja: 'completa', es_resumen: false, es_principal: false,
      piezas_por_caja: pzc, cantidad_cajas: cantidad, total_piezas: pzc != null ? pzc * cantidad : null,
      carton_no_raw: null, carton_inicio: null, carton_fin: null,
      peso_neto_kg: g.nw, peso_neto_total_kg: g.nw != null ? +(g.nw * cantidad).toFixed(2) : null,
      peso_bruto_kg: g.gw, peso_bruto_total_kg: g.gw != null ? +(g.gw * cantidad).toFixed(2) : null,
      largo_cm: null, ancho_cm: null, alto_cm: null, cbm_por_caja: g.cbm, cbm_total_linea: g.cbm != null ? +(g.cbm * cantidad).toFixed(4) : null,
      estado_temporal: 'listo_para_revision', hoja_origen: g.hoja,
      tallas: [...sb.tallas].join('|'), colores: [...sb.colores].join('|'),
      validacion: { suma_detalle_por_caja: pzc }
    });
    const pid = g.style;
    totalesPorSku[pid] = totalesPorSku[pid] || { cajas: 0, piezas: 0 };
    totalesPorSku[pid].cajas += cantidad;
    if (pzc != null) totalesPorSku[pid].piezas += pzc * cantidad;
  }
}
for (const h of parseMsPorHoja) {
  if (!h.totalHoja || h.totalHoja.cajas == null) continue;
  let calc = 0;
  for (const c of cajasFinales) if (c.hoja_origen === h.hoja && !c.es_resumen) calc += c.cantidad_cajas;
  if (calc !== h.totalHoja.cajas) {
    warnings.push({ tipo: 'total_hoja_vs_detalle', severidad: 'media', hoja: h.hoja, detalle: 'TOTAL hoja ' + h.totalHoja.cajas + ' vs calculado ' + calc });
  }
  delete h.totalHoja;
}
const productosArr = [...productos.values()].map(p => ({
  sku_base: p.sku_base, sku_raw: p.sku_base, nombre: null, marca: null, descripcion: p.descripcion,
  composicion: null, precio_usd: null, precio_yuan: null, precio_unitario_usd: p.precio, estado_temporal: 'pendiente_revision'
}));
const ordenProductos = Object.keys(totalesPorSku).map(sku => ({
  sku_base: sku, producto_id: null, piezas_pedidas: totalesPorSku[sku].piezas, cajas_pedidas: totalesPorSku[sku].cajas,
  cbm_detalle: null, peso_bruto_kg: null, estado_producto: 'Pendiente'
}));
for (const sku of Object.keys(totalesPorSku)) {
  cajasFinales.push({
    codigo_caja_temporal: sku.replace(/[^A-Z0-9]+/gi, '-') + '-CP', sku_base: sku, sku_raw: sku, nombre_pack: 'PACK UNICO',
    producto_id: null, proveedor_id: null, tipo_caja: 'padre_resumen', es_resumen: true, es_principal: true,
    piezas_por_caja: null, cantidad_cajas: 0, total_piezas: 0,
    carton_no_raw: null, carton_inicio: null, carton_fin: null,
    peso_neto_kg: null, peso_neto_total_kg: null, peso_bruto_kg: null, peso_bruto_total_kg: null,
    largo_cm: null, ancho_cm: null, alto_cm: null, cbm_por_caja: null, cbm_total_linea: null,
    estado_temporal: 'listo_para_revision', hoja_origen: null,
    tallas: '', colores: '', validacion: {}
  });
}
let totCajas = 0, totPiezas = 0;
for (const sku of Object.keys(totalesPorSku)) { totCajas += totalesPorSku[sku].cajas; totPiezas += totalesPorSku[sku].piezas; }
const cfgOut = (() => { try { return $('Normalizar archivo + ruta').first().json.__config || {}; } catch (e) { return {}; } })();
return [{ json: {
  ok: true,
  version_parser: 'mvp-n8n-code-v1.0-jenny-multicolor-pack',
  metadata: {
    cliente_b2b_id: cfgOut.cliente_b2b_id != null ? cfgOut.cliente_b2b_id : null, proveedor_id: cfgOut.proveedor_id != null ? cfgOut.proveedor_id : null, proveedor: 'JENNY / SHISHI BETERLON',
    orden_id: cfgOut.orden_id != null ? cfgOut.orden_id : null, formato_detectado: 'jenny_multicolor_pack', fecha_parseo: new Date().toISOString(),
    hojas_procesadas: hojas.length, parse_ms_por_hoja: parseMsPorHoja, parse_ms_total: Date.now() - T0,
    uso: 'JSON temporal para Next.js/staging. Revisar antes de insertar definitivo en Supabase.'
  },
  resumen: { total_productos: productosArr.length, total_cajas: totCajas, total_piezas: totPiezas, cbm_orden: null, peso_bruto_total_kg: null, total_warnings: warnings.length, estado: 'Requiere revision' },
  totales_por_sku: Object.keys(totalesPorSku).map(sku => ({ sku_base: sku, total_cajas: totalesPorSku[sku].cajas, total_piezas: totalesPorSku[sku].piezas, cbm_total: null, peso_bruto_kg: null, peso_neto_kg: null, fuente_totales: 'sumatoria_cajas' })),
  totales_calculados_desde_cajas: { total_cajas: totCajas, total_piezas: totPiezas, cbm_total: null, peso_bruto_total_kg: null, peso_neto_total_kg: null },
  productos_para_editar: productosArr,
  cajas_para_editar: cajasFinales,
  caja_detalles_para_editar: detalles,
  orden_preview: { orden_id: cfgOut.orden_id != null ? cfgOut.orden_id : null, cliente_b2b_id: cfgOut.cliente_b2b_id != null ? cfgOut.cliente_b2b_id : null, proveedor_id: cfgOut.proveedor_id != null ? cfgOut.proveedor_id : null, estado: 'Requiere revision', total_productos: productosArr.length, total_cajas: totCajas, total_piezas: totPiezas, cbm_orden: null, peso_bruto_total_kg: null, orden_productos: ordenProductos },
  warnings: warnings
} }];`;

module.exports = { JENNY_JS };
