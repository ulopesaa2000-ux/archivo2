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
  BROWN: 'BROWN', CAFE: 'BROWN', 'CAFÉ': 'BROWN', CHOCOLATE: 'BROWN', COFFEE: 'BROWN', COCOA: 'BROWN',
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
  'D.BEIGE': 'DARK BEIGE', 'DARK BEIGE': 'DARK BEIGE', 'BEIGE OSCURO': 'DARK BEIGE',
  'PALE ROSE': 'PALE ROSE', 'ROSA PALIDO': 'PALE ROSE', 'ROSA PÁLIDO': 'PALE ROSE',
  SAND: 'SAND', ARENA2: 'SAND',
  'FRENCH ROAST': 'FRENCH ROAST', 'CAFE TOSTADO': 'FRENCH ROAST', 'CAFÉ TOSTADO': 'FRENCH ROAST',
}

// EN canonico -> ES display sugerido (para nombre).
const EN_A_ES: Record<string, string> = {
  BLACK: 'NEGRO', WHITE: 'BLANCO', RED: 'ROJO', NAVY: 'MARINO', BLUE: 'AZUL',
  GREY: 'GRIS', 'DARK GREY': 'GRIS OSCURO', 'LIGHT GREY': 'GRIS CLARO',
  PINK: 'ROSA', PURPLE: 'MORADO', BROWN: 'CAFÉ', GREEN: 'VERDE', OLIVE: 'OLIVO',
  'MILITARY GREEN': 'VERDE MILITAR', 'HUNTER GREEN': 'VERDE CAZADOR',
  BEIGE: 'BEIGE', 'LIGHT BEIGE': 'BEIGE CLARO', 'DARK BEIGE': 'BEIGE OSCURO',
  'OFF WHITE': 'BLANCO HUESO', PETROL: 'PETRÓLEO', DENIM: 'DENIM',
  WINE: 'VINO', 'DARK WINE': 'VINO TINTO', STONE: 'PIEDRA',
  YELLOW: 'AMARILLO', ORANGE: 'NARANJA', MUSTARD: 'MOSTAZA',
  KHAKI: 'CAQUI', 'DARK KHAKI': 'CAQUI OSCURO', BRONZE: 'BRONCE',
  'PALE ROSE': 'ROSA PÁLIDO', SAND: 'ARENA', 'FRENCH ROAST': 'CAFÉ TOSTADO',
  CAMEL: 'CAMEL', TOBACCO: 'TABACO', COFFEE: 'CAFÉ',
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

/** EN canonico (llave nombre_intern) para un raw limpio. */
export function canonicalEn(raw: string): string {
  const clean = cleanColorRaw(raw)
  return VARIANTE_A_EN[clean] || clean
}

/** ES display sugerido (para nombre) a partir del EN canonico o raw. */
export function suggestEs(rawOrEn: string): string {
  const clean = cleanColorRaw(rawOrEn)
  return EN_A_ES[clean] || EN_A_ES[canonicalEn(clean)] || clean
}

/**
 * Resuelve un color contra el catalogo activo.
 * Orden: nombre_intern exacto -> codigo -> nombre -> normalizado -> parcial (>=4).
 * Los compuestos se resuelven por lados; si algun lado falla, no hay match.
 */
export function resolveColor(raw: string, catalog: CatalogColor[]): ColorMatch {
  const clean = cleanColorRaw(raw)
  if (!clean) return { found: false, id: null, via: null, candidatos: [] }
  const lados = splitCompoundColor(clean)
  let mergedId: number | null = null
  void mergedId
  const resultados = lados.map((lado) => resolveSingle(lado, catalog))
  if (resultados.every((r) => r.found)) {
    // Compuesto donde todos los lados matchean: devolver el primero con trazabilidad.
    const primero = resultados[0]
    return { ...primero, candidatos: resultados.flatMap((r) => r.candidatos) }
  }
  const simple = resolveSingle(clean, catalog)
  return simple
}

function resolveSingle(clean: string, catalog: CatalogColor[]): ColorMatch {
  const en = canonicalEn(clean)
  const es = suggestEs(en)
  const candidatos = Array.from(new Set([clean, en, es]))
  const normCandidatos = candidatos.map(normalizeColorKey)

  const byIntern = catalog.find((c) => cleanColorRaw(c.nombre_intern || '') === en)
  if (byIntern) return { found: true, id: byIntern.id, via: 'nombre_intern', catalog: byIntern, candidatos }
  const byCodigo = catalog.find((c) => cleanColorRaw(c.codigo || '') === clean || cleanColorRaw(c.codigo || '') === en)
  if (byCodigo) return { found: true, id: byCodigo.id, via: 'codigo', catalog: byCodigo, candidatos }
  const byNombre = catalog.find((c) => cleanColorRaw(c.nombre || '') === es || cleanColorRaw(c.nombre || '') === clean)
  if (byNombre) return { found: true, id: byNombre.id, via: 'nombre', catalog: byNombre, candidatos }

  const normMatch = catalog.find((c) => {
    const norms = [normalizeColorKey(c.nombre_intern || ''), normalizeColorKey(c.codigo || ''), normalizeColorKey(c.nombre || '')]
    return normCandidatos.some((nc) => nc && norms.includes(nc))
  })
  if (normMatch) return { found: true, id: normMatch.id, via: 'normalizado', catalog: normMatch, candidatos }

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
}

/** Infiere codigo/hex/tipo para crear un color (misma regla que ColorCombobox). */
export function inferirCodigoHexTipo(nombreEs: string): { codigo: string; hex_code: string; tipo: string } {
  const norm = cleanColorRaw(nombreEs)
  let codigo = norm.replace(/[^A-Z]/g, '').slice(0, 3)
  if (codigo.length < 2) codigo = 'COL'
  const palabras = norm.split(' ')
  if (palabras.length > 1) codigo = palabras.map((p) => p[0]).join('').slice(0, 3)
  let hex = '#000000'
  for (const [key, h] of Object.entries(HEX_POR_NOMBRE)) {
    if (norm.includes(key)) { hex = h; break }
  }
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
  const en = cleanColorRaw(aiEn || '') || canonicalEn(clean)
  const es = (aiEs || '').trim().toUpperCase() || suggestEs(en)
  const sug = inferirCodigoHexTipo(es)
  return { raw: clean, nombre: es, nombre_intern: en, codigo: sug.codigo, hex_code: sug.hex_code, tipo_color: sug.tipo }
}
