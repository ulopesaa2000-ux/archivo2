// components/admin/ocr-sync/_hooks/ocr-catalogo-cache.ts
'use client'

import {
  indexarCatalogoSku,
  type CatalogoSkuIndexado,
} from '@/lib/inventario/sku-matcher'

const CACHE_TTL_MS = 5 * 60 * 1000

type CatalogoApiItem = {
  id: number
  sku_base: string
  descripcion: string | null
  pz_en_caja: number | null
  proveedor_nombre?: string | null
}

let cachedIndex: CatalogoSkuIndexado[] | null = null
let cachedAt = 0
let inflightPromise: Promise<CatalogoSkuIndexado[]> | null = null

function isCacheFresh(): boolean {
  return cachedIndex !== null && Date.now() - cachedAt < CACHE_TTL_MS
}

/** Retorna el catálogo ya indexado en memoria si sigue vigente (0 ms), o null. */
export function getCatalogoOcrSync(): CatalogoSkuIndexado[] | null {
  return isCacheFresh() ? cachedIndex : null
}

/** Obtiene e indexa el catálogo compacto una sola vez con deduplicación en vuelo. */
export async function getCatalogoOcrIndexado(
  forceRefresh: boolean = false
): Promise<CatalogoSkuIndexado[]> {
  if (!forceRefresh && isCacheFresh() && cachedIndex) {
    return cachedIndex
  }
  if (!forceRefresh && inflightPromise) {
    return inflightPromise
  }

  const req = fetch('/api/inventario/ocr/catalogo', {
    cache: forceRefresh ? 'no-store' : 'default',
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const payload = (await res.json()) as { items?: CatalogoApiItem[] }
      const rawItems = Array.isArray(payload?.items) ? payload.items : []
      const indexado = indexarCatalogoSku(
        rawItems.map((item) => ({
          id: item.id,
          sku_base: item.sku_base,
          descripcion: item.descripcion ?? null,
          pz_en_caja: item.pz_en_caja ?? null,
          familia: null,
          persona_id: null,
          proveedor_nombre: item.proveedor_nombre ?? null,
          proveedor_prefijo: null,
        }))
      )
      cachedIndex = indexado
      cachedAt = Date.now()
      return indexado
    })
    .finally(() => {
      if (inflightPromise === req) {
        inflightPromise = null
      }
    })

  inflightPromise = req
  return req
}

/** Precarga silenciosa en hover/focus antes de abrir el modal OCR. */
export function prefetchCatalogoOcr(): void {
  if (isCacheFresh() || inflightPromise) return
  void getCatalogoOcrIndexado().catch(() => {})
}
