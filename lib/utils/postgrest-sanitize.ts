// lib/utils/postgrest-sanitize.ts
/**
 * Sanitiza un término de búsqueda libre antes de interpolarlo en filtros PostgREST
 * (`.or(...)`, `.ilike(...)`), eliminando operadores reservados `,`, `(`, `)`, `*`
 * y escapando comodines SQL `%` y `_`.
 */
export function sanitizePostgrestFilterTerm(raw: string): string {
  return raw
    .trim()
    .replace(/[,()*\\]/g, ' ')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}
