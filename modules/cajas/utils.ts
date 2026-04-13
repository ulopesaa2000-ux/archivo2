// modules/cajas/utils.ts
import type { SharedCajaContenidoMap } from './types'

/**
 * Convierte un array plano de detalles de talla/color en una estructura matricial
 * para facilitar su representación en tablas.
 */
export function buildCajaContenidoMap(detalles: any[]): SharedCajaContenidoMap | null {
  if (!detalles || detalles.length === 0) return null

  const tallasSet = new Set<string>()
  const coloresSet = new Set<string>()
  const matriz: Record<string, Record<string, number>> = {}
  let totalPiezas = 0

  for (const d of detalles) {
    const talla = d.talla_codigo ?? d.talla_nombre ?? '—'
    const color = d.color_nombre ?? '—'
    const cantidad = d.cantidad ?? 0

    tallasSet.add(talla)
    coloresSet.add(color)

    if (!matriz[color]) matriz[color] = {}
    matriz[color][talla] = (matriz[color][talla] ?? 0) + cantidad
    totalPiezas += cantidad
  }

  return {
    tallas: Array.from(tallasSet).sort(), // Opcional: ordenar tallas si hay criterio
    colores: Array.from(coloresSet).sort(),
    matriz,
    totalPiezas,
  }
}
