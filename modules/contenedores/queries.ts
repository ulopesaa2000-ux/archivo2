// modules/contenedores/queries.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { PAGE_SIZE } from '@/lib/constants'
import type {
  FiltrosContenedores, ContenedorResumen,
  ContenedorPackingItem, OrdenEnContenedor, ContenedorSortBy,
  OrdenDisponible, CajaEnContenedor, ContenedorReporteItem,
  ResumenContenedorData, ResumenItemData,
} from './types'
import type { ContenedorRow } from '@/lib/types/tables'
import { getCommercialScope } from '@/lib/dal'
import { buildCommercialOrderFilter } from '@/lib/auth/commercial-scope'

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

  const scope = await getCommercialScope()

  let query = supabase
    .from('v_contenedor_resumen')
    .select('*', { count: 'exact' })

  if (!scope.is_super_admin) {
    const orderFilter = buildCommercialOrderFilter(scope)
    if (!orderFilter || orderFilter === '__no_access__.eq.true') {
      return { items: [], total: 0 }
    }

    const { data: ordenes } = await supabase.from('ordenes_b2b')
      .select('contenedor_id')
      .eq('activo', true)
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
  const scope = await getCommercialScope()

  if (!scope.is_super_admin) {
    const orderFilter = buildCommercialOrderFilter(scope)
    if (!orderFilter || orderFilter === '__no_access__.eq.true') return null

    const { data: ordenes } = await supabase.from('ordenes_b2b')
      .select('id')
      .eq('contenedor_id', id)
      .eq('activo', true)
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
  const scope = await getCommercialScope()

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
    .eq('activo', true)
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
  const scope = await getCommercialScope()

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
    const { data: allowedOrders } = await supabase.from('ordenes_b2b')
      .select('id')
      .eq('contenedor_id', contenedorId)
      .eq('activo', true)
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
  const scope = await getCommercialScope()

  let query: any = supabase
    .from('ordenes_b2b')
    .select(`
      id, cliente_b2b_id, proveedor_id, folio_proveedor, estado, moneda,
      total_cajas, total_piezas, fecha_orden, contenedor_id,
      proveedor:personas!ordenes_b2b_proveedor_id_fkey (nombre_completo)
    `)
    .eq('activo', true)
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
  const scope = await getCommercialScope()

  // 1. Obtener órdenes del contenedor con filtro de alcance comercial
  let query = supabase
    .from('ordenes_b2b')
    .select('id, folio_proveedor')
    .eq('contenedor_id', contenedorId)
    .eq('activo', true)

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
  const scope = await getCommercialScope()

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
  const scope = await getCommercialScope()

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

// ════════════════════════════════════════════════════════════
// REPORTE RESUMEN DE CONTENEDOR (Formato HAMU1553617)
// ════════════════════════════════════════════════════════════

export async function fetchContenedorReporteResumen(
  contenedorId: number
): Promise<ResumenContenedorData | null> {
  const supabase = await createClient()

  // 1. Contenedor
  const { data: cont, error: contErr } = await supabase
    .from('contenedores')
    .select('*')
    .eq('id', contenedorId)
    .single()

  if (contErr || !cont) return null

  const docs = (cont.documentos_checklist as Record<string, any>) || {}

  // 2. Órdenes del contenedor
  const { data: ordenes, error: ordErr } = await supabase
    .from('ordenes_b2b')
    .select('id, folio_proveedor, estado, cbm_orden, moneda, tipo_cambio')
    .eq('contenedor_id', contenedorId)
    .eq('activo', true)
    .order('id')

  const ordenIds = (ordenes || []).map((o: any) => o.id)
  if (ordenIds.length === 0) {
    return {
      contenedorId: cont.id,
      codigoContenedor: cont.codigo_contenedor,
      numeroContenedor: cont.numero_contenedor || cont.codigo_contenedor,
      fechaSalidaBl: cont.fecha_etd,
      fechaLlegadaReal: cont.fecha_llegada_real,
      fechaEta: cont.fecha_eta,
      naviera: cont.naviera,
      buque: cont.buque,
      importador: docs.importador || cont.naviera || null,
      pagador: docs.pagador || docs.importador || null,
      puertoOrigen: cont.puerto_origen,
      puertoDestino: cont.puerto_destino,
      costoDesaduanamiento: cont.costo_desaduanamiento,
      costoIsf: docs.costo_isf !== undefined ? Number(docs.costo_isf) : 350,
      costoFleteMaritimo: cont.costo_flete_maritimo,
      resumenPrendasTitulo: 'RESUMEN DE PRENDAS',
      items: [],
      balance: docs.balance !== undefined ? Number(docs.balance) : 0,
      demoras: docs.demoras || '',
      almacenajes: docs.almacenajes || '',
      fechaLlegadaAlmacen: docs.fecha_llegada_almacen || '',
    }
  }

  // 3. Detalles de las órdenes
  const { data: detalles } = await supabase
    .from('ordenes_b2b_detalles')
    .select(`
      id, orden_id, producto_id, cantidad_solicitada, precio_unitario, importe_total, cbm_detalle,
      cajas_pedidas, piezas_pedidas,
      producto:productos!ordenes_b2b_detalles_producto_id_fkey (
        id, sku_base, nombre, descripcion, composicion, familia,
        tipo_prenda:cat_tipo_prenda!productos_tipo_prenda_id_fkey (nombre),
        genero:cat_generos!productos_genero_id_fkey (nombre),
        imagenes:producto_imagenes (url, es_principal)
      )
    `)
    .in('orden_id', ordenIds)

  const detalleMap = new Map<string, any>()
  ;(detalles || []).forEach((d: any) => {
    detalleMap.set(`${d.orden_id}_${d.producto_id}`, d)
  })

  // 4. Cajas de las órdenes
  const { data: ordenCajas } = await supabase
    .from('orden_cajas')
    .select(`
      id, orden_id, caja_id, cantidad_cajas,
      caja:cajas_producto!orden_cajas_caja_id_fkey (
        id, codigo_caja, nombre_pack, producto_id,
        piezas_por_caja, cbm, peso_bruto_kg,
        producto:productos!cajas_producto_producto_id_fkey (
          id, sku_base, nombre, descripcion, composicion, familia,
          tipo_prenda:cat_tipo_prenda!productos_tipo_prenda_id_fkey (nombre),
          genero:cat_generos!productos_genero_id_fkey (nombre),
          imagenes:producto_imagenes (url, es_principal)
        )
      )
    `)
    .in('orden_id', ordenIds)

  const rawItems: ResumenItemData[] = []

  // Procesar orden_cajas si existen
  if (ordenCajas && ordenCajas.length > 0) {
    for (const oc of ordenCajas as any[]) {
      const c = oc.caja
      const p = c?.producto
      if (!p) continue

      const detalle = detalleMap.get(`${oc.orden_id}_${p.id}`)

      const imgs = p.imagenes || []
      const mainImg = imgs.find((i: any) => i.es_principal) || imgs[0]

      const totalCajas = oc.cantidad_cajas || 0
      let pzCaja = c.piezas_por_caja || 0
      if (pzCaja === 0 && detalle && detalle.piezas_pedidas && detalle.cajas_pedidas) {
        pzCaja = Math.round(detalle.piezas_pedidas / detalle.cajas_pedidas)
      }
      const piezasTotales = totalCajas * pzCaja
      const precioUsd = Number(detalle?.precio_unitario) || 0
      const importeTotal = Number((piezasTotales * precioUsd).toFixed(2))
      const cbm = Number(((c.cbm || 0) * totalCajas).toFixed(4)) || Number(detalle?.cbm_detalle || 0)

      rawItems.push({
        id: `caja_${oc.id}_${c.id}`,
        ordenId: oc.orden_id,
        ordenDetalleId: detalle?.id || null,
        cajaId: c.id,
        productoId: p.id,
        control: 0,
        imagenUrl: mainImg?.url || null,
        modelo: p.sku_base,
        skuBase: p.sku_base,
        nombrePack: c.nombre_pack || null,
        descripcion: p.descripcion || p.nombre || '',
        composicion: p.composicion || '',
        piezasTotales,
        totalCajas,
        piezasPorCaja: pzCaja,
        precioUsd,
        importeTotal,
        cbm,
      })
    }
  }

  // Si hay detalles que no tienen registro en orden_cajas
  for (const d of (detalles || []) as any[]) {
    const p = d.producto
    if (!p) continue

    const alreadyInItems = rawItems.some((it) => it.ordenId === d.orden_id && it.productoId === p.id)
    if (!alreadyInItems) {
      const imgs = p.imagenes || []
      const mainImg = imgs.find((i: any) => i.es_principal) || imgs[0]

      const totalCajas = d.cajas_pedidas || 0
      const piezasTotales = d.piezas_pedidas || d.cantidad_solicitada || 0
      const pzCaja = totalCajas > 0 ? Math.round(piezasTotales / totalCajas) : piezasTotales
      const precioUsd = Number(d.precio_unitario) || 0
      const importeTotal = Number((piezasTotales * precioUsd).toFixed(2)) || Number((d.importe_total || 0).toFixed(2))
      const cbm = Number((d.cbm_detalle || 0).toFixed(4))

      rawItems.push({
        id: `detalle_${d.id}`,
        ordenId: d.orden_id,
        ordenDetalleId: d.id,
        cajaId: null,
        productoId: p.id,
        control: 0,
        imagenUrl: mainImg?.url || null,
        modelo: p.sku_base,
        skuBase: p.sku_base,
        nombrePack: null,
        descripcion: p.descripcion || p.nombre || '',
        composicion: p.composicion || '',
        piezasTotales,
        totalCajas,
        piezasPorCaja: pzCaja,
        precioUsd,
        importeTotal,
        cbm,
      })
    }
  }

  // CONSOLIDACIÓN Y AGRUPACIÓN POR MODELO / SKU
  const groupsMap = new Map<string, ResumenItemData & { _maxCajas: number }>()

  for (const it of rawItems) {
    // Normalizar nombre de pack (ignorar variantes que significan pack único)
    let pack = (it.nombrePack || '').trim().toUpperCase()
    if (
      pack === 'PACK UNICO' ||
      pack === 'UNICO' ||
      pack === 'PACK ÚNICO' ||
      pack === 'ÚNICO' ||
      pack === 'DEFAULT' ||
      pack === 'STANDARD' ||
      pack === 'PRINCIPAL' ||
      pack === 'A01' ||
      pack === 'B01' ||
      pack === 'C01'
    ) {
      pack = ''
    }

    // Extraer identificador de pack si es PACK A, PACK B, etc.
    const packMatch = pack.match(/PACK\s+([A-Z0-9]+)/i) || pack.match(/^([A-Z0-9]+)$/i)
    if (packMatch && pack.includes('PACK')) {
      pack = `PACK ${packMatch[1]}`
    }

    const key = `${it.productoId}_${pack}`

    if (!groupsMap.has(key)) {
      let modelo = it.skuBase
      if (pack && !modelo.toUpperCase().includes(pack)) {
        modelo = `${modelo} ${pack}`
      }

      groupsMap.set(key, {
        id: `group_${key}`,
        ordenId: it.ordenId,
        ordenDetalleId: it.ordenDetalleId,
        cajaId: it.cajaId,
        productoId: it.productoId,
        control: 0,
        imagenUrl: it.imagenUrl,
        modelo: modelo.trim(),
        skuBase: it.skuBase,
        nombrePack: pack || null,
        descripcion: it.descripcion,
        composicion: it.composicion,
        totalCajas: 0,
        piezasPorCaja: it.piezasPorCaja,
        piezasTotales: 0,
        precioUsd: it.precioUsd,
        importeTotal: 0,
        cbm: 0,
        _maxCajas: -1,
      })
    }

    const grp = groupsMap.get(key)!
    grp.totalCajas += it.totalCajas || 0
    grp.piezasTotales += it.piezasTotales || ((it.totalCajas || 0) * (it.piezasPorCaja || 0))
    grp.cbm = Number((grp.cbm + (it.cbm || 0)).toFixed(4))

    // Caja predominante: tomar piezasPorCaja de la entrada con mayor número de cajas
    if ((it.totalCajas || 0) > grp._maxCajas) {
      grp._maxCajas = it.totalCajas || 0
      if (it.piezasPorCaja > 0) {
        grp.piezasPorCaja = it.piezasPorCaja
      }
    }

    if (it.precioUsd > 0 && grp.precioUsd === 0) {
      grp.precioUsd = it.precioUsd
    }
    if (it.composicion && !grp.composicion) {
      grp.composicion = it.composicion
    }
    if (it.imagenUrl && !grp.imagenUrl) {
      grp.imagenUrl = it.imagenUrl
    }
  }

  // Generar lista final consolidada con numeración de control
  let controlIdx = 1
  const items: ResumenItemData[] = []
  for (const grp of groupsMap.values()) {
    const piezasTotales = grp.piezasTotales > 0 ? grp.piezasTotales : (grp.totalCajas * grp.piezasPorCaja)
    const importeTotal = Number((piezasTotales * grp.precioUsd).toFixed(2))

    items.push({
      id: grp.id,
      ordenId: grp.ordenId,
      ordenDetalleId: grp.ordenDetalleId,
      cajaId: grp.cajaId,
      productoId: grp.productoId,
      control: controlIdx++,
      imagenUrl: grp.imagenUrl,
      modelo: grp.modelo,
      skuBase: grp.skuBase,
      nombrePack: grp.nombrePack,
      descripcion: grp.descripcion,
      composicion: grp.composicion,
      totalCajas: grp.totalCajas,
      piezasPorCaja: grp.piezasPorCaja,
      piezasTotales,
      precioUsd: grp.precioUsd,
      importeTotal,
      cbm: grp.cbm,
    })
  }

  // Generar título dinámico de resumen de prendas para Col B
  const tiposSet = new Set<string>()
  ;(detalles || []).forEach((d: any) => {
    const p = d.producto
    if (p) {
      const tp = p.tipo_prenda?.nombre || p.familia
      const g = p.genero?.nombre
      if (tp && g) tiposSet.add(`${tp.toUpperCase()} ${g.toUpperCase()}`)
      else if (tp) tiposSet.add(tp.toUpperCase())
    }
  })

  const resumenPrendasTitulo = tiposSet.size > 0
    ? Array.from(tiposSet).join('; ')
    : 'CONJ. DEP. CHAM Y SUD. DAMA; CHAM. CAB.'

  return {
    contenedorId: cont.id,
    codigoContenedor: cont.codigo_contenedor,
    numeroContenedor: cont.numero_contenedor || cont.codigo_contenedor,
    fechaSalidaBl: cont.fecha_etd,
    fechaLlegadaReal: cont.fecha_llegada_real,
    fechaEta: cont.fecha_eta,
    naviera: cont.naviera,
    buque: cont.buque,
    importador: docs.importador || cont.naviera || null,
    pagador: docs.pagador || docs.importador || null,
    puertoOrigen: cont.puerto_origen,
    puertoDestino: cont.puerto_destino,
    costoDesaduanamiento: cont.costo_desaduanamiento,
    costoIsf: docs.costo_isf !== undefined ? Number(docs.costo_isf) : 350,
    costoFleteMaritimo: cont.costo_flete_maritimo,
    resumenPrendasTitulo,
    items,
    balance: docs.balance !== undefined ? Number(docs.balance) : 0,
    demoras: docs.demoras || '',
    almacenajes: docs.almacenajes || '',
    fechaLlegadaAlmacen: docs.fecha_llegada_almacen || '',
  }
}

