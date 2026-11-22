// lib/inventario/sku-matcher.ts
//
// Motor puro de cruce y desambiguación de SKUs OCR contra catálogo × proveedores.
// Sin dependencias de React, Supabase ni variables de entorno (compartible con n8n).

import { compactarSkuOcr, normalizarSku } from './sku-ocr'

export interface CatalogoSkuItem {
  id: number
  sku_base: string
  descripcion: string | null
  pz_en_caja: number | null
  familia: string | null
  persona_id: number | null
  proveedor_nombre?: string | null
  proveedor_prefijo?: string | null
}

export interface DescSignals {
  gender: 'F' | 'M' | 'B' | 'G' | 'U' | null
  garment:
    | 'CHAMARRA'
    | 'CHALECO'
    | 'SUDADERA'
    | 'SUETER'
    | 'ABRIGO'
    | 'GABARDINA'
    | 'ROMPE'
    | 'SET'
    | 'CAMISA'
    | null
  pz: number | null
  words: string[]
}

export interface PartesSku {
  p1: string
  p2: string
  hasSep: boolean
}

export interface CatalogoSkuIndexado extends CatalogoSkuItem {
  sku_compacto: string
  sku_alnum: string
  desc_norm: string
  tokens: string[]
  tokens_alnum: string[]
  partes_por_token: PartesSku[]
  desc_sig: DescSignals
  prefijo_raiz: string
}

export interface MatchCandidatoOcr {
  producto_id: number
  sku_base: string
  descripcion: string | null
  pz_en_caja: number | null
  familia: string | null
  proveedor_nombre: string | null
  score: number
  metodo: string
  razon: string
  diff_indices: number[]
  decider_prob?: number | null
}

export interface PrefijoSerieSugerido {
  prefijo: string
  total: number
  ejemplos: CatalogoSkuItem[]
}

export interface ResultadoMatchLineaOcr {
  estilo_compacto: string
  estado: 'EXACTO' | 'PROPUESTA_ALTA' | 'AMBIGUO' | 'SIN_COINCIDENCIA'
  necesita_decider: boolean
  top: MatchCandidatoOcr | null
  candidatos: MatchCandidatoOcr[]
  por_prefijo: PrefijoSerieSugerido[]
}

// Matriz simétrica de confusiones reales en caligrafía de bodega.
const OCR_PAIRS: Array<[string, string, number]> = [
  ['0', 'O', 0.20], ['0', 'D', 0.25], ['O', 'D', 0.25], ['0', 'Q', 0.25], ['O', 'Q', 0.25],
  ['U', 'V', 0.20], ['U', 'O', 0.35], ['U', '0', 0.35], ['U', 'C', 0.35],
  ['M', 'H', 0.25], ['H', 'N', 0.35], ['M', 'N', 0.35],
  ['A', 'N', 0.35], ['A', '4', 0.30], ['A', 'V', 0.35],
  ['S', '5', 0.20], ['S', 'I', 0.35], ['S', 'B', 0.40], ['5', 'B', 0.35],
  ['B', '8', 0.25], ['8', 'P', 0.40],
  ['1', 'I', 0.20], ['1', 'L', 0.25], ['1', '7', 0.35], ['I', 'L', 0.25],
  ['2', '7', 0.35], ['2', 'Z', 0.25],
  ['C', 'G', 0.35], ['C', 'W', 0.35], ['G', '6', 0.30],
  ['J', 'Y', 0.30], ['T', '7', 0.30], ['F', 'E', 0.35],
  ['D', 'N', 0.35], ['P', 'R', 0.35], ['K', 'R', 0.40], ['E', '3', 0.35], ['L', 'C', 0.40],
]

const SUB_COST = new Map<string, number>()
for (const [a, b, c] of OCR_PAIRS) {
  SUB_COST.set(a + b, c)
  SUB_COST.set(b + a, c)
}

const STOP_WORDS_DESC = new Set([
  'CHAM', 'CHAMARRA', 'DAMA', 'MUJER', 'CAB', 'CABALLERO', 'HOMBRE', 'NINO', 'NINA',
  'PARA', 'TIPO', 'CON', 'GORRO', 'INTERIOR', 'MARCA', 'IDOL', 'NAVY', 'GREENFIELD',
  'BULLSTAFF', 'AMERICAN', 'NICE', 'TORONTO', 'UTILITY', 'BORDADO', 'ACOLCHADA',
  'COLORES', 'BASICA', 'TALLAS', 'LARGA', 'CORTA', 'CHALECO', 'SUDADERA', 'SUETER',
  'ABRIGO', 'GABARDINA', 'PANTS', 'FELPA', 'LICRA', 'PCS', 'PZS', 'UNISEX',
])

function charCost(ca: string, cb: string): number {
  if (ca === cb) return 0
  const known = SUB_COST.get(ca + cb)
  if (known !== undefined) return known
  // Penalización extra en dígitos distintos no confundibles (ej. 9 vs 6, 4 vs 3)
  if (/\d/.test(ca) && /\d/.test(cb)) return 1.45
  return 1.0
}

// Buffers reutilizables para evitar asignaciones por llamada en distanciaOcrPonderada
const BUF_MAX = 64
let ROLL_A = new Float64Array(BUF_MAX)
let ROLL_B = new Float64Array(BUF_MAX)
let ROLL_C = new Float64Array(BUF_MAX)

/** Distancia Damerau-Levenshtein ponderada con matriz de confusión caligráfica OCR. */
export function distanciaOcrPonderada(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  let prev2 = n + 1 <= BUF_MAX ? ROLL_A : new Float64Array(n + 1)
  let prev1 = n + 1 <= BUF_MAX ? ROLL_B : new Float64Array(n + 1)
  let curr = n + 1 <= BUF_MAX ? ROLL_C : new Float64Array(n + 1)

  for (let j = 0; j <= n; j += 1) prev1[j] = j

  for (let i = 1; i <= m; i += 1) {
    curr[0] = i
    const ca = a[i - 1]
    for (let j = 1; j <= n; j += 1) {
      const cb = b[j - 1]
      let best = Math.min(
        prev1[j] + 1.0,
        curr[j - 1] + 1.0,
        prev1[j - 1] + charCost(ca, cb)
      )
      if (i > 1 && j > 1 && ca === b[j - 2] && a[i - 2] === cb) {
        best = Math.min(best, prev2[j - 2] + 0.5)
      }
      curr[j] = best
    }
    const tmp = prev2
    prev2 = prev1
    prev1 = curr
    curr = tmp
  }
  return prev1[n]
}

/** Divide un código en 2 partes lógicas: por separador (`/` o `-`) o estructura prefijo+modelo. */
export function partirSkuDosPartes(code: string): PartesSku {
  const c = compactarSkuOcr(code)
  const sepIdx = c.search(/[/-]/)
  if (sepIdx > 0 && sepIdx < c.length - 1) {
    return {
      p1: normalizarSku(c.slice(0, sepIdx)),
      p2: normalizarSku(c.slice(sepIdx + 1)),
      hasSep: true,
    }
  }
  const mAnd = c.match(/^([A-Z0-9]{2,3})(\d{6})$/)
  if (mAnd) {
    return { p1: mAnd[1] + mAnd[2].slice(0, 2), p2: mAnd[2].slice(2), hasSep: false }
  }
  const mGen = c.match(/^([A-Z]{1,4}\d{2})(\d{2}[A-Z0-9]*)$/)
  if (mGen) {
    return { p1: mGen[1], p2: mGen[2], hasSep: false }
  }
  return { p1: normalizarSku(c), p2: '', hasSep: false }
}

function extraerTokensCatalogo(sku: string): string[] {
  const c = compactarSkuOcr(sku)
  if (!c) return []
  const tokens = [c]
  const spaceParts = c.split(' ').filter(Boolean)
  if (spaceParts.length > 1) {
    for (const sp of spaceParts) {
      const clean = sp.replace(/^\/+|\/+$/g, '')
      if (clean) tokens.push(clean)
    }
  }
  const slashParts = c.split('/')
  if (
    slashParts.length === 2 &&
    /^(AND\d{5,6}|[13][A-Z]{2}\d{4})/i.test(slashParts[0]) &&
    /^(AND\d{5,6}|[13][A-Z]{2}\d{4})/i.test(slashParts[1])
  ) {
    tokens.push(slashParts[0], slashParts[1])
  }
  return Array.from(new Set(tokens))
}

function normalizarTextoPlano(texto: string | null | undefined): string {
  return String(texto ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function extraerSenalesDescripcion(desc: string | null | undefined): DescSignals {
  const d = normalizarTextoPlano(desc)
  if (!d) return { gender: null, garment: null, pz: null, words: [] }

  const gender: DescSignals['gender'] = /\b(DAMA|MUJER)\b/.test(d)
    ? 'F'
    : /\b(CAB|CABALLERO|HOMBRE)\b/.test(d)
    ? 'M'
    : /\b(NINO|BOY|INFANTIL)\b/.test(d)
    ? 'B'
    : /\b(NINA|GIRL)\b/.test(d)
    ? 'G'
    : /\b(UNISEX)\b/.test(d)
    ? 'U'
    : null

  const garment: DescSignals['garment'] = /\b(CHAM|CHAMARRA|CHAMARRACABALLERO)\b/.test(d)
    ? 'CHAMARRA'
    : /\b(CHALECO)\b/.test(d)
    ? 'CHALECO'
    : /\b(SUDADERA)\b/.test(d)
    ? 'SUDADERA'
    : /\b(SUETER)\b/.test(d)
    ? 'SUETER'
    : /\b(ABRIGO)\b/.test(d)
    ? 'ABRIGO'
    : /\b(GABARDINA)\b/.test(d)
    ? 'GABARDINA'
    : /\b(ROMPE|ROMPEVIENTOS)\b/.test(d)
    ? 'ROMPE'
    : /\b(PANTS|PANTALON|SET)\b/.test(d)
    ? 'SET'
    : /\b(CAMISA|PLAYERA)\b/.test(d)
    ? 'CAMISA'
    : null

  const pzMatch = d.match(/\b(\d{2,3})\s*(?:PCS|PZ|PZS)?\b/)
  const words = d
    .split(/[^A-Z0-9]+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS_DESC.has(w))

  return {
    gender,
    garment,
    pz: pzMatch ? Number(pzMatch[1]) : null,
    words,
  }
}

function extraerPrefijoRaiz(skuCompacto: string): string {
  const slashIdx = skuCompacto.indexOf('/')
  if (slashIdx > 0) return skuCompacto.slice(0, slashIdx + 1)
  const mAnd = skuCompacto.match(/^(AND\d{2})\d+/)
  if (mAnd) return mAnd[1]
  const dashIdx = skuCompacto.indexOf('-')
  if (dashIdx > 0) return skuCompacto.slice(0, dashIdx + 1)
  const mLetras = skuCompacto.match(/^([A-Z]{2,4}\d{2})/)
  if (mLetras) return mLetras[1]
  return skuCompacto.slice(0, Math.min(4, skuCompacto.length))
}

/** Pre-indexa los ~1,075 productos activos para búsqueda y cruce en <5 ms. */
export function indexarCatalogoSku(items: CatalogoSkuItem[]): CatalogoSkuIndexado[] {
  return items.map((item) => {
    const sku_compacto = compactarSkuOcr(item.sku_base)
    const tokens = extraerTokensCatalogo(item.sku_base)
    return {
      ...item,
      sku_compacto,
      sku_alnum: normalizarSku(sku_compacto),
      desc_norm: normalizarTextoPlano(item.descripcion),
      tokens,
      tokens_alnum: tokens.map((t) => normalizarSku(t)),
      partes_por_token: tokens.map((t) => partirSkuDosPartes(t)),
      desc_sig: extraerSenalesDescripcion(item.descripcion),
      prefijo_raiz: extraerPrefijoRaiz(sku_compacto),
    }
  })
}

function alinearDiffIndicesSpan(origen: string, destino: string): number[] {
  const a = origen
  const b = destino
  const m = a.length
  const n = b.length
  if (m === 0) return Array.from({ length: n }, (_, i) => i)
  if (n === 0) return []

  const dp: Float64Array[] = Array.from({ length: m + 1 }, () => new Float64Array(n + 1))
  for (let i = 0; i <= m; i += 1) dp[i][0] = i
  for (let j = 0; j <= n; j += 1) dp[0][j] = j

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const ca = a[i - 1]
      const cb = b[j - 1]
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1.0,
        dp[i][j - 1] + 1.0,
        dp[i - 1][j - 1] + (ca === cb ? 0 : charCost(ca, cb))
      )
    }
  }

  const diff = new Set<number>()
  let i = m
  let j = n
  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      Math.abs(dp[i][j] - (dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : charCost(a[i - 1], b[j - 1])))) < 1e-6
    ) {
      if (a[i - 1] !== b[j - 1]) diff.add(j - 1)
      i -= 1
      j -= 1
    } else if (j > 0 && (i === 0 || Math.abs(dp[i][j] - (dp[i][j - 1] + 1.0)) < 1e-6)) {
      diff.add(j - 1)
      j -= 1
    } else {
      i -= 1
    }
  }
  return Array.from(diff).sort((x, y) => x - y)
}

/**
 * Devuelve los índices en `skuCandidato` que difieren respecto a `ocrCompacto`
 * para resaltado visual en la UI (ej. `AN[D]250009`, `J219/3C[A]C`).
 */
export function calcularDiffIndices(ocrCompacto: string, skuCandidato: string): number[] {
  const a = compactarSkuOcr(ocrCompacto)
  const b = compactarSkuOcr(skuCandidato)
  if (!a || !b || a === b) return []

  // Si el SKU candidato es compuesto ("AND260018 3VT8703"), alinear el token más cercano.
  const bTokens = extraerTokensCatalogo(b)
  if (bTokens.length > 1) {
    const aBase = partirSkuDosPartes(a).hasSep && a.includes('-') ? a.split('-')[0] : a
    let bestTok = b
    let bestNorm = Infinity
    for (const tok of bTokens.slice(1)) {
      const cmp = aBase.length >= 5 && tok.length >= 5 ? aBase : a
      const normDist = distanciaOcrPonderada(cmp, tok) / Math.max(cmp.length, tok.length)
      if (normDist < bestNorm) {
        bestNorm = normDist
        bestTok = tok
      }
    }
    const fullNorm = distanciaOcrPonderada(a, b) / Math.max(a.length, b.length)
    if (bestTok !== b && bestNorm + 0.15 < fullNorm) {
      const offset = b.indexOf(bestTok)
      if (offset >= 0) {
        const cmp = aBase.length >= 5 && bestTok.length >= 5 ? aBase : a
        return alinearDiffIndicesSpan(cmp, bestTok).map((idx) => idx + offset)
      }
    }
  }

  return alinearDiffIndicesSpan(a, b)
}

export interface BuscarCandidatosInput {
  estilo_raw: string
  sku_ia?: string | null
  descripcion_raw?: string | null
  piezas_detectadas?: number | null
  posibles_variantes?: string[] | null
  proveedor_hint?: string | null
}

function sugerirPrefijosSerie(
  estiloCompacto: string,
  topCandidato: MatchCandidatoOcr | null,
  catalogo: CatalogoSkuIndexado[]
): PrefijoSerieSugerido[] {
  const candidatosPref = new Set<string>()
  const raizRaw = extraerPrefijoRaiz(estiloCompacto)
  if (raizRaw.length >= 2) candidatosPref.add(raizRaw)

  if (topCandidato) {
    const raizTop = extraerPrefijoRaiz(compactarSkuOcr(topCandidato.sku_base))
    if (raizTop.length >= 2) candidatosPref.add(raizTop)
  }

  const resultados: PrefijoSerieSugerido[] = []
  for (const pref of candidatosPref) {
    const prefAlnum = normalizarSku(pref)
    const matches = catalogo.filter(
      (item) => item.sku_compacto.startsWith(pref) || (prefAlnum.length >= 4 && item.sku_alnum.startsWith(prefAlnum))
    )
    if (matches.length > 0) {
      resultados.push({
        prefijo: pref,
        total: matches.length,
        ejemplos: matches.slice(0, 5),
      })
    }
  }

  return resultados.sort((a, b) => b.total - a.total).slice(0, 2)
}

const EXACT_LOOKUP_CACHE = new WeakMap<
  CatalogoSkuIndexado[],
  { byAlnum: Map<string, CatalogoSkuIndexado[]> }
>()

function getExactLookupMap(catalogo: CatalogoSkuIndexado[]) {
  let entry = EXACT_LOOKUP_CACHE.get(catalogo)
  if (!entry) {
    const byAlnum = new Map<string, CatalogoSkuIndexado[]>()
    for (const prod of catalogo) {
      if (!prod.sku_alnum) continue
      const list = byAlnum.get(prod.sku_alnum)
      if (list) list.push(prod)
      else byAlnum.set(prod.sku_alnum, [prod])
    }
    entry = { byAlnum }
    EXACT_LOOKUP_CACHE.set(catalogo, entry)
  }
  return entry
}

/**
 * Ejecuta el cruce completo de una línea OCR contra todo el catálogo indexado:
 * exacto O(1) -> exacto de token -> cruce por 2 partes -> distancia ponderada OCR ->
 * token base -> bonus variantes IA -> señales semánticas de descripción y piezas.
 */
export function buscarCandidatosEnCatalogo(
  input: BuscarCandidatosInput,
  catalogo: CatalogoSkuIndexado[],
  limit: number = 5
): ResultadoMatchLineaOcr {
  const estiloCompacto = compactarSkuOcr(input.estilo_raw || input.sku_ia || '')
  const inAlnum = normalizarSku(estiloCompacto)

  if (!estiloCompacto && !input.descripcion_raw) {
    return {
      estilo_compacto: '',
      estado: 'SIN_COINCIDENCIA',
      necesita_decider: false,
      top: null,
      candidatos: [],
      por_prefijo: [],
    }
  }

  // Short-circuit O(1): coincidencia exacta única evita 1,075 matrices Damerau-Levenshtein
  if (inAlnum) {
    const exactHits = getExactLookupMap(catalogo).byAlnum.get(inAlnum)
    if (exactHits && exactHits.length === 1) {
      const prod = exactHits[0]
      const exactCand: MatchCandidatoOcr = {
        producto_id: prod.id,
        sku_base: prod.sku_base,
        descripcion: prod.descripcion,
        pz_en_caja: prod.pz_en_caja,
        familia: prod.familia,
        proveedor_nombre: prod.proveedor_nombre ?? null,
        score: 1.0,
        metodo: 'EXACTO',
        razon: 'EXACTO',
        diff_indices: [],
      }
      return {
        estilo_compacto: estiloCompacto,
        estado: 'EXACTO',
        necesita_decider: false,
        top: exactCand,
        candidatos: [exactCand],
        por_prefijo: [],
      }
    }
  }

  const inParts = partirSkuDosPartes(estiloCompacto)
  const inSig = extraerSenalesDescripcion(input.descripcion_raw)
  const piezasObjetivo =
    input.piezas_detectadas && input.piezas_detectadas > 0
      ? input.piezas_detectadas
      : inSig.pz
  const provHintNorm = normalizarTextoPlano(input.proveedor_hint)

  const variantesIaSet = new Set<string>()
  if (input.sku_ia) {
    const v = normalizarSku(compactarSkuOcr(input.sku_ia))
    if (v && v !== inAlnum) variantesIaSet.add(v)
  }
  for (const vRaw of input.posibles_variantes ?? []) {
    const v = normalizarSku(compactarSkuOcr(vRaw))
    if (v && v !== inAlnum) variantesIaSet.add(v)
  }

  const candidatosRaw: MatchCandidatoOcr[] = []

  for (const prod of catalogo) {
    // 1. Exacto completo
    if (inAlnum && prod.sku_alnum === inAlnum) {
      candidatosRaw.push({
        producto_id: prod.id,
        sku_base: prod.sku_base,
        descripcion: prod.descripcion,
        pz_en_caja: prod.pz_en_caja,
        familia: prod.familia,
        proveedor_nombre: prod.proveedor_nombre ?? null,
        score: 1.0,
        metodo: 'EXACTO',
        razon: 'EXACTO',
        diff_indices: [],
      })
      continue
    }

    let bestScore = 0
    let bestMetodo = 'OCR_EDIT'
    let bestReason = ''

    for (let tIdx = 0; tIdx < prod.tokens_alnum.length; tIdx += 1) {
      const tAlnum = prod.tokens_alnum[tIdx]
      if (!tAlnum) continue

      // 2. Exacto de token en SKU compuesto ("AND260016 3VT8489")
      if (inAlnum && tAlnum === inAlnum) {
        if (0.99 > bestScore) {
          bestScore = 0.99
          bestMetodo = 'EXACTO_TOKEN'
          bestReason = 'EXACTO_TOKEN'
        }
        continue
      }

      // 3. Cruce por 2 partes (cuando ambos tienen separador `/` o `-`)
      const tParts = prod.partes_por_token[tIdx]
      if (inParts.hasSep && tParts.hasSep && inParts.p1 && tParts.p1) {
        const d1 = distanciaOcrPonderada(inParts.p1, tParts.p1)
        const sim1 = Math.max(0, 1 - d1 / Math.max(inParts.p1.length, tParts.p1.length))
        if (sim1 >= 0.60) {
          let sim2 = 0
          if (inParts.p2 && tParts.p2) {
            if (tParts.p2.startsWith(inParts.p2) && inParts.p2.length >= 2) {
              sim2 = 0.85 + 0.09 * (inParts.p2.length / tParts.p2.length)
            } else {
              const d2 = distanciaOcrPonderada(inParts.p2, tParts.p2)
              sim2 = Math.max(0, 1 - d2 / Math.max(inParts.p2.length, tParts.p2.length))
            }
          }
          const combined = (sim1 * 0.50 + sim2 * 0.50) * 0.96
          if (combined > bestScore) {
            bestScore = combined
            bestMetodo = 'CRUCE_2_PARTES'
            bestReason = `PARTES(s1=${sim1.toFixed(2)},s2=${sim2.toFixed(2)})`
          }
        }
      }

      // 4. Edición ponderada OCR sobre token completo
      if (inAlnum && Math.abs(inAlnum.length - tAlnum.length) <= 4) {
        const d = distanciaOcrPonderada(inAlnum, tAlnum)
        const sim = Math.max(0, (1 - d / Math.max(inAlnum.length, tAlnum.length)) * 0.95)
        if (sim > bestScore) {
          bestScore = sim
          bestMetodo = 'OCR_EDIT'
          bestReason = `OCR_EDIT(d=${d.toFixed(2)})`
        }
      }

      // 5. Token base antes del separador ("3UT8703-BOY" -> "3UT8703" contra "3VT8703")
      if (inParts.hasSep && inParts.p1.length >= 6 && tAlnum.length >= 6) {
        const d = distanciaOcrPonderada(inParts.p1, tAlnum)
        const sim = Math.max(0, (1 - d / Math.max(inParts.p1.length, tAlnum.length)) * 0.89)
        if (sim > bestScore) {
          bestScore = sim
          bestMetodo = 'TOKEN_BASE'
          bestReason = `BASE_TOKEN(d=${d.toFixed(2)})`
        }
      }
    }

    // 6. Variante IA exacta en catálogo
    if (
      bestScore < 0.86 &&
      variantesIaSet.size > 0 &&
      (variantesIaSet.has(prod.sku_alnum) || prod.tokens_alnum.some((ta) => variantesIaSet.has(ta)))
    ) {
      bestScore = 0.86
      bestMetodo = 'PROPUESTA_VARIANTE_IA'
      bestReason = 'VARIANTE_IA'
    }

    // 7. Señales semánticas de desempate (descripción, género, prenda, pz/caja, proveedor)
    let finalScore = bestScore
    if (bestScore >= 0.55 && bestScore < 0.99) {
      let boost = 0
      if (inSig.gender && prod.desc_sig.gender) {
        boost += inSig.gender === prod.desc_sig.gender ? 0.035 : -0.04
      }
      if (inSig.garment && prod.desc_sig.garment) {
        boost += inSig.garment === prod.desc_sig.garment ? 0.035 : -0.03
      }
      if (piezasObjetivo && prod.pz_en_caja && piezasObjetivo === prod.pz_en_caja) {
        boost += 0.02
      }
      if (inSig.words.length > 0 && prod.desc_sig.words.length > 0) {
        const overlap = inSig.words.filter((w) =>
          prod.desc_sig.words.some((dw) => dw.includes(w) || w.includes(dw))
        ).length
        if (overlap > 0) boost += Math.min(0.04, overlap * 0.02)
      }
      if (
        provHintNorm &&
        prod.proveedor_nombre &&
        normalizarTextoPlano(prod.proveedor_nombre).includes(provHintNorm)
      ) {
        boost += 0.02
      }
      finalScore = Math.min(0.95, Math.max(0, bestScore + boost))
    }

    finalScore = Number(finalScore.toFixed(4))
    if (finalScore >= 0.60) {
      candidatosRaw.push({
        producto_id: prod.id,
        sku_base: prod.sku_base,
        descripcion: prod.descripcion,
        pz_en_caja: prod.pz_en_caja,
        familia: prod.familia,
        proveedor_nombre: prod.proveedor_nombre ?? null,
        score: finalScore,
        metodo: bestMetodo,
        razon: bestReason,
        diff_indices: calcularDiffIndices(estiloCompacto, prod.sku_base),
      })
    }
  }

  candidatosRaw.sort((a, b) => b.score - a.score || a.producto_id - b.producto_id)
  const candidatos = candidatosRaw.slice(0, limit)
  const top = candidatos[0] ?? null
  const second = candidatos[1] ?? null
  const margin = top ? top.score - (second ? second.score : 0) : 0
  const exactos = candidatosRaw.filter((c) => c.score >= 0.99)
  const countAbove70 = candidatosRaw.filter((c) => c.score >= 0.70).length

  let estado: ResultadoMatchLineaOcr['estado'] = 'SIN_COINCIDENCIA'
  let necesita_decider = false

  if (top && exactos.length === 1 && top.score >= 0.99) {
    estado = 'EXACTO'
    necesita_decider = false
  } else if (
    top &&
    ((top.score >= 0.90 && margin >= 0.08) || (top.score >= 0.70 && countAbove70 === 1))
  ) {
    estado = 'PROPUESTA_ALTA'
    necesita_decider = !(top.score >= 0.93 && margin >= 0.10)
  } else if (top && top.score >= 0.70) {
    estado = 'AMBIGUO'
    necesita_decider = true
  } else {
    estado = 'SIN_COINCIDENCIA'
    necesita_decider = candidatosRaw.length > 0
  }

  return {
    estilo_compacto: estiloCompacto,
    estado,
    necesita_decider,
    top,
    candidatos,
    por_prefijo: sugerirPrefijosSerie(estiloCompacto, top, catalogo),
  }
}

/**
 * Búsqueda instantánea local sobre catálogo cacheado (0 ms):
 * prefijo exacto -> substring en SKU/descripción -> fallback matcher OCR.
 */
export function buscarEnCatalogoLocal(
  term: string,
  catalogo: CatalogoSkuIndexado[],
  limit: number = 15
): CatalogoSkuIndexado[] {
  const clean = term.trim()
  if (!clean) return []

  const termCompact = compactarSkuOcr(clean)
  const termAlnum = normalizarSku(termCompact)
  const words = normalizarTextoPlano(clean).split(/\s+/).filter(Boolean)

  const exactPrefix: CatalogoSkuIndexado[] = []
  const skuContains: CatalogoSkuIndexado[] = []
  const descMatches: CatalogoSkuIndexado[] = []
  const seen = new Set<number>()

  for (const item of catalogo) {
    if (
      item.sku_compacto.startsWith(termCompact) ||
      (termAlnum.length >= 2 && item.sku_alnum.startsWith(termAlnum))
    ) {
      seen.add(item.id)
      exactPrefix.push(item)
    }
  }

  for (const item of catalogo) {
    if (seen.has(item.id)) continue
    if (
      item.sku_compacto.includes(termCompact) ||
      (termAlnum.length >= 2 && item.sku_alnum.includes(termAlnum))
    ) {
      seen.add(item.id)
      skuContains.push(item)
    }
  }

  if (words.length > 0) {
    for (const item of catalogo) {
      if (seen.has(item.id)) continue
      if (words.every((w) => item.desc_norm.includes(w) || item.sku_compacto.includes(w))) {
        seen.add(item.id)
        descMatches.push(item)
      }
    }
  }

  const combined = [...exactPrefix, ...skuContains, ...descMatches].slice(0, limit)

  if (combined.length < 5 && termAlnum.length >= 3) {
    const fuzzy = buscarCandidatosEnCatalogo(
      { estilo_raw: clean, descripcion_raw: clean },
      catalogo,
      limit
    )
    const byId = new Map(catalogo.map((c) => [c.id, c]))
    for (const cand of fuzzy.candidatos) {
      if (cand.score >= 0.60 && !seen.has(cand.producto_id)) {
        const item = byId.get(cand.producto_id)
        if (item) {
          seen.add(item.id)
          combined.push(item)
        }
      }
      if (combined.length >= limit) break
    }
  }

  return combined.slice(0, limit)
}
