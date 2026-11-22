// lib/ecommerce/seo-generator.ts
// Generador determinístico e inteligente de metadatos SEO para productos web.

export interface SeoGeneratorInput {
  sku_base?: string | null
  nombre?: string | null
  descripcion?: string | null
  tipo_prenda_nombre?: string | null
  genero_nombre?: string | null
  marca_nombre?: string | null
  composicion?: string | null
}

export interface GeneratedSeo {
  titulo_seo: string
  descripcion_seo: string
  keywords: string
}

const MAX_TITLE_LEN = 60
const MAX_DESC_LEN = 160

const STOPWORDS = new Set([
  'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'en',
  'con', 'sin', 'para', 'por', 'del', 'al', 'a', 'su', 'sus', 'modelo', 'mod',
  'estilo', 'tipo', 'corte', 'color', 'talla', 'tallas', 'pieza', 'piezas',
  'caja', 'cajas', 'nuevo', 'nueva', 'producto', 'ropa', 'prenda',
])

function cleanSpace(value?: string | null): string {
  if (!value) return ''
  return value.replace(/\s+/g, ' ').trim()
}

function truncateWordBoundary(text: string, maxLen: number): string {
  const clean = cleanSpace(text)
  if (clean.length <= maxLen) return clean
  const sliced = clean.slice(0, maxLen)
  const lastSpace = sliced.lastIndexOf(' ')
  if (lastSpace > Math.floor(maxLen * 0.6)) {
    return sliced.slice(0, lastSpace).replace(/[,:;\-]+$/, '').trim()
  }
  return sliced.trim()
}

function capitalizeFirst(text: string): string {
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function extractDescriptiveTokens(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
  const words = cleaned.split(/\s+/).filter(Boolean)
  const seen = new Set<string>()
  const result: string[] = []
  for (const w of words) {
    if (w.length < 3 || STOPWORDS.has(w) || /^\d+$/.test(w)) continue
    if (!seen.has(w)) {
      seen.add(w)
      result.push(w)
    }
  }
  return result
}

/**
 * Genera Título SEO (<=60), Descripción SEO (<=160) y Keywords a partir de
 * los atributos disponibles del producto en catálogo.
 */
export function generateSmartSeo(input: SeoGeneratorInput): GeneratedSeo {
  const tipo = cleanSpace(input.tipo_prenda_nombre)
  const genero = cleanSpace(input.genero_nombre)
  const marca = cleanSpace(input.marca_nombre)
  const desc = cleanSpace(input.descripcion)
  const nombre = cleanSpace(input.nombre)
  const composicion = cleanSpace(input.composicion)
  const sku = cleanSpace(input.sku_base)

  const baseText = desc || nombre || sku || 'Producto'

  // 1. Título SEO (máx 60 chars)
  // Prioriza: Tipo Prenda + Género + Marca + detalle de descripción (sin repetir)
  const titleParts: string[] = []
  if (tipo) titleParts.push(tipo)
  if (genero) titleParts.push(genero)

  let titulo = titleParts.join(' ')
  if (marca && !titulo.toLowerCase().includes(marca.toLowerCase())) {
    titulo = titulo ? `${titulo} ${marca}` : marca
  }

  if (baseText) {
    // Agregar detalle útil de la descripción si aporta palabras nuevas y cabe
    const baseLower = baseText.toLowerCase()
    const alreadyCovered =
      titulo.length > 0 &&
      (!tipo || baseLower.includes(tipo.toLowerCase())) &&
      (!marca || baseLower.includes(marca.toLowerCase()))

    if (!titulo) {
      titulo = capitalizeFirst(baseText)
    } else if (alreadyCovered && baseText.length <= MAX_TITLE_LEN) {
      titulo = capitalizeFirst(baseText)
    } else if (titulo.length < MAX_TITLE_LEN - 12) {
      const candidate = `${titulo} - ${capitalizeFirst(baseText)}`
      titulo = candidate.length <= MAX_TITLE_LEN ? candidate : titulo
    }
  }

  const titulo_seo = truncateWordBoundary(titulo || sku || 'Producto de Moda', MAX_TITLE_LEN)

  // 2. Descripción SEO (máx 160 chars)
  const intro =
    tipo && genero
      ? `${tipo} para ${genero.toLowerCase()}${marca ? ` marca ${marca}` : ''}`
      : titulo_seo

  const details: string[] = []
  if (desc && desc.toLowerCase() !== intro.toLowerCase()) {
    details.push(capitalizeFirst(desc))
  } else if (nombre && nombre.toLowerCase() !== intro.toLowerCase()) {
    details.push(capitalizeFirst(nombre))
  }
  if (composicion) {
    details.push(`Composición: ${composicion}`)
  }

  const cta = 'Disponible en tienda online por pieza y mayoreo.'
  let descDraft = details.length > 0 ? `${intro}. ${details.join('. ')}. ${cta}` : `${intro}. ${cta}`
  if (descDraft.length > MAX_DESC_LEN) {
    descDraft = details.length > 0 ? `${intro}. ${details[0]}.` : `${intro}. ${cta}`
  }
  const descripcion_seo = truncateWordBoundary(descDraft, MAX_DESC_LEN)

  // 3. Keywords (máx 12 términos únicos en minúsculas)
  const kwList: string[] = []
  const kwSeen = new Set<string>()
  const pushKw = (raw?: string | null) => {
    const k = cleanSpace(raw).toLowerCase()
    if (!k || kwSeen.has(k)) return
    kwSeen.add(k)
    kwList.push(k)
  }

  pushKw(tipo)
  pushKw(genero)
  pushKw(marca)
  if (tipo && genero) pushKw(`${tipo.toLowerCase()} ${genero.toLowerCase()}`)
  for (const token of extractDescriptiveTokens(`${desc} ${nombre} ${composicion}`)) {
    if (kwList.length >= 12) break
    pushKw(token)
  }

  return {
    titulo_seo,
    descripcion_seo,
    keywords: kwList.join(', '),
  }
}

/**
 * Combina keywords existentes con nuevas separadas por coma, sin duplicados.
 */
export function mergeKeywords(
  existing?: string | null,
  incoming?: string | null,
  maxItems = 15
): string | null {
  const parts = [
    ...(existing ? existing.split(',') : []),
    ...(incoming ? incoming.split(',') : []),
  ]
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of parts) {
    const clean = cleanSpace(raw).toLowerCase()
    if (!clean || seen.has(clean)) continue
    seen.add(clean)
    out.push(clean)
    if (out.length >= maxItems) break
  }
  return out.length > 0 ? out.join(', ') : null
}
