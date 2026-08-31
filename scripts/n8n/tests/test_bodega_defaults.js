// scripts/n8n/tests/test_bodega_defaults.js

const BODEGAS = [
  { id: 1,  codigo: "SUC001", nombre: "CHICONCUAC",     ciudad: "CHINCONCUAC",   es_matriz: true },
  { id: 2,  codigo: "SUC002", nombre: "VACAS",          ciudad: "CHINCONCUAC",   es_matriz: false },
  { id: 3,  codigo: "SUC003", nombre: "TOLUCA ANGEL",   ciudad: "TOLUCA",        es_matriz: false },
  { id: 4,  codigo: "SUC004", nombre: "TOLUCA BORDADO", ciudad: "TOLUCA",        es_matriz: true },
  { id: 5,  codigo: "SUC005", nombre: "DURAZNO",        ciudad: "SAN MARTIN",    es_matriz: false },
  { id: 6,  codigo: "SUC006", nombre: "SAN DIEGO 1",    ciudad: "SAN MARTIN",    es_matriz: false },
  { id: 7,  codigo: "SUC007", nombre: "TORTILLA",       ciudad: "SAN MARTIN",    es_matriz: false },
  { id: 8,  codigo: "SUC008", nombre: "SAN DIEGO 2",    ciudad: "SAN MARTIN",    es_matriz: false },
  { id: 9,  codigo: "SUC009", nombre: "ANDRADE",        ciudad: "SAN MARTIN",    es_matriz: false },
  { id: 10, codigo: "SUC010", nombre: "COCINA",         ciudad: "SAN MARTIN",    es_matriz: true },
  { id: 11, codigo: "SUC011", nombre: "PALOMAS",        ciudad: "NEZAHUALCOYOTL",es_matriz: false },
  { id: 12, codigo: "SUC012", nombre: "ZANDUNGA 1",     ciudad: "NEZAHUALCOYOTL",es_matriz: true },
  { id: 13, codigo: "SUC013", nombre: "ZANDUNGA 2",     ciudad: "NEZAHUALCOYOTL",es_matriz: false },
  { id: 14, codigo: "SUC014", nombre: "ZANDUNGA 3",     ciudad: "NEZAHUALCOYOTL",es_matriz: false },
  { id: 15, codigo: "SUC015", nombre: "TULANCINGO",     ciudad: "TULANCINGO",    es_matriz: true },
  { id: 16, codigo: "SUC016", nombre: "RI&KA",         ciudad: null,            es_matriz: false },
  { id: 17, codigo: "SUC017", nombre: "PANTACO",        ciudad: null,            es_matriz: false },
  { id: 18, codigo: "SUC0018",nombre: "GBG",            ciudad: null,            es_matriz: false },
  { id: 19, codigo: "SUC019", nombre: "SOR JUANA",      ciudad: "NEZAHUALCOYOTL",es_matriz: false }
];

const MATRICES_CIUDAD = {
  'TOLUCA': 4,              // TOLUCA BORDADO
  'SAN MARTIN': 10,         // COCINA
  'TEXMELUCAN': 10,         // COCINA
  'SAN MARTIN TEXMELUCAN': 10,
  'NEZAHUALCOYOTL': 12,     // ZANDUNGA 1
  'NEZA': 12,               // ZANDUNGA 1
  'CHICONCUAC': 1,          // CHICONCUAC
  'CHINCONCUAC': 1,
  'TULANCINGO': 15          // TULANCINGO
};

function normalizarTextoBodega(raw) {
  if (!raw) return '';
  let s = String(raw).toUpperCase().trim();
  s = s.replace(/COSINA/g, 'COCINA');
  s = s.replace(/RIKA|RI Y KA|RI&KA/g, 'RI&KA');
  s = s.replace(/PANTACO|PANTACO 1/g, 'PANTACO');
  s = s.replace(/DURASNO/g, 'DURAZNO');
  s = s.replace(/SANDUNGA/g, 'ZANDUNGA');
  s = s.replace(/BORDADOS/g, 'BORDADO');
  s = s.replace(/CHICONKUAC/g, 'CHICONCUAC');
  return s;
}

function buscarBodega(texto) {
  if (!texto) return null;
  const limpio = normalizarTextoBodega(texto);

  if (/^\d+$/.test(limpio)) {
    const bId = Number(limpio);
    const hit = BODEGAS.find(b => b.id === bId);
    if (hit) return hit;
  }

  // Nivel 1: Match Exacto por Nombre o Código
  const exacto = BODEGAS.find(b => b.nombre === limpio || b.codigo === limpio);
  if (exacto) return exacto;

  // Nivel 2: Token Matching (Palabras desordenadas)
  const tokensInput = limpio.split(/[\s\-\/]+/).filter(Boolean);
  for (const b of BODEGAS) {
    const tokensB = b.nombre.split(/[\s\-\/]+/).filter(Boolean);
    if (tokensInput.length === tokensB.length && tokensB.every(t => tokensInput.includes(t))) {
      return b;
    }
  }

  // Nivel 3: Desambiguación de Nombres Parciales con Defaults a Matriz / Sucursal 1
  if (limpio.includes('ZANDUNGA') || limpio.includes('SANDUNGA')) {
    if (limpio.includes('2')) return BODEGAS.find(b => b.id === 13);
    if (limpio.includes('3')) return BODEGAS.find(b => b.id === 14);
    return BODEGAS.find(b => b.id === 12); // Default ZANDUNGA 1
  }

  if (limpio.includes('SAN DIEGO')) {
    if (limpio.includes('2')) return BODEGAS.find(b => b.id === 8);
    return BODEGAS.find(b => b.id === 6); // Default SAN DIEGO 1
  }

  if (limpio.includes('TOLUCA') || limpio.includes('BORDADO')) {
    if (limpio.includes('ANGEL')) return BODEGAS.find(b => b.id === 3);
    return BODEGAS.find(b => b.id === 4); // Default TOLUCA BORDADO (Matriz)
  }

  // Nivel 4: Resolución por Ciudad / Bodega Matriz (Padre)
  for (const [ciudadKey, matrizId] of Object.entries(MATRICES_CIUDAD)) {
    if (limpio === ciudadKey || limpio.startsWith(ciudadKey) || ciudadKey.startsWith(limpio)) {
      return BODEGAS.find(b => b.id === matrizId) || null;
    }
  }

  // Nivel 5: Contención simple
  return BODEGAS.find(b => 
    limpio.includes(b.nombre) || 
    b.nombre.includes(limpio)
  ) || null;
}

const testCases = [
  { input: 'Bordado Toluca', expectedId: 4, expectedName: 'TOLUCA BORDADO' },
  { input: 'Toluca Bordado', expectedId: 4, expectedName: 'TOLUCA BORDADO' },
  { input: 'Toluca', expectedId: 4, expectedName: 'TOLUCA BORDADO' },
  { input: 'Bordado', expectedId: 4, expectedName: 'TOLUCA BORDADO' },
  { input: 'Angel Toluca', expectedId: 3, expectedName: 'TOLUCA ANGEL' },
  { input: 'Toluca Angel', expectedId: 3, expectedName: 'TOLUCA ANGEL' },
  { input: 'Zandunga', expectedId: 12, expectedName: 'ZANDUNGA 1' },
  { input: 'Sandunga', expectedId: 12, expectedName: 'ZANDUNGA 1' },
  { input: 'Zandunga 2', expectedId: 13, expectedName: 'ZANDUNGA 2' },
  { input: 'Sandunga 3', expectedId: 14, expectedName: 'ZANDUNGA 3' },
  { input: 'San Diego', expectedId: 6, expectedName: 'SAN DIEGO 1' },
  { input: 'San Diego 2', expectedId: 8, expectedName: 'SAN DIEGO 2' },
  { input: 'Cosina', expectedId: 10, expectedName: 'COCINA' },
  { input: 'San Martin', expectedId: 10, expectedName: 'COCINA' },
  { input: 'Neza', expectedId: 12, expectedName: 'ZANDUNGA 1' },
  { input: 'Nezahualcoyotl', expectedId: 12, expectedName: 'ZANDUNGA 1' },
  { input: 'Chiconcuac', expectedId: 1, expectedName: 'CHICONCUAC' },
  { input: 'Tulancingo', expectedId: 15, expectedName: 'TULANCINGO' }
];

console.log('=== TEST DE RESOLUCIÓN DE BODEGAS Y DEFAULTS ===\n');
let passed = 0;
for (const tc of testCases) {
  const res = buscarBodega(tc.input);
  const ok = res && res.id === tc.expectedId;
  if (ok) passed++;
  console.log(`${ok ? '✅' : '❌'} Input: "${tc.input}" -> Resuelto: ID ${res?.id} (${res?.nombre}) | Esperado: ID ${tc.expectedId} (${tc.expectedName})`);
}

console.log(`\nResultado: ${passed}/${testCases.length} pruebas pasadas.`);
