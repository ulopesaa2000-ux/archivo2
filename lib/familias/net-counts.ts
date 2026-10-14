// C:\Users\uriel\Downloads\enero 26\archivo2\lib\familias\net-counts.ts
// Conteo neto de productos por familia tras aplicar movimientos en borrador.
// Puro y testeable (AGENTS.md 3.7.1): la UI solo lo alimenta, no calcula aquí.
// Regla anti doble-conteo: las familias draft nacen en 0 porque el 100% de sus
// miembros llega vía stagedMoves (crear con B + 1 producto debe dar neto 1, no 2).

export interface FamiliaConteoEntrada {
  familia: string
  /** Total en BD. Se ignora cuando esDraft es true. */
  total: number
  /** true si la familia solo existe en local (creada en borrador). */
  esDraft: boolean
}

/** productId -> familia donde está cargado en local, o null si no se encuentra. */
export type ResolverOrigen = (productId: number) => string | null

export function getNetProductCounts(
  familias: FamiliaConteoEntrada[],
  stagedMoves: Record<number | string, string>,
  resolverOrigen: ResolverOrigen,
): Record<string, number> {
  const counts: Record<string, number> = {}

  // 1. Base: BD para existentes, 0 para drafts (sus miembros llegan en el paso 2).
  for (const f of familias) {
    if (!f.familia) continue
    counts[f.familia] = f.esDraft ? 0 : f.total
  }

  // 2. Aplicar staged moves: -1 origen, +1 destino (sin doble-conteo).
  for (const [prodIdStr, targetFamily] of Object.entries(stagedMoves)) {
    const prodId = parseInt(prodIdStr, 10)
    if (!Number.isFinite(prodId) || !targetFamily) continue
    const originalFamily = resolverOrigen(prodId)
    if (originalFamily && originalFamily !== targetFamily) {
      if (counts[originalFamily] !== undefined) {
        counts[originalFamily] = Math.max(0, counts[originalFamily] - 1)
      }
      counts[targetFamily] = (counts[targetFamily] || 0) + 1
    }
  }

  return counts
}
