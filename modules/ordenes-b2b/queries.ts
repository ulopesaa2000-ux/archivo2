// modules/ordenes-b2b/queries.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { PAGE_SIZE } from '@/lib/constants'
import type {
  FiltrosOrdenesB2B, OrdenB2BListItem, OrdenDetalleResuelto,
  OrdenCajaResuelta, CatalogosB2B, FiltrosCajas, CajaListItem,
  CajaDetalle, CajaDetalleTC,
} from './types'
import type {
  OrdenB2BRow,
  OrdenDetalleComentario,
  OrdenDetalleEvento,
} from '@/lib/types/tables'
import { getCurrentUser } from '@/modules/auth/queries'
import {
  buildCommercialOrderFilter,
  canAccessCommercialOrder,
  getCommercialScope,
} from '@/lib/auth/commercial-scope'

function applyCommercialScopeToOrderQuery(query: any, scope: Awaited<ReturnType<typeof getCommercialScope>>) {
  if (scope.is_super_admin) return query

  const filter = buildCommercialOrderFilter(scope)
  if (!filter || filter === '__no_access__.eq.true') {
    return null
  }

  return query.or(filter)
}

function mapOrderRow(o: any): OrdenB2BListItem {
  const cont = Array.isArray(o.contenedor) ? o.contenedor[0] : o.contenedor
  const prov = Array.isArray(o.proveedor) ? o.proveedor[0] : o.proveedor
  const cli = Array.isArray(o.cliente) ? o.cliente[0] : o.cliente
  return {
    id: o.id,
    proveedor_id: o.proveedor_id ?? null,
    cliente_b2b_id: o.cliente_b2b_id ?? null,
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
}

async function fetchAutoresMap(supabase: any, usuarioIds: number[]) {
  if (usuarioIds.length === 0) return new Map<number, { autor_nombre: string | null; autor_email: string | null; autor_persona_tipo: string | null }>()

  const [usuariosRes, personasRes] = await Promise.all([
    supabase.from('usuarios').select('id, nombre_completo, email').in('id', usuarioIds),
    supabase.from('personas').select('usuario_id, tipo_entidad').in('usuario_id', usuarioIds),
  ])

  const personasByUsuario = new Map<number, string | null>(
    (personasRes.data ?? []).map((persona: any) => [persona.usuario_id, persona.tipo_entidad ?? null])
  )

  return new Map<number, { autor_nombre: string | null; autor_email: string | null; autor_persona_tipo: string | null }>(
    (usuariosRes.data ?? []).map((usuario: any) => [
      usuario.id,
      {
        autor_nombre: usuario.nombre_completo ?? null,
        autor_email: usuario.email ?? null,
        autor_persona_tipo: personasByUsuario.get(usuario.id) ?? null,
      },
    ])
  )
}

async function fetchDetalleConversationMap(ordenId: number) {
  const supabase = await createClient()
  const [detalleRowsRes, comentariosRes, eventosRes] = await Promise.all([
    supabase
      .from('ordenes_b2b_detalles')
      .select('id, orden_id, producto_id')
      .eq('orden_id', ordenId),
    supabase
      .from('orden_detalles_comentarios' as any)
      .select('id, orden_detalle_id, usuario_id, mensaje, archivo_adjunto_url, created_at')
      .order('created_at', { ascending: true }),
    supabase
      .from('orden_detalle_eventos' as any)
      .select('id, orden_detalle_id, usuario_id, tipo_evento, comentario_id, payload, created_at')
      .order('created_at', { ascending: true }),
  ])

  const detalleRows = detalleRowsRes.data ?? []
  const detalleMap = new Map<number, { orden_id: number; producto_id: number | null }>(
    detalleRows.map((detalle) => [detalle.id, { orden_id: detalle.orden_id ?? ordenId, producto_id: detalle.producto_id ?? null }])
  )

  const comentariosData = comentariosRes.error?.code === '42P01' || comentariosRes.error?.code === 'PGRST205'
    ? []
    : ((comentariosRes.data as any) ?? []).filter((comentario: any) => detalleMap.has(comentario.orden_detalle_id))

  const eventosData = eventosRes.error?.code === '42P01' || eventosRes.error?.code === 'PGRST205'
    ? []
    : ((eventosRes.data as any) ?? []).filter((evento: any) => detalleMap.has(evento.orden_detalle_id))

  const autores = await fetchAutoresMap(
    supabase,
    Array.from(new Set([
      ...comentariosData.map((comentario: any) => comentario.usuario_id),
      ...eventosData.map((evento: any) => evento.usuario_id),
    ]))
  )

  const comentariosPorDetalle = new Map<number, OrdenDetalleComentario[]>()
  for (const comentario of comentariosData) {
    const detalle = detalleMap.get(comentario.orden_detalle_id)
    if (!detalle) continue

    const autor = autores.get(comentario.usuario_id)
    const item: OrdenDetalleComentario = {
      id: comentario.id,
      orden_detalle_id: comentario.orden_detalle_id,
      orden_id: detalle.orden_id,
      producto_id: detalle.producto_id,
      usuario_id: comentario.usuario_id,
      mensaje: comentario.mensaje,
      archivo_adjunto_url: comentario.archivo_adjunto_url ?? null,
      created_at: comentario.created_at ?? null,
      autor_nombre: autor?.autor_nombre ?? null,
      autor_email: autor?.autor_email ?? null,
      autor_persona_tipo: autor?.autor_persona_tipo ?? null,
    }

    const items = comentariosPorDetalle.get(comentario.orden_detalle_id) ?? []
    items.push(item)
    comentariosPorDetalle.set(comentario.orden_detalle_id, items)
  }

  const eventosPorDetalle = new Map<number, OrdenDetalleEvento[]>()
  for (const evento of eventosData) {
    const detalle = detalleMap.get(evento.orden_detalle_id)
    if (!detalle) continue

    const autor = autores.get(evento.usuario_id)
    const item: OrdenDetalleEvento = {
      id: evento.id,
      orden_detalle_id: evento.orden_detalle_id,
      orden_id: detalle.orden_id,
      usuario_id: evento.usuario_id,
      tipo_evento: evento.tipo_evento,
      comentario_id: evento.comentario_id ?? null,
      payload: (evento.payload as Record<string, unknown> | null) ?? null,
      created_at: evento.created_at ?? null,
      autor_nombre: autor?.autor_nombre ?? null,
      autor_email: autor?.autor_email ?? null,
      autor_persona_tipo: autor?.autor_persona_tipo ?? null,
    }

    const items = eventosPorDetalle.get(evento.orden_detalle_id) ?? []
    items.push(item)
    eventosPorDetalle.set(evento.orden_detalle_id, items)
  }

  return {
    comentariosPorDetalle,
    eventosPorDetalle,
  }
}

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

  const currentUser = await getCurrentUser()
  const scope = await getCommercialScope(supabase, currentUser)

  let query: any = supabase
    .from('ordenes_b2b')
    .select(`
      id, proveedor_id, cliente_b2b_id, folio_proveedor, estado, moneda, tipo_cambio,
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

  query = applyCommercialScopeToOrderQuery(query, scope)
  if (!query) {
    return { items: [], total: 0 }
  }

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

  const items: OrdenB2BListItem[] = (data ?? []).map(mapOrderRow)

  return { items, total: count ?? 0 }
}

// ════════════════════════════════════════════════════════════
// DETALLE ORDEN
// ════════════════════════════════════════════════════════════

export async function fetchOrdenB2BById(
  id: number
): Promise<OrdenB2BListItem | null> {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const scope = await getCommercialScope(supabase, currentUser)

  let query: any = supabase
    .from('ordenes_b2b')
    .select(`
      id, proveedor_id, cliente_b2b_id, folio_proveedor, estado, moneda, tipo_cambio,
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

  query = applyCommercialScopeToOrderQuery(query, scope)
  if (!query) {
    return null
  }

  const { data, error } = await query.single()

  if (error || !data) return null
  return mapOrderRow(data)
}

export async function fetchOrdenDetalles(
  ordenId: number
): Promise<OrdenDetalleResuelto[]> {
  const supabase = await createClient()
  const conversation = await fetchDetalleConversationMap(ordenId)
  const { data, error } = await supabase
    .from('ordenes_b2b_detalles')
    .select(`
      id, orden_id, producto_id, cantidad_solicitada, cantidad_aprobada,
      precio_acordado, precio_unitario, precio_yuan, importe_total,
      piezas_pedidas, cajas_pedidas, cbm_detalle, peso_bruto_kg,
      estado_producto,
      producto:productos!ordenes_b2b_detalles_producto_id_fkey (
        sku_base, nombre, descripcion, precio_ec
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
      producto_descripcion: prod?.descripcion ?? null,
      producto_precio_ec: prod?.precio_ec ?? null,
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
      comentarios: conversation.comentariosPorDetalle.get(d.id) ?? [],
      eventos: conversation.eventosPorDetalle.get(d.id) ?? [],
    }
  })
}

export async function fetchDetalleComentarios(
  ordenDetalleId: number
): Promise<OrdenDetalleComentario[]> {
  const supabase = await createClient()
  const { data: detalle } = await supabase
    .from('ordenes_b2b_detalles')
    .select('orden_id')
    .eq('id', ordenDetalleId)
    .single()

  if (!detalle?.orden_id) return []

  const conversation = await fetchDetalleConversationMap(detalle.orden_id)
  return conversation.comentariosPorDetalle.get(ordenDetalleId) ?? []
}

export async function fetchDetalleEventos(
  ordenDetalleId: number
): Promise<OrdenDetalleEvento[]> {
  const supabase = await createClient()
  const { data: detalle } = await supabase
    .from('ordenes_b2b_detalles')
    .select('orden_id')
    .eq('id', ordenDetalleId)
    .single()

  if (!detalle?.orden_id) return []

  const conversation = await fetchDetalleConversationMap(detalle.orden_id)
  return conversation.eventosPorDetalle.get(ordenDetalleId) ?? []
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
        codigo_caja, nombre_pack, piezas_por_caja, cbm, peso_bruto_kg, peso_neto,
        largo_cm, ancho_cm, alto_cm, costo_total_caja,
        tallas, colores,
        producto:productos!cajas_producto_producto_id_fkey ( sku_base, precio_ec ),
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
      caja_peso_neto: c?.peso_neto ?? null,
      caja_largo_cm: c?.largo_cm ?? null,
      caja_ancho_cm: c?.ancho_cm ?? null,
      caja_alto_cm: c?.alto_cm ?? null,
      caja_costo_total_caja: c?.costo_total_caja ?? null,
      producto_sku: p?.sku_base ?? null,
      producto_precio_ec: p?.precio_ec ?? null,
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
  const currentUser = await getCurrentUser()
  const scope = await getCommercialScope(supabase, currentUser)

  let proveedoresQuery: any = supabase
    .from('personas')
    .select('id, nombre_completo')
    .eq('tipo_entidad', 'Proveedor')
    .eq('activo', true)
    .order('nombre_completo')

  let clientesQuery: any = supabase
    .from('personas')
    .select('id, nombre_completo')
    .eq('tipo_entidad', 'Cliente B2B')
    .eq('activo', true)
    .order('nombre_completo')

  if (!scope.is_super_admin) {
    if (scope.allowed_proveedor_ids.length === 0) {
      proveedoresQuery = null
    } else {
      proveedoresQuery = proveedoresQuery.in('id', scope.allowed_proveedor_ids)
    }

    if (scope.allowed_cliente_ids.length === 0) {
      clientesQuery = null
    } else {
      clientesQuery = clientesQuery.in('id', scope.allowed_cliente_ids)
    }
  }

  const [provRes, cliRes] = await Promise.all([
    proveedoresQuery ?? Promise.resolve({ data: [], error: null }),
    clientesQuery ?? Promise.resolve({ data: [], error: null }),
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

  const currentUser = await getCurrentUser()
  const scope = await getCommercialScope(supabase, currentUser)

  // Query base desde cajas_producto con JOINs
  let query = supabase
    .from('cajas_producto')
    .select(`
      id, codigo_caja, nombre_pack, producto_id,
      piezas_por_caja, tallas, colores, cbm, peso_bruto_kg, peso_neto,
      costo_total_caja,
      producto:productos!cajas_producto_producto_id_fkey (
        sku_base, nombre
      ),
      proveedor:personas!cajas_producto_proveedor_id_fkey (
        nombre_completo
      )
    `, { count: 'exact' })
    .or('activo.is.null,activo.eq.true')

  if (!scope.is_super_admin) {
    const clauses: string[] = []

    if (scope.primary_persona_tipo === 'Proveedor') {
      // Si es un Proveedor primario, SÓLO puede ver cajas de su propia marca/proveedor
      if (scope.allowed_proveedor_ids.length > 0) {
        clauses.push(`proveedor_id.in.(${scope.allowed_proveedor_ids.join(',')})`)
      }
    } else if (scope.primary_persona_tipo === 'Cliente B2B') {
      // Si es un Cliente B2B primario, SÓLO puede ver cajas de los productos de su empresa
      if (scope.allowed_cliente_ids.length > 0) {
        const { data: allowedProducts } = await supabase
          .from('productos')
          .select('id')
          .in('cliente_b2b_id', scope.allowed_cliente_ids)

        const allowedProductIds = (allowedProducts ?? []).map((p: any) => p.id)
        if (allowedProductIds.length > 0) {
          clauses.push(`producto_id.in.(${allowedProductIds.join(',')})`)
        }
      }
    } else {
      // Si es un intermediario / staff (como Diana), puede ver cajas de sus proveedores o productos de sus clientes asignados
      if (scope.allowed_proveedor_ids.length > 0) {
        clauses.push(`proveedor_id.in.(${scope.allowed_proveedor_ids.join(',')})`)
      }
      if (scope.allowed_cliente_ids.length > 0) {
        const { data: allowedProducts } = await supabase
          .from('productos')
          .select('id')
          .in('cliente_b2b_id', scope.allowed_cliente_ids)

        const allowedProductIds = (allowedProducts ?? []).map((p: any) => p.id)
        if (allowedProductIds.length > 0) {
          clauses.push(`producto_id.in.(${allowedProductIds.join(',')})`)
        }
      }
    }

    if (clauses.length === 0) {
      return { items: [], total: 0 }
    }

    query = query.or(clauses.join(','))
  }

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
      cbm: c.cbm, peso_bruto_kg: c.peso_bruto_kg, peso_neto: c.peso_neto,
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
  const currentUser = await getCurrentUser()
  const scope = await getCommercialScope(supabase, currentUser)

  if (!scope.is_super_admin) {
    const { data: cajaBase } = await supabase
      .from('cajas_producto')
      .select('id, proveedor_id')
      .eq('id', cajaId)
      .single()

    if (!cajaBase) return null

    let allowed = scope.allowed_proveedor_ids.includes(cajaBase.proveedor_id ?? -1)

    if (!allowed && scope.allowed_cliente_ids.length > 0) {
      const { data: ordenes } = await supabase.from('ordenes_b2b')
        .select('id')
        .or(`cliente_b2b_id.in.(${scope.allowed_cliente_ids.join(',')})`)

      const ordenIds = (ordenes ?? []).map((orden: any) => orden.id)
      if (ordenIds.length > 0) {
        const { data: check } = await supabase
          .from('orden_cajas')
          .select('id')
          .eq('caja_id', cajaId)
          .in('orden_id', ordenIds)
          .limit(1)

        allowed = Boolean(check && check.length > 0)
      }
    }

    if (!allowed) return null
  }

  const { data: caja, error } = await supabase
    .from('cajas_producto')
    .select(`
      id, codigo_caja, nombre_pack, producto_id,
      piezas_por_caja, tallas, colores, cbm, peso_bruto_kg, peso_neto,
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
    cbm: c.cbm, peso_bruto_kg: c.peso_bruto_kg, peso_neto: c.peso_neto,
    largo_cm: c.largo_cm, ancho_cm: c.ancho_cm, alto_cm: c.alto_cm,
    costo_total_caja: c.costo_total_caja,
    detalles_talla_color, ordenes_vinculadas,
  }
}

// ════════════════════════════════════════════════════════════
// BÚSQUEDA DE PRODUCTOS (para agregar a orden)
// ════════════════════════════════════════════════════════════

export async function fetchProductosBusqueda(
  q?: string,
  limit = 20,
): Promise<{ id: number; sku_base: string; nombre: string; descripcion: string | null }[]> {
  const supabase = await createClient()

  let query = supabase
    .from('productos')
    .select('id, sku_base, nombre, descripcion')
    .limit(limit)

  if (q) {
    const term = `%${q}%`
    query = query.or(`sku_base.ilike.${term},nombre.ilike.${term}`)
  }

  const { data } = await query.order('sku_base')
  return (data ?? []) as { id: number; sku_base: string; nombre: string; descripcion: string | null }[]
}

// ════════════════════════════════════════════════════════════
// CATÁLOGO TALLAS Y COLORES (para CajaCard edit)
// ════════════════════════════════════════════════════════════

export async function fetchCatalogoTallasColores(): Promise<{
  tallas: { id: number; codigo: string; nombre: string; categoria: string; talla_us: string | null }[]
  colores: { id: number; nombre: string; codigo: string | null; hex_code: string | null }[]
}> {
  const supabase = await createClient()

  const [tallasRes, coloresRes] = await Promise.all([
    supabase.from('cat_tallas').select('id, codigo, nombre, categoria, talla_us').order('codigo'),
    supabase.from('cat_colores').select('id, nombre, codigo, hex_code').order('nombre'),
  ])

  return {
    tallas: (tallasRes.data ?? []).map(t => ({ id: t.id, codigo: t.codigo, nombre: t.nombre ?? '', categoria: t.categoria ?? '', talla_us: t.talla_us })),
    colores: (coloresRes.data ?? []).map(c => ({ id: c.id, nombre: c.nombre, codigo: c.codigo, hex_code: c.hex_code })),
  }
}
