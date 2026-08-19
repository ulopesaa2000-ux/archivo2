// modules/dashboard/queries.ts
import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { UsuarioConRol, BodegaRow } from '@/lib/types/tables'
import { getPeriodDateRange } from './utils'
import type { 
  DashboardPeriod, 
  InventarioDashboardData, 
  EcommerceDashboardData, 
  ComercialDashboardData,
  CatalogoDashboardData,
  TopBodegaMovimiento,
  NotaRecienteDashboard,
  ProductoStockTopItem,
  TipoPrendaResumen,
  GeneroResumen
} from './types'

/**
 * Consulta métricas de inventario para el dashboard:
 * - Filtra por bodega si bodegaId > 0, o consolida si bodegaId === 0.
 * - Aplica el rango de fechas (semana / mes / todo).
 */
export async function fetchInventarioDashboardData({
  periodo,
  bodegaId,
  bodegasUsuario,
}: {
  periodo: DashboardPeriod
  bodegaId: number
  bodegasUsuario: BodegaRow[]
}): Promise<InventarioDashboardData> {
  const supabase = await createClient()
  const dateRange = getPeriodDateRange(periodo)

  // 1. Query base de notas activas en el período
  let notasQuery = supabase
    .from('notas_inventario')
    .select(`
      id,
      numero_nota,
      tipo_movimiento_id,
      estado_id,
      fecha_nota,
      total_cajas,
      bodega_origen_id,
      bodega_destino_id,
      created_at,
      activo,
      tipo_movimiento:cat_tipos_movimiento!notas_inventario_tipo_movimiento_id_fkey(codigo, nombre),
      estado:cat_estados_nota!notas_inventario_estado_id_fkey(codigo, nombre),
      bodega_origen:bodegas!notas_inventario_bodega_origen_id_fkey(id, nombre, es_virtual),
      bodega_destino:bodegas!notas_inventario_bodega_destino_id_fkey(id, nombre, es_virtual)
    `)
    .eq('activo', true)
    .order('created_at', { ascending: false })

  if (bodegaId > 0) {
    notasQuery = notasQuery.or(`bodega_origen_id.eq.${bodegaId},bodega_destino_id.eq.${bodegaId}`)
  }

  if (dateRange.inicio && dateRange.fin) {
    notasQuery = notasQuery.gte('created_at', dateRange.inicio).lte('created_at', dateRange.fin)
  }

  // 2. Query de notas pendientes activas globales o por bodega
  // Estados pendientes: PEND (id 1) y PROC (id 4), o buscando por relación
  let notasPendientesQuery = supabase
    .from('notas_inventario')
    .select(`
      id,
      estado:cat_estados_nota!notas_inventario_estado_id_fkey!inner(codigo)
    `, { count: 'exact', head: true })
    .eq('activo', true)
    .in('estado.codigo', ['PEND', 'PROC', 'BORR'])

  if (bodegaId > 0) {
    notasPendientesQuery = notasPendientesQuery.or(`bodega_origen_id.eq.${bodegaId},bodega_destino_id.eq.${bodegaId}`)
  }

  // 3. Query de stock actual (cajas y piezas sueltas)
  let stockQuery = supabase
    .from('inventario_stock')
    .select('producto_id, bodega_id, cajas, piezas_sueltas')

  if (bodegaId > 0) {
    stockQuery = stockQuery.eq('bodega_id', bodegaId)
  }

  // 4. Catálogo de productos para factor pz_en_caja
  const prodsFactorQuery = supabase
    .from('productos')
    .select('id, pz_en_caja')

  // Ejecutar queries en paralelo
  const [notasRes, pendientesRes, stockRes, prodsFactorRes] = await Promise.all([
    notasQuery.limit(100),
    notasPendientesQuery,
    stockQuery,
    prodsFactorQuery,
  ])

  const notas = notasRes.data ?? []
  const notasPendientesCount = pendientesRes.count ?? 0
  const stockItems = stockRes.data ?? []
  const factorMap = new Map((prodsFactorRes.data ?? []).map((p: any) => [p.id, p.pz_en_caja || 1]))

  // Calcular KPIs de inventario
  let notasConfirmadas = 0
  let entradasPeriodo = 0
  let piezasIngresadas = 0
  let piezasSalidas = 0

  const movimientosPorBodega: Record<number, { totalNotas: number; totalPiezas: number; nombre: string; esVirtual: boolean }> = {}

  notas.forEach((n: any) => {
    const estadoCod = n.estado?.codigo ?? ''
    const tipoCod = n.tipo_movimiento?.codigo ?? ''
    const cajas = n.total_cajas || 0

    if (estadoCod === 'CONF') {
      notasConfirmadas++
    }

    if (tipoCod === 'ENT') {
      entradasPeriodo++
      piezasIngresadas += cajas
    } else if (tipoCod === 'SAL') {
      piezasSalidas += cajas
    }

    // Agrupar movimientos por bodega (origen o destino)
    const bId = n.bodega_origen_id || n.bodega_destino_id
    const bodegaObj = n.bodega_origen || n.bodega_destino
    if (bId) {
      if (!movimientosPorBodega[bId]) {
        movimientosPorBodega[bId] = {
          totalNotas: 0,
          totalPiezas: 0,
          nombre: bodegaObj?.nombre ?? `Bodega #${bId}`,
          esVirtual: bodegaObj?.es_virtual ?? false,
        }
      }
      movimientosPorBodega[bId].totalNotas += 1
      movimientosPorBodega[bId].totalPiezas += cajas
    }
  })

  // Agregaciones de stock: cajas totales y piezas totales (cajas * pz_en_caja + piezas_sueltas)
  const totalCajasStock = stockItems.reduce((acc, item) => acc + (item.cajas || 0), 0)
  const totalPiezasStock = stockItems.reduce((acc, item) => {
    const pzPorCaja = factorMap.get(item.producto_id) ?? 1
    const pzDeCajas = (item.cajas || 0) * pzPorCaja
    const pzSueltas = item.piezas_sueltas || 0
    return acc + pzDeCajas + pzSueltas
  }, 0)
  const uniqueProductos = new Set(stockItems.filter(s => (s.cajas || 0) > 0 || (s.piezas_sueltas || 0) > 0).map(s => s.producto_id))
  const totalProductosConStock = uniqueProductos.size

  // Top Bodegas
  const topBodegas: TopBodegaMovimiento[] = Object.entries(movimientosPorBodega)
    .map(([bIdStr, data]) => {
      const bId = parseInt(bIdStr, 10)
      const bodegaInfo = bodegasUsuario.find(b => b.id === bId)
      return {
        bodegaId: bId,
        nombre: bodegaInfo?.nombre ?? data.nombre,
        esVirtual: bodegaInfo?.es_virtual ?? data.esVirtual,
        totalNotas: data.totalNotas,
        totalPiezas: data.totalPiezas,
      }
    })
    .sort((a, b) => b.totalNotas - a.totalNotas)
    .slice(0, 6)

  // Notas Recientes formateadas
  const notasRecientes: NotaRecienteDashboard[] = notas.slice(0, 8).map((n: any) => ({
    id: n.id,
    folio: n.numero_nota,
    tipo_movimiento_id: n.tipo_movimiento?.codigo ?? 'TRF',
    estado_id: n.estado_id,
    fecha_movimiento: n.fecha_nota || n.created_at,
    total_piezas: n.total_cajas || 0,
    bodega_nombre: n.bodega_origen?.nombre ?? n.bodega_destino?.nombre ?? 'Sin asignar',
    created_at: n.created_at,
  }))

  const entradasRecientes: NotaRecienteDashboard[] = notas
    .filter((n: any) => n.tipo_movimiento?.codigo === 'ENT')
    .slice(0, 6)
    .map((n: any) => ({
      id: n.id,
      folio: n.numero_nota,
      tipo_movimiento_id: n.tipo_movimiento?.codigo ?? 'ENT',
      estado_id: n.estado_id,
      fecha_movimiento: n.fecha_nota || n.created_at,
      total_piezas: n.total_cajas || 0,
      bodega_nombre: n.bodega_origen?.nombre ?? n.bodega_destino?.nombre ?? 'Sin asignar',
      created_at: n.created_at,
    }))

  const bodegaActual = bodegaId === 0 
    ? null 
    : bodegasUsuario.find(b => b.id === bodegaId)

  return {
    kpis: {
      notasCreadasPeriodo: notas.length,
      notasConfirmadasPeriodo: notasConfirmadas,
      notasPendientes: notasPendientesCount,
      entradasPeriodo,
      piezasIngresadasPeriodo: piezasIngresadas,
      piezasSalidasPeriodo: piezasSalidas,
      totalProductosConStock,
      totalCajasStock,
      totalPiezasStock,
    },
    topBodegas,
    notasRecientes,
    entradasRecientes,
    bodegaSeleccionadaId: bodegaId,
    bodegaNombre: bodegaActual?.nombre ?? 'Todas las bodegas',
  }
}

/**
 * Consulta métricas de ecommerce para el dashboard:
 * - Productos web (publicados, oferta, destacados)
 * - Órdenes de venta / cotizaciones
 */
export async function fetchEcommerceDashboardData({
  periodo,
}: {
  periodo: DashboardPeriod
}): Promise<EcommerceDashboardData> {
  const supabase = await createClient()
  const dateRange = getPeriodDateRange(periodo)

  // 1. Productos Web
  const productosWebPromise = supabase
    .from('productos_web')
    .select('id, precio_publico, precio_oferta, en_oferta, destacado, nuevo')

  // 2. Órdenes de Venta en el período
  let ordenesQuery = supabase
    .from('ordenes_venta')
    .select('id, numero_orden, nombre_cliente, email_cliente, estado, total, fecha_orden, created_at')
    .order('created_at', { ascending: false })

  if (dateRange.inicio && dateRange.fin) {
    ordenesQuery = ordenesQuery.gte('created_at', dateRange.inicio).lte('created_at', dateRange.fin)
  }

  // 3. Órdenes pendientes globales
  const ordenesPendientesPromise = supabase
    .from('ordenes_venta')
    .select('id', { count: 'exact', head: true })
    .in('estado', ['pendiente', 'recibida', 'en_revision'])

  const [productosWebRes, ordenesRes, pendientesRes] = await Promise.all([
    productosWebPromise,
    ordenesQuery.limit(50),
    ordenesPendientesPromise,
  ])

  const productosWeb = productosWebRes.data ?? []
  const ordenes = ordenesRes.data ?? []
  const ordenesPendientesCount = pendientesRes.count ?? 0

  const totalProductosWeb = productosWeb.length
  const productosEnOferta = productosWeb.filter(p => p.en_oferta || (p.precio_oferta && p.precio_oferta > 0)).length
  const productosDestacados = productosWeb.filter(p => p.destacado).length
  const montoVentas = ordenes.reduce((acc, o) => acc + (o.total || 0), 0)

  return {
    kpis: {
      totalProductosWeb,
      productosPublicados: totalProductosWeb,
      productosEnOferta,
      productosDestacados,
      ordenesPeriodo: ordenes.length,
      ordenesPendientes: ordenesPendientesCount,
      montoVentasPeriodo: montoVentas,
    },
    ordenesRecientes: ordenes.slice(0, 8),
  }
}

/**
 * Consulta métricas comerciales B2B
 */
export async function fetchComercialDashboardData({
  user,
}: {
  user: UsuarioConRol
}): Promise<ComercialDashboardData> {
  const supabase = await createClient()
  const persona = user.persona
  const nivel = user.rol?.nivel_acceso ?? 99

  let ordenesCount = 0
  let contenedoresCount = 0
  let cajasCount = 0
  let ultimasOrdenes: any[] = []
  let proximosContenedores: any[] = []

  if (nivel === 4 && persona) {
    // Cliente B2B
    const { data: ords } = await supabase
      .from('ordenes_b2b')
      .select('id, folio_proveedor, estado, fecha_orden, total_cajas, total_piezas, contenedor_id')
      .eq('cliente_b2b_id', persona.id)
      .neq('estado', 'Cancelada')
      .order('fecha_orden', { ascending: false })

    ultimasOrdenes = ords?.slice(0, 10) ?? []
    ordenesCount = ords?.filter(o => o.estado !== 'Completo').length ?? 0

    if (ords && ords.length > 0) {
      const contenedorIds = Array.from(new Set(ords.map(o => o.contenedor_id).filter(Boolean))) as number[]
      if (contenedorIds.length > 0) {
        const { data: conts } = await supabase
          .from('v_contenedor_resumen')
          .select('*')
          .in('contenedor_id', contenedorIds)
          .neq('estado', 'cerrado')
          .neq('estado', 'cancelado')

        proximosContenedores = conts?.slice(0, 10) ?? []
        contenedoresCount = conts?.length ?? 0
      }
      cajasCount = ords.reduce((acc, o) => acc + (o.total_cajas || 0), 0)
    }
  } else if (nivel === 5 && persona) {
    // Proveedor B2B
    const { data: ords } = await supabase
      .from('ordenes_b2b')
      .select('id, folio_proveedor, estado, fecha_orden, total_cajas, total_piezas, contenedor_id')
      .eq('proveedor_id', persona.id)
      .neq('estado', 'Cancelada')
      .order('fecha_orden', { ascending: false })

    ultimasOrdenes = ords?.slice(0, 10) ?? []
    ordenesCount = ords?.filter(o => o.estado !== 'Completo').length ?? 0

    if (ords && ords.length > 0) {
      const contenedorIds = Array.from(new Set(ords.map(o => o.contenedor_id).filter(Boolean))) as number[]
      if (contenedorIds.length > 0) {
        const { data: conts } = await supabase
          .from('v_contenedor_resumen')
          .select('*')
          .in('contenedor_id', contenedorIds)
          .neq('estado', 'cerrado')
          .neq('estado', 'cancelado')

        proximosContenedores = conts?.slice(0, 10) ?? []
        contenedoresCount = conts?.length ?? 0
      }
      cajasCount = ords.reduce((acc, o) => acc + (o.total_cajas || 0), 0)
    }
  } else {
    // Global Admin
    const [ordsRes, contsRes, cajasRes] = await Promise.all([
      supabase.from('ordenes_b2b').select('id, folio_proveedor, estado, fecha_orden, total_cajas, total_piezas, contenedor_id').neq('estado', 'Cancelada').order('created_at', { ascending: false }),
      supabase.from('v_contenedor_resumen').select('*').neq('estado', 'cerrado').neq('estado', 'cancelado'),
      supabase.from('cajas_producto').select('id', { count: 'exact' }),
    ])

    ultimasOrdenes = ordsRes.data?.slice(0, 10) ?? []
    ordenesCount = ordsRes.data?.filter(o => o.estado !== 'Completo').length ?? 0
    proximosContenedores = contsRes.data?.slice(0, 10) ?? []
    contenedoresCount = contsRes.data?.length ?? 0
    cajasCount = cajasRes.count ?? 0
  }

  return {
    kpis: {
      ordenesActivas: ordenesCount,
      contenedoresTransito: contenedoresCount,
      cajasSolicitadas: cajasCount,
      despachosActivos: 0,
    },
    ultimasOrdenes,
    proximosContenedores,
  }
}

/**
 * Consulta y cruza el catálogo de productos activos con el stock real por género, edad y tipo de prenda.
 */
export async function fetchCatalogoDashboardData({
  bodegaId,
  bodegasUsuario,
}: {
  bodegaId: number
  bodegasUsuario: BodegaRow[]
}): Promise<CatalogoDashboardData> {
  const supabase = await createClient()

  // 1. Consultar productos y catálogos en paralelo
  const stockPromise = bodegaId > 0
    ? supabase.from('inventario_stock').select('producto_id, bodega_id, cajas, piezas_sueltas').eq('bodega_id', bodegaId)
    : supabase.from('inventario_stock').select('producto_id, bodega_id, cajas, piezas_sueltas')

  const [prodsRes, generosRes, tiposPrendaRes, edadesRes, stockRes] = await Promise.all([
    supabase
      .from('productos')
      .select('id, sku_base, nombre, descripcion, pz_en_caja, genero_id, tipo_prenda_id, edad_id')
      .eq('activo', true),
    supabase
      .from('cat_generos')
      .select('id, nombre'),
    supabase
      .from('cat_tipo_prenda')
      .select('id, nombre'),
    supabase
      .from('cat_edades')
      .select('id, rango'),
    stockPromise,
  ])

  const productos = prodsRes.data ?? []
  const generosList = generosRes.data ?? []
  const tiposPrendaList = tiposPrendaRes.data ?? []
  const edadesList = edadesRes.data ?? []
  const stockItems = stockRes.data ?? []

  const generosMapLookup = new Map(generosList.map((g) => [g.id, g.nombre]))
  const tiposPrendaLookup = new Map(tiposPrendaList.map((t) => [t.id, t.nombre]))
  const edadesLookup = new Map(edadesList.map((e: any) => [e.id, e.rango || '']))

  // Mapear stock por producto_id
  const stockPorProducto: Record<number, { cajas: number; piezas: number }> = {}
  stockItems.forEach((item) => {
    const pId = item.producto_id
    if (!stockPorProducto[pId]) {
      stockPorProducto[pId] = { cajas: 0, piezas: 0 }
    }
    stockPorProducto[pId].cajas += item.cajas || 0
    stockPorProducto[pId].piezas += item.piezas_sueltas || 0
  })

  // Estructuras de agregación
  let totalCajasGlobal = 0
  let totalPiezasGlobal = 0
  let totalConStockGlobal = 0

  const generosMap: Record<string, {
    totalSKUs: number
    totalSKUsConStock: number
    totalCajas: number
    totalPiezas: number
    tiposPrendaMap: Record<string, {
      tipoPrendaId: number
      nombre: string
      totalSKUs: number
      totalSKUsConStock: number
      totalCajas: number
      totalPiezas: number
      productos: ProductoStockTopItem[]
    }>
  }> = {
    'Dama': { totalSKUs: 0, totalSKUsConStock: 0, totalCajas: 0, totalPiezas: 0, tiposPrendaMap: {} },
    'Caballero': { totalSKUs: 0, totalSKUsConStock: 0, totalCajas: 0, totalPiezas: 0, tiposPrendaMap: {} },
    'Infantil': { totalSKUs: 0, totalSKUsConStock: 0, totalCajas: 0, totalPiezas: 0, tiposPrendaMap: {} },
    'Unisex / Otros': { totalSKUs: 0, totalSKUsConStock: 0, totalCajas: 0, totalPiezas: 0, tiposPrendaMap: {} },
  }

  const todosProductosConStock: ProductoStockTopItem[] = []

  productos.forEach((p: any) => {
    const pId = p.id
    const pzCaja = p.pz_en_caja || 1
    const stockInfo = stockPorProducto[pId] || { cajas: 0, piezas: 0 }
    const cajas = stockInfo.cajas
    const piezasTotales = (cajas * pzCaja) + stockInfo.piezas
    const tieneStock = cajas >= 1 || piezasTotales > 0

    if (tieneStock) {
      totalConStockGlobal++
    }
    totalCajasGlobal += cajas
    totalPiezasGlobal += piezasTotales

    // Determinar categoría de género / edad
    const edadNombre = (edadesLookup.get(p.edad_id) || '').toLowerCase()
    const generoNombre = generosMapLookup.get(p.genero_id) || ''
    const tipoPrendaNombre = tiposPrendaLookup.get(p.tipo_prenda_id) || 'General'
    const tipoPrendaId = p.tipo_prenda_id || 0

    let grupoGenero = 'Unisex / Otros'
    if (edadNombre.includes('infantil') || edadNombre.includes('niñ') || edadNombre.includes('bebé') || edadNombre.includes('bebe') || generoNombre.toLowerCase().includes('niñ')) {
      grupoGenero = 'Infantil'
    } else if (generoNombre.toLowerCase().includes('dama') || generoNombre.toLowerCase().includes('mujer')) {
      grupoGenero = 'Dama'
    } else if (generoNombre.toLowerCase().includes('caballero') || generoNombre.toLowerCase().includes('hombre')) {
      grupoGenero = 'Caballero'
    }

    const genTarget = generosMap[grupoGenero]
    genTarget.totalSKUs++
    genTarget.totalCajas += cajas
    genTarget.totalPiezas += piezasTotales
    if (tieneStock) {
      genTarget.totalSKUsConStock++
    }

    // Tipo de prenda dentro del género
    if (!genTarget.tiposPrendaMap[tipoPrendaNombre]) {
      genTarget.tiposPrendaMap[tipoPrendaNombre] = {
        tipoPrendaId,
        nombre: tipoPrendaNombre,
        totalSKUs: 0,
        totalSKUsConStock: 0,
        totalCajas: 0,
        totalPiezas: 0,
        productos: [],
      }
    }

    const tipoTarget = genTarget.tiposPrendaMap[tipoPrendaNombre]
    tipoTarget.totalSKUs++
    tipoTarget.totalCajas += cajas
    tipoTarget.totalPiezas += piezasTotales
    if (tieneStock) {
      tipoTarget.totalSKUsConStock++
    }

    const itemTop: ProductoStockTopItem = {
      id: p.id,
      sku_base: p.sku_base,
      nombre: p.nombre,
      descripcion: p.descripcion,
      genero: grupoGenero,
      tipo_prenda: tipoPrendaNombre,
      cajas,
      piezas: piezasTotales,
      pz_en_caja: pzCaja,
      imagen_url: null,
    }

    tipoTarget.productos.push(itemTop)
    todosProductosConStock.push(itemTop)
  })

  // Ordenar y construir resumen
  const resumenGeneros: GeneroResumen[] = Object.entries(generosMap).map(([genNombre, genData]) => {
    const tiposPrenda: TipoPrendaResumen[] = Object.values(genData.tiposPrendaMap)
      .map((t) => ({
        tipoPrendaId: t.tipoPrendaId,
        nombre: t.nombre,
        genero: genNombre,
        totalSKUs: t.totalSKUs,
        totalSKUsConStock: t.totalSKUsConStock,
        totalCajas: t.totalCajas,
        totalPiezas: t.totalPiezas,
        topProductos: t.productos.sort((a, b) => b.cajas - a.cajas || b.piezas - a.piezas).slice(0, 10),
      }))
      .sort((a, b) => b.totalCajas - a.totalCajas || b.totalSKUs - a.totalSKUs)

    return {
      genero: genNombre,
      totalSKUs: genData.totalSKUs,
      totalSKUsConStock: genData.totalSKUsConStock,
      totalCajas: genData.totalCajas,
      totalPiezas: genData.totalPiezas,
      tiposPrenda,
    }
  })

  // Top chamarras de dama
  const damaGroup = generosMap['Dama']
  const chamarrasDamaObj = Object.values(damaGroup.tiposPrendaMap).find(t => t.nombre.toLowerCase().includes('chamarra'))
  const topChamarrasDama = (chamarrasDamaObj?.productos ?? [])
    .sort((a, b) => b.cajas - a.cajas || b.piezas - a.piezas)
    .slice(0, 10)

  const topProductosGeneral = todosProductosConStock
    .sort((a, b) => b.cajas - a.cajas || b.piezas - a.piezas)
    .slice(0, 10)

  const bodegaActual = bodegaId === 0 
    ? null 
    : bodegasUsuario.find(b => b.id === bodegaId)

  return {
    totalProductosActivos: productos.length,
    totalProductosConStock: totalConStockGlobal,
    totalCajasStock: totalCajasGlobal,
    totalPiezasStock: totalPiezasGlobal,
    resumenGeneros,
    topChamarrasDama,
    topProductosGeneral,
    bodegaSeleccionadaId: bodegaId,
    bodegaNombre: bodegaActual?.nombre ?? 'Todas las bodegas',
  }
}

