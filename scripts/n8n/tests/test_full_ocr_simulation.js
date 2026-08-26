// scripts\n8n\tests\test_full_ocr_simulation.js
const fs = require('fs');

// Datos exactos que devolvió OpenRouter reportados por el usuario
const rawFromUser = {
  id: "gen-1787685833-4FNqVRDbxuKUHaJUFxfn",
  model: "google/gemini-2.5-flash-lite",
  usage: {
    cost: 0.0006894,
    is_byok: false,
    total_tokens: 5370,
    prompt_tokens: 4862,
    completion_tokens: 508
  },
  object: "chat.completion",
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content: `{\n  "folio": null,\n  "fecha": "2026-08-11",\n  "tipo_movimiento": "SAL",\n  "bodega_receptora_interna": null,\n  "entidad_externa_procedencia": null,\n  "origen": "Cosina",\n  "destino": "cliente Hilario (casa)",\n  "nota_referencia": null,\n  "observaciones": "Entrega: Miguel",\n  "lineas": [\n    {\n      "estilo_raw": "B026/ISMSTYC",\n      "sku": "B026/15MSTCYC",\n      "prefijo": "B0",\n      "proveedor_sugerido": "BONNIE",\n      "familia_sku": "MODERNO",\n      "descripcion_raw": "Pants dama Lecra",\n      "cantidad_cajas": 2,\n      "piezas_por_caja": null,\n      "confianza": 0.9\n    },\n    {\n      "estilo_raw": "B026/16 MSTCYC",\n      "sku": "B026/16MSTCYC",\n      "prefijo": "B0",\n      "proveedor_sugerido": "BONNIE",\n      "familia_sku": "MODERNO",\n      "descripcion_raw": "pants dama lucra",\n      "cantidad_cajas": 1,\n      "piezas_por_caja": null,\n      "confianza": 0.9\n    },\n    {\n      "estilo_raw": "TY25/0IMC",\n      "sku": "TY25/01MC",\n      "prefijo": "TY",\n      "proveedor_sugerido": "TIANYI",\n      "familia_sku": "MODERNO",\n      "descripcion_raw": "Cham. cab Toronto.",\n      "cantidad_cajas": 1,\n      "piezas_por_caja": null,\n      "confianza": 0.9\n    }\n  ],\n  "confianza_global": 0.9\n}`
      }
    }
  ]
};

const meta = {
  usuario_id: 8,
  client_request_id: '4e41a036-e1a2-4cbb-b054-82c7672dbc05',
  comprobante_url: 'https://supabase.sistemaindumentaria.com/storage/v1/object/public/comprobantes/2026/08/nota_1787685833077_464651.jpg',
  storage_path: '2026/08/nota_1787685833077_464651.jpg',
  tipo_hint: 'salida',
  origen_hint: 'COCINA',
  destino_hint: null,
  priorizar_ia: true
};

// ==========================================
// SIMULACIÓN NODO: Parsear JSON1
// ==========================================
function simularParsearJSON1(item, meta) {
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

  let data = {};
  if (typeof rawContent === 'object' && rawContent !== null && Array.isArray(rawContent.lineas)) {
    data = rawContent;
  } else if (typeof rawContent === 'string') {
    let str = rawContent.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();
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
        data = JSON.parse(str);
      } catch (e2) {
        data = {};
      }
    }
  } else if (typeof rawContent === 'object' && rawContent !== null) {
    data = rawContent;
  }

  function normalizarSku(raw) {
    if (!raw) return '';
    let s = String(raw).trim().toUpperCase();
    s = s.replace(/[\s\.\,\-]+$/g, '');
    s = s.replace(/\s+/g, '');
    return s;
  }

  function normalizarFecha(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const dd = m[1].padStart(2, '0');
      const mm = m[2].padStart(2, '0');
      const yyyy = m[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
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
    json_crudo: Object.assign({}, data, { _raw_llm_response: item })
  };

  return payload;
}

const resultadoParsear = simularParsearJSON1(rawFromUser, meta);
console.log('=== SALIDA DE PARSEAR JSON1 ===');
console.log('Folio:', resultadoParsear.folio);
console.log('Fecha:', resultadoParsear.fecha);
console.log('Tipo Movimiento:', resultadoParsear.tipo_movimiento);
console.log('Origen:', resultadoParsear.origen);
console.log('Destino:', resultadoParsear.destino);
console.log('Observaciones:', resultadoParsear.observaciones);
console.log('Total Lineas:', resultadoParsear.lineas.length);
console.log('Lineas Procesadas:');
resultadoParsear.lineas.forEach(l => {
  console.log(` - SKU: ${l.sku} | Desc: ${l.descripcion_texto} | Cajas: ${l.cantidad_cajas}`);
});
