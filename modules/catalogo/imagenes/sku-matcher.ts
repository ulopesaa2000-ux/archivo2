// modules/catalogo/imagenes/sku-matcher.ts

export interface SkuCatalogProduct {
  id: number
  sku_base: string
  nombre: string | null
}

export interface MatchResult {
  productoId?: number
  sku: string
  productoNombre?: string
  es_principal: boolean
  tienePrincipalActual?: boolean
  status: 'detected' | 'not_found'
  metodo?: string
}

/** Limpia y normaliza a solo caracteres alfanuméricos en mayúsculas (sin /, -, _, espacios) */
export function toCanonicalAlphanumeric(s: string): string {
  return (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Extrae tokens de proveedor MOTI:
 * - Token principal: AND seguido de dígitos o identificador (ej: AND260007, AND-CLS-12, AND 250015)
 * - Token secundario: 1AK, 3VT, 3JA, 1VT seguido de números (ej: 1AK7986, 3VT7138, 3JA7975, 3VT7130-PLUS)
 * Tolera espacios y guiones entre el prefijo y los números.
 */
export function extractMotiTokens(s: string): { andToken: string | null; secToken: string | null } {
  const upper = (s || '').toUpperCase()

  // Match AND token: ej. AND260007, AND-CLS-12, AND 250015, AND_CLS_12
  const andMatch = upper.match(/AND\s*[-_]?\s*([A-Z0-9]+(?:-[A-Z0-9]+)?)/i)
  const andToken = andMatch ? 'AND' + toCanonicalAlphanumeric(andMatch[1]) : null

  // Match token secundario MOTI: 1AK, 3VT, 3JA, 1VT
  const secMatch = upper.match(/(1AK|3VT|3JA|1VT)\s*[-_]?\s*(\d+[A-Z0-9\-]*(?:-PLUS)?)/i)
  const secToken = secMatch ? secMatch[1] + toCanonicalAlphanumeric(secMatch[2]) : null

  return { andToken, secToken }
}

/**
 * Intenta emparejar una cadena dada contra el catálogo de productos usando múltiples capas.
 */
function matchCandidateString(
  candidate: string,
  catalog: SkuCatalogProduct[]
): { product: SkuCatalogProduct; metodo: string } | null {
  if (!candidate) return null

  const clean = candidate.trim()
  if (!clean) return null

  const upper = clean.toUpperCase()
  const alpha = toCanonicalAlphanumeric(clean)

  // 1. Coincidencia Exacta directa
  const exact = catalog.find((p) => p.sku_base.trim().toUpperCase() === upper)
  if (exact) return { product: exact, metodo: 'EXACTO_DIRECTO' }

  // 2. Coincidencia reemplazando _ o - por / (ej: BO26_01MSTFE -> BO26/01MSTFE)
  const withSlash = upper.replace(/[_\-]/g, '/')
  const exactSlash = catalog.find((p) => p.sku_base.trim().toUpperCase() === withSlash)
  if (exactSlash) return { product: exactSlash, metodo: 'SEPARADOR_SLASH' }

  // 3. Coincidencia Alfanumérica Canónica (resuelve archivos SIN separador: BO2601MSTFE == BO26/01MSTFE)
  const exactAlpha = catalog.find((p) => toCanonicalAlphanumeric(p.sku_base) === alpha)
  if (exactAlpha) return { product: exactAlpha, metodo: 'CANONICO_ALFANUMERICO' }

  // 4. Reglas Especiales para Proveedor MOTI (3VT, 3JA, 1AK, 1VT, AND, con o sin espacios)
  const moti = extractMotiTokens(clean)
  if (moti.andToken || moti.secToken) {
    // 4a. Si el archivo incluye ambos tokens (ej: AND260007 1AK7986 o AND250015_3VT7130-PLUS)
    if (moti.andToken && moti.secToken) {
      const matchBoth = catalog.find((p) => {
        const pMoti = extractMotiTokens(p.sku_base)
        return pMoti.andToken === moti.andToken && pMoti.secToken === moti.secToken
      })
      if (matchBoth) return { product: matchBoth, metodo: 'MOTI_AMBOS_TOKENS' }
    }

    // 4b. Si el archivo solo incluye el token AND (ej: AND260007.jpg o AND CLS 12.jpg)
    if (moti.andToken) {
      const matchesAnd = catalog.filter((p) => {
        const pMoti = extractMotiTokens(p.sku_base)
        return pMoti.andToken === moti.andToken
      })
      if (matchesAnd.length === 1) {
        return { product: matchesAnd[0], metodo: 'MOTI_TOKEN_AND' }
      }
    }

    // 4c. Si el archivo solo incluye el token secundario (ej: 1AK7986.jpg, 3VT 8232.jpg, 3JA8075.jpg)
    if (moti.secToken) {
      const matchesSec = catalog.filter((p) => {
        const pMoti = extractMotiTokens(p.sku_base)
        return (
          pMoti.secToken === moti.secToken ||
          toCanonicalAlphanumeric(p.sku_base) === moti.secToken
        )
      })
      if (matchesSec.length === 1) {
        return { product: matchesSec[0], metodo: 'MOTI_TOKEN_SECUNDARIO' }
      }
    }
  }

  // 5. Desambiguación Letra O vs Número 0 (ej: B026 vs BO26)
  if (alpha.length >= 4) {
    const oToZero = alpha.replace(/O/g, '0')
    const zeroToO = alpha.replace(/0/g, 'O')
    const matchO0 = catalog.find((p) => {
      const pAlpha = toCanonicalAlphanumeric(p.sku_base)
      return (
        pAlpha.replace(/O/g, '0') === oToZero ||
        pAlpha.replace(/0/g, 'O') === zeroToO
      )
    })
    if (matchO0) return { product: matchO0, metodo: 'CONFUSION_O_CERO' }
  }

  return null
}

/**
 * Resuelve el mejor SKU para un nombre de archivo de imagen.
 *
 * Flujo de ejecución:
 * 1. Limpieza de extensión.
 * 2. Prueba coincidencia directa con el nombre completo (protege códigos que terminan en -1 como 1AK4830-1).
 * 3. Si no coincide, analiza sufijos fotográficos (_1, _2, (1), (2), _back, _frente, etc.) y reintenta con la base.
 * 4. Infiere inteligentemente si debe ser marcada como principal (`es_principal = true/false`).
 */
export function resolverSkuParaArchivo(
  filename: string,
  catalog: SkuCatalogProduct[]
): MatchResult {
  const raw = filename.replace(/\.[^.]+$/, '').trim()
  if (!raw) {
    return { sku: '', es_principal: false, status: 'not_found' }
  }

  // Paso A: Probar con el nombre completo primero
  let matched = matchCandidateString(raw, catalog)
  let isPrincipal = true

  // Paso B: Si no hizo match directo, comprobar si tiene sufijos fotográficos
  if (!matched) {
    // Sufijos secundarios: _2, _3, (2), _back, _espalda, _detalle, _costado, _side, _box, _caja
    const secondaryMatch = raw.match(
      /[_\-\s]+([2-9]|\d{2,}|back|espalda|detalle|costado|side|box|caja)$/i
    )
    // Sufijos principales: _1, _01, (1), _frente, _delantera, _principal
    const primarySuffixMatch = raw.match(
      /[_\-\s]+(1|01|\(1\)|frente|delantera|principal)$/i
    )

    if (secondaryMatch && secondaryMatch.index !== undefined) {
      isPrincipal = false
      const stripped = raw.slice(0, secondaryMatch.index).trim()
      matched = matchCandidateString(stripped, catalog)
    } else if (primarySuffixMatch && primarySuffixMatch.index !== undefined) {
      isPrincipal = true
      const stripped = raw.slice(0, primarySuffixMatch.index).trim()
      matched = matchCandidateString(stripped, catalog)
    }
  } else {
    // Si hizo match directo, comprobar si el nombre del archivo contiene un sufijo secundario
    // que NO pertenezca al SKU real de la base de datos (ej: BO26_01MSTFE_2 vs BO26/01MSTFE)
    const secSuffix = raw.match(/[_\-\s]+([2-9]|back|espalda|detalle|costado|side|box|caja)$/i)
    if (secSuffix && !matched.product.sku_base.endsWith(raw.slice(-2))) {
      isPrincipal = false
    }
  }

  if (matched) {
    const cleanSku = matched.product.sku_base.trim()
    return {
      productoId: matched.product.id,
      sku: cleanSku,
      productoNombre: matched.product.nombre ?? undefined,
      es_principal: isPrincipal,
      status: 'detected',
      metodo: matched.metodo,
    }
  }

  // Fallback: SKU limpio con sugerencia de formato para corrección manual
  const fallbackSku = raw
    .replace(/[_\-]/g, '/')
    .replace(/\s+/g, ' ')
    .toUpperCase()

  return {
    sku: fallbackSku,
    es_principal: false,
    status: 'not_found',
  }
}
