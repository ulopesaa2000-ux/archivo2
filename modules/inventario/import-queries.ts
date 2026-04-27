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

export async function buscarProductosPorSkuBatch(
  skus: string[]
): Promise<Map<string, ProductoMatch>> {
  const supabase = await createClient()

  const map = new Map<string, ProductoMatch>()

  if (skus.length === 0) return map

  const { data, error } = await supabase
    .from('productos')
    .select('id, sku_base, nombre')
    .in('sku_base', skus)
    .eq('activo', true)

  if (error || !data) return map

  for (const p of data) {
    map.set(p.sku_base, {
      producto_id: p.id,
      sku_base: p.sku_base,
      nombre: p.nombre,
    })
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

  for (const b of data) {
    map.set(b.nombre.toLowerCase(), {
      id: b.id,
      nombre: b.nombre,
      codigo: b.codigo,
    })
    map.set(b.codigo.toLowerCase(), {
      id: b.id,
      nombre: b.nombre,
      codigo: b.codigo,
    })
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

export async function fetchTipoMovimientoAjuste(): Promise<number | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cat_tipos_movimiento')
    .select('id')
    .eq('codigo', 'AJU')
    .single()
  return data?.id ?? null
}
