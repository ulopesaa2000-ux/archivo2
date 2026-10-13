// C:\Users\uriel\Downloads\enero 26\archivo2\lib\descripcion.ts
// Normalización mínima de descripción de producto (fase mayúsculas).
// Solo display/guardado en Orden Rápida: no toca nombre ni corrige ortografía.

/** Trim + mayúsculas. Vacío/nulo → '' (la capa DB mapea '' a null). */
export function aMayusculasDescripcion(valor: unknown): string {
  if (valor == null) return ''
  return String(valor).trim().toUpperCase()
}
