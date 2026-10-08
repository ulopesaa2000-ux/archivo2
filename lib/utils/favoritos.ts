// lib/utils/favoritos.ts

export const FAVORITES_STORAGE_KEY = 'inv_tienda_favorites'
export const FAVORITES_EVENT_KEY = 'inv_favorites_updated'
export const MAX_FAVORITES = 200

export function sanitizeFavoriteIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<number>()
  for (const item of raw) {
    const id = typeof item === 'number' ? item : Number(item)
    if (Number.isInteger(id) && id > 0 && !seen.has(id)) {
      seen.add(id)
    }
    if (seen.size >= MAX_FAVORITES) break
  }
  return [...seen]
}

/**
 * Unión local + servidor preservando el orden local primero.
 * Nada se borra: lo que ya estaba en DB se conserva y lo local se suma.
 */
export function mergeFavoriteIds(local: number[], server: number[]): number[] {
  const seen = new Set(sanitizeFavoriteIds(local))
  for (const id of sanitizeFavoriteIds(server)) {
    if (seen.size >= MAX_FAVORITES) break
    seen.add(id)
  }
  return [...seen]
}
