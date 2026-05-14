// modules/contenedores/queries.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { PAGE_SIZE } from '@/lib/constants'
import type {
  FiltrosContenedores, ContenedorResumen,
  ContenedorPackingItem, OrdenEnContenedor,
  OrdenDisponible, CajaEnContenedor,
} from './types'
import type { ContenedorRow } from '@/lib/types/tables'

// ════════════════════════════════════════════════════════════
// LISTADO (usa v_contenedor_resumen)
// ════════════════════════════════════════════════════════════

export async function fetchContenedores(
  filtros: FiltrosContenedores
): Promise<{ items: ContenedorResumen[]; total: number }> {
  const supabase = await createClient()
  const page = filtros.page ?? 1
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('v_contenedor_resumen')
    .select('*', { count: 'exact' })

  if (filtros.q) {
    const term = `%${filtros.q}%`
    query = query.or(
      `numero_contenedor.ilike.${term},codigo_contenedor.ilike.${term},numero_bl.ilike.${term}`
    )
  }

  if (filtros.estado) {
    query = query.eq('estado', filtros.estado)
  }

  if (filtros.año) {
    query = query
      .gte('fecha_eta', `${filtros.año}-01-01`)
      .lt('fecha_eta', `${filtros.año + 1}-01-01`)
  }

  query = query
    .order('fecha_eta', { ascending: false, nullsFirst: false })
    .range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetchContenedores:', error)
    return { items: [], total: 0 }
  }

  return {
    items: (data ?? []) as ContenedorResumen[],
    total: count ?? 0,
  }
}

// ════════════════════════════════════════════════════════════
// DETALLE
// ════════════════════════════════════════════════════════════

export async function fetchContenedorById(
  id: number
): Promise<ContenedorRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contenedores')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as ContenedorRow
}

export async function fetchContenedorResumen(
  id: number
): Promise<ContenedorResumen | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_contenedor_resumen')
    .select('*')
    .eq('contenedor_id', id)
    .single()

  if (error || !data) return null
  return data as ContenedorResumen
}

export async function fetchOrdenesDeContenedor(
  contenedorId: number
): Promise<OrdenEnContenedor[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ordenes_b2b')
    .select(`
      id, folio_proveedor, estado, moneda, tipo_cambio, observaciones,
      total_cajas, total_piezas, cbm_orden, fecha_orden,
      proveedor:personas!ordenes_b2b_proveedor_id_fkey (nombre_completo),
      cliente:personas!ordenes_b2b_cliente_b2b_id_fkey (nombre_completo),
      contenedor:contenedores!ordenes_b2b_contenedor_id_fkey (codigo_contenedor)
    `)
    .eq('contenedor_id', contenedorId)
    .order('id')

  if (error || !data) return []

  return data.map((o: any) => {
    const prov = Array.isArray(o.proveedor) ? o.proveedor[0] : o.proveedor
    const client = Array.isArray(o.cliente) ? o.cliente[0] : o.cliente
    const cont = Array.isArray(o.contenedor) ? o.contenedor[0] : o.contenedor
    return {
      id: o.id,
      folio_proveedor: o.folio_proveedor,
      estado: o.estado,
      moneda: o.moneda,
      tipo_cambio: o.tipo_cambio,
      observaciones: o.observaciones,
      total_cajas: o.total_cajas,
      total_piezas: o.total_piezas,
      cbm_orden: o.cbm_orden,
      proveedor_nombre: prov?.nombre_completo ?? null,
      cliente_nombre: client?.nombre_completo ?? null,
      contenedor_codigo: cont?.codigo_contenedor ?? null,
      fecha_orden: o.fecha_orden,
    }
  })
}

export async function fetchContenedorPacking(
  contenedorId: number
): Promise<ContenedorPackingItem[]> {
  const supabase = await createClient()

  const { data: cont } = await supabase
    .from('contenedores')
    .select('codigo_contenedor')
    .eq('id', contenedorId)
    .single()

  if (!cont) return []

  const { data, error } = await supabase
    .from('v_contenedor_packing')
    .select('*')
    .eq('codigo_contenedor', cont.codigo_contenedor)
    .order('orden_id')

  if (error) {
    console.error('Error fetchContenedorPacking:', JSON.stringify(error, null, 2))
    return []
  }

  if (!data) return []

  return data as unknown as ContenedorPackingItem[]
}

// ════════════════════════════════════════════════════════════
// ÓRDENES DISPONIBLES PARA VINCULAR
// ════════════════════════════════════════════════════════════

export async function fetchOrdenesDisponibles(
  contenedorId: number,
  q?: string,
): Promise<OrdenDisponible[]> {
  const supabase = await createClient()

  let query = supabase
    .from('ordenes_b2b')
    .select(`
      id, folio_proveedor, estado, moneda,
      total_cajas, total_piezas, fecha_orden, contenedor_id,
      proveedor:personas!ordenes_b2b_proveedor_id_fkey (nombre_completo)
    `)
    .or(`contenedor_id.is.null,contenedor_id.eq.${contenedorId}`)
    .neq('estado', 'Cancelada')
    .order('fecha_orden', { ascending: false })
    .limit(50)

  if (q) {
    const term = `%${q}%`
    query = query.or(`folio_proveedor.ilike.${term}`)
  }

  const { data, error } = await query

  if (error || !data) return []

  return data.map((o: any) => {
    const prov = Array.isArray(o.proveedor) ? o.proveedor[0] : o.proveedor
    return {
      id: o.id,
      folio_proveedor: o.folio_proveedor,
      estado: o.estado,
      moneda: o.moneda,
      proveedor_nombre: prov?.nombre_completo ?? null,
      total_cajas: o.total_cajas,
      total_piezas: o.total_piezas,
      fecha_orden: o.fecha_orden,
      contenedor_id: o.contenedor_id,
    }
  })
}

// ════════════════════════════════════════════════════════════
// CAJAS DEL CONTENEDOR (para tab Cajas)
// ════════════════════════════════════════════════════════════

export async function fetchCajasDeContenedor(
  contenedorId: number,
): Promise<CajaEnContenedor[]> {
  const supabase = await createClient()

  // 1. Obtener órdenes del contenedor
  const { data: ordenes } = await supabase
    .from('ordenes_b2b')
    .select('id, folio_proveedor')
    .eq('contenedor_id', contenedorId)

  if (!ordenes || ordenes.length === 0) return []

  const ordenIds = ordenes.map((o: any) => o.id)
  const ordenMap = new Map(ordenes.map((o: any) => [o.id, o]))

  // 2. Obtener orden_cajas con cajas_producto + detalles
  const { data: ordenCajas, error } = await supabase
    .from('orden_cajas')
    .select(`
      id, orden_id, caja_id, cantidad_cajas,
      caja:cajas_producto!orden_cajas_caja_id_fkey (
        id, codigo_caja, nombre_pack, producto_id,
        piezas_por_caja, cbm, peso_bruto_kg,
        largo_cm, ancho_cm, alto_cm, costo_total_caja,
        tallas, colores, es_principal,
        producto:productos!cajas_producto_producto_id_fkey (sku_base),
        caja_detalles (
          cantidad,
          talla:cat_tallas!caja_detalles_talla_id_fkey (codigo, nombre),
          color:cat_colores!caja_detalles_color_id_fkey (nombre, hex_code)
        )
      )
    `)
    .in('orden_id', ordenIds)

  if (error || !ordenCajas) return []

  return ordenCajas.map((oc: any) => {
    const c = Array.isArray(oc.caja) ? oc.caja[0] : oc.caja
    const p = c?.producto
      ? (Array.isArray(c.producto) ? c.producto[0] : c.producto)
      : null
    const orden = ordenMap.get(oc.orden_id)

    // Build contenidoMap from caja_detalles
    let contenidoMap = null
    const detalles = Array.isArray(c?.caja_detalles) ? c.caja_detalles : []
    if (detalles.length > 0) {
      const ts = new Set<string>()
      const cs = new Set<string>()
      const mt: Record<string, Record<string, number>> = {}
      let total = 0
      for (const d of detalles) {
        const tallaObj = Array.isArray(d.talla) ? d.talla[0] : d.talla
        const colorObj = Array.isArray(d.color) ? d.color[0] : d.color
        const cod = tallaObj?.codigo ?? tallaObj?.nombre ?? '?'
        const col = colorObj?.nombre ?? '?'
        const qty = Number(d.cantidad) || 0
        ts.add(cod)
        cs.add(col)
        if (!mt[col]) mt[col] = {}
        mt[col][cod] = (mt[col][cod] ?? 0) + qty
        total += qty
      }
      contenidoMap = { tallas: Array.from(ts).sort(), colores: Array.from(cs).sort(), matriz: mt, totalPiezas: total }
    }

    return {
      id: c?.id ?? 0,
      codigo_caja: c?.codigo_caja ?? '',
      nombre_pack: c?.nombre_pack ?? null,
      producto_id: c?.producto_id ?? null,
      producto_sku: p?.sku_base ?? null,
      piezas_por_caja: c?.piezas_por_caja ?? null,
      cbm: c?.cbm ?? null,
      peso_bruto_kg: c?.peso_bruto_kg ?? null,
      largo_cm: c?.largo_cm ?? null,
      ancho_cm: c?.ancho_cm ?? null,
      alto_cm: c?.alto_cm ?? null,
      costo_total_caja: c?.costo_total_caja ?? null,
      tallas: c?.tallas ?? null,
      colores: c?.colores ?? null,
      contenidoMap,
      cantidad_cajas: oc.cantidad_cajas,
      es_principal: c?.es_principal ?? null,
      ordenCajaId: oc.id,
      ordenId: oc.orden_id,
      ordenFolio: orden?.folio_proveedor ?? null,
    }
  })
}
