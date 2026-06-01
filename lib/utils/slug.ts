// lib/utils/slug.ts

/**
 * Genera un slug URL-friendly a partir de los datos del producto.
 *
 * Formato: SKU-TIPO_PRENDA-GENERO-MARCA
 * Ejemplo: AND250016-CHL-CAB-GREENFIELD
 *
 * - SKU se incluye completo (es el identificador único)
 * - tipo_prenda: abreviatura de 3 letras (CHamarra → CHA, CaMisa → CAM)
 * - género: abreviatura de 3 letras (CABallero → CAB, DaMa → DAM)
 * - marca: nombre completo si cabe, se omite si el slug supera MAX_SLUG_LENGTH
 *
 * Si tipo_prenda o género son null, se omite ese segmento.
 */

const MAX_SLUG_LENGTH = 60

/** Toma las primeras N letras de una palabra en minúsculas */
function abreviar(texto: string, len = 3): string {
  const clean = texto.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  return clean.slice(0, len)
}

/** Convierte texto a formato slug (minúsculas, guiones, sin acentos) */
function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // quitar acentos
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')       // no-alfanum → guión
    .replace(/^-+|-+$/g, '')           // quitar guiones bordes
}

export function generarSlugProducto(opts: {
  sku_base: string
  tipo_prenda?: string | null
  genero?: string | null
  marca?: string | null
}): string {
  const partes: string[] = []

  // 1) SKU (siempre presente, es único)
  const sku = slugify(opts.sku_base)
  if (sku) partes.push(sku)

  // 2) Abreviatura tipo de prenda (3 chars)
  if (opts.tipo_prenda) {
    const abr = abreviar(opts.tipo_prenda, 3)
    if (abr) partes.push(abr)
  }

  // 3) Abreviatura género (3 chars)
  if (opts.genero) {
    const abr = abreviar(opts.genero, 3)
    if (abr) partes.push(abr)
  }

  // 4) Marca (completa, solo si no excede el largo máximo)
  if (opts.marca) {
    const marcaSlug = slugify(opts.marca)
    const sinMarca = partes.join('-')
    const conMarca = [...partes, marcaSlug].join('-')
    // Incluir marca solo si el slug total no excede el límite
    if (conMarca.length <= MAX_SLUG_LENGTH) {
      partes.push(marcaSlug)
    }
  }

  return partes.join('-')
}
