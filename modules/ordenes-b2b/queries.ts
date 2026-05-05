// modules/ordenes-b2b/queries.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { PAGE_SIZE } from '@/lib/constants'
import type {
  FiltrosOrdenesB2B, OrdenB2BListItem, OrdenDetalleResuelto,
  OrdenCajaResuelta, CatalogosB2B, FiltrosCajas, CajaListItem,
  CajaDetalle, CajaDetalleTC,
} from './types'
import type { OrdenB2BRow } from '@/lib/types/tables'

// ════════════════════════════════════════════════════════════
// LISTADO ÓRDENES
// ════════════════════════════════════════════════════════════

export async function fetchOrdenesB2B(
  filtros: FiltrosOrdenesB2B
): Promise<{ items: OrdenB2BListItem[]; total: number }> {
  const supabase = await createClient()
  const page = filtros.page ?? 1
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('ordenes_b2b')
    .select(`
      id, folio_proveedor, estado, moneda, tipo_cambio,
      total_cajas, total_piezas, cbm_orden, observaciones,
      fecha_orden, contenedor_id,
      contenedor:contenedores!ordenes_b2b_contenedor_id_fkey (
        codigo_contenedor
      ),
      proveedor:personas!ordenes_b2b_proveedor_id_fkey (
        nombre_completo
      ),
      cliente:personas!ordenes_b2b_cliente_b2b_id_fkey (
        nombre_completo
      )
    `, { count: 'estimated' })

  if (filtros.q) {
    query = query.ilike('folio_proveedor', `%${filtros.q}%`)
  }
  if (filtros.estado) {
    query = query.eq('estado', filtros.estado)
  }
  if (filtros.proveedor_id) {
    query = query.eq('proveedor_id', filtros.proveedor_id)
  }
  if (filtros.año) {
    query = query
      .gte('fecha_orden', `${filtros.año}-01-01T00:00:00`)
      .lt('fecha_orden', `${filtros.año + 1}-01-01T00:00:00`)
  }

  // Manejo de ordenamiento dinámico
  const sort = filtros.sort_by || 'fecha_orden'
  const ascending = filtros.order === 'asc'

  if (sort === 'proveedor_nombre') {
    query = query.order('proveedor(nombre_completo)', { ascending })
  } else if (sort === 'cliente_nombre') {
    query = query.order('cliente(nombre_completo)', { ascending })
  } else if (sort === 'contenedor_codigo') {
    query = query.order('contenedor(codigo_contenedor)', { ascending })
  } else {
    query = query.order(sort, { ascending })
  }

  query = query.range(from, to)

  const { data, count, error } = await query
  if (error) {
    console.error('Error fetchOrdenesB2B:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      filtros,
    })
    return { items: [], total: 0 }
  }

  const items: OrdenB2BListItem[] = (data ?? []).map((o: any) => {
    const cont = Array.isArray(o.contenedor) ? o.contenedor[0] : o.contenedor
    const prov = Array.isArray(o.proveedor) ? o.proveedor[0] : o.proveedor
    const cli = Array.isArray(o.cliente) ? o.cliente[0] : o.cliente
    return {
      id: o.id,
      folio_proveedor: o.folio_proveedor,
      estado: o.estado,
      moneda: o.moneda,
      tipo_cambio: o.tipo_cambio,
      total_cajas: o.total_cajas,
      total_piezas: o.total_piezas,
      cbm_orden: o.cbm_orden,
      observaciones: o.observaciones,
      fecha_orden: o.fecha_orden,
      contenedor_id: o.contenedor_id,
      contenedor_codigo: cont?.codigo_contenedor ?? null,
      proveedor_nombre: prov?.nombre_completo ?? null,
      cliente_nombre: cli?.nombre_completo ?? null,
    }
  })

  return { items, total: count ?? 0 }
}

// ════════════════════════════════════════════════════════════
// DETALLE ORDEN
// ════════════════════════════════════════════════════════════

export async function fetchOrdenB2BById(
  id: number
): Promise<OrdenB2BListItem | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ordenes_b2b')
    .select(`
      id, folio_proveedor, estado, moneda, tipo_cambio,
      total_cajas, total_piezas, cbm_orden, observaciones,
      fecha_orden, contenedor_id,
      contenedor:contenedores!ordenes_b2b_contenedor_id_fkey (
        codigo_contenedor
      ),
      proveedor:personas!ordenes_b2b_proveedor_id_fkey (
        nombre_completo
      ),
      cliente:personas!ordenes_b2b_cliente_b2b_id_fkey (
        nombre_completo
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) return null

  const o: any = data
  const cont = Array.isArray(o.contenedor) ? o.contenedor[0] : o.contenedor
  const prov = Array.isArray(o.proveedor) ? o.proveedor[0] : o.proveedor
  const cli = Array.isArray(o.cliente) ? o.cliente[0] : o.cliente

  return {
    id: o.id, folio_proveedor: o.folio_proveedor, estado: o.estado,
    moneda: o.moneda, tipo_cambio: o.tipo_cambio,
    total_cajas: o.total_cajas, total_piezas: o.total_piezas,
    cbm_orden: o.cbm_orden, observaciones: o.observaciones,
    fecha_orden: o.fecha_orden, contenedor_id: o.contenedor_id,
    contenedor_codigo: cont?.codigo_contenedor ?? null,
    proveedor_nombre: prov?.nombre_completo ?? null,
    cliente_nombre: cli?.nombre_completo ?? null,
  }
}

export async function fetchOrdenDetalles(
  ordenId: number
): Promise<OrdenDetalleResuelto[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ordenes_b2b_detalles')
    .select(`
      id, orden_id, producto_id, cantidad_solicitada, cantidad_aprobada,
      precio_acordado, precio_unitario, precio_yuan, importe_total,
      piezas_pedidas, cajas_pedidas, cbm_detalle, peso_bruto_kg,
      estado_producto,
      producto:productos!ordenes_b2b_detalles_producto_id_fkey (
        sku_base, nombre
      )
    `)
    .eq('orden_id', ordenId)
    .order('id')

  if (error || !data) return []

  return data.map((d: any) => {
    const prod = Array.isArray(d.producto) ? d.producto[0] : d.producto
    return {
      id: d.id, orden_id: d.orden_id, producto_id: d.producto_id,
      producto_sku: prod?.sku_base ?? null,
      producto_nombre: prod?.nombre ?? null,
      cantidad_solicitada: d.cantidad_solicitada,
      cantidad_aprobada: d.cantidad_aprobada,
      precio_acordado: d.precio_acordado,
      precio_unitario: d.precio_unitario,
      precio_yuan: d.precio_yuan,
      importe_total: d.importe_total,
      piezas_pedidas: d.piezas_pedidas,
      cajas_pedidas: d.cajas_pedidas,
      cbm_detalle: d.cbm_detalle,
      peso_bruto_kg: d.peso_bruto_kg,
      estado_producto: d.estado_producto,
    }
  })
}

export async function fetchOrdenCajas(
  ordenId: number
): Promise<OrdenCajaResuelta[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orden_cajas')
    .select(`
      id, orden_id, caja_id, cantidad_cajas,
      caja:cajas_producto!orden_cajas_caja_id_fkey (
        codigo_caja, nombre_pack, piezas_por_caja, cbm, peso_bruto_kg,
        tallas, colores,
        producto:productos!cajas_producto_producto_id_fkey ( sku_base ),
        caja_detalles (
          cantidad,
          talla:cat_tallas!caja_detalles_talla_id_fkey (codigo, nombre),
          color:cat_colores!caja_detalles_color_id_fkey (nombre, hex_code)
        )
      )
    `)
    .eq('orden_id', ordenId)
    .order('id')

  if (error || !data) return []

  return data.map((oc: any) => {
    const c = Array.isArray(oc.caja) ? oc.caja[0] : oc.caja
    const p = c?.producto
      ? (Array.isArray(c.producto) ? c.producto[0] : c.producto)
      : null
      
    let contenidoMap = null
    const detalles = Array.isArray(c?.caja_detalles) ? c.caja_detalles : []
    if (detalles.length > 0) {
      const ts = new Set<string>()
      const cs = new Set<string>()
      const mt: Record<string, Record<string, number>> = {}
      let total = 0

      detalles.forEach((d: any) => {
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
      })

      contenidoMap = {
        tallas: Array.from(ts).sort(),
        colores: Array.from(cs).sort(),
        matriz: mt,
        totalPiezas: total,
      }
    }

    return {
      id: oc.id, orden_id: oc.orden_id, caja_id: oc.caja_id,
      cantidad_cajas: oc.cantidad_cajas,
      caja_codigo: c?.codigo_caja ?? '',
      caja_nombre_pack: c?.nombre_pack ?? null,
      caja_piezas_por_caja: c?.piezas_por_caja ?? null,
      caja_cbm: c?.cbm ?? null,
      caja_peso_bruto_kg: c?.peso_bruto_kg ?? null,
      producto_sku: p?.sku_base ?? null,
      caja_tallas: c?.tallas ?? null,
      caja_colores: c?.colores ?? null,
      caja_contenidoMap: contenidoMap,
    }
  })
}

// ════════════════════════════════════════════════════════════
// CATÁLOGOS
// ════════════════════════════════════════════════════════════

export async function fetchCatalogosB2B(): Promise<CatalogosB2B> {
  const supabase = await createClient()

  const [provRes, cliRes] = await Promise.all([
    supabase
      .from('personas')
      .select('id, nombre_completo')
      .eq('tipo_entidad', 'Proveedor')
      .eq('activo', true)
      .order('nombre_completo'),
    supabase
      .from('personas')
      .select('id, nombre_completo')
      .eq('tipo_entidad', 'Cliente B2B')
      .eq('activo', true)
      .order('nombre_completo'),
  ])

  if (provRes.error) {
    console.error('fetchCatalogosB2B proveedores error:', {
      message: provRes.error.message,
      details: provRes.error.details,
      hint: provRes.error.hint,
      code: provRes.error.code,
    })
  }

  if (cliRes.error) {
    console.error('fetchCatalogosB2B clientesB2B error:', {
      message: cliRes.error.message,
      details: cliRes.error.details,
      hint: cliRes.error.hint,
      code: cliRes.error.code,
    })
  }

  return {
    proveedores: provRes.data ?? [],
    clientesB2B: cliRes.data ?? [],
  }
}

// ════════════════════════════════════════════════════════════
// CAJAS (/ordenes-b2b/cajas)
// ════════════════════════════════════════════════════════════

export async function fetchCajasListado(
  filtros: FiltrosCajas
): Promise<{ items: CajaListItem[]; total: number }> {
  const supabase = await createClient()
  const page = filtros.page ?? 1
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Query base desde cajas_producto con JOINs
  let query = supabase
    .from('cajas_producto')
    .select(`
      id, codigo_caja, nombre_pack, producto_id,
      piezas_por_caja, tallas, colores, cbm, peso_bruto_kg,
      costo_total_caja,
      producto:productos!cajas_producto_producto_id_fkey (
        sku_base, nombre
      ),
      proveedor:personas!cajas_producto_proveedor_id_fkey (
        nombre_completo
      )
    `, { count: 'exact' })
    .or('activo.is.null,activo.eq.true')

  if (filtros.q) {
    const term = `%${filtros.q}%`
    query = query.or(`codigo_caja.ilike.${term}`)
  }
  if (filtros.proveedor_id) {
    query = query.eq('proveedor_id', filtros.proveedor_id)
  }

  // Manejo de ordenamiento dinámico
  const sort = filtros.sort_by || 'codigo_caja'
  const ascending = filtros.order === 'asc'

  if (sort === 'proveedor_nombre') {
    query = query.order('proveedor(nombre_completo)', { ascending })
  } else if (sort === 'producto_sku') {
    query = query.order('producto(sku_base)', { ascending })
  } else {
    query = query.order(sort, { ascending })
  }

  query = query.range(from, to)

  const { data, count, error } = await query
  if (error) {
    console.error('Error fetchCajasListado:', error)
    return { items: [], total: 0 }
  }

  const items: CajaListItem[] = (data ?? []).map((c: any) => {
    const prod = Array.isArray(c.producto) ? c.producto[0] : c.producto
    const prov = Array.isArray(c.proveedor) ? c.proveedor[0] : c.proveedor
    return {
      id: c.id, codigo_caja: c.codigo_caja, nombre_pack: c.nombre_pack,
      producto_id: c.producto_id,
      producto_sku: prod?.sku_base ?? null,
      producto_nombre: prod?.nombre ?? null,
      proveedor_nombre: prov?.nombre_completo ?? null,
      piezas_por_caja: c.piezas_por_caja, tallas: c.tallas, colores: c.colores,
      cbm: c.cbm, peso_bruto_kg: c.peso_bruto_kg,
      costo_total_caja: c.costo_total_caja,
      total_ordenes: 0, contenedores: null, // Se llenan aparte si es necesario
    }
  })

  return { items, total: count ?? 0 }
}

export async function fetchCajaDetalle(
  cajaId: number
): Promise<CajaDetalle | null> {
  const supabase = await createClient()

  const { data: caja, error } = await supabase
    .from('cajas_producto')
    .select(`
      id, codigo_caja, nombre_pack, producto_id,
      piezas_por_caja, tallas, colores, cbm, peso_bruto_kg,
      largo_cm, ancho_cm, alto_cm, costo_total_caja,
      producto:productos!cajas_producto_producto_id_fkey ( sku_base, nombre ),
      proveedor:personas!cajas_producto_proveedor_id_fkey ( nombre_completo )
    `)
    .eq('id', cajaId)
    .single()

  if (error || !caja) return null

  const c: any = caja
  const prod = Array.isArray(c.producto) ? c.producto[0] : c.producto
  const prov = Array.isArray(c.proveedor) ? c.proveedor[0] : c.proveedor

  // Detalles talla/color
  const { data: detallesTC } = await supabase
    .from('caja_detalles')
    .select(`
      id, cantidad,
      talla:cat_tallas!caja_detalles_talla_id_fkey ( codigo, nombre ),
      color:cat_colores!caja_detalles_color_id_fkey ( nombre, hex_code )
    `)
    .eq('caja_id', cajaId)

  const detalles_talla_color: CajaDetalleTC[] = (detallesTC ?? []).map((d: any) => {
    const t = Array.isArray(d.talla) ? d.talla[0] : d.talla
    const co = Array.isArray(d.color) ? d.color[0] : d.color
    return {
      id: d.id,
      talla_codigo: t?.codigo ?? null, talla_nombre: t?.nombre ?? null,
      color_nombre: co?.nombre ?? null, color_hex: co?.hex_code ?? null,
      cantidad: d.cantidad,
    }
  })

  // Órdenes donde se usa esta caja
  const { data: ordenesVinc } = await supabase
    .from('orden_cajas')
    .select(`
      orden_id,
      orden:ordenes_b2b!orden_cajas_orden_id_fkey (
        contenedor:contenedores!ordenes_b2b_contenedor_id_fkey ( codigo_contenedor )
      )
    `)
    .eq('caja_id', cajaId)

  const ordenes_vinculadas = (ordenesVinc ?? []).map((ov: any) => {
    const ord = Array.isArray(ov.orden) ? ov.orden[0] : ov.orden
    const cont = ord?.contenedor
      ? (Array.isArray(ord.contenedor) ? ord.contenedor[0] : ord.contenedor)
      : null
    return {
      orden_id: ov.orden_id,
      contenedor_codigo: cont?.codigo_contenedor ?? null,
    }
  })

  return {
    id: c.id, codigo_caja: c.codigo_caja, nombre_pack: c.nombre_pack,
    producto_id: c.producto_id,
    producto_sku: prod?.sku_base ?? null, producto_nombre: prod?.nombre ?? null,
    proveedor_nombre: prov?.nombre_completo ?? null,
    piezas_por_caja: c.piezas_por_caja, tallas: c.tallas, colores: c.colores,
    cbm: c.cbm, peso_bruto_kg: c.peso_bruto_kg,
    largo_cm: c.largo_cm, ancho_cm: c.ancho_cm, alto_cm: c.alto_cm,
    costo_total_caja: c.costo_total_caja,
    detalles_talla_color, ordenes_vinculadas,
  }
}
