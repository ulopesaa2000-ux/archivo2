// modules/contenedores/queries.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { PAGE_SIZE } from '@/lib/constants'
import type {
  FiltrosContenedores, ContenedorResumen,
  ContenedorPackingItem, OrdenEnContenedor, ContenedorSortBy,
  OrdenDisponible, CajaEnContenedor, ContenedorReporteItem,
} from './types'
import type { ContenedorRow } from '@/lib/types/tables'
import { getCurrentUser } from '@/modules/auth/queries'
import { buildCommercialOrderFilter, getCommercialScope } from '@/lib/auth/commercial-scope'

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
  const sortBy: ContenedorSortBy = filtros.sort_by ?? 'fecha_eta'
  const ascending = filtros.order === 'asc'

  const currentUser = await getCurrentUser()
  const scope = await getCommercialScope(supabase, currentUser)

  let query = supabase
    .from('v_contenedor_resumen')
    .select('*', { count: 'exact' })

  if (!scope.is_super_admin) {
    const orderFilter = buildCommercialOrderFilter(scope)
    if (!orderFilter || orderFilter === '__no_access__.eq.true') {
      return { items: [], total: 0 }
    }

    const { data: ordenes } = await (supabase.from('ordenes_b2b') as any)
      .select('contenedor_id')
      .or(orderFilter)
      .not('contenedor_id', 'is', null)

    const contenedorIds = Array.from(new Set((ordenes ?? []).map((o: any) => o.contenedor_id).filter(Boolean))) as number[]

    if (contenedorIds.length === 0) {
      return { items: [], total: 0 }
    }

    query = query.in('contenedor_id', contenedorIds)
  }

  if (filtros.q) {
    const term = `%${filtros.q}%`
    query = query.or(
      `numero_contenedor.ilike.${term},codigo_contenedor.ilike.${term},numero_bl.ilike.${term}`
    )
  }

  if (filtros.estado) {
    query = query.eq('estado', filtros.estado)
  }

  if (filtros.anio) {
    query = query
      .gte('fecha_eta', `${filtros.anio}-01-01`)
      .lt('fecha_eta', `${filtros.anio + 1}-01-01`)
  }

  query = query
    .order(sortBy, { ascending, nullsFirst: !ascending })
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
  const currentUser = await getCurrentUser()
  const scope = await getCommercialScope(supabase, currentUser)

  if (!scope.is_super_admin) {
    const orderFilter = buildCommercialOrderFilter(scope)
    if (!orderFilter || orderFilter === '__no_access__.eq.true') return null

    const { data: ordenes } = await (supabase.from('ordenes_b2b') as any)
      .select('id')
      .eq('contenedor_id', id)
      .or(orderFilter)
      .limit(1)

    if (!ordenes || ordenes.length === 0) {
      return null
    }
  }

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
  const currentUser = await getCurrentUser()
  const scope = await getCommercialScope(supabase, currentUser)

  let query: any = supabase
    .from('ordenes_b2b')
    .select(`
      id, cliente_b2b_id, proveedor_id, folio_proveedor, estado, moneda, tipo_cambio, observaciones,
      total_cajas, total_piezas, cbm_orden, fecha_orden,
      proveedor:personas!ordenes_b2b_proveedor_id_fkey (nombre_completo),
      cliente:personas!ordenes_b2b_cliente_b2b_id_fkey (nombre_completo),
      contenedor:contenedores!ordenes_b2b_contenedor_id_fkey (codigo_contenedor)
    `)
    .eq('contenedor_id', contenedorId)
    .order('id')

  if (!scope.is_super_admin) {
    const orderFilter = buildCommercialOrderFilter(scope)
    if (!orderFilter || orderFilter === '__no_access__.eq.true') return []
    query = query.or(orderFilter)
  }

  const { data, error } = await query

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
  const currentUser = await getCurrentUser()
  const scope = await getCommercialScope(supabase, currentUser)

  const { data: cont } = await supabase
    .from('contenedores')
    .select('codigo_contenedor')
    .eq('id', contenedorId)
    .single()

  if (!cont) return []

  let query = supabase
    .from('v_contenedor_packing')
    .select('*')
    .eq('codigo_contenedor', cont.codigo_contenedor)

  if (!scope.is_super_admin) {
    const orderFilter = buildCommercialOrderFilter(scope)
    if (!orderFilter || orderFilter === '__no_access__.eq.true') return []

    // Obtener los IDs de las órdenes permitidas en este contenedor
    const { data: allowedOrders } = await (supabase.from('ordenes_b2b') as any)
      .select('id')
      .eq('contenedor_id', contenedorId)
      .or(orderFilter)

    const allowedIds = (allowedOrders ?? []).map((o: any) => o.id)
    if (allowedIds.length === 0) return []

    query = query.in('orden_id', allowedIds)
  }

  query = query.order('orden_id')

  const { data, error } = await query

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
  const currentUser = await getCurrentUser()
  const scope = await getCommercialScope(supabase, currentUser)

  let query: any = supabase
    .from('ordenes_b2b')
    .select(`
      id, cliente_b2b_id, proveedor_id, folio_proveedor, estado, moneda,
      total_cajas, total_piezas, fecha_orden, contenedor_id,
      proveedor:personas!ordenes_b2b_proveedor_id_fkey (nombre_completo)
    `)
    .or(`contenedor_id.is.null,contenedor_id.eq.${contenedorId}`)
    .neq('estado', 'Cancelada')
    .order('fecha_orden', { ascending: false })
    .limit(50)

  if (!scope.is_super_admin) {
    const orderFilter = buildCommercialOrderFilter(scope)
    if (!orderFilter || orderFilter === '__no_access__.eq.true') return []
    query = query.or(`${orderFilter},contenedor_id.is.null,contenedor_id.eq.${contenedorId}`)
  }

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
  const currentUser = await getCurrentUser()
  const scope = await getCommercialScope(supabase, currentUser)

  // 1. Obtener órdenes del contenedor con filtro de alcance comercial
  let query = supabase
    .from('ordenes_b2b')
    .select('id, folio_proveedor')
    .eq('contenedor_id', contenedorId)

  if (!scope.is_super_admin) {
    const orderFilter = buildCommercialOrderFilter(scope)
    if (!orderFilter || orderFilter === '__no_access__.eq.true') return []
    query = query.or(orderFilter)
  }

  const { data: ordenes } = await query

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

export async function fetchContenedoresReporteAnual(): Promise<ContenedorReporteItem[]> {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const scope = await getCommercialScope(supabase, currentUser)

  let query: any = supabase
    .from('ordenes_b2b')
    .select(`
      contenedor_id,
      proveedor_id,
      proveedor:personas!ordenes_b2b_proveedor_id_fkey (nombre_completo),
      contenedor:contenedores!ordenes_b2b_contenedor_id_fkey (
        id, codigo_contenedor, numero_contenedor, estado, fecha_eta
      )
    `)
    .not('contenedor_id', 'is', null)

  if (!scope.is_super_admin) {
    const orderFilter = buildCommercialOrderFilter(scope)
    if (!orderFilter || orderFilter === '__no_access__.eq.true') return []
    query = query.or(orderFilter)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('Error fetchContenedoresReporteAnual:', error)
    return []
  }

  const map = new Map<number, { proveedor_nombre: string; contenedoresMap: Map<number, any> }>()

  for (const o of data) {
    const provId = o.proveedor_id
    if (!provId) continue
    const prov = Array.isArray(o.proveedor) ? o.proveedor[0] : o.proveedor
    const cont = Array.isArray(o.contenedor) ? o.contenedor[0] : o.contenedor
    if (!cont) continue

    if (!map.has(provId)) {
      map.set(provId, {
        proveedor_nombre: prov?.nombre_completo ?? 'Proveedor Desconocido',
        contenedoresMap: new Map()
      })
    }

    const supplierInfo = map.get(provId)!
    if (!supplierInfo.contenedoresMap.has(cont.id)) {
      supplierInfo.contenedoresMap.set(cont.id, cont)
    }
  }

  const result: ContenedorReporteItem[] = []

  for (const [provId, info] of map.entries()) {
    const anios: Record<number, { cantidad: number; contenedores: any[] }> = {}

    for (const cont of info.contenedoresMap.values()) {
      const dateStr = cont.fecha_eta
      const year = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear()

      if (!anios[year]) {
        anios[year] = { cantidad: 0, contenedores: [] }
      }

      anios[year].cantidad++
      anios[year].contenedores.push({
        id: cont.id,
        codigo_contenedor: cont.codigo_contenedor,
        numero_contenedor: cont.numero_contenedor,
        estado: cont.estado,
        fecha_eta: cont.fecha_eta
      })
    }

    result.push({
      proveedor_id: provId,
      proveedor_nombre: info.proveedor_nombre,
      anios
    })
  }

  return result.sort((a, b) => a.proveedor_nombre.localeCompare(b.proveedor_nombre))
}

export async function fetchContenedoresDetalleAnual(
  anio: number
): Promise<any[]> {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const scope = await getCommercialScope(supabase, currentUser)

  // 1. Obtener contenedores del año
  const { data: contenedores, error } = await supabase
    .from('contenedores')
    .select('*')
    .gte('fecha_eta', `${anio}-01-01`)
    .lt('fecha_eta', `${anio + 1}-01-01`)
    .order('fecha_eta', { ascending: false })

  if (error || !contenedores) {
    console.error('Error fetchContenedoresDetalleAnual:', error)
    return []
  }

  const contIds = contenedores.map((c) => c.id)
  if (contIds.length === 0) return []

  // 2. Obtener órdenes asociadas
  let query: any = supabase
    .from('ordenes_b2b')
    .select(`
      id, folio_proveedor, estado, total_cajas, total_piezas, cbm_orden, contenedor_id,
      proveedor:personas!ordenes_b2b_proveedor_id_fkey (nombre_completo)
    `)
    .in('contenedor_id', contIds)

  if (!scope.is_super_admin) {
    const orderFilter = buildCommercialOrderFilter(scope)
    if (!orderFilter || orderFilter === '__no_access__.eq.true') {
      // Retornar contenedores vacíos si no hay acceso a órdenes
      return contenedores.map((c) => ({
        ...c,
        proveedores_nombres: 'Sin acceso',
        folios_ordenes: '',
        cajas_totales: 0,
        piezas_totales: 0,
        cbm_ocupado: 0,
        ordenes: [],
      }))
    }
    query = query.or(orderFilter)
  }

  const { data: ordenes } = await query

  // Agrupar órdenes por contenedor
  const ordenesPorContenedor: Record<number, any[]> = {}
  for (const o of (ordenes ?? [])) {
    const cid = o.contenedor_id
    if (!cid) continue
    if (!ordenesPorContenedor[cid]) ordenesPorContenedor[cid] = []
    ordenesPorContenedor[cid].push(o)
  }

  return contenedores.map((c) => {
    const ords = ordenesPorContenedor[c.id] ?? []
    const proveedores = Array.from(
      new Set(
        ords
          .map((o) => {
            const prov = Array.isArray(o.proveedor) ? o.proveedor[0] : o.proveedor
            return prov?.nombre_completo ?? 'Desconocido'
          })
          .filter(Boolean)
      )
    )

    const totalCajas = ords.reduce((sum, o) => sum + (o.total_cajas ?? 0), 0)
    const totalPiezas = ords.reduce((sum, o) => sum + (o.total_piezas ?? 0), 0)
    const cbmOcupado = ords.reduce((sum, o) => sum + (o.cbm_orden ?? 0), 0)

    return {
      ...c,
      proveedores_nombres: proveedores.join(', '),
      folios_ordenes: ords
        .map((o) => o.folio_proveedor)
        .filter(Boolean)
        .join(', '),
      cajas_totales: totalCajas,
      piezas_totales: totalPiezas,
      cbm_ocupado: cbmOcupado,
      ordenes: ords.map((o) => {
        const prov = Array.isArray(o.proveedor) ? o.proveedor[0] : o.proveedor
        return {
          id: o.id,
          folio_proveedor: o.folio_proveedor,
          estado: o.estado,
          total_cajas: o.total_cajas,
          total_piezas: o.total_piezas,
          cbm_orden: o.cbm_orden,
          proveedor_nombre: prov?.nombre_completo ?? 'Desconocido',
        }
      }),
    }
  })
}

