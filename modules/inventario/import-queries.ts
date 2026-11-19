// modules/inventario/import-queries.ts
import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { fetchAllPages } from '@/lib/supabase/pagination'
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

// ═══════════════════════════════════════════════════════════════════════════
// CONCILIACIÓN DE INVENTARIO TOTAL (CONTEO FÍSICO VS SISTEMA)
// ═══════════════════════════════════════════════════════════════════════════

export type TipoResultadoConciliacion =
  | 'MATCH'
  | 'DIFERENCIA_POS'
  | 'DIFERENCIA_NEG'
  | 'SOLO_FISICO'
  | 'SOLO_SISTEMA'

export type FilaConciliacionTotal = {
  producto_id: number
  sku: string
  nombre: string | null
  descripcion: string | null
  familia: string | null
  conteo_fisico: number
  stock_sistema: number
  delta: number
  resultado: TipoResultadoConciliacion
  resultado_texto: string
  en_lista_subida: boolean
  mandar_a_cero?: boolean
}

export type ResumenConciliacionBodega = {
  bodega_id: number
  bodega_nombre: string
  filas_comparacion: FilaConciliacionTotal[]
  filas_solo_sistema: FilaConciliacionTotal[]
  total_cajas_sistema: number
  total_cajas_fisico: number
  diferencia_neta: number
  conteo_match: number
  conteo_diferencias: number
  conteo_solo_fisico: number
  conteo_solo_sistema: number
}

/**
 * Genera la conciliación y auditoría física vs sistema para una bodega en modo Inventario Total.
 */
export async function generarConciliacionInventarioTotal(
  bodegaId: number,
  filasValidas: { producto_id: number; sku: string; cajas: number }[]
): Promise<ResumenConciliacionBodega> {
  const supabase = await createClient()

  // 1. Obtener nombre de la bodega
  const { data: bodegaData } = await supabase
    .from('bodegas')
    .select('id, nombre, codigo')
    .eq('id', bodegaId)
    .single()

  const bodegaNombre = bodegaData?.nombre || `Bodega #${bodegaId}`

  // 2. Consolidar filas del archivo en caso de duplicados
  const consolidadas = new Map<number, { producto_id: number; sku: string; cajas: number }>()
  for (const f of filasValidas) {
    const existing = consolidadas.get(f.producto_id)
    if (existing) {
      existing.cajas += f.cajas
    } else {
      consolidadas.set(f.producto_id, { ...f })
    }
  }

  const uploadedIds = Array.from(consolidadas.keys())

  // 3. Consultar todo el inventario stock actual activo de la bodega (paginado completo)
  const { data: stockBodega } = await fetchAllPages<any>(
    (fromIdx, toIdx, isFirst) =>
      supabase
        .from('inventario_stock')
        .select(
          `
          producto_id,
          cajas,
          piezas_sueltas,
          producto:productos (
            id,
            sku_base,
            nombre,
            descripcion,
            familia
          )
        `,
          isFirst ? { count: 'exact' } : undefined
        )
        .eq('bodega_id', bodegaId)
        .is('caja_id', null)
        .gt('cajas', 0)
        .order('id', { ascending: true })
        .range(fromIdx, toIdx),
    { label: 'generarConciliacionInventarioTotal:stock' }
  )

  const stockMap = new Map<number, { cajas: number; producto: any }>()
  for (const row of stockBodega ?? []) {
    stockMap.set(row.producto_id, {
      cajas: Number(row.cajas ?? 0),
      producto: row.producto,
    })
  }

  // 4. Buscar información de productos subidos que no tengan stock en esa bodega
  const missingProductInfoIds = uploadedIds.filter((id) => !stockMap.has(id))
  const productInfoMap = new Map<number, { id: number; sku_base: string; nombre: string | null; descripcion: string | null; familia: string | null }>()

  if (missingProductInfoIds.length > 0) {
    const CHUNK = 200
    for (let i = 0; i < missingProductInfoIds.length; i += CHUNK) {
      const chunk = missingProductInfoIds.slice(i, i + CHUNK)
      const { data: prods } = await supabase
        .from('productos')
        .select('id, sku_base, nombre, descripcion, familia')
        .in('id', chunk)

      for (const p of prods ?? []) {
        productInfoMap.set(p.id, p)
      }
    }
  }

  // 5. Armar lista de Comparación (los códigos presentes en el conteo físico)
  const filas_comparacion: FilaConciliacionTotal[] = []
  let conteo_match = 0
  let conteo_diferencias = 0
  let conteo_solo_fisico = 0

  for (const item of consolidadas.values()) {
    const stockInfo = stockMap.get(item.producto_id)
    const stock_sistema = stockInfo ? stockInfo.cajas : 0
    const conteo_fisico = item.cajas
    const delta = conteo_fisico - stock_sistema

    const prodInfo = stockInfo?.producto || productInfoMap.get(item.producto_id)
    const sku = prodInfo?.sku_base || item.sku
    const nombre = prodInfo?.nombre || null
    const descripcion = prodInfo?.descripcion || prodInfo?.nombre || null
    const familia = prodInfo?.familia || 'SIN FAMILIA'

    let resultado: TipoResultadoConciliacion
    let resultado_texto: string

    if (delta === 0) {
      resultado = 'MATCH'
      resultado_texto = '0 MATCH'
      conteo_match++
    } else if (stock_sistema === 0 && conteo_fisico > 0) {
      resultado = 'SOLO_FISICO'
      resultado_texto = `+${conteo_fisico} SOLO FÍSICO`
      conteo_solo_fisico++
    } else if (delta > 0) {
      resultado = 'DIFERENCIA_POS'
      resultado_texto = `+${delta} DIFERENCIA`
      conteo_diferencias++
    } else {
      resultado = 'DIFERENCIA_NEG'
      resultado_texto = `${delta} DIFERENCIA`
      conteo_diferencias++
    }

    filas_comparacion.push({
      producto_id: item.producto_id,
      sku,
      nombre,
      descripcion,
      familia,
      conteo_fisico,
      stock_sistema,
      delta,
      resultado,
      resultado_texto,
      en_lista_subida: true,
    })
  }

  // 6. Armar lista de "SOLO SISTEMA" (Lista Amarilla: productos en sistema con stock > 0 que no vinieron en el archivo)
  const filas_solo_sistema: FilaConciliacionTotal[] = []

  for (const row of stockBodega ?? []) {
    if (!consolidadas.has(row.producto_id)) {
      const stock_sistema = Number(row.cajas ?? 0)
      const conteo_fisico = 0
      const delta = -stock_sistema
      const prodInfo = row.producto as any
      const sku = prodInfo?.sku_base || `ID:${row.producto_id}`
      const nombre = prodInfo?.nombre || null
      const descripcion = prodInfo?.descripcion || prodInfo?.nombre || null
      const familia = prodInfo?.familia || 'SIN FAMILIA'

      filas_solo_sistema.push({
        producto_id: row.producto_id,
        sku,
        nombre,
        descripcion,
        familia,
        conteo_fisico,
        stock_sistema,
        delta,
        resultado: 'SOLO_SISTEMA',
        resultado_texto: `-${stock_sistema} SOLO SISTEMA`,
        en_lista_subida: false,
        mandar_a_cero: false, // Desmarcado inicialmente según requerimiento del usuario
      })
    }
  }

  // 7. Calcular totales globales de la bodega
  const total_cajas_sistema_comparacion = filas_comparacion.reduce((a, f) => a + f.stock_sistema, 0)
  const total_cajas_sistema_solo = filas_solo_sistema.reduce((a, f) => a + f.stock_sistema, 0)
  const total_cajas_sistema = total_cajas_sistema_comparacion + total_cajas_sistema_solo

  const total_cajas_fisico = filas_comparacion.reduce((a, f) => a + f.conteo_fisico, 0)
  const diferencia_neta = total_cajas_fisico - total_cajas_sistema

  return {
    bodega_id: bodegaId,
    bodega_nombre: bodegaNombre,
    filas_comparacion,
    filas_solo_sistema,
    total_cajas_sistema,
    total_cajas_fisico,
    diferencia_neta,
    conteo_match,
    conteo_diferencias,
    conteo_solo_fisico,
    conteo_solo_sistema: filas_solo_sistema.length,
  }
}


