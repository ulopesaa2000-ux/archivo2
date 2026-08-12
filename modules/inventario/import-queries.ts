// modules/inventario/import-queries.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type { BodegaRow } from '@/lib/types/tables'

export type ProductoMatch = {
  producto_id: number
  sku_base: string
  nombre: string | null
}

export type BodegaMatch = {
  id: number
  nombre: string
  codigo: string
}

function extractAndToken(s: string): string | null {
  const match = s.toUpperCase().match(/AND\d+/i)
  return match ? match[0].trim().toUpperCase() : null
}

function extract3VtToken(s: string): string | null {
  const match = s.toUpperCase().match(/3VT\d+/i)
  return match ? match[0].trim().toUpperCase() : null
}

export async function buscarProductosPorSkuBatch(
  skus: string[]
): Promise<Map<string, ProductoMatch>> {
  const supabase = await createClient()
  const map = new Map<string, ProductoMatch>()

  if (skus.length === 0) return map

  // Consultar todos los productos activos de la BD para resolución inteligente (son ~800 productos)
  const { data: allProducts, error } = await supabase
    .from('productos')
    .select('id, sku_base, nombre')
    .eq('activo', true)

  if (error || !allProducts) return map

  const exactMap = new Map<string, ProductoMatch>()
  const andMap = new Map<string, ProductoMatch>()
  const vtMap = new Map<string, ProductoMatch>()
  const tokenMap = new Map<string, ProductoMatch>()

  for (const p of allProducts) {
    const item: ProductoMatch = {
      producto_id: p.id,
      sku_base: p.sku_base,
      nombre: p.nombre,
    }

    const skuUpper = p.sku_base.trim().toUpperCase()
    exactMap.set(skuUpper, item)

    const andToken = extractAndToken(p.sku_base)
    if (andToken) andMap.set(andToken, item)

    const vtToken = extract3VtToken(p.sku_base)
    if (vtToken) vtMap.set(vtToken, item)

    // Token por primera palabra
    const firstWord = skuUpper.split(/\s+/)[0]
    if (firstWord) tokenMap.set(firstWord, item)
  }

  for (const rawSku of skus) {
    const rawUpper = rawSku.trim().toUpperCase()
    if (!rawUpper) continue

    // 1. Coincidencia exacta
    if (exactMap.has(rawUpper)) {
      map.set(rawSku, exactMap.get(rawUpper)!)
      continue
    }

    // 2. Coincidencia antes del primer espacio
    const beforeSpace = rawUpper.split(/\s+/)[0]
    if (beforeSpace && exactMap.has(beforeSpace)) {
      map.set(rawSku, exactMap.get(beforeSpace)!)
      continue
    }

    // 3. Coincidencia por token AND#####
    const andTok = extractAndToken(rawSku)
    if (andTok && andMap.has(andTok)) {
      map.set(rawSku, andMap.get(andTok)!)
      continue
    }

    // 4. Coincidencia por token 3VT#####
    const vtTok = extract3VtToken(rawSku)
    if (vtTok && vtMap.has(vtTok)) {
      map.set(rawSku, vtMap.get(vtTok)!)
      continue
    }

    // 5. Coincidencia por partes divididas por '/' o '-'
    const slashParts = rawUpper.split(/[\/\s-]+/).map((s) => s.trim()).filter(Boolean)
    let found = false
    for (const part of slashParts) {
      if (exactMap.has(part)) {
        map.set(rawSku, exactMap.get(part)!)
        found = true
        break
      }
      const partAnd = extractAndToken(part)
      if (partAnd && andMap.has(partAnd)) {
        map.set(rawSku, andMap.get(partAnd)!)
        found = true
        break
      }
      const partVt = extract3VtToken(part)
      if (partVt && vtMap.has(partVt)) {
        map.set(rawSku, vtMap.get(partVt)!)
        found = true
        break
      }
    }

    if (found) continue
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
