// modules/inventario/import-queries.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type { BodegaRow } from '@/lib/types/tables'

export type ProductoMatch = {
  producto_id: number
  variante_id?: number | null
  sku_base: string
  sku_completo?: string | null
  nombre: string | null
  pz_en_caja?: number | null
  score?: number
  metodo?: string
}

export type BodegaMatch = {
  id: number
  nombre: string
  codigo: string
}

export async function buscarProductosPorSkuBatch(
  skus: string[]
): Promise<Map<string, ProductoMatch>> {
  const supabase = await createClient()
  const map = new Map<string, ProductoMatch>()

  if (skus.length === 0) return map

  const validSkus = Array.from(new Set(skus.map((s) => s.trim()).filter(Boolean)))
  if (validSkus.length === 0) return map

  // Procesar en chunks de 100 para optimizar llamadas RPC en PostgreSQL
  const chunkSize = 100
  for (let i = 0; i < validSkus.length; i += chunkSize) {
    const chunk = validSkus.slice(i, i + chunkSize)
    const payload = chunk.map((s, idx) => ({
      index: idx,
      sku: s,
      estilo_raw: s,
    }))

    const { data: candidates, error } = await (supabase as any).rpc('fn_buscar_candidatos_sku_ocr', {
      p_lineas: payload,
    })

    if (!error && Array.isArray(candidates)) {
      for (const item of chunk) {
        const cands = candidates
          .filter((c: any) => c.sku_buscado === item)
          .sort((a: any, b: any) => Number(b.score) - Number(a.score))

        const top = cands.length > 0 ? cands[0] : null
        if (top && Number(top.score) >= 0.40) {
          map.set(item, {
            producto_id: top.producto_id,
            variante_id: top.variante_id || null,
            sku_base: top.sku_base,
            sku_completo: top.sku_completo || null,
            nombre: top.descripcion || null,
            pz_en_caja: top.pz_en_caja || null,
            score: Number(top.score),
            metodo: top.metodo,
          })
        }
      }
    }
  }

  return map
}

export async function buscarBodegasBatch(
  nombres: string[]
): Promise<Map<string, BodegaMatch>> {
  const supabase = await createClient()

  const map = new Map<string, BodegaMatch>()

  if (nombres.length === 0) return map

  const { data, error } = await supabase
    .from('bodegas')
    .select('id, nombre, codigo')
    .eq('activa', true)

  if (error || !data) return map

  function normalize(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s$/, '')
  }

  for (const b of data) {
    const matchObj = {
      id: b.id,
      nombre: b.nombre,
      codigo: b.codigo,
    }
    map.set(b.nombre.toLowerCase(), matchObj)
    map.set(b.codigo.toLowerCase(), matchObj)
    map.set(normalize(b.nombre), matchObj)
    map.set(normalize(b.codigo), matchObj)
  }

  return map
}

export async function fetchBodegasParaImport(): Promise<BodegaRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('bodegas')
    .select('*')
    .eq('activa', true)
    .order('nombre')
  return (data ?? []) as BodegaRow[]
}

export type TiposMovimientoMap = {
  ENT: number
  SAL: number
  AJU: number
}

export async function fetchTiposMovimientoImport(): Promise<TiposMovimientoMap | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cat_tipos_movimiento')
    .select('id, codigo')
    .in('codigo', ['ENT', 'SAL', 'AJU'])

  if (!data) return null

  const map: Partial<TiposMovimientoMap> = {}
  for (const row of data) {
    if (row.codigo === 'ENT') map.ENT = row.id
    if (row.codigo === 'SAL') map.SAL = row.id
    if (row.codigo === 'AJU') map.AJU = row.id
  }

  if (!map.ENT || !map.SAL) return null
  return {
    ENT: map.ENT,
    SAL: map.SAL,
    AJU: map.AJU ?? map.ENT,
  }
}

export async function fetchTipoMovimientoAjuste(): Promise<number | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cat_tipos_movimiento')
    .select('id')
    .eq('codigo', 'AJU')
    .single()
  return data?.id ?? null
}

/**
 * Busca productos por SKU base o Nombre en el catálogo activo para selector manual.
 */
export async function buscarProductosCatalogo(query: string): Promise<ProductoMatch[]> {
  const supabase = await createClient()
  if (!query || query.trim().length < 1) return []

  const term = query.trim()
  const { data } = await supabase
    .from('productos')
    .select('id, sku_base, nombre')
    .eq('activo', true)
    .or(`sku_base.ilike.%${term}%,nombre.ilike.%${term}%`)
    .order('sku_base')
    .limit(25)

  return (data ?? []).map((p) => ({
    producto_id: p.id,
    sku_base: p.sku_base,
    nombre: p.nombre,
  }))
}

