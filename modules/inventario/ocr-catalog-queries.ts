// modules/inventario/ocr-catalog-queries.ts
import 'server-only'

import { cacheLife, cacheTag } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/server'
import { fetchAllPages } from '@/lib/supabase/pagination'
import {
  indexarCatalogoSku,
  type CatalogoSkuIndexado,
  type CatalogoSkuItem,
} from '@/lib/inventario/sku-matcher'

type ProductoOcrRow = {
  id: number
  sku_base: string
  nombre: string | null
  descripcion: string | null
  pz_en_caja: number | null
  familia: string | null
  persona_id: number | null
}

type ProveedorOcrRow = {
  id: number
  nombre_completo: string
  prefijo: string | null
}

/**
 * Carga y cachea el catálogo activo compacto (SKU × Proveedor) para el
 * motor OCR en servidor y cliente. Evita SELECT * y pagina por lotes de 1,000.
 */
export async function fetchCatalogoOcrCompacto(): Promise<CatalogoSkuItem[]> {
  'use cache'
  cacheLife('minutes')
  cacheTag('catalogo-ocr', 'productos')

  const supabase = createStaticClient()

  const [productosRes, proveedoresRes] = await Promise.all([
    fetchAllPages<ProductoOcrRow>(
      (fromIdx, toIdx, isFirst) =>
        supabase
          .from('productos')
          .select(
            'id, sku_base, nombre, descripcion, pz_en_caja, familia, persona_id',
            isFirst ? { count: 'exact' } : undefined
          )
          .eq('activo', true)
          .order('id', { ascending: true })
          .range(fromIdx, toIdx),
      { label: 'fetchCatalogoOcrCompacto' }
    ),
    (supabase as any)
      .from('personas')
      .select('id, nombre_completo, prefijo')
      .eq('tipo_entidad', 'Proveedor')
      .eq('activo', true)
      .order('id', { ascending: true }),
  ])

  if (productosRes.error) {
    console.error('[fetchCatalogoOcrCompacto] Error productos:', productosRes.error)
    return []
  }

  const provRows = (proveedoresRes.data ?? []) as ProveedorOcrRow[]
  const provMap = new Map<number, ProveedorOcrRow>(provRows.map((p) => [p.id, p]))

  return productosRes.data.map((p) => {
    const prov = p.persona_id != null ? provMap.get(p.persona_id) : undefined
    return {
      id: p.id,
      sku_base: p.sku_base,
      descripcion: p.descripcion || p.nombre || null,
      pz_en_caja: p.pz_en_caja ?? null,
      familia: p.familia ?? null,
      persona_id: p.persona_id ?? null,
      proveedor_nombre: prov?.nombre_completo ?? null,
      proveedor_prefijo: prov?.prefijo ?? null,
    }
  })
}

const CATALOGO_INDEX_MEMO = new WeakMap<CatalogoSkuItem[], CatalogoSkuIndexado[]>()

/**
 * Retorna el catálogo ya pre-indexado reutilizando el arreglo cacheado en memoria
 * para evitar reconstruir tokens y señales en cada búsqueda.
 */
export async function fetchCatalogoOcrIndexado(): Promise<CatalogoSkuIndexado[]> {
  const items = await fetchCatalogoOcrCompacto()
  let indexado = CATALOGO_INDEX_MEMO.get(items)
  if (!indexado) {
    indexado = indexarCatalogoSku(items)
    CATALOGO_INDEX_MEMO.set(items, indexado)
  }
  return indexado
}
