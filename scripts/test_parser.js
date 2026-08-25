// scripts/test_parser.js
const sample = {
  id: 'gen-1787685833-4FNqVRDbxuKUHaJUFxfn',
  model: 'google/gemini-2.5-flash-lite',
  choices: [{
    index: 0,
    message: {
      role: 'assistant',
      content: JSON.stringify({
        folio: null,
        fecha: '2026-08-11',
        tipo_movimiento: 'SAL',
        origen: 'Cosina',
        destino: 'cliente Hilario (casa)',
        lineas: [
          {
            estilo_raw: 'B026/ISMSTYC',
            sku: 'B026/15MSTCYC',
            descripcion_raw: 'Pants dama Lecra',
            cantidad_cajas: 2
          }
        ],
        confianza_global: 0.9
      })
    }
  }]
};

// 1. CÓDIGO ACTUAL CON EL BUG
const item = sample;
let data = item.data || item;
if (typeof data === 'string') {
  try {
    let clean = data.replace(/^[\s\S]*?\{/, '{').replace(/\}[\s\S]*?$/, '}');
    data = JSON.parse(clean);
  } catch(e) {}
}

console.log('--- COMPORTAMIENTO ACTUAL (BUG) ---');
console.log('data.lineas:', data.lineas); // undefined!
console.log('data.tipo_movimiento:', data.tipo_movimiento); // undefined!
console.log('data.fecha:', data.fecha); // undefined!
console.log('data.origen:', data.origen); // undefined!

// 2. CÓDIGO CORREGIDO
let contentStr = '';
if (item.choices && item.choices[0] && item.choices[0].message && item.choices[0].message.content) {
  contentStr = item.choices[0].message.content;
} else if (item.message && item.message.content) {
  contentStr = item.message.content;
} else if (item.content) {
  contentStr = typeof item.content === 'string' ? item.content : JSON.stringify(item.content);
} else if (typeof data === 'string') {
  contentStr = data;
} else if (data && typeof data === 'object' && data.choices && data.choices[0]) {
  contentStr = data.choices[0].message?.content || '';
}

let parsedData = data;
if (contentStr) {
  try {
    let clean = contentStr.replace(/^[\s\S]*?\{/, '{').replace(/\}[\s\S]*?$/, '}');
    parsedData = JSON.parse(clean);
  } catch(e) {
    try {
      const match = contentStr.match(/\{[\s\S]*\}/);
      if (match) parsedData = JSON.parse(match[0]);
    } catch(e2) {}
  }
}

console.log('\n--- COMPORTAMIENTO CORREGIDO ---');
console.log('parsedData.lineas:', parsedData.lineas);
console.log('parsedData.tipo_movimiento:', parsedData.tipo_movimiento);
console.log('parsedData.fecha:', parsedData.fecha);
console.log('parsedData.origen:', parsedData.origen);
console.log('parsedData.destino:', parsedData.destino);
