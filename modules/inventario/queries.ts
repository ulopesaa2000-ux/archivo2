// modules/inventario/queries.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { PAGE_SIZE } from '@/lib/constants'
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
      tipo_movimiento:cat_tipos_movimiento!notas_inventario_tipo_movimiento_id_fkey (
        codigo, nombre, afecta_inventario
      ),
      estado:cat_estados_nota!notas_inventario_estado_id_fkey (
        codigo, nombre, color
      ),
      bodega_origen:bodegas!notas_inventario_bodega_origen_id_fkey (
        nombre, codigo
      ),
      bodega_destino:bodegas!notas_inventario_bodega_destino_id_fkey (
        nombre, codigo
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

  // ── Filtro: bodega origen ───────────────────────────────
  if (filtros.bodega_origen_id) {
    query = query.eq('bodega_origen_id', filtros.bodega_origen_id)
  }

  // ── Filtro: rango de fechas ─────────────────────────────
  if (filtros.fecha_desde) {
    query = query.gte('fecha_nota', filtros.fecha_desde)
  }
  if (filtros.fecha_hasta) {
    query = query.lte('fecha_nota', `${filtros.fecha_hasta}T23:59:59`)
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
      bodega_origen_nombre: origen?.nombre ?? '',
      bodega_origen_codigo: origen?.codigo ?? '',
      bodega_destino_nombre: destino?.nombre ?? null,
      bodega_destino_codigo: destino?.codigo ?? null,
      usuario_nombre: usuario?.nombre_completo ?? '',
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
      tipo_movimiento:cat_tipos_movimiento!notas_inventario_tipo_movimiento_id_fkey (
        codigo, nombre, afecta_inventario
      ),
      estado:cat_estados_nota!notas_inventario_estado_id_fkey (
        codigo, nombre, color
      ),
      bodega_origen:bodegas!notas_inventario_bodega_origen_id_fkey (
        nombre, codigo
      ),
      bodega_destino:bodegas!notas_inventario_bodega_destino_id_fkey (
        nombre, codigo
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
    bodega_origen_nombre: origen?.nombre ?? '',
    bodega_origen_codigo: origen?.codigo ?? '',
    bodega_destino_nombre: destino?.nombre ?? null,
    bodega_destino_codigo: destino?.codigo ?? null,
    usuario_nombre: usuario?.nombre_completo ?? '',
  }

  // 2. Detalles de productos
  const [detalles, historial] = await Promise.all([
    fetchNotaDetalles(supabase, id),
    fetchNotaHistorial(supabase, id),
  ])

  return { cabecera, detalles, historial }
}

async function fetchNotaDetalles(
  supabase: any,
  notaId: number
): Promise<NotaDetalleResuelto[]> {
  const { data, error } = await supabase
    .from('nota_detalle_productos')
    .select(`
      id, nota_id, producto_id, variante_id, cajas, piezas_sueltas, caja_id,
      producto:productos!nota_detalle_productos_producto_id_fkey (
        sku_base, nombre, pz_en_caja
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
      producto_nombre: prod?.nombre ?? null,
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
  supabase: any,
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
        id, sku_base, nombre, pz_en_caja,
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
      id, sku_base, nombre, pz_en_caja,
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
  const supabase = await createClient()

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
  const supabase = await createClient()
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
      id, sku_base, nombre, pz_en_caja,
      marca:cat_marcas!productos_marca_id_fkey ( nombre ),
      imagenes:producto_imagenes!producto_imagenes_producto_id_fkey (
        url
      )
    `)
    .eq('activo', true)
    .or(`sku_base.ilike.%${term}%,nombre.ilike.%${term}%`)
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
      nombre: p.nombre,
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
