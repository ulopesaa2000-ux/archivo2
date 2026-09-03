// modules/inventario/trazabilidad.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export interface TrazabilidadFiltros {
  q?: string
  periodo?: 'mes_actual' | 'mes_anterior' | 'ultimo_mes' | 'rango' | 'todo'
  fecha_desde?: string
  fecha_hasta?: string
  ciudad?: string
  familia?: string
  agrupar_por?: 'familia' | 'producto'
}

export interface CiudadMovimiento {
  ciudad: string
  cajas_salida: number
  cajas_entrada: number
  porcentaje_salida: number
}

export interface TraspasoInterCiudad {
  origen_ciudad: string
  destino_ciudad: string
  origen_bodega: string
  destino_bodega: string
  cajas: number
}

export interface FilaTrazabilidadMatriz {
  id: string // familia o producto_id
  familia: string
  producto_id?: number
  sku_base?: string
  descripcion?: string
  foto_url?: string | null
  stock_inicial: number
  total_entradas: number
  total_salidas: number
  total_traspasos: number
  stock_actual: number
  salidas_por_ciudad: Record<string, number>
  stock_por_ciudad: Record<string, number>
  traspasos_flujo: TraspasoInterCiudad[]
  skus?: FilaTrazabilidadMatriz[]
}

export interface TimelineEvento {
  nota_id: number
  detalle_id: number
  fecha_nota: string
  created_at: string
  numero_nota: string
  tipo_codigo: 'ENT' | 'SAL' | 'TRF' | 'AJU' | 'DEV'
  tipo_nombre: string
  estado_codigo: string
  producto_id: number
  sku_base: string
  descripcion: string | null
  cajas: number
  piezas_sueltas: number
  origen_bodega: string | null
  origen_ciudad: string | null
  destino_bodega: string | null
  destino_ciudad: string | null
  cliente_destino: string | null
  observaciones: string | null
  nota_referencia: string | null
  saldo_despues?: number
}

export interface TrazabilidadCompletaRespuesta {
  filtrosAplicados: {
    periodo: string
    fechaDesde: string
    fechaHasta: string
    ciudad?: string
    familia?: string
    q?: string
    agruparPor: 'familia' | 'producto'
  }
  kpis: {
    totalSalidasCajas: number
    totalEntradasCajas: number
    totalTraspasosCajas: number
    totalStockEmpresa: number
    ciudadesSalidas: CiudadMovimiento[]
    topFamiliasRotacion: { familia: string; descripcion?: string | null; salidas: number; porcentaje: number }[]
    topFamiliasStock: { familia: string; descripcion?: string | null; stock: number }[]
  }
  ciudadesDisponibles: string[]
  familiasDisponibles: { codigo: string; descripcion: string | null }[]
  matriz: FilaTrazabilidadMatriz[]
}

function resolverRangoFechas(filtros: TrazabilidadFiltros): { desde: string; hasta: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed

  if (filtros.periodo === 'mes_anterior') {
    const primerDiaMesAnt = new Date(year, month - 1, 1)
    const ultimoDiaMesAnt = new Date(year, month, 0, 23, 59, 59)
    return {
      desde: primerDiaMesAnt.toISOString().split('T')[0] + 'T00:00:00',
      hasta: ultimoDiaMesAnt.toISOString().split('T')[0] + 'T23:59:59',
    }
  }

  if (filtros.periodo === 'ultimo_mes') {
    const hace30Dias = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    return {
      desde: hace30Dias.toISOString().split('T')[0] + 'T00:00:00',
      hasta: now.toISOString().split('T')[0] + 'T23:59:59',
    }
  }

  if (filtros.periodo === 'todo') {
    return {
      desde: '2026-01-01T00:00:00',
      hasta: now.toISOString().split('T')[0] + 'T23:59:59',
    }
  }

  if (filtros.periodo === 'rango' && filtros.fecha_desde && filtros.fecha_hasta) {
    return {
      desde: filtros.fecha_desde + 'T00:00:00',
      hasta: filtros.fecha_hasta + 'T23:59:59',
    }
  }

  // Default: mes_actual
  const primerDiaMes = new Date(year, month, 1)
  return {
    desde: primerDiaMes.toISOString().split('T')[0] + 'T00:00:00',
    hasta: now.toISOString().split('T')[0] + 'T23:59:59',
  }
}

export async function fetchTrazabilidadData(
  filtros: TrazabilidadFiltros
): Promise<TrazabilidadCompletaRespuesta> {
  const supabase = await createClient()
  const { desde, hasta } = resolverRangoFechas(filtros)
  const agruparPor = filtros.agrupar_por ?? 'familia'

  // 1. Obtener todas las bodegas activas con su ciudad normalizada
  const { data: bodegasRaw, error: bodegasError } = await supabase
    .from('bodegas')
    .select('id, codigo, nombre, ciudad, activa, es_virtual')
    .eq('activa', true)
    .order('id')

  if (bodegasError) throw bodegasError

  const bodegasMap = new Map<number, { id: number; nombre: string; ciudad: string }>()
  const ciudadesSet = new Set<string>()

  ;(bodegasRaw || []).forEach((b) => {
    const ciudadNorm = (b.ciudad || 'VIRTUAL').trim().toUpperCase()
    bodegasMap.set(b.id, {
      id: b.id,
      nombre: b.nombre,
      ciudad: ciudadNorm,
    })
    ciudadesSet.add(ciudadNorm)
  })

  const ciudadesDisponibles = Array.from(ciudadesSet).sort()

  // 2. Obtener productos activos con familia
  let productosQuery = supabase
    .from('productos')
    .select('id, sku_base, descripcion, familia, activo')
    .eq('activo', true)
    .order('sku_base')

  if (filtros.familia) {
    productosQuery = productosQuery.eq('familia', filtros.familia)
  }

  if (filtros.q) {
    productosQuery = productosQuery.or(`sku_base.ilike.%${filtros.q}%,descripcion.ilike.%${filtros.q}%,familia.ilike.%${filtros.q}%`)
  }

  const { data: productosRaw, error: prodError } = await productosQuery
  if (prodError) throw prodError

  const productosMap = new Map<number, {
    id: number
    sku_base: string
    descripcion: string | null
    familia: string
    foto_url?: string | null
  }>()

  const familiasSet = new Set<string>()
  const familiaDescMap = new Map<string, string>()

  ;(productosRaw || []).forEach((p) => {
    const fam = (p.familia || 'SIN_FAMILIA').trim()
    const desc = (p.descripcion || '').trim()
    if (desc && !familiaDescMap.has(fam)) {
      familiaDescMap.set(fam, desc)
    }

    productosMap.set(p.id, {
      id: p.id,
      sku_base: p.sku_base,
      descripcion: p.descripcion,
      familia: fam,
      foto_url: null,
    })
    familiasSet.add(fam)
  })

  const familiasDisponibles = Array.from(familiasSet).sort().map((fam) => ({
    codigo: fam,
    descripcion: familiaDescMap.get(fam) || null,
  }))
  const productosIds = Array.from(productosMap.keys())

  // 3. Obtener stock actual de esos productos
  const { data: stockRaw, error: stockError } = await supabase
    .from('inventario_stock')
    .select('producto_id, bodega_id, cajas, piezas_sueltas')
    .in('producto_id', productosIds.length > 0 ? productosIds : [-1])

  if (stockError) throw stockError

  // Mapa: producto_id -> { total: number, por_ciudad: Record<string, number> }
  const stockActualPorProducto = new Map<number, { total: number; por_ciudad: Record<string, number> }>()
  let totalStockEmpresa = 0

  ;(stockRaw || []).forEach((s) => {
    const cajas = Number(s.cajas) || 0
    totalStockEmpresa += cajas
    const b = bodegasMap.get(s.bodega_id)
    const ciudad = b ? b.ciudad : 'OTRO'

    if (!stockActualPorProducto.has(s.producto_id)) {
      stockActualPorProducto.set(s.producto_id, { total: 0, por_ciudad: {} })
    }
    const entry = stockActualPorProducto.get(s.producto_id)!
    entry.total += cajas
    entry.por_ciudad[ciudad] = (entry.por_ciudad[ciudad] || 0) + cajas
  })

  // 4. Obtener movimientos confirmados (CONF) dentro del período
  // Hacemos join de nota_detalle_productos con notas_inventario
  const { data: movimientosRaw, error: movError } = await supabase
    .from('nota_detalle_productos')
    .select(`
      id,
      nota_id,
      producto_id,
      cajas,
      piezas_sueltas,
      notas_inventario!inner (
        id,
        numero_nota,
        tipo_movimiento_id,
        bodega_origen_id,
        bodega_destino_id,
        fecha_nota,
        created_at,
        estado_id,
        nota_referencia,
        observaciones,
        cat_tipos_movimiento (
          codigo,
          nombre,
          afecta_inventario,
          requiere_destino
        ),
        cat_estados_nota (
          codigo
        )
      )
    `)
    .in('producto_id', productosIds.length > 0 ? productosIds : [-1])
    .gte('notas_inventario.fecha_nota', desde)
    .lte('notas_inventario.fecha_nota', hasta)
    .eq('notas_inventario.cat_estados_nota.codigo', 'CONF')
    .order('id')

  if (movError) throw movError

  // 5. Procesar KPIs globales y agregaciones por familia/producto
  let totalSalidasCajas = 0
  let totalEntradasCajas = 0
  let totalTraspasosCajas = 0

  const salidasPorCiudadGlobal: Record<string, number> = {}
  const entradasPorCiudadGlobal: Record<string, number> = {}

  interface ProdAcumulador {
    producto_id: number
    sku_base: string
    descripcion: string | null
    familia: string
    foto_url: string | null
    entradas: number
    salidas: number
    traspasos: number
    salidas_por_ciudad: Record<string, number>
    traspasos_flujo: TraspasoInterCiudad[]
  }

  const prodAcumulados = new Map<number, ProdAcumulador>()
  productosMap.forEach((p, id) => {
    prodAcumulados.set(id, {
      producto_id: id,
      sku_base: p.sku_base,
      descripcion: p.descripcion,
      familia: p.familia,
      foto_url: p.foto_url ?? null,
      entradas: 0,
      salidas: 0,
      traspasos: 0,
      salidas_por_ciudad: {},
      traspasos_flujo: [],
    })
  })

  const familiaSalidasMap: Record<string, number> = {}

  ;(movimientosRaw || []).forEach((m: any) => {
    const nota = m.notas_inventario
    const tipo = nota?.cat_tipos_movimiento?.codigo || 'OTRO'
    const cajas = Number(m.cajas) || 0
    const prodId = m.producto_id
    const prodInfo = productosMap.get(prodId)
    const fam = prodInfo?.familia || 'SIN_FAMILIA'

    const origen = bodegasMap.get(nota.bodega_origen_id)
    const destino = bodegasMap.get(nota.bodega_destino_id)
    const ciudadOrigen = origen ? origen.ciudad : 'DESCONOCIDO'
    const ciudadDestino = destino ? destino.ciudad : 'DESCONOCIDO'

    // Si hay filtro por ciudad, filtrar origen o destino
    if (filtros.ciudad && ciudadOrigen !== filtros.ciudad && ciudadDestino !== filtros.ciudad) {
      return
    }

    const itemAcum = prodAcumulados.get(prodId)

    if (tipo === 'SAL') {
      totalSalidasCajas += cajas
      salidasPorCiudadGlobal[ciudadOrigen] = (salidasPorCiudadGlobal[ciudadOrigen] || 0) + cajas
      familiaSalidasMap[fam] = (familiaSalidasMap[fam] || 0) + cajas
      if (itemAcum) {
        itemAcum.salidas += cajas
        itemAcum.salidas_por_ciudad[ciudadOrigen] = (itemAcum.salidas_por_ciudad[ciudadOrigen] || 0) + cajas
      }
    } else if (tipo === 'ENT' || tipo === 'DEV') {
      totalEntradasCajas += cajas
      entradasPorCiudadGlobal[ciudadOrigen] = (entradasPorCiudadGlobal[ciudadOrigen] || 0) + cajas
      if (itemAcum) {
        itemAcum.entradas += cajas
      }
    } else if (tipo === 'TRF') {
      totalTraspasosCajas += cajas
      if (itemAcum) {
        itemAcum.traspasos += cajas
        itemAcum.traspasos_flujo.push({
          origen_ciudad: ciudadOrigen,
          destino_ciudad: ciudadDestino,
          origen_bodega: origen?.nombre || 'Origen',
          destino_bodega: destino?.nombre || 'Destino',
          cajas,
        })
      }
    } else if (tipo === 'AJU') {
      if (cajas >= 0) {
        totalEntradasCajas += cajas
        if (itemAcum) itemAcum.entradas += cajas
      } else {
        const cajasPos = Math.abs(cajas)
        totalSalidasCajas += cajasPos
        salidasPorCiudadGlobal[ciudadOrigen] = (salidasPorCiudadGlobal[ciudadOrigen] || 0) + cajasPos
        familiaSalidasMap[fam] = (familiaSalidasMap[fam] || 0) + cajasPos
        if (itemAcum) {
          itemAcum.salidas += cajasPos
          itemAcum.salidas_por_ciudad[ciudadOrigen] = (itemAcum.salidas_por_ciudad[ciudadOrigen] || 0) + cajasPos
        }
      }
    }
  })

  // 6. Consolidar KPIs de Ciudades y Rotación
  const ciudadesSalidas: CiudadMovimiento[] = Object.entries(salidasPorCiudadGlobal).map(([cd, sal]) => ({
    ciudad: cd,
    cajas_salida: sal,
    cajas_entrada: entradasPorCiudadGlobal[cd] || 0,
    porcentaje_salida: totalSalidasCajas > 0 ? Math.round((sal / totalSalidasCajas) * 100) : 0,
  })).sort((a, b) => b.cajas_salida - a.cajas_salida)

  const topFamiliasRotacion = Object.entries(familiaSalidasMap).map(([fam, sal]) => ({
    familia: fam,
    descripcion: familiaDescMap.get(fam) || null,
    salidas: sal,
    porcentaje: totalSalidasCajas > 0 ? Math.round((sal / totalSalidasCajas) * 100) : 0,
  })).sort((a, b) => b.salidas - a.salidas).slice(0, 5)

  // Top Familias por Stock Actual
  const familiaStockMap: Record<string, number> = {}
  stockActualPorProducto.forEach((stk, pId) => {
    const fam = productosMap.get(pId)?.familia || 'SIN_FAMILIA'
    familiaStockMap[fam] = (familiaStockMap[fam] || 0) + stk.total
  })
  const topFamiliasStock = Object.entries(familiaStockMap).map(([fam, stk]) => ({
    familia: fam,
    descripcion: familiaDescMap.get(fam) || null,
    stock: stk,
  })).sort((a, b) => b.stock - a.stock).slice(0, 5)

  // 7. Construir Matriz de Filas (Agrupada por Familia o Producto)
  let matriz: FilaTrazabilidadMatriz[] = []

  if (agruparPor === 'familia') {
    const familiasAgrupadas: Record<string, FilaTrazabilidadMatriz> = {}

    prodAcumulados.forEach((p, pId) => {
      const fam = p.familia || 'SIN_FAMILIA'
      const stockInfo = stockActualPorProducto.get(pId) || { total: 0, por_ciudad: {} }
      const stockActual = stockInfo.total
      const stockInicial = Math.max(0, stockActual - p.entradas + p.salidas)

      const skuRow: FilaTrazabilidadMatriz = {
        id: `p-${pId}`,
        familia: fam,
        producto_id: pId,
        sku_base: p.sku_base,
        descripcion: p.descripcion || '',
        foto_url: p.foto_url,
        stock_inicial: stockInicial,
        total_entradas: p.entradas,
        total_salidas: p.salidas,
        total_traspasos: p.traspasos,
        stock_actual: stockActual,
        salidas_por_ciudad: p.salidas_por_ciudad,
        stock_por_ciudad: stockInfo.por_ciudad,
        traspasos_flujo: p.traspasos_flujo,
      }

      if (!familiasAgrupadas[fam]) {
        familiasAgrupadas[fam] = {
          id: `fam-${fam}`,
          familia: fam,
          descripcion: familiaDescMap.get(fam) || undefined,
          stock_inicial: 0,
          total_entradas: 0,
          total_salidas: 0,
          total_traspasos: 0,
          stock_actual: 0,
          salidas_por_ciudad: {},
          stock_por_ciudad: {},
          traspasos_flujo: [],
          skus: [],
        }
      }

      const fGroup = familiasAgrupadas[fam]
      fGroup.stock_inicial += stockInicial
      fGroup.total_entradas += p.entradas
      fGroup.total_salidas += p.salidas
      fGroup.total_traspasos += p.traspasos
      fGroup.stock_actual += stockActual
      fGroup.skus?.push(skuRow)

      Object.entries(p.salidas_por_ciudad).forEach(([cd, cant]) => {
        fGroup.salidas_por_ciudad[cd] = (fGroup.salidas_por_ciudad[cd] || 0) + cant
      })
      Object.entries(stockInfo.por_ciudad).forEach(([cd, cant]) => {
        fGroup.stock_por_ciudad[cd] = (fGroup.stock_por_ciudad[cd] || 0) + cant
      })
      fGroup.traspasos_flujo.push(...p.traspasos_flujo)
    })

    matriz = Object.values(familiasAgrupadas).sort((a, b) => {
      return (b.total_salidas + b.stock_actual) - (a.total_salidas + a.stock_actual)
    })
  } else {
    matriz = Array.from(prodAcumulados.values()).map((p) => {
      const stockInfo = stockActualPorProducto.get(p.producto_id) || { total: 0, por_ciudad: {} }
      const stockActual = stockInfo.total
      const stockInicial = Math.max(0, stockActual - p.entradas + p.salidas)

      return {
        id: `p-${p.producto_id}`,
        familia: p.familia,
        producto_id: p.producto_id,
        sku_base: p.sku_base,
        descripcion: p.descripcion || '',
        foto_url: p.foto_url,
        stock_inicial: stockInicial,
        total_entradas: p.entradas,
        total_salidas: p.salidas,
        total_traspasos: p.traspasos,
        stock_actual: stockActual,
        salidas_por_ciudad: p.salidas_por_ciudad,
        stock_por_ciudad: stockInfo.por_ciudad,
        traspasos_flujo: p.traspasos_flujo,
      }
    }).sort((a, b) => (b.total_salidas + b.stock_actual) - (a.total_salidas + a.stock_actual))
  }

  return {
    filtrosAplicados: {
      periodo: filtros.periodo || 'mes_actual',
      fechaDesde: desde,
      fechaHasta: hasta,
      ciudad: filtros.ciudad,
      familia: filtros.familia,
      q: filtros.q,
      agruparPor,
    },
    kpis: {
      totalSalidasCajas,
      totalEntradasCajas,
      totalTraspasosCajas,
      totalStockEmpresa,
      ciudadesSalidas,
      topFamiliasRotacion,
      topFamiliasStock,
    },
    ciudadesDisponibles,
    familiasDisponibles,
    matriz,
  }
}

export async function fetchProductoTimeline(
  productoId: number,
  fechaDesde?: string,
  fechaHasta?: string
): Promise<TimelineEvento[]> {
  const supabase = await createClient()

  let query = supabase
    .from('nota_detalle_productos')
    .select(`
      id,
      nota_id,
      producto_id,
      cajas,
      piezas_sueltas,
      productos (
        sku_base,
        descripcion
      ),
      notas_inventario!inner (
        id,
        numero_nota,
        tipo_movimiento_id,
        bodega_origen_id,
        bodega_destino_id,
        fecha_nota,
        created_at,
        estado_id,
        nota_referencia,
        observaciones,
        cat_tipos_movimiento (
          codigo,
          nombre
        ),
        cat_estados_nota (
          codigo
        ),
        bodega_origen:bodegas!bodega_origen_id (
          nombre,
          ciudad
        ),
        bodega_destino:bodegas!bodega_destino_id (
          nombre,
          ciudad
        )
      )
    `)
    .eq('producto_id', productoId)
    .order('id', { ascending: false })

  if (fechaDesde) {
    query = query.gte('notas_inventario.fecha_nota', fechaDesde)
  }
  if (fechaHasta) {
    query = query.lte('notas_inventario.fecha_nota', fechaHasta)
  }

  const { data, error } = await query
  if (error) throw error

  return (data || []).map((m: any) => {
    const nota = m.notas_inventario
    return {
      nota_id: nota.id,
      detalle_id: m.id,
      fecha_nota: nota.fecha_nota,
      created_at: nota.created_at,
      numero_nota: nota.numero_nota,
      tipo_codigo: nota.cat_tipos_movimiento?.codigo || 'SAL',
      tipo_nombre: nota.cat_tipos_movimiento?.nombre || 'Movimiento',
      estado_codigo: nota.cat_estados_nota?.codigo || 'CONF',
      producto_id: m.producto_id,
      sku_base: m.productos?.sku_base || '',
      descripcion: m.productos?.descripcion || null,
      cajas: Number(m.cajas) || 0,
      piezas_sueltas: Number(m.piezas_sueltas) || 0,
      origen_bodega: nota.bodega_origen?.nombre || null,
      origen_ciudad: (nota.bodega_origen?.ciudad || 'VIRTUAL').toUpperCase(),
      destino_bodega: nota.bodega_destino?.nombre || null,
      destino_ciudad: nota.bodega_destino ? (nota.bodega_destino?.ciudad || 'VIRTUAL').toUpperCase() : null,
      cliente_destino: nota.observaciones?.includes('Puesto') || nota.observaciones?.includes('Cliente')
        ? nota.observaciones
        : null,
      observaciones: nota.observaciones,
      nota_referencia: nota.nota_referencia,
    }
  })
}
