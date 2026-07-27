// C:\Users\uriel\Downloads\enero 26\archivo2\modules\catalogo\search.ts

/** El listado no consulta el servidor para términos de una sola letra. */
export const CATALOGO_SEARCH_MIN_LENGTH = 2

/**
 * Normaliza el texto que llega desde la URL antes de construir el filtro.
 * Conserva slash, guion y números para soportar SKUs como `jo24/1daw`.
 */
export function normalizeCatalogoSearchTerm(term?: string | null): string {
  return (term ?? '')
    .replace(/[(),]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Retorna null hasta que el término sea suficientemente específico. */
export function getCatalogoSearchTerm(term?: string | null): string | null {
  const normalized = normalizeCatalogoSearchTerm(term)
  return normalized.length >= CATALOGO_SEARCH_MIN_LENGTH ? normalized : null
}

/**
 * Construye el filtro OR de PostgREST para coincidencias parciales.
 * ILIKE hace la búsqueda insensible a mayúsculas/minúsculas.
 */
export function buildCatalogoSearchFilter(term?: string | null): string | null {
  const normalized = getCatalogoSearchTerm(term)
  if (!normalized) return null

  const pattern = `%${normalized.replace(/[\\%_]/g, '\\$&')}%`
  return [
    `sku_base.ilike.${pattern}`,
    `descripcion.ilike.${pattern}`,
    `nombre.ilike.${pattern}`,
    `familia.ilike.${pattern}`,
  ].join(',')
}
