// scripts\n8n\tests\test_complete_ocr_flow.js
const fs = require('fs');

const rawFromUser = {
  id: 'gen-1787685833-4FNqVRDbxuKUHaJUFxfn',
  model: 'google/gemini-2.5-flash-lite',
  usage: { cost: 0.0006894 },
  object: 'chat.completion',
  choices: [{
    index: 0,
    message: {
      role: 'assistant',
      content: JSON.stringify({
        folio: null,
        fecha: '2026-08-11',
        tipo_movimiento: 'SAL',
        bodega_receptora_interna: null,
        entidad_externa_procedencia: null,
        origen: 'Cosina',
        destino: 'cliente Hilario (casa)',
        nota_referencia: null,
        observaciones: 'Entrega: Miguel',
        lineas: [
          {
            estilo_raw: 'B026/ISMSTYC',
            sku: 'B026/15MSTCYC',
            prefijo: 'B0',
            proveedor_sugerido: 'BONNIE',
            familia_sku: 'MODERNO',
            descripcion_raw: 'Pants dama Lecra',
            cantidad_cajas: 2,
            piezas_por_caja: null,
            confianza: 0.9
          },
          {
            estilo_raw: 'B026/16 MSTCYC',
            sku: 'B026/16MSTCYC',
            prefijo: 'B0',
            proveedor_sugerido: 'BONNIE',
            familia_sku: 'MODERNO',
            descripcion_raw: 'pants dama lucra',
            cantidad_cajas: 1,
            piezas_por_caja: null,
            confianza: 0.9
          },
          {
            estilo_raw: 'TY25/0IMC',
            sku: 'TY25/01MC',
            prefijo: 'TY',
            proveedor_sugerido: 'TIANYI',
            familia_sku: 'MODERNO',
            descripcion_raw: 'Cham. cab Toronto.',
            cantidad_cajas: 1,
            piezas_por_caja: null,
            confianza: 0.9
          }
        ],
        confianza_global: 0.9
      })
    }
  }],
  meta_enviada: {
    tipo_hint: 'salida',
    usuario_id: 8,
    origen_hint: 'COCINA',
    destino_hint: null,
    storage_path: '2026/08/nota_1787685833077_464651.jpg',
    comprobante_url: 'https://supabase.sistemaindumentaria.com/storage/v1/object/public/comprobantes/2026/08/nota_1787685833077_464651.jpg'
  }
};

// ==========================================
// FUNCIÓN ROBUSTA DE EXTRACCIÓN Y PARSEO
// ==========================================
function parsearRespuestaOcr(inputItem) {
  const item = inputItem || {};
  let rawContent = item;

  // 1. Extraer el contenido textual según el proveedor/estructura
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
  } else if (typeof item === 'string') {
    rawContent = item;
  }

  // 2. Si ya es un objeto con la estructura parseada (ej. tiene lineas)
  let data = {};
  if (typeof rawContent === 'object' && rawContent !== null && Array.isArray(rawContent.lineas)) {
    data = rawContent;
  } else if (typeof rawContent === 'string') {
    // Limpiar bloques de código markdown ```json ... ```
    let str = rawContent.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();
    
    // Intentar extraer el JSON entre llaves { ... }
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
        console.error('Error al parsear JSON:', e2.message);
        data = {};
      }
    }
  } else if (typeof rawContent === 'object' && rawContent !== null) {
    data = rawContent;
  }

  return data;
}

const dataParsed = parsearRespuestaOcr(rawFromUser);
console.log('✅ Resultado de parsearRespuestaOcr:');
console.log('Folio:', dataParsed.folio);
console.log('Fecha:', dataParsed.fecha);
console.log('Tipo Movimiento:', dataParsed.tipo_movimiento);
console.log('Origen:', dataParsed.origen);
console.log('Destino:', dataParsed.destino);
console.log('Observaciones:', dataParsed.observaciones);
console.log('Total Líneas detectadas:', dataParsed.lineas ? dataParsed.lineas.length : 0);
console.log('Líneas:', JSON.stringify(dataParsed.lineas, null, 2));
