// scripts/supabase/tests/test_sku_matcher.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { db: { schema: 'inv-tienda' } }
);

function toCanonicalAlphanumeric(s) {
  return (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function extractMotiTokens(s) {
  const upper = (s || '').toUpperCase();
  const andMatch = upper.match(/AND\s*[-_]?\s*([A-Z0-9]+(?:-[A-Z0-9]+)?)/i);
  const andToken = andMatch ? 'AND' + toCanonicalAlphanumeric(andMatch[1]) : null;

  const secMatch = upper.match(/(1AK|3VT|3JA|1VT)\s*[-_]?\s*(\d+[A-Z0-9\-]*(?:-PLUS)?)/i);
  const secToken = secMatch ? secMatch[1] + toCanonicalAlphanumeric(secMatch[2]) : null;

  return { andToken, secToken };
}

function matchCandidateString(candidate, catalog) {
  if (!candidate) return null;
  const clean = candidate.trim();
  if (!clean) return null;

  const upper = clean.toUpperCase();
  const alpha = toCanonicalAlphanumeric(clean);

  // 1. Coincidencia Exacta directa
  const exact = catalog.find((p) => p.sku_base.trim().toUpperCase() === upper);
  if (exact) return { product: exact, metodo: 'EXACTO_DIRECTO' };

  // 2. Coincidencia reemplazando _ o - por /
  const withSlash = upper.replace(/[_\-]/g, '/');
  const exactSlash = catalog.find((p) => p.sku_base.trim().toUpperCase() === withSlash);
  if (exactSlash) return { product: exactSlash, metodo: 'SEPARADOR_SLASH' };

  // 3. Coincidencia Alfanumérica Canónica
  const exactAlpha = catalog.find((p) => toCanonicalAlphanumeric(p.sku_base) === alpha);
  if (exactAlpha) return { product: exactAlpha, metodo: 'CANONICO_ALFANUMERICO' };

  // 4. Reglas Especiales para Proveedor MOTI
  const moti = extractMotiTokens(clean);
  if (moti.andToken || moti.secToken) {
    if (moti.andToken && moti.secToken) {
      const matchBoth = catalog.find((p) => {
        const pMoti = extractMotiTokens(p.sku_base);
        return pMoti.andToken === moti.andToken && pMoti.secToken === moti.secToken;
      });
      if (matchBoth) return { product: matchBoth, metodo: 'MOTI_AMBOS_TOKENS' };
    }

    if (moti.andToken) {
      const matchesAnd = catalog.filter((p) => {
        const pMoti = extractMotiTokens(p.sku_base);
        return pMoti.andToken === moti.andToken;
      });
      if (matchesAnd.length === 1) {
        return { product: matchesAnd[0], metodo: 'MOTI_TOKEN_AND' };
      }
    }

    if (moti.secToken) {
      const matchesSec = catalog.filter((p) => {
        const pMoti = extractMotiTokens(p.sku_base);
        return (
          pMoti.secToken === moti.secToken ||
          toCanonicalAlphanumeric(p.sku_base) === moti.secToken
        );
      });
      if (matchesSec.length === 1) {
        return { product: matchesSec[0], metodo: 'MOTI_TOKEN_SECUNDARIO' };
      }
    }
  }

  // 5. Desambiguación Letra O vs Número 0
  if (alpha.length >= 4) {
    const oToZero = alpha.replace(/O/g, '0');
    const zeroToO = alpha.replace(/0/g, 'O');
    const matchO0 = catalog.find((p) => {
      const pAlpha = toCanonicalAlphanumeric(p.sku_base);
      return (
        pAlpha.replace(/O/g, '0') === oToZero ||
        pAlpha.replace(/0/g, 'O') === zeroToO
      );
    });
    if (matchO0) return { product: matchO0, metodo: 'CONFUSION_O_CERO' };
  }

  return null;
}

function resolverSkuParaArchivo(filename, catalog) {
  const raw = filename.replace(/\.[^.]+$/, '').trim();
  if (!raw) return { sku: '', es_principal: false, status: 'not_found' };

  let matched = matchCandidateString(raw, catalog);
  let isPrincipal = true;

  if (!matched) {
    const secondaryMatch = raw.match(/[_\-\s]+([2-9]|\d{2,}|back|espalda|detalle|costado|side|box|caja)$/i);
    const primarySuffixMatch = raw.match(/[_\-\s]+(1|01|\(1\)|frente|delantera|principal)$/i);

    if (secondaryMatch && secondaryMatch.index !== undefined) {
      isPrincipal = false;
      const stripped = raw.slice(0, secondaryMatch.index).trim();
      matched = matchCandidateString(stripped, catalog);
    } else if (primarySuffixMatch && primarySuffixMatch.index !== undefined) {
      isPrincipal = true;
      const stripped = raw.slice(0, primarySuffixMatch.index).trim();
      matched = matchCandidateString(stripped, catalog);
    }
  } else {
    const secSuffix = raw.match(/[_\-\s]+([2-9]|back|espalda|detalle|costado|side|box|caja)$/i);
    if (secSuffix && !matched.product.sku_base.endsWith(raw.slice(-2))) {
      isPrincipal = false;
    }
  }

  if (matched) {
    return {
      productoId: matched.product.id,
      sku: matched.product.sku_base.trim(),
      productoNombre: matched.product.nombre,
      es_principal: isPrincipal,
      status: 'detected',
      metodo: matched.metodo,
    };
  }

  return {
    sku: raw.replace(/[_\-]/g, '/').replace(/\s+/g, ' ').toUpperCase(),
    es_principal: false,
    status: 'not_found',
  };
}

async function runTests() {
  console.log('--- Probando Motor Híbrido de SKUs ---');
  const { data: catalog, error } = await supabase
    .from('productos')
    .select('id, sku_base, nombre')
    .eq('activo', true);

  if (error || !catalog) {
    console.error('Error cargando catálogo:', error);
    process.exit(1);
  }

  console.log(`Catálogo cargado: ${catalog.length} productos activos.`);

  const testCases = [
    // Casos de la captura del usuario (BO26 / Bonnie)
    { file: 'BO26_01MSTFE.jpg', expectedSku: 'BO26/01MSTFE', expectedPrincipal: true },
    { file: 'BO26_02MSTFE.jpg', expectedSku: 'BO26/02MSTFE', expectedPrincipal: true },
    { file: 'BO26_04MSTFE.jpg', expectedSku: 'BO26/04MSTFE', expectedPrincipal: true },
    { file: 'BO26_07MSTFE.jpg', expectedSku: 'BO26/07MSTFE', expectedPrincipal: true },
    { file: 'BO26_08MSTFE.jpg', expectedSku: 'BO26/08MSTFE', expectedPrincipal: true },
    { file: 'BO26_10MSTFE.jpg', expectedSku: 'BO26/10MSTFE', expectedPrincipal: true },
    { file: 'BO26_15MSTLYC.jpg', expectedSku: 'BO26/15MSTLYC', expectedPrincipal: true },
    { file: 'BO26_16MSTLYC.jpg', expectedSku: 'BO26/16MSTLYC', expectedPrincipal: true },

    // Caso sin separador
    { file: 'BO2601MSTFE.jpg', expectedSku: 'BO26/01MSTFE', expectedPrincipal: true },
    { file: 'BO2602MSTFE.jpg', expectedSku: 'BO26/02MSTFE', expectedPrincipal: true },

    // Casos con fotos secundarias
    { file: 'BO26_01MSTFE_1.jpg', expectedSku: 'BO26/01MSTFE', expectedPrincipal: true },
    { file: 'BO26_01MSTFE_2.jpg', expectedSku: 'BO26/01MSTFE', expectedPrincipal: false },
    { file: 'BO26_01MSTFE_back.jpg', expectedSku: 'BO26/01MSTFE', expectedPrincipal: false },

    // Casos MOTI con espacios, guiones y tokens secundarios (3VT, 3JA, 1AK, AND)
    { file: '3VT8232.jpg', expectedSku: '3VT8232', expectedPrincipal: true },
    { file: '3VT 8232.jpg', expectedSku: '3VT8232', expectedPrincipal: true },
    { file: '1AK7663.jpg', expectedSku: '1AK7663', expectedPrincipal: true },
    { file: '1AK 7663.jpg', expectedSku: '1AK7663', expectedPrincipal: true },
    { file: '3JA8075.jpg', expectedSku: '3JA8075', expectedPrincipal: true },
    { file: '3JA 8075.jpg', expectedSku: '3JA8075', expectedPrincipal: true },
    { file: 'AND-CLS-12.jpg', expectedSku: 'AND-CLS-12', expectedPrincipal: true },
    { file: 'AND_CLS_12.jpg', expectedSku: 'AND-CLS-12', expectedPrincipal: true },
    { file: 'AND CLS 12.jpg', expectedSku: 'AND-CLS-12', expectedPrincipal: true },
    { file: '1AK4830-1.jpg', expectedSku: '1AK4830-1', expectedPrincipal: true },
    { file: '1AK4830_1.jpg', expectedSku: '1AK4830-1', expectedPrincipal: true },
    { file: 'AND260007 1AK7986.jpg', expectedSku: 'AND260007 1AK7986', expectedPrincipal: true },
    { file: 'AND260007_1AK7986.jpg', expectedSku: 'AND260007 1AK7986', expectedPrincipal: true },
    { file: 'AND260007.jpg', expectedSku: 'AND260007 1AK7986', expectedPrincipal: true },
    { file: '1AK7986.jpg', expectedSku: 'AND260007 1AK7986', expectedPrincipal: true },
    { file: 'AND250015_3VT7130-PLUS.jpg', expectedSku: 'AND250015 /3VT7130-PLUS', expectedPrincipal: true },
    { file: '3VT7130-PLUS.jpg', expectedSku: 'AND250015 /3VT7130-PLUS', expectedPrincipal: true },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const res = resolverSkuParaArchivo(tc.file, catalog);
    const skuOk = res.sku === tc.expectedSku;
    const princOk = res.es_principal === tc.expectedPrincipal;
    const isOk = skuOk && princOk && res.status === 'detected';

    if (isOk) {
      console.log(`✅ [OK] ${tc.file} -> ${res.sku} (Principal: ${res.es_principal}) [${res.metodo}]`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${tc.file} -> Obtenido: ${res.sku} (Principal: ${res.es_principal}), Esperado: ${tc.expectedSku} (Principal: ${tc.expectedPrincipal})`);
      failed++;
    }
  }

  console.log(`\nResultados: ${passed} pasadas, ${failed} fallidas de ${testCases.length} pruebas.`);
  if (failed > 0) process.exit(1);
}

runTests();
