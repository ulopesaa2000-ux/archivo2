// lib/supabase/pagination.ts

export const SUPABASE_MAX_ROWS = 1000
export const SUPABASE_IN_CHUNK_SIZE = 200

export interface SupabasePageResult<TRow> {
  data: TRow[] | null
  count?: number | null
  error: { message?: string; details?: string; hint?: string; code?: string } | null
}

export interface FetchAllPagesOptions {
  pageSize?: number
  label?: string
}

export interface FetchAllPagesResult<TRow> {
  data: TRow[]
  error: SupabasePageResult<TRow>['error']
}

/**
 * Divide un arreglo en sub-arreglos de tamaño máximo `size` (por defecto 200,
 * según AGENTS.md 3.7.2 para cláusulas `.in()`).
 */
export function chunkArray<T>(
  items: readonly T[],
  size: number = SUPABASE_IN_CHUNK_SIZE
): T[][] {
  if (items.length === 0) return []
  const safeSize = Math.max(1, Math.floor(size))
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += safeSize) {
    chunks.push(items.slice(i, i + safeSize))
  }
  return chunks
}

/**
 * Ejecuta una consulta paginada en Supabase superando el límite de 1,000 filas
 * de PostgREST (`db-max-rows`).
 *
 * Estrategia:
 * 1. Trae la primera página (0..999) solicitando `count: 'exact'` cuando `isFirstPage = true`.
 * 2. Si `count <= pageSize`, termina en 1 sola solicitud.
 * 3. Si `count > pageSize`, descarga todas las páginas restantes en paralelo (`Promise.all`).
 * 4. Si el servidor no devuelve `count`, pagina secuencialmente mientras reciba `pageSize` filas.
 *
 * IMPORTANTE: `buildPageQuery` debe construir un query nuevo en cada invocación
 * (los QueryBuilder de PostgREST son mutables) y usar un `.order(...)` determinista
 * (ej. `.order('id', { ascending: true })`).
 */
export async function fetchAllPages<TRow = any>(
  buildPageQuery: (
    from: number,
    to: number,
    isFirstPage: boolean
  ) => PromiseLike<SupabasePageResult<TRow>>,
  options?: FetchAllPagesOptions
): Promise<FetchAllPagesResult<TRow>> {
  const pageSize = Math.min(
    Math.max(1, options?.pageSize ?? SUPABASE_MAX_ROWS),
    SUPABASE_MAX_ROWS
  )
  const label = options?.label ?? 'fetchAllPages'

  const firstPage = await buildPageQuery(0, pageSize - 1, true)

  if (firstPage.error) {
    console.error(`[${label}] Error primera página:`, firstPage.error.message || firstPage.error)
    return { data: [], error: firstPage.error }
  }

  let allRows: TRow[] = firstPage.data ? [...firstPage.data] : []
  const totalCount = firstPage.count

  if (typeof totalCount === 'number') {
    if (totalCount <= pageSize) {
      return { data: allRows, error: null }
    }

    const offsets: number[] = []
    for (let from = pageSize; from < totalCount; from += pageSize) {
      offsets.push(from)
    }

    const remainingPages = await Promise.all(
      offsets.map((from) => buildPageQuery(from, from + pageSize - 1, false))
    )

    let firstError: SupabasePageResult<TRow>['error'] = null
    for (const page of remainingPages) {
      if (page.error) {
        if (!firstError) firstError = page.error
        console.error(`[${label}] Error página siguiente:`, page.error.message || page.error)
        continue
      }
      if (page.data && page.data.length > 0) {
        allRows = allRows.concat(page.data)
      }
    }

    return { data: allRows, error: firstError }
  }

  // Fallback si la consulta no incluyó { count: 'exact' }
  let lastLength = allRows.length
  let from = pageSize
  while (lastLength === pageSize) {
    const nextPage = await buildPageQuery(from, from + pageSize - 1, false)
    if (nextPage.error) {
      console.error(`[${label}] Error página fallback (${from}):`, nextPage.error.message || nextPage.error)
      return { data: allRows, error: nextPage.error }
    }
    const batch = nextPage.data ?? []
    allRows = allRows.concat(batch)
    lastLength = batch.length
    from += pageSize
  }

  return { data: allRows, error: null }
}

/**
 * Ejecuta consultas `.in()` dividiendo `ids` en chunks <= 200 en paralelo.
 * Útil para relaciones 1:1 o acotadas (< 1,000 filas por chunk).
 */
export async function fetchInChunks<TId, TRow = any>(
  ids: readonly TId[],
  queryChunk: (chunk: TId[]) => PromiseLike<SupabasePageResult<TRow>>,
  options?: { chunkSize?: number; label?: string }
): Promise<TRow[]> {
  const uniqueIds = Array.from(new Set(ids))
  if (uniqueIds.length === 0) return []

  const chunkSize = Math.min(
    Math.max(1, options?.chunkSize ?? SUPABASE_IN_CHUNK_SIZE),
    SUPABASE_IN_CHUNK_SIZE
  )
  const label = options?.label ?? 'fetchInChunks'
  const chunks = chunkArray(uniqueIds, chunkSize)

  const results = await Promise.all(chunks.map((chunk) => queryChunk(chunk)))
  const out: TRow[] = []

  for (const res of results) {
    if (res.error) {
      console.error(`[${label}] Error en chunk:`, res.error.message || res.error)
      continue
    }
    if (res.data && res.data.length > 0) {
      out.push(...res.data)
    }
  }

  return out
}

/**
 * Combina chunking de IDs (<= 200) con paginación interna (<= 1,000 por página)
 * para relaciones 1:N que podrían superar 1,000 filas dentro de un mismo chunk
 * (ej. `inventario_stock` multi-bodega o `producto_imagenes` completas).
 */
export async function fetchInChunksPaginated<TId, TRow = any>(
  ids: readonly TId[],
  buildChunkPageQuery: (
    chunk: TId[],
    from: number,
    to: number,
    isFirstPage: boolean
  ) => PromiseLike<SupabasePageResult<TRow>>,
  options?: { chunkSize?: number; pageSize?: number; label?: string }
): Promise<TRow[]> {
  const uniqueIds = Array.from(new Set(ids))
  if (uniqueIds.length === 0) return []

  const chunkSize = Math.min(
    Math.max(1, options?.chunkSize ?? 150),
    SUPABASE_IN_CHUNK_SIZE
  )
  const label = options?.label ?? 'fetchInChunksPaginated'
  const chunks = chunkArray(uniqueIds, chunkSize)

  const results = await Promise.all(
    chunks.map((chunk) =>
      fetchAllPages<TRow>(
        (from, to, isFirst) => buildChunkPageQuery(chunk, from, to, isFirst),
        { pageSize: options?.pageSize, label }
      )
    )
  )

  return results.flatMap((r) => r.data)
}
