// C:\Users\uriel\Downloads\enero 26\archivo2\lib\color-match.ts
// Unica fuente de verdad para limpieza, traduccion EN<->ES y match de colores
// contra cat_colores. Reemplaza los 4 mapas divergentes (prompt n8n,
// modules/ordenes-b2b/actions, modules/cajas/actions, CajaCard).

export interface CatalogColor {
  id: number
  nombre: string
  codigo?: string | null
  nombre_intern?: string | null
}

export type ColorMatchVia =
  | 'nombre_intern'
  | 'codigo'
  | 'nombre'
  | 'normalizado'
  | 'base'
  | 'parcial'
  | null

export interface ColorMatch {
  found: boolean
  id: number | null
  via: ColorMatchVia
  catalog?: CatalogColor
  /** Candidatos generados (raw, EN canonico, ES sugerido) para trazabilidad */
  candidatos: string[]
}

// Variante (ES con typo, abreviatura, otro idioma) -> EN canonico (nombre_intern).
const VARIANTE_A_EN: Record<string, string> = {
  BLACK: 'BLACK', NEGRO: 'BLACK',
  WHITE: 'WHITE', BLANCO: 'WHITE',
  RED: 'RED', ROJO: 'RED',
  NAVY: 'NAVY', MARINO: 'NAVY', 'NAVY BLUE': 'NAVY',
  BLUE: 'BLUE', AZUL: 'BLUE',
  GREY: 'GREY', GRAY: 'GREY', GRIS: 'GREY',
  'DARK GREY': 'DARK GREY', 'DARK GRAY': 'DARK GREY', 'GRIS OSCURO': 'DARK GREY', MARENGO: 'DARK GREY', CHARCOAL: 'DARK GREY',
  'LIGHT GREY': 'LIGHT GREY', 'LIGHT GRAY': 'LIGHT GREY', 'GRIS CLARO': 'LIGHT GREY', OXFORD: 'LIGHT GREY', 'GRIS OXFORD': 'LIGHT GREY',
  ROSE: 'PINK', ROSA: 'PINK', PINK: 'PINK',
  PURPLE: 'PURPLE', MORADO: 'PURPLE', VIOLET: 'PURPLE', PURPURA: 'PURPLE', PURPUPA: 'PURPLE',
  BROWN: 'BROWN', CAFE: 'BROWN', 'CAFÉ': 'BROWN', CHOCOLATE: 'CHOCOLATE', COFFEE: 'BROWN', COCOA: 'BROWN',
  GREEN: 'GREEN', VERDE: 'GREEN', OLIVE: 'OLIVE', OLIVO: 'OLIVE', 'OLIVE GREEN': 'OLIVE',
  MILITARY: 'MILITARY GREEN', ARMY: 'MILITARY GREEN', CAMO: 'MILITARY GREEN',
  'VERDE MILITARY': 'MILITARY GREEN', 'MILITARY GREEN': 'MILITARY GREEN', HUNTER: 'HUNTER GREEN', 'HUNTER GREEN': 'HUNTER GREEN',
  BEIGE: 'BEIGE', 'LT BEIGE': 'LIGHT BEIGE', 'LIGHT BEIGE': 'LIGHT BEIGE', 'BEIGE CLARO': 'LIGHT BEIGE',
  'BEIGE 04': 'BEIGE', LATTE: 'BEIGE', CAMEL: 'BEIGE', CREAM: 'BEIGE', ARENA: 'BEIGE',
  PETROL: 'PETROL', PETROLEO: 'PETROL', 'PETRÓLEO': 'PETROL', PATROL: 'PETROL',
  DENIM: 'DENIM', MEZCLILLA: 'DENIM',
  WINE: 'WINE', VINO: 'WINE', BURGUNDY: 'WINE', 'DK WINE': 'DARK WINE', 'DARK WINE': 'DARK WINE', 'VINO TINTO': 'DARK WINE',
  STONE: 'STONE', PIEDRA: 'STONE',
  YELLOW: 'YELLOW', AMARILLO: 'YELLOW',
  ORANGE: 'ORANGE', NARANJA: 'ORANGE',
  MUSTARD: 'MUSTARD', MOSTAZA: 'MUSTARD',
  KHAKI: 'KHAKI', CAQUI: 'KHAKI', 'D.KHAKI': 'DARK KHAKI', 'DARK KHAKI': 'DARK KHAKI',
  BRONZE: 'BRONZE', BRONCE: 'BRONZE',
  HUESO: 'WHITE', 'OFF WHITE': 'OFF WHITE', 'BLANCO HUESO': 'OFF WHITE',
  // CJK (chino simplificado) -> canonico. Se conservan para no romper packing lists CN.
  '黑色': 'BLACK', '白色': 'WHITE', '红色': 'RED', '藏青': 'NAVY', '藏青色': 'NAVY',
  '灰色': 'GREY', '咖啡': 'BROWN', '咖啡色': 'BROWN',
  'D.BEIGE': 'DARK BEIGE', 'DARK BEIGE': 'DARK BEIGE', 'BEIGE OSCURO': 'DARK BEIGE',
  'PALE ROSE': 'PALE ROSE', 'ROSA PALIDO': 'PALE ROSE', 'ROSA PÁLIDO': 'PALE ROSE',
  SAND: 'SAND', ARENA2: 'SAND',
  'FRENCH ROAST': 'FRENCH ROAST', 'CAFE TOSTADO': 'FRENCH ROAST', 'CAFÉ TOSTADO': 'FRENCH ROAST',
  // Fase 1 orden-rapida: raros BONNIE 18-2026 + typos packing (base limpia via extraerBaseColor).
  MAUVE: 'MAUVE', 'PALE MAUVE': 'PALE MAUVE',
  ETHER: 'ETHER', ETER: 'ETHER',
  MELANGE: 'MELANGE', 'DARK MELANGE': 'DARK MELANGE', 'DK MELANGE': 'DARK MELANGE',
  OCEAN: 'OCEAN', 'DARK OCEAN': 'DARK OCEAN', 'DK OCEAN': 'DARK OCEAN', 'LIGHT OCEAN': 'LIGHT OCEAN',
  'LT OCEAN': 'LIGHT OCEAN',
  'LT OLIVE': 'LIGHT OLIVE', 'LIGHT OLIVE': 'LIGHT OLIVE', 'DARK OLIVE': 'DARK OLIVE',
  PHLOX: 'PHLOX', PLOX: 'PHLOX', 'DARK PHLOX': 'DARK PHLOX', 'DK PHLOX': 'DARK PHLOX',
  'BLUE BELL': 'BLUE BELL', BELL: 'BLUE BELL',
  'BLUE HEAVEN': 'BLUE HEAVEN', 'BLUE HEVEAN': 'BLUE HEAVEN', HEVEAN: 'HEAVEN',
  'RED CHERRY': 'RED CHERRY', CHERRY: 'RED CHERRY', CEREZA: 'RED CHERRY',
  STRAWBERRY: 'STRAWBERRY', STROWBERRY: 'STRAWBERRY', FRESA: 'STRAWBERRY',
  FUCHSIA: 'FUCHSIA', FUSHIA: 'FUCHSIA', FUCSIA: 'FUCHSIA',
  'NIGHT WINE': 'NIGHT WINE', 'NEW WINE': 'NEW WINE',
  FRAMBOISE: 'FRAMBOISE', FRANBOISE: 'FRAMBOISE', FRAMBUESA: 'FRAMBOISE',
  CAPRI: 'CAPRI', BRUSH: 'BRUSH',
}

// EN canonico -> ES display sugerido (para nombre).
const EN_A_ES: Record<string, string> = {
  BLACK: 'NEGRO', WHITE: 'BLANCO', RED: 'ROJO', NAVY: 'MARINO', BLUE: 'AZUL',
  GREY: 'GRIS', 'DARK GREY': 'GRIS OSCURO', 'LIGHT GREY': 'GRIS CLARO',
  PINK: 'ROSA', PURPLE: 'MORADO', BROWN: 'CAFÉ', CHOCOLATE: 'CHOCOLATE', GREEN: 'VERDE', OLIVE: 'OLIVO',
  'MILITARY GREEN': 'VERDE MILITAR', 'HUNTER GREEN': 'VERDE CAZADOR',
  BEIGE: 'BEIGE', 'LIGHT BEIGE': 'BEIGE CLARO', 'DARK BEIGE': 'BEIGE OSCURO',
  'OFF WHITE': 'BLANCO HUESO', PETROL: 'PETRÓLEO', DENIM: 'DENIM',
  WINE: 'VINO', 'DARK WINE': 'VINO TINTO', STONE: 'PIEDRA',
  YELLOW: 'AMARILLO', ORANGE: 'NARANJA', MUSTARD: 'MOSTAZA',
  KHAKI: 'CAQUI', 'DARK KHAKI': 'CAQUI OSCURO', BRONZE: 'BRONCE',
  'PALE ROSE': 'ROSA PÁLIDO', SAND: 'ARENA', 'FRENCH ROAST': 'CAFÉ TOSTADO',
  CAMEL: 'CAMEL', TOBACCO: 'TABACO', COFFEE: 'CAFÉ',
  // Fase 1 orden-rapida: ES sugerido para raros BONNIE (draft limpio del modal).
  MAUVE: 'MALVA', 'PALE MAUVE': 'MALVA PÁLIDO', ETHER: 'ÉTER',
  MELANGE: 'MELANGE', 'DARK MELANGE': 'MELANGE OSCURO',
  OCEAN: 'OCÉANO', 'LIGHT OCEAN': 'OCÉANO CLARO', 'DARK OCEAN': 'OCÉANO OSCURO',
  'LIGHT OLIVE': 'OLIVO CLARO', 'DARK OLIVE': 'OLIVO OSCURO',
  PHLOX: 'FLOX', 'DARK PHLOX': 'FLOX OSCURO',
  'BLUE BELL': 'CAMPANILLA AZUL', 'BLUE HEAVEN': 'CIELO AZUL',
  'RED CHERRY': 'ROJO CEREZA', STRAWBERRY: 'FRESA', FUCHSIA: 'FUCSIA',
  'NIGHT WINE': 'VINO NOCHE', 'NEW WINE': 'VINO NUEVO',
  FRAMBOISE: 'FRAMBUESA', CAPRI: 'CAPRI', BRUSH: 'BRUSH',
}

/** Quita caracteres chinos (CJK unificado + extensiones + kana) y normaliza espacios. */
export function stripChinese(s: string): string {
  // CJK unificado U+4E00-U+9FFF, extension A U+3400-U+4DBF, compatibilidad U+F900-U+FAFF, kana U+3040-U+30FF
  return String(s || '')
    .replace(/[぀-ヿ㐀-䶿一-鿿豈-﫿]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Limpieza base del raw que llega del packing/IA: sin chinos, UPPER, trim. */
export function cleanColorRaw(raw: string): string {
  return stripChinese(raw).toUpperCase().replace(/\s+/g, ' ').trim()
}

/** Normalizado agresivo para comparar (sin acentos, solo A-Z0-9). */
export function normalizeColorKey(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/** Parte compuestos "A/B" o "A Y B" en lados. */
export function splitCompoundColor(raw: string): string[] {
  const clean = cleanColorRaw(raw)
  if (!clean) return []
  if (clean.includes('/')) return clean.split('/').map((p) => p.trim()).filter(Boolean)
  const ySplit = clean.split(/\s+Y\s+/)
  if (ySplit.length === 2) return ySplit
  return [clean]
}

/** Modificadores de intensidad genericos (claro/oscuro). */
export type ModificadorColor = 'LIGHT' | 'DARK' | null

const MOD_ES: Record<Exclude<ModificadorColor, null>, string> = {
  LIGHT: 'CLARO',
  DARK: 'OSCURO',
}

/**
 * Separa un modificador claro/oscuro de la base del color.
 * Soporta prefijos EN (LT, DK, D., L., LIGHT, DARK) y sufijos ES
 * (CLARO/A, OSCURO/A, OBSCURO/A). El punto evita comerse DENIM/DEEP.
 * Ej: "LT BLUE" -> {DARK:null... LIGHT, "BLUE"}, "AZUL OSCURO" -> {DARK, "AZUL"}.
 */
export function separarModificador(raw: string): { mod: ModificadorColor; base: string } {
  let s = cleanColorRaw(raw)
  let mod: ModificadorColor = null
  const pre = s.match(/^(LT|DK|LIGHT|DARK)\s+(.+)$/) || s.match(/^([DL])\.\s*(.+)$/)
  if (pre) {
    const p = pre[1]
    mod = p === 'LT' || p === 'L' || p === 'LIGHT' ? 'LIGHT' : 'DARK'
    s = pre[2].trim()
  } else {
    const suf = s.match(/^(.+?)\s+(CLARO|CLARA|OSCURO|OSCURA|OBSCURO|OBSCURA)$/)
    if (suf) {
      const m = suf[2]
      mod = m === 'CLARO' || m === 'CLARA' ? 'LIGHT' : 'DARK'
      s = suf[1].trim()
    }
  }
  return { mod, base: s }
}

/** EN canonico (llave nombre_intern) para un raw limpio. */
export function canonicalEn(raw: string): string {
  // Directo primero (cubre CJK, que cleanColorRaw eliminaria).
  const direct = VARIANTE_A_EN[String(raw || '').trim().toUpperCase()]
  if (direct) return direct
  const clean = cleanColorRaw(raw)
  const hit = VARIANTE_A_EN[clean]
  if (hit) return hit
  // Modificador generico: compone "LIGHT BLUE" / "DARK GREY".
  const { mod, base } = separarModificador(clean)
  if (mod && base) {
    const baseEn = VARIANTE_A_EN[base] || base
    return `${mod} ${baseEn}`
  }
  return clean
}

/** ES display sugerido (para nombre) a partir del EN canonico o raw. */
export function suggestEs(rawOrEn: string): string {
  const clean = cleanColorRaw(rawOrEn)
  const hit = EN_A_ES[clean]
  if (hit) return hit
  const en = canonicalEn(clean)
  const enHit = EN_A_ES[en]
  if (enHit) return enHit
  // Compone "AZUL CLARO" desde "LIGHT BLUE" (o cualquier base conocida).
  const { mod, base } = separarModificador(en)
  if (mod && base) {
    const baseEs = EN_A_ES[base] || EN_A_ES[VARIANTE_A_EN[base] || ''] || base
    return `${baseEs} ${MOD_ES[mod]}`
  }
  return clean
}

/**
 * Clasifica texto libre de color (input manual de caja):
 * - id numerico existente -> fila catalogo (incluye sugeridos negativos).
 * - resolveColor vs catalogo -> fila catalogo con id real + nombre ES
 *   ("PALE MAUVE 16-1806TPX(120)" -> MALVA PÁLIDO).
 * - sin match -> inerte: se conserva el string, NO se crea fila, NO se
 *   sincroniza a la caja, NO se intenta crear el color, NO bloquea.
 *   El llamador muestra aviso ambar ("BOLOÑESA no se agregó a la caja").
 */
export function clasificarColorLibre(
  texto: string,
  catalogo: CatalogColor[],
): { kind: 'catalogo'; id: number; nombre: string } | { kind: 'inerte'; texto: string } {
  const t = String(texto || '').trim()
  if (!t) return { kind: 'inerte', texto: '' }
  const asId = Number(t)
  if (Number.isInteger(asId)) {
    const c = (catalogo || []).find((x) => x.id === asId)
    if (c) return { kind: 'catalogo', id: c.id, nombre: c.nombre }
  }
  const m = resolveColor(t, catalogo || [])
  if (m.found && typeof m.id === 'number' && m.catalog) {
    return { kind: 'catalogo', id: m.catalog.id, nombre: m.catalog.nombre }
  }
  return { kind: 'inerte', texto: t.toUpperCase() }
}

/** Llave unica de dedup: insensible a case, acentos y espacios extra. */
export function claveColor(raw: string): string {
  return normalizeColorKey(raw)
}

/**
 * Fase 1 orden-rapida: quita el ruido del packing (Pantone, numeros, parentesis)
 * y devuelve la base limpia en MAYUSCULAS para comparar contra DB.
 * Ej: "PALE MAUVE 16-1806TPX(120)" -> "PALE MAUVE", "BLUE BELL119" -> "BLUE BELL",
 * "STROWBERRY(99)" -> "STROWBERRY", "FRANBOISE 90850(57)" -> "FRANBOISE".
 * Si no quedan letras (ej "11321-121") es patron, no color: esPatron=true.
 */
export function extraerBaseColor(raw: string): { base: string; esPatron: boolean } {
  let s = cleanColorRaw(raw)
  if (!s) return { base: '', esPatron: false }
  // Parentesis con digitos: "(120)", "(57)", "(125)", "(47", "127 )".
  s = s.replace(/\([^()]*\d[^()]*\)/g, ' ')
  s = s.replace(/[()]/g, ' ')
  // Pantone/rangos: "16-2111TPG", "16-2111", "19-1623", "14-4210TPX".
  s = s.replace(/\b\d+\s*-\s*\d+[A-Z]*\b/g, ' ')
  // Sufijos de sistema Pantone sueltos.
  s = s.replace(/\b(TPX|TPG|TCX)\b/g, ' ')
  // Tokens alfanumericos tipo codigo: "OTO670113", "22DG02023".
  s = s.replace(/\b\d+[A-Z]+\d*[A-Z0-9]*\b/g, ' ')
  // Numeros sueltos: "49", "114", "90850".
  s = s.replace(/\b\d+\b/g, ' ')
  // Digitos pegados a letras: si la parte de letras es color conocido se conserva
  // ("BELL119" -> "BELL"); si es codigo de fabrica se tira el token ("OTO670113" -> "").
  s = s
    .split(' ')
    .map((tok) => {
      const m = tok.match(/^([A-Z\u00C0-\u00FF]{2,})(\d+)$/)
      if (!m) return tok
      return VARIANTE_A_EN[m[1]] ? m[1] : ''
    })
    .filter(Boolean)
    .join(' ')
  s = s.replace(/[\s/-]+/g, ' ').replace(/^[/\s-]+|[/\s-]+$/g, '').trim()
  if (!s) {
    const teniaLetras = /[A-Z\u00C0-\u00FF]/.test(cleanColorRaw(raw))
    return { base: '', esPatron: !teniaLetras }
  }
  return { base: s, esPatron: false }
}

/** ¿Es patron puro (sin letras)? Ej "11321-121". No va a colores_por_confirmar. */
export function esPatronColor(raw: string): boolean {
  return extraerBaseColor(raw).esPatron
}

/** Marcadores de tela/material que no son color (BONNIE trae FUR en col STYLE). */
const MARCADORES_NO_COLOR = new Set(['FUR'])

/** ¿Debe ignorarse como color (tela, patron)? Nunca bloquea el guardado. */
export function esColorIgnorable(raw: string): boolean {
  const { base, esPatron } = extraerBaseColor(raw)
  if (esPatron) return true
  const k = normalizeColorKey(base || raw)
  return MARCADORES_NO_COLOR.has(k)
}

/**
 * Quita stopwords de cantidad/novedad al inicio ("ALL BLACK" -> "BLACK").
 * Solo fallback nivel 2: el nivel 1 intenta el raw completo primero
 * ("NEW WINE" matchea Vino Nuevo/NEW WINE sin recorte).
 */
export function quitarStopwords(base: string): string {
  const s = String(base || '').trim().replace(/\s+/g, ' ')
  const m = s.match(/^(ALL|NEW)\s+(.+)$/)
  if (m && m[2].trim()) return m[2].trim()
  return s
}

/** Dedup por clave insensible, conservando el primer texto. */
export function dedupPorClave(items: string[]): string[] {
  const vistos = new Set<string>()
  const out: string[] = []
  for (const s of items || []) {
    if (!s) continue
    const k = normalizeColorKey(String(s))
    if (vistos.has(k)) continue
    vistos.add(k)
    out.push(String(s))
  }
  return out
}

/**
 * Filtra el catalogo por texto libre (buscador del modal).
 * Insensible a case/acentos; todos los tokens deben aparecer en
 * nombre+codigo+intern. Sin query devuelve los primeros `limite`.
 */
export function filtrarColoresCatalogo<T extends CatalogColor>(catalogo: T[], query: string, limite = 50): T[] {
  const tokens = String(query || '')
    .split(/\s+/)
    .map((t) => normalizeColorKey(t))
    .filter((t) => t.length > 0)
  if (tokens.length === 0) return (catalogo || []).slice(0, limite)
  return (catalogo || [])
    .filter((c) => {
      const hay = [c.nombre, c.codigo ?? '', c.nombre_intern ?? '']
        .map((s) => normalizeColorKey(s || ''))
        .join(' ')
      return tokens.every((t) => hay.includes(t))
    })
    .slice(0, limite)
}

/**
 * Resuelve un color contra el catalogo activo. Todo en MAYUSCULAS ambos lados.
 * Nivel 1 (auto): nombre ES exacto -> nombre_intern EN exacto -> codigo ->
 *   normalizado (mismo orden), incluyendo tripletes IA (aiEn/aiEs).
 * Nivel 2 (auto, via 'base'): lo mismo sobre la base limpia (sin Pantone/
 *   numeros) y sin stopwords ("MAUVE 16-2111TPG"->Malva, "ALL BLACK"->Negro).
 * Nivel 3 (propone, via 'parcial'): substring >=4 solo sobre nombre
 *   ("CAPRI" sugiere Brisa de Capri; el humano mapea o crea, nunca auto).
 * Los compuestos se resuelven por lados; si algun lado falla, no hay match.
 */
export function resolveColor(
  raw: string,
  catalog: CatalogColor[],
  aiEn?: string | null,
  aiEs?: string | null,
): ColorMatch {
  const clean = cleanColorRaw(raw)
  if (!clean) return { found: false, id: null, via: null, candidatos: [] }
  const aiEnClean = cleanColorRaw(aiEn || '')
  const aiEsClean = String(aiEs || '').trim().toUpperCase()
  const lados = splitCompoundColor(clean)
  // Tripletes IA solo aplican al raw completo (no por lado de compuesto).
  const porLado = lados.length > 1 ? { en: '', es: '' } : { en: aiEnClean, es: aiEsClean }
  const resultados = lados.map((lado) => resolveSingle(lado, catalog, porLado.en, porLado.es))
  if (resultados.every((r) => r.found)) {
    // Compuesto donde todos los lados matchean: devolver el primero con trazabilidad.
    const primero = resultados[0]
    return { ...primero, candidatos: resultados.flatMap((r) => r.candidatos) }
  }
  const simple = resolveSingle(clean, catalog, aiEnClean, aiEsClean)
  return simple
}

interface SetCandidatos {
  ENs: string[]
  ESs: string[]
  RAWs: string[]
}

function uniqStr(items: Array<string | null | undefined>): string[] {
  return Array.from(new Set((items || []).map((s) => String(s || '').trim()).filter(Boolean)))
}

/** Match exacto + normalizado en el orden acordado; null si no hay. */
function matchExactoNormalizado(
  sets: SetCandidatos,
  catalog: CatalogColor[],
): { via: ColorMatchVia; catalog: CatalogColor } | null {
  const normENs = sets.ENs.map(normalizeColorKey)
  const normESs = sets.ESs.map(normalizeColorKey)
  const normRAWs = sets.RAWs.map(normalizeColorKey)
  // 1) nombre ES exacto
  const byNombre = catalog.find((c) => {
    const n = cleanColorRaw(c.nombre || '')
    return sets.ESs.includes(n) || sets.RAWs.includes(n)
  })
  if (byNombre) return { via: 'nombre', catalog: byNombre }
  // 2) nombre_intern EN exacto (rescata lo mal traducido)
  const byIntern = catalog.find((c) => sets.ENs.includes(cleanColorRaw(c.nombre_intern || '')))
  if (byIntern) return { via: 'nombre_intern', catalog: byIntern }
  // 3) codigo exacto
  const byCodigo = catalog.find((c) => {
    const cd = cleanColorRaw(c.codigo || '')
    return sets.RAWs.includes(cd) || sets.ENs.includes(cd)
  })
  if (byCodigo) return { via: 'codigo', catalog: byCodigo }
  // 4) normalizado, en el mismo orden de prioridad
  const normNombre = catalog.find((c) =>
    [...normESs, ...normRAWs].some((nc) => nc && normalizeColorKey(c.nombre || '') === nc),
  )
  if (normNombre) return { via: 'normalizado', catalog: normNombre }
  const normIntern = catalog.find((c) =>
    normENs.some((nc) => nc && normalizeColorKey(c.nombre_intern || '') === nc),
  )
  if (normIntern) return { via: 'normalizado', catalog: normIntern }
  const normCodigo = catalog.find((c) =>
    [...normRAWs, ...normENs].some((nc) => nc && normalizeColorKey(c.codigo || '') === nc),
  )
  if (normCodigo) return { via: 'normalizado', catalog: normCodigo }
  return null
}

function resolveSingle(clean: string, catalog: CatalogColor[], aiEn = '', aiEs = ''): ColorMatch {
  const en = canonicalEn(clean)
  const es = suggestEs(en)
  const primario: SetCandidatos = {
    ENs: uniqStr([en, aiEn]),
    ESs: uniqStr([es, aiEs]),
    RAWs: uniqStr([clean]),
  }
  const candidatos = Array.from(new Set([...primario.RAWs, ...primario.ENs, ...primario.ESs]))

  // Nivel 1: raw completo + tripletes IA.
  const hit1 = matchExactoNormalizado(primario, catalog)
  if (hit1) return { found: true, id: hit1.catalog.id, via: hit1.via, catalog: hit1.catalog, candidatos }

  // Nivel 2: base limpia (sin Pantone/numeros) y sin stopwords.
  const { base, esPatron } = extraerBaseColor(clean)
  if (!esPatron) {
    const sinStop = quitarStopwords(base)
    const bases = uniqStr([base, sinStop].filter((b) => b && b !== clean))
    if (bases.length > 0) {
      const ENs: string[] = []
      const ESs: string[] = []
      for (const b of bases) {
        const e = canonicalEn(b)
        if (e) ENs.push(e)
        const s = suggestEs(e || b)
        if (s) ESs.push(s)
      }
      const hit2 = matchExactoNormalizado({ ENs: uniqStr(ENs), ESs: uniqStr(ESs), RAWs: bases }, catalog)
      candidatos.push(...bases, ...ENs, ...ESs)
      if (hit2) {
        return {
          found: true,
          id: hit2.catalog.id,
          via: 'base',
          catalog: hit2.catalog,
          candidatos: Array.from(new Set(candidatos)),
        }
      }
    }
  }

  // Nivel 3: parcial >=4, solo sobre nombre (sugiere, no auto-mapea).
  const normCandidatos = Array.from(new Set(candidatos.map(normalizeColorKey)))
  if (clean.length >= 4) {
    const partial = catalog.find((c) => {
      const n = normalizeColorKey(c.nombre || '')
      return normCandidatos.some((nc) => nc.length >= 4 && (n.includes(nc) || nc.includes(n)))
    })
    if (partial) return { found: true, id: partial.id, via: 'parcial', catalog: partial, candidatos }
  }
  return { found: false, id: null, via: null, candidatos }
}

const HEX_POR_NOMBRE: Record<string, string> = {
  ROJO: '#FF0000', AZUL: '#0000FF', VERDE: '#00FF00', AMARILLO: '#FFFF00',
  BLANCO: '#FFFFFF', NEGRO: '#000000', GRIS: '#808080', NARANJA: '#FFA500',
  ROSA: '#FFC0CB', MORADO: '#800080', VINO: '#800000', CAFE: '#8B4513',
  BEIGE: '#F5F5DC', MARINO: '#000080', MOSTAZA: '#FFDB58', OLIVO: '#808000',
  MILITAR: '#4B5320', CAZADOR: '#355E3B', PIEDRA: '#928E85', DENIM: '#1560BD',
  PETROLEO: '#005F6B', TABACO: '#9A6A3B', CAMEL: '#C19A6B',
  // Fase 2: HEX verificados via api.color.pizza (match exacto similarity 1).
  MALVA: '#E0B0FF', ETER: '#98B2B4', ÉTER: '#98B2B4', ARENA: '#E2CA76',
  OCEANO: '#005493', OCÉANO: '#005493', FRESA: '#FB2943', FUCSIA: '#ED0DD9',
  FRAMBUESA: '#B00149', FLOX: '#DF00FF', CAPRI: '#00BFFF', BRUSH: '#B99684',
}

/**
 * Fase 2: HEX de biblioteca para un nombre ES (null si no hay match:
 * el llamador decide API o negro #000000 para no trabar).
 */
export function hexBiblioteca(nombreEs: string): string | null {
  const norm = cleanColorRaw(nombreEs)
  if (!norm) return null
  for (const [key, h] of Object.entries(HEX_POR_NOMBRE)) {
    if (norm.includes(key)) return h
  }
  return null
}

/** Infiere codigo/hex/tipo para crear un color (misma regla que ColorCombobox). */
export function inferirCodigoHexTipo(nombreEs: string): { codigo: string; hex_code: string; tipo: string } {
  const norm = cleanColorRaw(nombreEs)
  let codigo = norm.replace(/[^A-Z]/g, '').slice(0, 3)
  if (codigo.length < 2) codigo = 'COL'
  const palabras = norm.split(' ')
  if (palabras.length > 1) codigo = palabras.map((p) => p[0]).join('').slice(0, 3)
  // Fase 2: biblioteca primero; negro #000000 solo si no hay match (no traba).
  const hex = hexBiblioteca(norm) ?? '#000000'
  let tipo = 'SOLIDO'
  if (norm.includes('ESTAMPADO') || norm.includes('CAMUFLAJE') || norm.includes('LEOPARDO')) tipo = 'ESTAMPADO'
  else if (norm.includes('MEZCLA') || norm.includes('HEATHER') || norm.includes('MELANGE')) tipo = 'MEZCLA'
  else if (norm.includes('REFLECTANTE')) tipo = 'REFLECTANTE'
  else if (norm.includes('/')) tipo = 'DOBLE'
  if (tipo === 'DOBLE' && norm.includes('/')) {
    const partes = norm.split('/')
    if (partes.length === 2) {
      codigo = `${partes[0].trim().replace(/[^A-Z]/g, '').slice(0, 3)}-${partes[1].trim().replace(/[^A-Z]/g, '').slice(0, 3)}`
    }
  }
  return { codigo, hex_code: hex, tipo }
}

/** Borrador para el modal de creacion: ES + EN + codigo/hex/tipo sugeridos. */
export function buildColorDraft(raw: string, aiEn?: string | null, aiEs?: string | null): {
  raw: string
  nombre: string
  nombre_intern: string
  codigo: string
  hex_code: string
  tipo_color: string
} {
  const clean = cleanColorRaw(raw)
  // Fase 1: prefill sobre la base limpia (sin Pantone/numeros), no el raw sucio.
  const { base } = extraerBaseColor(clean)
  const baseLimpia = quitarStopwords(base || clean) || clean
  const en = cleanColorRaw(aiEn || '') || canonicalEn(baseLimpia)
  const es = (aiEs || '').trim().toUpperCase() || suggestEs(en)
  const sug = inferirCodigoHexTipo(es)
  return { raw: clean, nombre: es, nombre_intern: en, codigo: sug.codigo, hex_code: sug.hex_code, tipo_color: sug.tipo }
}
