// scripts/n8n/updates/jenny_parser_code.js
// Código fuente del nodo "Parser Jenny multicolor-pack" (referencia versionada).
// Se incrusta en build_full_workflow_json.js para generar el workflow completo.
// Formato Jenny (SHISHI BETERLON), reglas validadas contra TOTALES de hoja:
// - Verdad = columna Style No. con herencia (nunca nombre de hoja).
// - Bloque fisico = Style + Pack + Color(etiqueta) + CtnNo.raw + Ctns.
//   Las filas que comparten clave son el MISMO carton: Ctns y Ttl se cuentan
//   una sola vez; los colores/tallas se suman como composicion del carton.
// - Con etiqueta (共N箱) los cartones son por color; sin etiqueta se comparten
//   entre colores del mismo (Style, Pack, CtnNo.raw).
// - Pcs/Ctn solo numerico plano; expresiones tipo 6*11packs=66 multiplican las
//   tallas de su fila y el total sale de Ttl (con warning, sin sustitucion).
// - Tallas solo con whitelist CH|M|G|EG|EEG|numericas (huecos vacios se ignoran).
// - CBM de celda es TOTAL del bloque; N.W/G.W son POR carton.
// - TOTAL de hoja solo contraste, nunca se recalcula ni se sobrescribe.
// NOTA String.raw: conserva escapes regex. Sin ${ ni backticks dentro.

const JENNY_JS = String.raw`// Parser Jenny bloques v2.0 — SHISHI BETERLON / JENNY
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
function normalizaEncabezado(v) {
  return cleanText(v).normalize('NFKC').toLowerCase().replace(/\s+/g, '').replace(/\./g, '');
}
function indiceEncabezado(headers, nombres) {
  const normalizados = headers.map(normalizaEncabezado);
  return normalizados.findIndex(function(h) { return nombres.indexOf(h) !== -1; });
}
function enteroPositivo(v) {
  const n = toNumJenny(v);
  return (typeof n === 'number' && isFinite(n) && Math.floor(n) === n && n > 0) ? n : null;
}
function etiquetaCajas(colorRaw) {
  const m = String(colorRaw || '').match(/[（(]\s*共\s*(\d+)\s*箱\s*[）)]/);
  return m ? Number(m[1]) : null;
}
function parsePacksJenny(s) {
  const t = cleanText(s);
  const m = t.match(/(\d+)\s*[×*x]\s*(\d+)\s*packs?\s*=\s*(\d+)/i);
  if (!m) return null;
  return { porPack: Number(m[1]), packs: Number(m[2]), total: Number(m[3]) };
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
const bloques = new Map();
const ordenBloques = [];
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
  descr: [/^descripcion/i],
  comp: [/^composicion/i],
  nw: [/^n\.w$/i],
  gw: [/^g\.w$/i],
  cbm: [/cbm/i]
};
for (const hoja of hojas) {
  const tHoja = Date.now();
  const rows = hoja.rows;
  let hIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const r = rows[i] || [];
    for (let k = 0; k < r.length; k++) {
      if (normalizaEncabezado(r[k]) === 'styleno') { hIdx = i; break; }
    }
    if (hIdx >= 0) break;
  }
  if (hIdx < 0) { warnings.push({ tipo: 'hoja_sin_header', severidad: 'alta', hoja: hoja.name, detalle: 'Sin fila Style No.: hoja omitida' }); continue; }
  const headers = rows[hIdx] || [];
  const ix = {
    style: indiceEncabezado(headers, ['styleno']),
    color: indiceEncabezado(headers, ['color', 'colour']),
    pack: indiceEncabezado(headers, ['pack']),
    pcs: indiceEncabezado(headers, ['pcs/ctn', 'sets/ctn', 'pcs/bag', 'sets/bag']),
    ctnno: indiceEncabezado(headers, ['ctnno', 'bagno']),
    ctns: indiceEncabezado(headers, ['ctns']),
    ttl: indiceEncabezado(headers, ['ttlqty']),
    precio: indiceEncabezado(headers, ['precio']),
    descr: indiceEncabezado(headers, ['descripcion', 'descripcionymarca']),
    comp: indiceEncabezado(headers, ['composicion', 'composition']),
    nw: indiceEncabezado(headers, ['nw']),
    gw: indiceEncabezado(headers, ['gw']),
    cbm: headers.findIndex(function(h) { return normalizaEncabezado(h).indexOf('cbm') === 0; })
  };
  if (ix.style < 0 || ix.color < 0 || ix.ctns < 0 || ix.ttl < 0) {
    warnings.push({ tipo: 'columnas_obligatorias_ausentes', severidad: 'alta', hoja: hoja.name, detalle: 'Faltan Style/Color/Ctns/Ttl.QTY', columnas: ix });
    continue;
  }
  const limite = ix.pcs >= 0 ? ix.pcs : headers.length;
  const tallas = [];
  if (ix.pcs >= 0) {
    for (let i = ix.color + 1; i < limite; i++) {
      const nombre = cleanText(headers[i]);
      if (/^(CH|M|G|EG|EEG|\d{1,3})$/i.test(nombre)) tallas.push({ i: i, nombre: nombre });
    }
  } else {
    warnings.push({ tipo: 'sin_columna_pcs', severidad: 'media', hoja: hoja.name, detalle: 'Sin Pcs/Sets por carton: no se extrae detalle de tallas' });
  }
  let hayEtiqueta = false;
  for (let i = hIdx + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    if (/^total$/i.test(cleanText(r[ix.style]))) break;
    if (etiquetaCajas(cleanText(r[ix.color])) !== null) { hayEtiqueta = true; break; }
  }
  let totalHoja = null;
  let style = null;
  let pack = 'PACK UNICO';
  let prodDescripcion = null;
  let prodComposicion = null;
  let prodPrecio = null;
  let seqHoja = 0;
  const valor = function(row, i) { return i >= 0 ? row[i] : undefined; };
  for (let i = hIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const styleCelda = cleanText(valor(row, ix.style));
    if (/^total$/i.test(styleCelda)) {
      totalHoja = { cajas: toNumJenny(valor(row, ix.ctns)), piezas: toNumJenny(valor(row, ix.ttl)) };
      break;
    }
    if (styleCelda) {
      style = styleCelda;
      pack = 'PACK UNICO';
      prodDescripcion = cleanText(valor(row, ix.descr)) || null;
      prodComposicion = cleanText(valor(row, ix.comp)) || null;
      prodPrecio = toNumJenny(valor(row, ix.precio));
      if (!productos.has(style)) {
        productos.set(style, { sku_base: style, descripcion: prodDescripcion, composicion: prodComposicion, precio: prodPrecio, hoja: hoja.name });
      } else {
        const p = productos.get(style);
        if (!p.descripcion && prodDescripcion) p.descripcion = prodDescripcion;
        if (!p.composicion && prodComposicion) p.composicion = prodComposicion;
        if (p.precio == null && prodPrecio != null) p.precio = prodPrecio;
      }
    }
    if (!style) continue;
    const packCelda = cleanText(valor(row, ix.pack));
    if (packCelda) pack = packCelda;
    const dCelda = cleanText(valor(row, ix.descr));
    const cCelda = cleanText(valor(row, ix.comp));
    const prCelda = toNumJenny(valor(row, ix.precio));
    const pReg = productos.get(style);
    if (pReg) {
      if (!pReg.descripcion && dCelda) pReg.descripcion = dCelda;
      if (!pReg.composicion && cCelda) pReg.composicion = cCelda;
      if (pReg.precio == null && prCelda != null) pReg.precio = prCelda;
    }
    const colorRaw = cleanText(valor(row, ix.color));
    const ctns = enteroPositivo(valor(row, ix.ctns));
    if (ctns === null) {
      let hayDato = false;
      for (const t of tallas) { if (toNumJenny(row[t.i]) != null) { hayDato = true; break; } }
      if (colorRaw && hayDato) {
        warnings.push({ tipo: 'color_sin_bloque_ctns', severidad: 'alta', hoja: hoja.name, fila: i + 1, sku_base: style, color: colorRaw, detalle: 'Fila con color y tallas pero sin Ctns: no se asigna a bloque' });
      }
      continue;
    }
    const ctnnoRaw = cleanText(valor(row, ix.ctnno));
    const colorClave = hayEtiqueta ? colorRaw : '';
    const clave = hoja.name + '||' + style + '||' + pack + '||' + colorClave + '||' + ctnnoRaw + '||' + String(ctns);
    let b = bloques.get(clave);
    if (!b) {
      seqHoja++;
      b = {
        hoja: hoja.name, fila_excel: i + 1, sku_base: style, nombre_pack: pack,
        descripcion: (productos.get(style) || {}).descripcion || null,
        cantidad_cajas: ctns, carton_no_raw: ctnnoRaw || null,
        total_piezas_declarado: toNumJenny(valor(row, ix.ttl)),
        piezas_por_caja: null, pcs_raw_list: [], tiene_packs: false,
        peso_neto_kg: toNumJenny(valor(row, ix.nw)),
        peso_bruto_kg: toNumJenny(valor(row, ix.gw)),
        cbm_total_declarado: toNumJenny(valor(row, ix.cbm)),
        ttl_gw_declarado: null, detalles: [], seq: seqHoja
      };
      bloques.set(clave, b);
      ordenBloques.push(b);
    }
    const pcsRaw = cleanText(valor(row, ix.pcs));
    const pzcFila = toNumJenny(valor(row, ix.pcs));
    if (pcsRaw) b.pcs_raw_list.push(pcsRaw);
    if (pzcFila != null && b.piezas_por_caja == null && !b.tiene_packs) b.piezas_por_caja = pzcFila;
    const pk = ix.pcs >= 0 ? parsePacksJenny(valor(row, ix.pcs)) : null;
    if (pk) {
      b.tiene_packs = true;
      if (b.piezas_por_caja == null || true) {
        if (b.total_piezas_declarado != null) b.piezas_por_caja = b.total_piezas_declarado / b.cantidad_cajas;
      }
      if (pcsRaw) warnings.push({ tipo: 'pcs_no_numerico', severidad: 'media', sku_base: style, hoja: hoja.name, fila: i + 1, detalle: 'Pcs/Ctn con packs (' + pcsRaw + '): tallas x' + pk.packs + ', total desde Ttl' });
    } else if (pcsRaw && pzcFila == null) {
      warnings.push({ tipo: 'pcs_no_numerico', severidad: 'media', sku_base: style, hoja: hoja.name, fila: i + 1, detalle: 'Pcs/Ctn no numerico (' + pcsRaw + '): total desde Ttl' });
    }
    if (b.total_piezas_declarado == null) b.total_piezas_declarado = toNumJenny(valor(row, ix.ttl));
    if (b.peso_neto_kg == null) b.peso_neto_kg = toNumJenny(valor(row, ix.nw));
    if (b.peso_bruto_kg == null) b.peso_bruto_kg = toNumJenny(valor(row, ix.gw));
    if (b.cbm_total_declarado == null) b.cbm_total_declarado = toNumJenny(valor(row, ix.cbm));
    let sumaFila = 0;
    const filaTallas = [];
    for (const t of tallas) {
      const q = toNumJenny(row[t.i]);
      if (q != null && q > 0) { filaTallas.push({ talla: t.nombre, cantidad: q }); sumaFila += q; }
    }
    let mult = 1;
    if (pk && sumaFila === pk.porPack) mult = pk.packs;
    if (colorRaw) {
      for (const ft of filaTallas) {
        b.detalles.push({ color_raw: colorRaw, talla_codigo: ft.talla, cantidad_por_caja: ft.cantidad * mult, fila_excel: i + 1 });
      }
    }
  }
  for (const b of ordenBloques) {
    if (b.hoja !== hoja.name || b._validado) continue;
    b._validado = true;
    b.suma_detalle_por_caja = b.detalles.reduce(function(s, d) { return s + (d.cantidad_por_caja || 0); }, 0);
    if (b.piezas_por_caja == null && b.total_piezas_declarado != null) {
      b.piezas_por_caja = b.total_piezas_declarado / b.cantidad_cajas;
      b.fuente_piezas = 'ttl_entre_ctns';
    }
    if (b.piezas_por_caja != null && b.suma_detalle_por_caja !== b.piezas_por_caja) {
      let notaPack = '';
      if (b.suma_detalle_por_caja > 0 && b.piezas_por_caja % b.suma_detalle_por_caja === 0) {
        notaPack = ' Posible composicion por pack x' + (b.piezas_por_caja / b.suma_detalle_por_caja) + ' (no aplicado).';
      }
      warnings.push({ tipo: 'detalle_vs_piezas_por_caja', severidad: 'alta', hoja: b.hoja, fila: b.fila_excel, sku_base: b.sku_base, declarado: b.piezas_por_caja, detalle: b.suma_detalle_por_caja, nota: notaPack || undefined });
    }
    if (b.total_piezas_declarado != null && b.piezas_por_caja != null && b.piezas_por_caja * b.cantidad_cajas !== b.total_piezas_declarado) {
      warnings.push({ tipo: 'ctns_por_piezas_vs_ttl', severidad: 'alta', hoja: b.hoja, fila: b.fila_excel, sku_base: b.sku_base, calculado: b.piezas_por_caja * b.cantidad_cajas, declarado: b.total_piezas_declarado });
    }
    if (b.piezas_por_caja == null) {
      warnings.push({ tipo: 'sin_piezas_por_caja', severidad: 'alta', hoja: b.hoja, fila: b.fila_excel, sku_base: b.sku_base, detalle: 'Sin piezas por caja ni Ttl para derivar' });
    }
    if (b.cantidad_cajas > 10000) {
      warnings.push({ tipo: 'cantidad_absurda', severidad: 'alta', hoja: b.hoja, fila: b.fila_excel, sku_base: b.sku_base, detalle: b.cantidad_cajas + ' cajas excede tope 10000' });
    }
  }
  parseMsPorHoja.push({ hoja: hoja.name, ms: Date.now() - tHoja, totalHoja: totalHoja });
}
const cajasFinales = [];
const detalles = [];
const totalesPorSku = {};
for (const b of ordenBloques) {
  const codigo = b.sku_base.replace(/[^A-Z0-9]+/gi, '-') + '-' + b.nombre_pack.replace(/[^A-Z0-9]+/gi, '') + '-B' + String(b.seq).padStart(2, '0');
  const pzc = b.piezas_por_caja;
  const totalPiezas = b.total_piezas_declarado != null ? b.total_piezas_declarado : (pzc != null ? pzc * b.cantidad_cajas : null);
  const tallasSet = [];
  const coloresSet = [];
  for (const d of b.detalles) {
    detalles.push({ codigo_caja_temporal: codigo, sku_base: b.sku_base, nombre_pack: b.nombre_pack, color_raw: d.color_raw || null, color_id: null, talla_codigo: d.talla_codigo, talla_id: null, cantidad_por_caja: d.cantidad_por_caja || 0, estado_temporal: 'pendiente_match_color' });
    if (d.talla_codigo && tallasSet.indexOf(d.talla_codigo) === -1) tallasSet.push(d.talla_codigo);
    if (d.color_raw && coloresSet.indexOf(d.color_raw) === -1) coloresSet.push(d.color_raw);
  }
  const cbmTotal = b.cbm_total_declarado;
  cajasFinales.push({
    codigo_caja_temporal: codigo, sku_base: b.sku_base, sku_raw: b.sku_base, nombre_pack: b.nombre_pack,
    producto_id: null, proveedor_id: null, tipo_caja: 'completa', es_resumen: false, es_principal: false,
    piezas_por_caja: pzc, cantidad_cajas: b.cantidad_cajas, total_piezas: totalPiezas,
    carton_no_raw: b.carton_no_raw, carton_inicio: null, carton_fin: null,
    peso_neto_kg: b.peso_neto_kg, peso_neto_total_kg: b.peso_neto_kg != null ? +(b.peso_neto_kg * b.cantidad_cajas).toFixed(2) : null,
    peso_bruto_kg: b.peso_bruto_kg, peso_bruto_total_kg: b.peso_bruto_kg != null ? +(b.peso_bruto_kg * b.cantidad_cajas).toFixed(2) : null,
    largo_cm: null, ancho_cm: null, alto_cm: null, cbm_por_caja: cbmTotal != null ? +(cbmTotal / b.cantidad_cajas).toFixed(6) : null, cbm_total_linea: cbmTotal,
    estado_temporal: 'listo_para_revision', hoja_origen: b.hoja,
    tallas: tallasSet.join('|'), colores: coloresSet.join('|'),
    validacion: { suma_detalle_por_caja: b.suma_detalle_por_caja, fila_excel: b.fila_excel }
  });
  const pid = b.sku_base;
  totalesPorSku[pid] = totalesPorSku[pid] || { cajas: 0, piezas: 0 };
  totalesPorSku[pid].cajas += b.cantidad_cajas;
  if (totalPiezas != null) totalesPorSku[pid].piezas += totalPiezas;
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
  composicion: p.composicion, precio_usd: null, precio_yuan: null, precio_unitario_usd: p.precio, estado_temporal: 'pendiente_revision'
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
  version_parser: 'mvp-n8n-code-v2.0-jenny-bloques',
  metadata: {
    cliente_b2b_id: cfgOut.cliente_b2b_id != null ? cfgOut.cliente_b2b_id : null, proveedor_id: cfgOut.proveedor_id != null ? cfgOut.proveedor_id : null, proveedor: 'JENNY / SHISHI BETERLON',
    orden_id: cfgOut.orden_id != null ? cfgOut.orden_id : null, formato_detectado: 'jenny_multicolor_pack', fecha_parseo: new Date().toISOString(),
    hojas_procesadas: hojas.length, parse_ms_por_hoja: parseMsPorHoja, parse_ms_total: Date.now() - T0,
    uso: 'JSON temporal para Next.js/staging. Revisar antes de insertar definitivo en Supabase.'
  },
  resumen: { total_productos: productosArr.length, total_cajas: totCajas, total_piezas: totPiezas, cbm_orden: null, peso_bruto_total_kg: null, total_warnings: warnings.length, estado: 'Requiere revision' },
  totales_por_sku: Object.keys(totalesPorSku).map(sku => ({ sku_base: sku, total_cajas: totalesPorSku[sku].cajas, total_piezas: totalesPorSku[sku].piezas, cbm_total: null, peso_bruto_kg: null, peso_neto_kg: null, fuente_totales: 'sumatoria_bloques' })),
  totales_calculados_desde_cajas: { total_cajas: totCajas, total_piezas: totPiezas, cbm_total: null, peso_bruto_total_kg: null, peso_neto_total_kg: null },
  productos_para_editar: productosArr,
  cajas_para_editar: cajasFinales,
  caja_detalles_para_editar: detalles,
  orden_preview: { orden_id: cfgOut.orden_id != null ? cfgOut.orden_id : null, cliente_b2b_id: cfgOut.cliente_b2b_id != null ? cfgOut.cliente_b2b_id : null, proveedor_id: cfgOut.proveedor_id != null ? cfgOut.proveedor_id : null, estado: 'Requiere revision', total_productos: productosArr.length, total_cajas: totCajas, total_piezas: totPiezas, cbm_orden: null, peso_bruto_total_kg: null, orden_productos: ordenProductos },
  warnings: warnings
} }];`;

module.exports = { JENNY_JS };
