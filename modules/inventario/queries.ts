// modules/inventario/queries.ts
'use server'

import { createClient, createStaticClient } from '@/lib/supabase/server'
import { PAGE_SIZE } from '@/lib/constants'
import { cacheLife, cacheTag } from 'next/cache'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/types/database.types'
import type {
  FiltrosNotas,
  ResultadoListadoNotas,
  NotaListItem,
  NotaCompleta,
  NotaDetalleResuelto,
  HistorialEstadoResuelto,
  FiltrosStock,
  StockListItem,
  StockDetalleCaja,
  CatalogosInventario,
  ProductoBusqueda,
  CajaParaSelector,
  FiltrosStockMatrix,
  StockMatrixItem,
  NotaOcrPropuesta,
  FiltrosOcrPropuestas,
} from './types'
import type {
  BodegaRow,
  TipoMovimientoRow,
  EstadoNotaRow,
  UsuarioBodegaRow,
} from '@/lib/types/tables'

// ════════════════════════════════════════════════════════════
// LISTADO DE NOTAS
// ════════════════════════════════════════════════════════════

export async function fetchNotas(
  filtros: FiltrosNotas
): Promise<ResultadoListadoNotas> {
  const supabase = await createClient()
  const page = filtros.page ?? 1
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Query con JOINs manuales via select con relaciones
  let query = supabase
    .from('notas_inventario')
    .select(`
      id, numero_nota, fecha_nota, fecha_confirmacion,
      total_cajas, nota_referencia, observaciones, usuario_id,
      costo_total, comprobante_url,
      tipo_movimiento:cat_tipos_movimiento!notas_inventario_tipo_movimiento_id_fkey (
        codigo, nombre, afecta_inventario
      ),
      estado:cat_estados_nota!notas_inventario_estado_id_fkey (
        codigo, nombre, color
      ),
      bodega_origen:bodegas!notas_inventario_bodega_origen_id_fkey (
        id, nombre, codigo
      ),
      bodega_destino:bodegas!notas_inventario_bodega_destino_id_fkey (
        id, nombre, codigo
      )
    `, { count: 'exact' })

  // ── Filtro: búsqueda por numero_nota ────────────────────
  if (filtros.q) {
    query = query.ilike('numero_nota', `%${filtros.q}%`)
  }

  // ── Filtro: tipo de movimiento ──────────────────────────
  if (filtros.tipo_movimiento_id) {
    query = query.eq('tipo_movimiento_id', filtros.tipo_movimiento_id)
  }

  // ── Filtro: estado por código ───────────────────────────
  if (filtros.estado_codigo) {
    // Necesitamos buscar el ID del estado por código
    const { data: estadoData } = await supabase
      .from('cat_estados_nota')
      .select('id')
      .eq('codigo', filtros.estado_codigo)
      .single()
    if (estadoData) {
      query = query.eq('estado_id', estadoData.id)
    }
  }

  // ── Filtro: bodega (origen o destino) ───────────────────
  if (filtros.bodega_origen_id) {
    query = query.or(`bodega_origen_id.eq.${filtros.bodega_origen_id},bodega_destino_id.eq.${filtros.bodega_origen_id}`)
  }

  // ── Filtro: ciudad de la bodega ─────────────────────────
  if (filtros.ciudad) {
    const { data: bodegasCiudad } = await supabase
      .from('bodegas')
      .select('id')
      .eq('ciudad', filtros.ciudad)
      .eq('activa', true)
    
    if (bodegasCiudad && bodegasCiudad.length > 0) {
      const idsStr = bodegasCiudad.map(b => b.id).join(',')
      query = query.or(`bodega_origen_id.in.(${idsStr}),bodega_destino_id.in.(${idsStr})`)
    } else {
      query = query.eq('id', -1)
    }
  }

  // ── Filtro: rango de fechas ─────────────────────────────
  if (filtros.fecha_desde) {
    query = query.gte('fecha_nota', filtros.fecha_desde)
  }
  if (filtros.fecha_hasta) {
    query = query.lte('fecha_nota', `${filtros.fecha_hasta}T23:59:59`)
  }

  // ── Filtro: scoping por Bodegas y Usuario (para nivel 3) ──
  if (filtros.limit_bodega_ids && filtros.limit_bodega_ids.length > 0) {
    const idsStr = filtros.limit_bodega_ids.join(',')
    if (filtros.limit_usuario_id) {
      query = query.or(`bodega_origen_id.in.(${idsStr}),bodega_destino_id.in.(${idsStr}),usuario_id.eq.${filtros.limit_usuario_id}`)
    } else {
      query = query.or(`bodega_origen_id.in.(${idsStr}),bodega_destino_id.in.(${idsStr})`)
    }
  } else if (filtros.limit_usuario_id) {
    query = query.eq('usuario_id', filtros.limit_usuario_id)
  }

  // ── Ordenamiento y paginación ───────────────────────────
  query = query
    .order('fecha_nota', { ascending: false })
    .range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetchNotas:', error)
    return { notas: [], total: 0 }
  }

  const userIds = Array.from(new Set((data ?? []).map(d => d.usuario_id).filter(Boolean)))
  const { data: usersData } = userIds.length > 0 
    ? await supabase.from('usuarios').select('id, nombre_completo').in('id', userIds)
    : { data: [] }
  const usersMap = new Map(usersData?.map(u => [u.id, u]) || [])

  // Normalizar resultados (Supabase retorna relaciones como objetos/arrays)
  const notas: NotaListItem[] = (data ?? []).map((n: any) => {
    const tipo = Array.isArray(n.tipo_movimiento) ? n.tipo_movimiento[0] : n.tipo_movimiento
    const estado = Array.isArray(n.estado) ? n.estado[0] : n.estado
    const origen = Array.isArray(n.bodega_origen) ? n.bodega_origen[0] : n.bodega_origen
    const destino = Array.isArray(n.bodega_destino) ? n.bodega_destino[0] : n.bodega_destino
    const usuario: any = usersMap.get(n.usuario_id)

    return {
      id: n.id,
      numero_nota: n.numero_nota,
      fecha_nota: n.fecha_nota,
      fecha_confirmacion: n.fecha_confirmacion,
      total_cajas: n.total_cajas,
      nota_referencia: n.nota_referencia,
      observaciones: n.observaciones,
      tipo_codigo: tipo?.codigo ?? '',
      tipo_nombre: tipo?.nombre ?? '',
      afecta_inventario: tipo?.afecta_inventario ?? 0,
      estado_codigo: estado?.codigo ?? '',
      estado_nombre: estado?.nombre ?? '',
      estado_color: estado?.color ?? null,
      bodega_origen_id: origen?.id ?? 0,
      bodega_origen_nombre: origen?.nombre ?? '',
      bodega_origen_codigo: origen?.codigo ?? '',
      bodega_destino_id: destino?.id ?? null,
      bodega_destino_nombre: destino?.nombre ?? null,
      bodega_destino_codigo: destino?.codigo ?? null,
      usuario_nombre: usuario?.nombre_completo ?? '',
      usuario_id: n.usuario_id,
      costo_total: n.costo_total ? Number(n.costo_total) : 0,
      comprobante_url: n.comprobante_url ?? null,
    }
  })

  return {
    notas,
    total: count ?? 0,
  }
}

// ════════════════════════════════════════════════════════════
// DETALLE DE NOTA
// ════════════════════════════════════════════════════════════

export async function fetchNotaById(
  id: number
): Promise<NotaCompleta | null> {
  const supabase = await createClient()

  // 1. Cabecera
  const { data: notaRaw, error: notaError } = await supabase
    .from('notas_inventario')
    .select(`
      id, numero_nota, fecha_nota, fecha_confirmacion,
      total_cajas, nota_referencia, observaciones, usuario_id,
      costo_total, comprobante_url,
      tipo_movimiento:cat_tipos_movimiento!notas_inventario_tipo_movimiento_id_fkey (
        codigo, nombre, afecta_inventario
      ),
      estado:cat_estados_nota!notas_inventario_estado_id_fkey (
        codigo, nombre, color
      ),
      bodega_origen:bodegas!notas_inventario_bodega_origen_id_fkey (
        id, nombre, codigo
      ),
      bodega_destino:bodegas!notas_inventario_bodega_destino_id_fkey (
        id, nombre, codigo
      )
    `)
    .eq('id', id)
    .single()

  if (notaError || !notaRaw) return null

  const nr: any = notaRaw
  const tipo = Array.isArray(nr.tipo_movimiento) ? nr.tipo_movimiento[0] : nr.tipo_movimiento
  const estado = Array.isArray(nr.estado) ? nr.estado[0] : nr.estado
  const origen = Array.isArray(nr.bodega_origen) ? nr.bodega_origen[0] : nr.bodega_origen
  const destino = Array.isArray(nr.bodega_destino) ? nr.bodega_destino[0] : nr.bodega_destino
  
  const { data: userData } = await supabase.from('usuarios').select('nombre_completo').eq('id', nr.usuario_id).single()
  const usuario = userData

  const cabecera: NotaListItem = {
    id: nr.id,
    numero_nota: nr.numero_nota,
    fecha_nota: nr.fecha_nota,
    fecha_confirmacion: nr.fecha_confirmacion,
    total_cajas: nr.total_cajas,
    nota_referencia: nr.nota_referencia,
    observaciones: nr.observaciones,
    tipo_codigo: tipo?.codigo ?? '',
    tipo_nombre: tipo?.nombre ?? '',
    afecta_inventario: tipo?.afecta_inventario ?? 0,
    estado_codigo: estado?.codigo ?? '',
    estado_nombre: estado?.nombre ?? '',
    estado_color: estado?.color ?? null,
    bodega_origen_id: origen?.id ?? 0,
    bodega_origen_nombre: origen?.nombre ?? '',
    bodega_origen_codigo: origen?.codigo ?? '',
    bodega_destino_id: destino?.id ?? null,
    bodega_destino_nombre: destino?.nombre ?? null,
    bodega_destino_codigo: destino?.codigo ?? null,
    usuario_nombre: usuario?.nombre_completo ?? '',
    usuario_id: nr.usuario_id,
    costo_total: nr.costo_total ? Number(nr.costo_total) : 0,
    comprobante_url: nr.comprobante_url ?? null,
  }

  // 2. Detalles de productos
  const [detalles, historial] = await Promise.all([
    fetchNotaDetalles(supabase, id),
    fetchNotaHistorial(supabase, id),
  ])

  return { cabecera, detalles, historial }
}

async function fetchNotaDetalles(
  supabase: SupabaseClient<Database, 'inv-tienda'>,
  notaId: number
): Promise<NotaDetalleResuelto[]> {
  const { data, error } = await supabase
    .from('nota_detalle_productos')
    .select(`
      id, nota_id, producto_id, variante_id, cajas, piezas_sueltas, caja_id,
      producto:productos!nota_detalle_productos_producto_id_fkey (
        sku_base, nombre, descripcion, pz_en_caja
      ),
      caja:cajas_producto!nota_detalle_productos_caja_id_fkey (
        codigo_caja, nombre_pack
      ),
      variante:variantes_producto!nota_detalle_productos_variante_id_fkey (
        sku_completo,
        talla:cat_tallas!variantes_producto_talla_id_fkey ( codigo ),
        color:cat_colores!variantes_producto_color_id_fkey ( nombre )
      )
    `)
    .eq('nota_id', notaId)
    .order('id')

  if (error || !data) return []

  return data.map((d: any) => {
    const prod = Array.isArray(d.producto) ? d.producto[0] : d.producto
    const caja = Array.isArray(d.caja) ? d.caja[0] : d.caja
    const variante = Array.isArray(d.variante) ? d.variante[0] : d.variante
    const talla = variante?.talla
      ? (Array.isArray(variante.talla) ? variante.talla[0] : variante.talla)
      : null
    const color = variante?.color
      ? (Array.isArray(variante.color) ? variante.color[0] : variante.color)
      : null

    return {
      id: d.id,
      nota_id: d.nota_id,
      producto_id: d.producto_id,
      variante_id: d.variante_id,
      cajas: d.cajas,
      piezas_sueltas: d.piezas_sueltas ?? 0,
      caja_id: d.caja_id,
      producto_sku: prod?.sku_base ?? null,
      producto_nombre: prod?.descripcion ?? prod?.nombre ?? null,
      producto_pz_en_caja: prod?.pz_en_caja ?? null,
      caja_codigo: caja?.codigo_caja ?? null,
      caja_nombre_pack: caja?.nombre_pack ?? null,
      variante_sku: variante?.sku_completo ?? null,
      talla_codigo: talla?.codigo ?? null,
      color_nombre: color?.nombre ?? null,
    }
  })
}

async function fetchNotaHistorial(
  supabase: SupabaseClient<Database, 'inv-tienda'>,
  notaId: number
): Promise<HistorialEstadoResuelto[]> {
  const { data, error } = await supabase
    .from('historial_estados_nota')
    .select(`
      id, nota_id, fecha_cambio, comentario, usuario_id,
      estado_anterior:cat_estados_nota!historial_estados_nota_estado_anterior_id_fkey (
        nombre, codigo
      ),
      estado_nuevo:cat_estados_nota!historial_estados_nota_estado_nuevo_id_fkey (
        nombre, codigo
      )
    `)
    .eq('nota_id', notaId)
    .order('fecha_cambio', { ascending: false })

  if (error || !data) return []

  const userIds = Array.from(new Set((data ?? []).map((d: any) => d.usuario_id).filter(Boolean)))
  const { data: usersData } = userIds.length > 0 
    ? await supabase.from('usuarios').select('id, nombre_completo').in('id', userIds)
    : { data: [] }
  const usersMap = new Map(usersData?.map((u: any) => [u.id, u]) || [])

  return data.map((h: any) => {
    const ea = Array.isArray(h.estado_anterior) ? h.estado_anterior[0] : h.estado_anterior
    const en = Array.isArray(h.estado_nuevo) ? h.estado_nuevo[0] : h.estado_nuevo
    const u: any = usersMap.get(h.usuario_id)

    return {
      id: h.id,
      nota_id: h.nota_id,
      estado_anterior_nombre: ea?.nombre ?? null,
      estado_anterior_codigo: ea?.codigo ?? null,
      estado_nuevo_nombre: en?.nombre ?? '',
      estado_nuevo_codigo: en?.codigo ?? '',
      usuario_nombre: u?.nombre_completo ?? '',
      fecha_cambio: h.fecha_cambio,
      comentario: h.comentario,
    }
  })
}

// ════════════════════════════════════════════════════════════
// STOCK
// ════════════════════════════════════════════════════════════

export async function fetchStockByBodega(
  bodegaId: number,
  filtros?: FiltrosStock
): Promise<{ items: StockListItem[]; total: number }> {
  const supabase = await createClient()
  const page = filtros?.page ?? 1
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('inventario_stock')
    .select(`
      id, bodega_id, producto_id, cajas, piezas_sueltas,
      ubicacion_pasillo, updated_at, caja_id,
      producto:productos!inventario_stock_producto_id_fkey (
        id, sku_base, nombre, descripcion, familia, pz_en_caja,
        marca:cat_marcas!productos_marca_id_fkey ( nombre )
      ),
      caja:cajas_producto!inventario_stock_caja_id_fkey (
        codigo_caja, nombre_pack
      )
    `, { count: 'exact' })
    .eq('bodega_id', bodegaId)
    .is('caja_id', null) // Solo registros generales

  // ── Filtro: stock en cero ───────────────────────────────
  if (!filtros?.con_stock_cero) {
    query = query.or('cajas.gt.0,piezas_sueltas.gt.0')
  }

  // ── Orden y paginación ──────────────────────────────────
  query = query
    .order('producto_id')
    .range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetchStockByBodega:', error)
    return { items: [], total: 0 }
  }

  const items: StockListItem[] = (data ?? []).map((s: any) => {
    const prod = Array.isArray(s.producto) ? s.producto[0] : s.producto
    const marca = prod?.marca
      ? (Array.isArray(prod.marca) ? prod.marca[0] : prod.marca)
      : null
    const caja = Array.isArray(s.caja) ? s.caja[0] : s.caja

    return {
      id: s.id,
      bodega_id: s.bodega_id,
      producto_id: s.producto_id,
      cajas: s.cajas,
      piezas_sueltas: s.piezas_sueltas,
      ubicacion_pasillo: s.ubicacion_pasillo,
      updated_at: s.updated_at,
      caja_id: s.caja_id,
      producto_sku: prod?.sku_base ?? '',
      producto_nombre: prod?.nombre ?? null,
      producto_descripcion: prod?.descripcion ?? null,
      producto_familia: prod?.familia ?? null,
      producto_pz_en_caja: prod?.pz_en_caja ?? null,
      marca_nombre: marca?.nombre ?? null,
      caja_codigo: caja?.codigo_caja ?? null,
      caja_nombre_pack: caja?.nombre_pack ?? null,
    }
  })

  // Aplicar filtro de búsqueda en cliente (Supabase no filtra dentro de relaciones fácilmente)
  let filtered = items
  if (filtros?.q) {
    const term = filtros.q.toLowerCase()
    filtered = items.filter(
      (i) =>
        i.producto_sku.toLowerCase().includes(term) ||
        (i.producto_nombre?.toLowerCase().includes(term) ?? false)
    )
  }
  if (filtros?.marca_id) {
    // Este filtro se aplica a nivel de producto, pero no podemos filtrar en relación
    // Lo dejamos para el futuro si es necesario optimizar con RPC
  }

  return { items: filtered, total: count ?? 0 }
}

export async function fetchStockDetallePorCaja(
  bodegaId: number,
  productoId: number
): Promise<StockDetalleCaja[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventario_stock')
    .select(`
      id, cajas, piezas_sueltas, caja_id,
      caja:cajas_producto!inventario_stock_caja_id_fkey (
        codigo_caja, nombre_pack, piezas_por_caja
      )
    `)
    .eq('bodega_id', bodegaId)
    .eq('producto_id', productoId)
    .not('caja_id', 'is', null)

  if (error || !data) return []

  return data.map((s: any) => {
    const caja = Array.isArray(s.caja) ? s.caja[0] : s.caja
    return {
      id: s.id,
      cajas: s.cajas,
      piezas_sueltas: s.piezas_sueltas,
      caja_id: s.caja_id,
      caja_codigo: caja?.codigo_caja ?? null,
      caja_nombre_pack: caja?.nombre_pack ?? null,
      caja_piezas_por_caja: caja?.piezas_por_caja ?? null,
    }
  })
}

export async function fetchStockMatrix(
  filtros: FiltrosStockMatrix,
  bodegasDisponibles: BodegaRow[]
): Promise<{ items: StockMatrixItem[]; total: number }> {
  const supabase = await createClient()
  const page = filtros.page ?? 1
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let bodegasAGestionar = bodegasDisponibles
  if (filtros.ciudades && filtros.ciudades.length > 0) {
    bodegasAGestionar = bodegasAGestionar.filter((b) => filtros.ciudades!.includes(b.ciudad || 'sin_asignar'))
  }
  if (filtros.bodegas && filtros.bodegas.length > 0) {
    bodegasAGestionar = bodegasAGestionar.filter((b) => filtros.bodegas!.includes(b.id))
  }
  const bodegasIds = bodegasAGestionar.map((b) => b.id)

  if (bodegasIds.length === 0) return { items: [], total: 0 }

  let query = supabase
    .from('productos')
    .select(`
      id, sku_base, nombre, descripcion, familia, pz_en_caja,
      inventario_stock!inner(bodega_id, cajas, piezas_sueltas, caja_id)
    `, { count: 'exact' })

  query = query.in('inventario_stock.bodega_id', bodegasIds)
  query = query.is('inventario_stock.caja_id', null)

  if (!filtros.con_stock_cero) {
    query = query.or('cajas.gt.0,piezas_sueltas.gt.0', { foreignTable: 'inventario_stock' })
  }

  if (filtros.q) {
    const term = `%${filtros.q}%`
    query = query.or(`sku_base.ilike.${term},nombre.ilike.${term}`)
  }

  query = query.order('id').range(from, to)

  const { data, count, error } = await query

  if (error || !data) {
    console.error('Error fetchStockMatrix:', error)
    return { items: [], total: 0 }
  }

  const items = data.map((prod: any) => {
    const pzCaja = prod.pz_en_caja ?? 0
    const stockEntries = Array.isArray(prod.inventario_stock) ? prod.inventario_stock : [prod.inventario_stock]
    const dict: Record<number, { cajas: number; piezas_sueltas: number; total: number }> = {}
    let totalGeneral = 0

    bodegasIds.forEach((id) => (dict[id] = { cajas: 0, piezas_sueltas: 0, total: 0 }))

    stockEntries.forEach((s: any) => {
      if (!dict[s.bodega_id]) dict[s.bodega_id] = { cajas: 0, piezas_sueltas: 0, total: 0 }
      dict[s.bodega_id].cajas += s.cajas
      dict[s.bodega_id].piezas_sueltas += s.piezas_sueltas
      const localTotal = s.cajas // Solo contabilizar cajas enteras en la vista general
      dict[s.bodega_id].total += localTotal
      totalGeneral += localTotal
    })

    return {
      producto_id: prod.id,
      producto_sku: prod.sku_base,
      producto_nombre: prod.nombre,
      producto_descripcion: prod.descripcion,
      producto_familia: prod.familia,
      pz_en_caja: prod.pz_en_caja,
      stock_por_bodega: dict,
      total_general: totalGeneral,
    }
  })

  return { items: items as StockMatrixItem[], total: count ?? 0 }
}

// ════════════════════════════════════════════════════════════
// CATÁLOGOS
// ════════════════════════════════════════════════════════════

export async function fetchCatalogosInventario(): Promise<CatalogosInventario> {
  'use cache'
  cacheLife('hours') // Cache por 1 hora ya que estos datos cambian poco
  cacheTag('inventario-catalogos')

  const supabase = createStaticClient()

  const [tiposRes, estadosRes, bodegasRes] = await Promise.all([
    supabase
      .from('cat_tipos_movimiento')
      .select('*')
      .order('nombre'),
    supabase
      .from('cat_estados_nota')
      .select('*')
      .order('id'),
    supabase
      .from('bodegas')
      .select('*')
      .eq('activa', true)
      .order('nombre'),
  ])

  return {
    tiposMovimiento: (tiposRes.data ?? []) as TipoMovimientoRow[],
    estadosNota: (estadosRes.data ?? []) as EstadoNotaRow[],
    bodegas: (bodegasRes.data ?? []) as BodegaRow[],
  }
}

export async function fetchBodegas(): Promise<BodegaRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('bodegas')
    .select('*')
    .order('nombre')
  return (data ?? []) as BodegaRow[]
}

export async function fetchTiposMovimiento(): Promise<TipoMovimientoRow[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('tipos-movimiento')

  const supabase = createStaticClient()
  const { data } = await supabase
    .from('cat_tipos_movimiento')
    .select('*')
    .order('nombre')
  return (data ?? []) as TipoMovimientoRow[]
}

export async function fetchEstadosNota(): Promise<EstadoNotaRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cat_estados_nota')
    .select('*')
    .order('id')
  return (data ?? []) as EstadoNotaRow[]
}

// ════════════════════════════════════════════════════════════
// BÚSQUEDA DE PRODUCTOS (para API route)
// ════════════════════════════════════════════════════════════

export async function searchProductos(
  term: string,
  limit: number = 10
): Promise<ProductoBusqueda[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('productos')
    .select(`
      id, sku_base, nombre, descripcion, pz_en_caja,
      marca:cat_marcas!productos_marca_id_fkey ( nombre ),
      imagenes:producto_imagenes!producto_imagenes_producto_id_fkey (
        url
      )
    `)
    .eq('activo', true)
    .or(`sku_base.ilike.%${term}%,descripcion.ilike.%${term}%`)
    .order('sku_base')
    .limit(limit)

  if (error || !data) return []

  return data.map((p: any) => {
    const marca = Array.isArray(p.marca) ? p.marca[0] : p.marca
    const imgs = Array.isArray(p.imagenes) ? p.imagenes : []
    const primeraImagen = imgs.length > 0 ? imgs[0]?.url : null

    return {
      id: p.id,
      sku_base: p.sku_base,
      nombre: p.descripcion ?? p.nombre ?? '',
      descripcion: p.descripcion,
      pz_en_caja: p.pz_en_caja,
      marca_nombre: marca?.nombre ?? null,
      imagen_url: primeraImagen,
    }
  })
}

export async function fetchCajasDeProducto(
  productoId: number
): Promise<CajaParaSelector[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cajas_producto')
    .select('id, codigo_caja, nombre_pack, piezas_por_caja')
    .eq('producto_id', productoId)
    .order('codigo_caja')

  if (error || !data) return []

  return data as CajaParaSelector[]
}

export async function fetchProductoStockEnBodega(
  productoId: number,
  bodegaId: number
): Promise<{ cajas: number; piezas_sueltas: number }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventario_stock')
    .select('cajas, piezas_sueltas')
    .eq('producto_id', productoId)
    .eq('bodega_id', bodegaId)
    .is('caja_id', null)
    .maybeSingle()

  if (error || !data) {
    return { cajas: 0, piezas_sueltas: 0 }
  }

  return {
    cajas: Number(data.cajas) || 0,
    piezas_sueltas: Number(data.piezas_sueltas) || 0,
  }
}

// ════════════════════════════════════════════════════════════
// BODEGAS — USUARIOS ASIGNADOS
// ════════════════════════════════════════════════════════════

export async function fetchUsuariosBodega(
  bodegaId: number
): Promise<(UsuarioBodegaRow & { usuario_nombre: string })[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('usuario_bodegas')
    .select(`*`)
    .eq('bodega_id', bodegaId)

  if (error || !data) return []

  const userIds = Array.from(new Set((data ?? []).map((d: any) => d.usuario_id).filter(Boolean)))
  const { data: usersData } = userIds.length > 0 
    ? await supabase.from('usuarios').select('id, nombre_completo').in('id', userIds)
    : { data: [] }
  const usersMap = new Map(usersData?.map((u: any) => [u.id, u]) || [])

  return data.map((ub: any) => {
    const u: any = usersMap.get(ub.usuario_id)
    return {
      ...ub,
      usuario_nombre: u?.nombre_completo ?? '',
    }
  })
}

export async function fetchUsuariosBodegasMap(
  bodegaIds: number[]
): Promise<Map<number, (UsuarioBodegaRow & { usuario_nombre: string })[]>> {
  const result = new Map<number, (UsuarioBodegaRow & { usuario_nombre: string })[]>()

  if (bodegaIds.length === 0) {
    return result
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('usuario_bodegas')
    .select('*')
    .in('bodega_id', bodegaIds)

  if (error || !data) {
    return result
  }

  const userIds = Array.from(new Set((data ?? []).map((item: any) => item.usuario_id).filter(Boolean)))
  const { data: usersData } = userIds.length > 0
    ? await supabase.from('usuarios').select('id, nombre_completo').in('id', userIds)
    : { data: [] }
  const usersMap = new Map(usersData?.map((u: any) => [u.id, u]) || [])

  for (const rawItem of data as any[]) {
    const current = result.get(rawItem.bodega_id) ?? []
    const usuario = usersMap.get(rawItem.usuario_id)

    current.push({
      ...rawItem,
      usuario_nombre: usuario?.nombre_completo ?? '',
    })

    result.set(rawItem.bodega_id, current)
  }

  return result
}

// ════════════════════════════════════════════════════════════
// NOTAS PENDIENTES POR BODEGA (para panel en stock)
// ════════════════════════════════════════════════════════════

export async function fetchNotasPendientesPorBodega(
  bodegaId: number,
  limit: number = 5
): Promise<NotaListItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notas_inventario')
    .select(`
      id, numero_nota, fecha_nota, fecha_confirmacion, total_cajas, nota_referencia, observaciones, usuario_id,
      costo_total, comprobante_url,
      tipo_movimiento:cat_tipos_movimiento!notas_inventario_tipo_movimiento_id_fkey (
        codigo, nombre, afecta_inventario
      ),
      estado:cat_estados_nota!notas_inventario_estado_id_fkey (
        codigo, nombre, color
      ),
      bodega_origen:bodegas!notas_inventario_bodega_origen_id_fkey (id, nombre, codigo),
      bodega_destino:bodegas!notas_inventario_bodega_destino_id_fkey (id, nombre, codigo)
    `)
    .eq('estado_id', 1) // PEND
    .or(`bodega_origen_id.eq.${bodegaId},bodega_destino_id.eq.${bodegaId}`)
    .order('fecha_nota', { ascending: false })
    .limit(limit)

  if (error || !data) {
    console.error('Error fetchNotasPendientesPorBodega:', error)
    return []
  }

  return (data ?? []).map((n: any) => {
    const tipo = Array.isArray(n.tipo_movimiento) ? n.tipo_movimiento[0] : n.tipo_movimiento
    const estado = Array.isArray(n.estado) ? n.estado[0] : n.estado
    const origen = Array.isArray(n.bodega_origen) ? n.bodega_origen[0] : n.bodega_origen
    const destino = Array.isArray(n.bodega_destino) ? n.bodega_destino[0] : n.bodega_destino
    return {
      id: n.id,
      numero_nota: n.numero_nota,
      fecha_nota: n.fecha_nota,
      fecha_confirmacion: n.fecha_confirmacion,
      total_cajas: n.total_cajas,
      nota_referencia: n.nota_referencia,
      observaciones: n.observaciones,
      tipo_codigo: tipo?.codigo ?? '',
      tipo_nombre: tipo?.nombre ?? '',
      afecta_inventario: tipo?.afecta_inventario ?? 0,
      estado_codigo: estado?.codigo ?? '',
      estado_nombre: estado?.nombre ?? '',
      estado_color: estado?.color ?? null,
      bodega_origen_id: origen?.id ?? 0,
      bodega_origen_nombre: origen?.nombre ?? '',
      bodega_origen_codigo: origen?.codigo ?? '',
      bodega_destino_id: destino?.id ?? null,
      bodega_destino_nombre: destino?.nombre ?? null,
      bodega_destino_codigo: destino?.codigo ?? null,
      usuario_nombre: '',
      usuario_id: n.usuario_id,
      costo_total: n.costo_total ? Number(n.costo_total) : 0,
      comprobante_url: n.comprobante_url ?? null,
    }
  })
}

export async function fetchTodasAsignacionesBodega(): Promise<UsuarioBodegaRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('usuario_bodegas')
    .select('*')
  if (error || !data) return []
  return data as UsuarioBodegaRow[]
}

export async function fetchNotasParaReporte(
  filtros: Omit<FiltrosNotas, 'page'>
): Promise<NotaListItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from('notas_inventario')
    .select(`
      id, numero_nota, fecha_nota, fecha_confirmacion,
      total_cajas, nota_referencia, observaciones, usuario_id,
      costo_total, comprobante_url,
      tipo_movimiento:cat_tipos_movimiento!notas_inventario_tipo_movimiento_id_fkey (
        codigo, nombre, afecta_inventario
      ),
      estado:cat_estados_nota!notas_inventario_estado_id_fkey (
        codigo, nombre, color
      ),
      bodega_origen:bodegas!notas_inventario_bodega_origen_id_fkey (
        id, nombre, codigo
      ),
      bodega_destino:bodegas!notas_inventario_bodega_destino_id_fkey (
        id, nombre, codigo
      )
    `)

  if (filtros.q) {
    query = query.ilike('numero_nota', `%${filtros.q}%`)
  }

  if (filtros.tipo_movimiento_id) {
    query = query.eq('tipo_movimiento_id', filtros.tipo_movimiento_id)
  }

  if (filtros.estado_codigo) {
    const { data: estadoData } = await supabase
      .from('cat_estados_nota')
      .select('id')
      .eq('codigo', filtros.estado_codigo)
      .single()
    if (estadoData) {
      query = query.eq('estado_id', estadoData.id)
    }
  }

  if (filtros.bodega_origen_id) {
    query = query.or(`bodega_origen_id.eq.${filtros.bodega_origen_id},bodega_destino_id.eq.${filtros.bodega_origen_id}`)
  }

  if (filtros.ciudad) {
    const { data: bodegasCiudad } = await supabase
      .from('bodegas')
      .select('id')
      .eq('ciudad', filtros.ciudad)
      .eq('activa', true)
    
    if (bodegasCiudad && bodegasCiudad.length > 0) {
      const idsStr = bodegasCiudad.map(b => b.id).join(',')
      query = query.or(`bodega_origen_id.in.(${idsStr}),bodega_destino_id.in.(${idsStr})`)
    } else {
      query = query.eq('id', -1)
    }
  }

  if (filtros.fecha_desde) {
    query = query.gte('fecha_nota', filtros.fecha_desde)
  }
  if (filtros.fecha_hasta) {
    query = query.lte('fecha_nota', `${filtros.fecha_hasta}T23:59:59`)
  }

  if (filtros.limit_bodega_ids && filtros.limit_bodega_ids.length > 0) {
    const idsStr = filtros.limit_bodega_ids.join(',')
    if (filtros.limit_usuario_id) {
      query = query.or(`bodega_origen_id.in.(${idsStr}),bodega_destino_id.in.(${idsStr}),usuario_id.eq.${filtros.limit_usuario_id}`)
    } else {
      query = query.or(`bodega_origen_id.in.(${idsStr}),bodega_destino_id.in.(${idsStr})`)
    }
  } else if (filtros.limit_usuario_id) {
    query = query.eq('usuario_id', filtros.limit_usuario_id)
  }

  query = query.order('fecha_nota', { ascending: false }).limit(10000)

  const { data, error } = await query

  if (error || !data) {
    console.error('Error fetchNotasParaReporte:', error)
    return []
  }

  const userIds = Array.from(new Set((data ?? []).map(d => d.usuario_id).filter(Boolean)))
  const { data: usersData } = userIds.length > 0 
    ? await supabase.from('usuarios').select('id, nombre_completo').in('id', userIds)
    : { data: [] }
  const usersMap = new Map(usersData?.map(u => [u.id, u]) || [])

  return (data ?? []).map((n: any) => {
    const tipo = Array.isArray(n.tipo_movimiento) ? n.tipo_movimiento[0] : n.tipo_movimiento
    const estado = Array.isArray(n.estado) ? n.estado[0] : n.estado
    const origen = Array.isArray(n.bodega_origen) ? n.bodega_origen[0] : n.bodega_origen
    const destino = Array.isArray(n.bodega_destino) ? n.bodega_destino[0] : n.bodega_destino
    const usuario: any = usersMap.get(n.usuario_id)

    return {
      id: n.id,
      numero_nota: n.numero_nota,
      fecha_nota: n.fecha_nota,
      fecha_confirmacion: n.fecha_confirmacion,
      total_cajas: n.total_cajas,
      nota_referencia: n.nota_referencia,
      observaciones: n.observaciones,
      tipo_codigo: tipo?.codigo ?? '',
      tipo_nombre: tipo?.nombre ?? '',
      afecta_inventario: tipo?.afecta_inventario ?? 0,
      estado_codigo: estado?.codigo ?? '',
      estado_nombre: estado?.nombre ?? '',
      estado_color: estado?.color ?? null,
      bodega_origen_id: origen?.id ?? 0,
      bodega_origen_nombre: origen?.nombre ?? '',
      bodega_origen_codigo: origen?.codigo ?? '',
      bodega_destino_id: destino?.id ?? null,
      bodega_destino_nombre: destino?.nombre ?? null,
      bodega_destino_codigo: destino?.codigo ?? null,
      usuario_nombre: usuario?.nombre_completo ?? '',
      usuario_id: n.usuario_id,
      costo_total: n.costo_total ? Number(n.costo_total) : 0,
      comprobante_url: n.comprobante_url ?? null,
    }
  })
}

export async function fetchResumenReporteNotas(filtros: {
  bodegaIds?: number[]
  fechaDesde?: string
  fechaHasta?: string
  limit_usuario_id?: number
}): Promise<{ total: number; porTipo: Record<string, number> }> {
  const supabase = await createClient()

  let query = supabase
    .from('notas_inventario')
    .select('id, tipo_movimiento_id')

  if (filtros.fechaDesde) {
    query = query.gte('fecha_nota', filtros.fechaDesde)
  }
  if (filtros.fechaHasta) {
    query = query.lte('fecha_nota', `${filtros.fechaHasta}T23:59:59`)
  }

  if (filtros.bodegaIds && filtros.bodegaIds.length > 0) {
    const idsStr = filtros.bodegaIds.join(',')
    if (filtros.limit_usuario_id) {
      query = query.or(`bodega_origen_id.in.(${idsStr}),bodega_destino_id.in.(${idsStr}),usuario_id.eq.${filtros.limit_usuario_id}`)
    } else {
      query = query.or(`bodega_origen_id.in.(${idsStr}),bodega_destino_id.in.(${idsStr})`)
    }
  } else if (filtros.limit_usuario_id) {
    query = query.eq('usuario_id', filtros.limit_usuario_id)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('Error fetchResumenReporteNotas:', error)
    return { total: 0, porTipo: {} }
  }

  const { data: tipos } = await supabase.from('cat_tipos_movimiento').select('id, codigo')
  const tiposMap = new Map(tipos?.map(t => [t.id, t.codigo]) || [])

  const porTipo: Record<string, number> = {}
  data.forEach((n: any) => {
    const code = tiposMap.get(n.tipo_movimiento_id) || 'OTRO'
    porTipo[code] = (porTipo[code] || 0) + 1
  })

  return {
    total: data.length,
    porTipo,
  }
}

// ════════════════════════════════════════════════════════════
// PROPUESTAS OCR
// ════════════════════════════════════════════════════════════

export async function fetchOcrPropuestas(
  filtros: { estado?: string; page?: number }
): Promise<{ propuestas: NotaOcrPropuesta[]; total: number }> {
  const supabase = await createClient()
  const page = filtros.page ?? 1
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = (supabase as any)
    .from('nota_ocr_propuestas')
    .select('*', { count: 'exact' })

  if (filtros.estado) {
    query = query.eq('estado', filtros.estado)
  }

  query = query
    .order('id', { ascending: false })
    .range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetchOcrPropuestas:', JSON.stringify(error, null, 2))
    return { propuestas: [], total: 0 }
  }

  const rawData = (data ?? []) as any[]

  // Fetch related catalog tables in parallel
  // 1. Fetch all cat_tipos_movimiento
  const { data: tiposMovimiento } = await supabase
    .from('cat_tipos_movimiento')
    .select('id, nombre, codigo')
  const tiposMap = new Map(tiposMovimiento?.map(tm => [tm.id, tm]) || [])

  // 2. Fetch all bodegas
  const { data: bodegas } = await supabase
    .from('bodegas')
    .select('id, nombre, codigo')
  const bodegasMap = new Map(bodegas?.map(b => [b.id, b]) || [])

  // 3. Fetch referenced notas_inventario
  const notaIds = Array.from(new Set(rawData.map(d => d.nota_id).filter(Boolean)))
  const { data: notasData } = notaIds.length > 0
    ? await supabase.from('notas_inventario').select('id, numero_nota').in('id', notaIds)
    : { data: [] }
  const notasMap = new Map(notasData?.map(n => [n.id, n.numero_nota]) || [])

  // 4. Resolver los nombres de los usuarios revisores
  const revisorIds = Array.from(new Set(rawData.map(d => d.revisado_por).filter(Boolean)))
  const { data: usersData } = revisorIds.length > 0
    ? await supabase.from('usuarios').select('id, nombre_completo').in('id', revisorIds)
    : { data: [] }
  const usersMap = new Map(usersData?.map(u => [u.id, u.nombre_completo]) || [])

  const propuestas: NotaOcrPropuesta[] = rawData.map((p: any) => {
    const tm = p.tipo_movimiento_id ? tiposMap.get(Number(p.tipo_movimiento_id)) : null
    const bo = p.bodega_origen_id ? bodegasMap.get(Number(p.bodega_origen_id)) : null
    const bd = p.bodega_destino_id ? bodegasMap.get(Number(p.bodega_destino_id)) : null
    const notaNumero = p.nota_id ? notasMap.get(Number(p.nota_id)) : null

    return {
      id: p.id,
      created_at: p.creado_en,
      client_request_id: p.client_request_id,
      comprobante_url: p.comprobante_url,
      storage_path: p.storage_path,
      folio_detectado: p.folio_detectado,
      fecha_detectada: p.fecha_detectada,
      tipo_movimiento_detectado: p.tipo_movimiento_detectado,
      origen_detectado: p.origen_detectado,
      destino_detectado: p.destino_detectado,
      lineas: p.lineas || [],
      json_crudo: p.json_crudo,
      confianza_global: p.confianza_global ? Number(p.confianza_global) : null,
      tipo_movimiento_id: p.tipo_movimiento_id ? Number(p.tipo_movimiento_id) : null,
      bodega_origen_id: p.bodega_origen_id ? Number(p.bodega_origen_id) : null,
      bodega_destino_id: p.bodega_destino_id ? Number(p.bodega_destino_id) : null,
      lineas_confirmadas: p.lineas_confirmadas || [],
      revisado_por: p.revisado_por ? Number(p.revisado_por) : null,
      revisado_en: p.revisado_en,
      nota_id: p.nota_id ? Number(p.nota_id) : null,
      estado: p.estado,
      tipo_movimiento_nombre: tm?.nombre,
      tipo_movimiento_codigo: tm?.codigo,
      bodega_origen_nombre: bo?.nombre,
      bodega_destino_nombre: bd?.nombre,
      revisado_por_nombre: p.revisado_por ? usersMap.get(Number(p.revisado_por)) : undefined,
      nota_numero: notaNumero || undefined
    }
  })

  return { propuestas, total: count ?? 0 }
}

export async function fetchOcrPropuestaById(
  id: string
): Promise<NotaOcrPropuesta | null> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('nota_ocr_propuestas')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    console.error('Error fetchOcrPropuestaById:', error)
    return null
  }

  const p: any = data

  // Fetch specific cat_tipos_movimiento
  let tm: any = null
  if (p.tipo_movimiento_id) {
    const { data: tmData } = await supabase
      .from('cat_tipos_movimiento')
      .select('id, nombre, codigo')
      .eq('id', p.tipo_movimiento_id)
      .single()
    tm = tmData
  }

  // Fetch bodega_origen
  let bo: any = null
  if (p.bodega_origen_id) {
    const { data: boData } = await supabase
      .from('bodegas')
      .select('id, nombre, codigo')
      .eq('id', p.bodega_origen_id)
      .single()
    bo = boData
  }

  // Fetch bodega_destino
  let bd: any = null
  if (p.bodega_destino_id) {
    const { data: bdData } = await supabase
      .from('bodegas')
      .select('id, nombre, codigo')
      .eq('id', p.bodega_destino_id)
      .single()
    bd = bdData
  }

  // Fetch referenced nota_inventario
  let notaNumero: string | undefined = undefined
  if (p.nota_id) {
    const { data: notaData } = await supabase
      .from('notas_inventario')
      .select('numero_nota')
      .eq('id', p.nota_id)
      .single()
    notaNumero = notaData?.numero_nota
  }

  let revisadoPorNombre: string | undefined = undefined
  if (p.revisado_por) {
    const { data: userData } = await supabase
      .from('usuarios')
      .select('nombre_completo')
      .eq('id', p.revisado_por)
      .single()
    revisadoPorNombre = userData?.nombre_completo
  }

  return {
    id: p.id,
    created_at: p.creado_en,
    client_request_id: p.client_request_id,
    comprobante_url: p.comprobante_url,
    storage_path: p.storage_path,
    folio_detectado: p.folio_detectado,
    fecha_detectada: p.fecha_detectada,
    tipo_movimiento_detectado: p.tipo_movimiento_detectado,
    origen_detectado: p.origen_detectado,
    destino_detectado: p.destino_detectado,
    lineas: p.lineas || [],
    json_crudo: p.json_crudo,
    confianza_global: p.confianza_global ? Number(p.confianza_global) : null,
    tipo_movimiento_id: p.tipo_movimiento_id ? Number(p.tipo_movimiento_id) : null,
    bodega_origen_id: p.bodega_origen_id ? Number(p.bodega_origen_id) : null,
    bodega_destino_id: p.bodega_destino_id ? Number(p.bodega_destino_id) : null,
    lineas_confirmadas: p.lineas_confirmadas || [],
    revisado_por: p.revisado_por ? Number(p.revisado_por) : null,
    revisado_en: p.revisado_en,
    nota_id: p.nota_id ? Number(p.nota_id) : null,
    estado: p.estado,
    tipo_movimiento_nombre: tm?.nombre,
    tipo_movimiento_codigo: tm?.codigo,
    bodega_origen_nombre: bo?.nombre,
    bodega_destino_nombre: bd?.nombre,
    revisado_por_nombre: revisadoPorNombre,
    nota_numero: notaNumero
  }
}
