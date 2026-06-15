// modules/despachos/queries.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { PAGE_SIZE } from '@/lib/constants'
import type { Database } from '@/lib/types/database.types'
import type { FiltrosDespacho, DespachoListaItem, StockVirtualItem } from './types'

// ════════════════════════════════════════════════════════════
// BODEGAS VIRTUALES
// ════════════════════════════════════════════════════════════

export async function fetchBodegasVirtuales() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bodegas')
    .select('*')
    .eq('es_virtual', true)
    .eq('activa', true)
    .order('nombre')

  if (error) {
    console.error('Error fetchBodegasVirtuales:', error)
    return []
  }
  return data ?? []
}

// ════════════════════════════════════════════════════════════
// STOCK EN BODEGA VIRTUAL (para seleccionar qué enviar)
// ════════════════════════════════════════════════════════════

export async function fetchStockVirtual(
  bodegaId: number
): Promise<StockVirtualItem[]> {
  const supabase = await createClient()

  // Obtenemos inventario_stock por producto sumando cajas
  const { data, error } = await supabase
    .from('inventario_stock')
    .select(`
      producto_id,
      cajas,
      piezas_sueltas,
      bodega_id,
      bodega:bodegas!inventario_stock_bodega_id_fkey (nombre),
      producto:productos!inventario_stock_producto_id_fkey (sku_base, nombre)
    `)
    .eq('bodega_id', bodegaId)
    .gt('cajas', 0)

  if (error || !data) {
    console.error('Error fetchStockVirtual:', error)
    return []
  }

  type StockRowType = {
    producto_id: number
    cajas: number | null
    piezas_sueltas: number | null
    bodega_id: number
    bodega: { nombre: string } | { nombre: string }[] | null
    producto: { sku_base: string; nombre: string } | { sku_base: string; nombre: string }[] | null
  }

  const rows = data as unknown as StockRowType[]

  // Agrupar por producto (pueden haber múltiples registros por producto si tienen caja_id distinto)
  const map = new Map<number, StockVirtualItem>()
  for (const row of rows) {
    const prod = row.producto
      ? (Array.isArray(row.producto) ? row.producto[0] : row.producto)
      : null
    const bodega = row.bodega
      ? (Array.isArray(row.bodega) ? row.bodega[0] : row.bodega)
      : null

    const existing = map.get(row.producto_id)
    if (existing) {
      existing.cajas_disponibles += Number(row.cajas ?? 0)
      existing.piezas_sueltas += Number(row.piezas_sueltas ?? 0)
    } else {
      map.set(row.producto_id, {
        producto_id: row.producto_id,
        sku_base: prod?.sku_base ?? null,
        producto_nombre: prod?.nombre ?? null,
        cajas_disponibles: Number(row.cajas ?? 0),
        piezas_sueltas: Number(row.piezas_sueltas ?? 0),
        bodega_id: row.bodega_id,
        bodega_nombre: bodega?.nombre ?? '',
      })
    }
  }

  return Array.from(map.values())
}

export async function fetchStockVirtualResumenes(
  bodegaIds: number[]
): Promise<Map<number, { totalCajas: number; totalProductos: number }>> {
  const resumenes = new Map<number, { totalCajas: number; totalProductos: number }>()

  if (bodegaIds.length === 0) {
    return resumenes
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventario_stock')
    .select('bodega_id, producto_id, cajas')
    .in('bodega_id', bodegaIds)
    .gt('cajas', 0)

  if (error || !data) {
    console.error('Error fetchStockVirtualResumenes:', error)
    return resumenes
  }

  const productosPorBodega = new Map<number, Set<number>>()

  for (const row of data) {
    const current = resumenes.get(row.bodega_id) ?? { totalCajas: 0, totalProductos: 0 }
    current.totalCajas += Number(row.cajas ?? 0)
    resumenes.set(row.bodega_id, current)

    if (!productosPorBodega.has(row.bodega_id)) {
      productosPorBodega.set(row.bodega_id, new Set())
    }

    productosPorBodega.get(row.bodega_id)!.add(row.producto_id)
  }

  for (const [bodegaId, productos] of productosPorBodega.entries()) {
    const current = resumenes.get(bodegaId) ?? { totalCajas: 0, totalProductos: 0 }
    current.totalProductos = productos.size
    resumenes.set(bodegaId, current)
  }

  return resumenes
}

// ════════════════════════════════════════════════════════════
// LISTADO DE DESPACHOS CON PAGINACIÓN
// ════════════════════════════════════════════════════════════

export async function fetchDespachos(
  filtros: FiltrosDespacho
): Promise<{ items: DespachoListaItem[]; total: number }> {
  const supabase = await createClient()
  const page = filtros.page ?? 1
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('despachos')
    .select(
      `*,
      bodega_origen:bodegas!despachos_bodega_origen_id_fkey (id, codigo, nombre, es_virtual, activa),
      bodega_destino:bodegas!despachos_bodega_destino_id_fkey (id, codigo, nombre, es_virtual, activa),
      detalles:despachos_detalles (cantidad_cajas_solicitadas, cantidad_cajas_cargadas, cantidad_cajas_recibidas)
      `,
      { count: 'exact' }
    )

  if (filtros.estado) {
    query = query.eq('estado', filtros.estado)
  }
  if (filtros.bodega_origen_id) {
    query = query.eq('bodega_origen_id', filtros.bodega_origen_id)
  }
  if (filtros.bodega_destino_id) {
    query = query.eq('bodega_destino_id', filtros.bodega_destino_id)
  }
  if (filtros.fecha_desde) {
    query = query.gte('fecha_programada', filtros.fecha_desde)
  }
  if (filtros.fecha_hasta) {
    query = query.lte('fecha_programada', filtros.fecha_hasta)
  }

  // Ordenar por fecha descendente (más recientes primero)
  query = query
    .order('created_at', { ascending: false })
    .range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetchDespachos:', error)
    return { items: [], total: 0 }
  }

  type DespachoQueryRow = Database['inv-tienda']['Tables']['despachos']['Row'] & {
    bodega_origen: Database['inv-tienda']['Tables']['bodegas']['Row'] | Database['inv-tienda']['Tables']['bodegas']['Row'][] | null
    bodega_destino: Database['inv-tienda']['Tables']['bodegas']['Row'] | Database['inv-tienda']['Tables']['bodegas']['Row'][] | null
    detalles: {
      cantidad_cajas_solicitadas: number | null
      cantidad_cajas_cargadas: number | null
      cantidad_cajas_recibidas: number | null
    }[] | null
  }

  const rows = (data ?? []) as unknown as DespachoQueryRow[]

  const items: DespachoListaItem[] = rows.map((d) => {
    const detalles = Array.isArray(d.detalles) ? d.detalles : []
    const totSolicitadas = detalles.reduce(
      (acc: number, det) => acc + (det.cantidad_cajas_solicitadas ?? 0),
      0
    )
    const totCargadas = detalles.reduce(
      (acc: number, det) => acc + (det.cantidad_cajas_cargadas ?? 0),
      0
    )
    const totRecibidas = detalles.reduce(
      (acc: number, det) => acc + (det.cantidad_cajas_recibidas ?? 0),
      0
    )

    const bodegaOrigen = d.bodega_origen
      ? Array.isArray(d.bodega_origen)
        ? d.bodega_origen[0]
        : d.bodega_origen
      : null
    const bodegaDestino = d.bodega_destino
      ? Array.isArray(d.bodega_destino)
        ? d.bodega_destino[0]
        : d.bodega_destino
      : null

    return {
      id: d.id,
      estado: d.estado,
      fecha_programada: d.fecha_programada,
      fecha_real_salida: d.fecha_real_salida,
      fecha_recepcion: d.fecha_recepcion,
      chofer: d.chofer,
      vehiculo_info: d.vehiculo_info,
      bodega_origen: bodegaOrigen,
      bodega_destino: bodegaDestino,
      total_cajas_solicitadas: totSolicitadas,
      total_cajas_cargadas: totCargadas,
      total_cajas_recibidas: totRecibidas,
      created_at: d.created_at,
    }
  })

  return { items, total: count ?? 0 }
}

// ════════════════════════════════════════════════════════════
// DETALLE DE DESPACHO CON PRODUCTOS
// ════════════════════════════════════════════════════════════

export async function fetchDespachoById(despachoId: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('despachos')
    .select(
      `*,
      bodega_origen:bodegas!despachos_bodega_origen_id_fkey (id, codigo, nombre, es_virtual, activa),
      bodega_destino:bodegas!despachos_bodega_destino_id_fkey (id, codigo, nombre, es_virtual, activa),
      detalles:despachos_detalles (
        id, caja_id, producto_id,
        cantidad_cajas_solicitadas, cantidad_cajas_cargadas, cantidad_cajas_recibidas,
        caja:cajas_producto!despachos_detalles_caja_id_fkey (codigo_caja),
        producto:productos!despachos_detalles_producto_id_fkey (sku_base, nombre)
      )
      `
    )
    .eq('id', despachoId)
    .single()

  if (error || !data) {
    console.error('Error fetchDespachoById:', error)
    return null
  }

  type DespachoDetailQueryRow = Database['inv-tienda']['Tables']['despachos']['Row'] & {
    bodega_origen: Database['inv-tienda']['Tables']['bodegas']['Row'] | Database['inv-tienda']['Tables']['bodegas']['Row'][] | null
    bodega_destino: Database['inv-tienda']['Tables']['bodegas']['Row'] | Database['inv-tienda']['Tables']['bodegas']['Row'][] | null
    detalles: {
      id: number
      caja_id: number | null
      producto_id: number | null
      cantidad_cajas_solicitadas: number | null
      cantidad_cajas_cargadas: number | null
      cantidad_cajas_recibidas: number | null
      caja: { codigo_caja: string } | { codigo_caja: string }[] | null
      producto: { sku_base: string; nombre: string } | { sku_base: string; nombre: string }[] | null
    }[] | null
  }

  const typedData = data as unknown as DespachoDetailQueryRow

  const detalles = Array.isArray(typedData.detalles) ? typedData.detalles : []
  const detallesProcesados = detalles.map((det) => {
    const caja = det.caja
      ? Array.isArray(det.caja)
        ? det.caja[0]
        : det.caja
      : null
    const prod = det.producto
      ? Array.isArray(det.producto)
        ? det.producto[0]
        : det.producto
      : null
    return {
      ...det,
      caja_codigo: caja?.codigo_caja ?? null,
      producto_sku: prod?.sku_base ?? null,
      producto_nombre: prod?.nombre ?? null,
    }
  })

  return {
    ...typedData,
    bodega_origen: typedData.bodega_origen
      ? Array.isArray(typedData.bodega_origen)
        ? typedData.bodega_origen[0]
        : typedData.bodega_origen
      : null,
    bodega_destino: typedData.bodega_destino
      ? Array.isArray(typedData.bodega_destino)
        ? typedData.bodega_destino[0]
        : typedData.bodega_destino
      : null,
    detalles: detallesProcesados,
  }
}
