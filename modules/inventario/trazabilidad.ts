// modules/inventario/trazabilidad.ts
'use server'

import { createClient } from '@/lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de ordenamiento de Familias (canónico clásico: ascendente A→Z, F000-000C al final)
// Unificado con lib/inventario/familias-orden.ts y StockMatrixTable.
// ─────────────────────────────────────────────────────────────────────────────
function isTrazabilidadFamiliaUnassigned(fam: string | null | undefined): boolean {
  if (!fam) return true
  const norm = fam.trim().toUpperCase()
  return (
    norm === 'F000-000C' ||
    norm === 'F000-000' ||
    norm === 'SIN_FAMILIA' ||
    norm === 'SIN FAMILIA' ||
    norm === 'SIN ASIGNAR' ||
    norm === 'SIN CLASIFICAR' ||
    norm === '—' ||
    norm === '-' ||
    norm === 'NULL' ||
    norm === 'UNDEFINED'
  )
}

function compareFamiliaDesc(a: string, b: string): number {
  const aUn = isTrazabilidadFamiliaUnassigned(a)
  const bUn = isTrazabilidadFamiliaUnassigned(b)
  if (aUn && !bUn) return 1
  if (!aUn && bUn) return -1
  // Clásico ascendente alfabético A → Z (es locale)
  return a.localeCompare(b, 'es', { sensitivity: 'base' })
}

function compareSkuAsc(a: string | undefined, b: string | undefined): number {
  return (a || '').localeCompare(b || '', 'es', { sensitivity: 'base' })
}

export interface TrazabilidadFiltros {
  q?: string
  periodo?: 'mes_actual' | 'mes_anterior' | 'ultimo_mes' | 'rango' | 'todo'
  fecha_desde?: string
  fecha_hasta?: string
  ciudad?: string
  familia?: string
  agrupar_por?: 'familia' | 'producto'
  /** Toggle "Ver canceladas" — OFF por defecto. Solo muestra CANC con activo=true, nunca suma. */
  incluir_canceladas?: boolean
  /** Alcance a una bodega específica (cascada ciudad → bodega). Solo sus movimientos y stock. */
  bodega_id?: number
}

export interface BodegaDisponible {
  id: number
  nombre: string
  ciudad: string
  es_virtual: boolean
  stock_cajas: number
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
  nota_id?: number
  numero_nota?: string
}

export interface PendienteDetalle {
  delta: number
  /** Suma de lo que entra (amarillo +) */
  entradas: number
  /** Suma de lo que sale en valor absoluto (amarillo −) */
  salidas: number
  n_entradas: number
  n_salidas: number
  notas: NotaPendienteResumen[]
}

export interface NotaPendienteResumen {
  nota_id: number
  numero_nota: string
  tipo_codigo: string
  delta: number
  cajas: number
  bodega_origen_id?: number | null
  bodega_destino_id?: number | null
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
  /** Trámite PEND/PROC con activo=true — solo visual (amarillo), no suma a totales CONF. */
  tiene_pendiente?: boolean
  delta_pendiente?: number
  /** Desglose amarillo en 2 valores: lo que suma (+) y lo que resta (−) con sus conteos. */
  pend_entradas?: number
  pend_salidas?: number
  pend_n_entradas?: number
  pend_n_salidas?: number
  notas_pendientes?: NotaPendienteResumen[]
}

export interface NotaCanceladaResumen {
  nota_id: number
  numero_nota: string
  fecha_nota: string
  tipo_codigo: string
  tipo_nombre: string
  producto_id: number
  sku_base: string
  cajas: number
  origen_bodega: string | null
  destino_bodega: string | null
  observaciones: string | null
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
    incluirCanceladas: boolean
    bodegaId?: number
    bodegaNombre?: string
    bodegaCiudad?: string
  }
  avisos: {
    /** CONF/MODF con activo=false ignoradas en el período (borrado suave admin). Explica descuadres vs stock_actual. */
    movimientosOcultosIgnorados: number
    canceladasVisibles: number
    pendientesEnTramite: number
  }
  canceladas: NotaCanceladaResumen[]
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
  /** Bodegas con stock > 0 en los productos del alcance (para cascada ciudad → bodega, incluye virtuales). */
  bodegasDisponibles: BodegaDisponible[]
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

  const bodegasMap = new Map<number, { id: number; nombre: string; ciudad: string; es_virtual: boolean }>()
  const ciudadesSet = new Set<string>()

  ;(bodegasRaw || []).forEach((b) => {
    const ciudadNorm = (b.ciudad || 'VIRTUAL').trim().toUpperCase()
    bodegasMap.set(b.id, {
      id: b.id,
      nombre: b.nombre,
      ciudad: ciudadNorm,
      es_virtual: Boolean((b as any).es_virtual),
    })
    ciudadesSet.add(ciudadNorm)
  })

  const ciudadesDisponibles = Array.from(ciudadesSet).sort()
  // Alcance a bodega específica (cascada ciudad → bodega). Se valida que exista y esté activa.
  const bodegaAlcance = filtros.bodega_id ? bodegasMap.get(filtros.bodega_id) || null : null

  // 2. Obtener productos activos con familia
  let productosQuery = supabase
    .from('productos')
    .select('id, sku_base, descripcion, familia, activo')
    .eq('activo', true)
    .order('sku_base')
    .limit(10000)

  if (filtros.familia) {
    productosQuery = productosQuery.eq('familia', filtros.familia)
  }

  if (filtros.q) {
    productosQuery = productosQuery.or(`sku_base.ilike.%${filtros.q}%,descripcion.ilike.%${filtros.q}%,familia.ilike.%${filtros.q}%`)
  }

  const { data: productosRaw, error: prodError } = await productosQuery
  if (prodError) throw prodError

  // 2b. Descripciones canónicas por familia (primera descripción alfabética de productos ACTIVOS)
  // Se obtiene de todo el catálogo ordenado por sku_base asc, idéntico a fetchDescripcionesCanonicasFamilias
  let familiaDescCanonMap = new Map<string, string>()
  try {
    const { data: canonRows } = await supabase
      .from('productos')
      .select('familia, descripcion, nombre, sku_base')
      .eq('activo', true)
      .not('familia', 'is', null)
      .order('sku_base', { ascending: true })
      .limit(5000)
    if (canonRows) {
      for (const p of canonRows as any[]) {
        const fam = (p.familia || '').trim()
        if (!fam || familiaDescCanonMap.has(fam)) continue
        const desc = (p.descripcion || p.nombre || '').trim()
        if (desc) familiaDescCanonMap.set(fam, desc)
      }
    }
  } catch (_) {
    // fallback silencioso; se usará el mapa local
  }

  const productosMap = new Map<number, {
    id: number
    sku_base: string
    descripcion: string | null
    familia: string
    foto_url?: string | null
  }>()

  const familiasSet = new Set<string>()
  // Mapa local (fallback) por si la familia no existe en el catálogo canónico (ej. SIN_FAMILIA)
  const familiaDescLocalMap = new Map<string, string>()

  // Ordenar productosRaw por sku_base asc para garantizar que la primera descripción coincida con el primer SKU alfabético
  const productosRawOrdenados = [...(productosRaw || [])].sort((a: any, b: any) =>
    (a.sku_base || '').localeCompare(b.sku_base || '', 'es', { sensitivity: 'base' })
  )

  ;(productosRawOrdenados || []).forEach((p) => {
    const fam = (p.familia || 'SIN_FAMILIA').trim()
    const desc = (p.descripcion || '').trim()
    if (desc && !familiaDescLocalMap.has(fam)) {
      familiaDescLocalMap.set(fam, desc)
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

  // Combinar: priorizar canónico global, fallback a local
  const familiaDescMap = new Map<string, string>()
  familiasSet.forEach((fam) => {
    const canon = familiaDescCanonMap.get(fam)
    if (canon) familiaDescMap.set(fam, canon)
    else if (familiaDescLocalMap.has(fam)) familiaDescMap.set(fam, familiaDescLocalMap.get(fam)!)
  })

  const familiasDisponibles = Array.from(familiasSet)
    .sort((a, b) => compareFamiliaDesc(a, b))
    .map((fam) => ({
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
  // Con alcance a bodega, solo cuenta esa bodega (columnas colapsan a ella).
  const stockActualPorProducto = new Map<number, { total: number; por_ciudad: Record<string, number> }>()
  const stockPorBodega = new Map<number, number>()
  let totalStockEmpresa = 0

  ;(stockRaw || []).forEach((s) => {
    const cajas = Number(s.cajas) || 0
    if (bodegaAlcance && Number(s.bodega_id) !== bodegaAlcance.id) {
      // Igual acumula para el catálogo de bodegas con stock (cascada ciudad → bodega)
      stockPorBodega.set(Number(s.bodega_id), (stockPorBodega.get(Number(s.bodega_id)) || 0) + cajas)
      return
    }
    totalStockEmpresa += cajas
    stockPorBodega.set(Number(s.bodega_id), (stockPorBodega.get(Number(s.bodega_id)) || 0) + cajas)
    const b = bodegasMap.get(s.bodega_id)
    const ciudad = b ? b.ciudad : 'OTRO'

    if (!stockActualPorProducto.has(s.producto_id)) {
      stockActualPorProducto.set(s.producto_id, { total: 0, por_ciudad: {} })
    }
    const entry = stockActualPorProducto.get(s.producto_id)!
    entry.total += cajas
    entry.por_ciudad[ciudad] = (entry.por_ciudad[ciudad] || 0) + cajas
  })

  // Catálogo de bodegas con stock > 0 (incluye virtuales) para el filtro en cascada
  const bodegasDisponibles: BodegaDisponible[] = Array.from(stockPorBodega.entries())
    .filter(([, stock]) => stock > 0)
    .map(([id, stock]) => {
      const b = bodegasMap.get(id)
      return {
        id,
        nombre: b?.nombre || `Bodega ${id}`,
        ciudad: b?.ciudad || 'OTRO',
        es_virtual: b?.es_virtual ?? false,
        stock_cajas: stock,
      }
    })
    .sort((a, b) => a.ciudad.localeCompare(b.ciudad, 'es') || a.nombre.localeCompare(b.nombre, 'es'))

  // 4. Obtener movimientos confirmados (CONF + MODF con activo=true) dentro del período.
  // Regla: CANC y activo=false NUNCA suman. MODF sí movió stock vía trigger → cuenta como real.
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
        activo,
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
    .eq('notas_inventario.activo', true)
    .in('notas_inventario.cat_estados_nota.codigo', ['CONF', 'MODF'])
    .order('id')

  if (movError) throw movError

  // 4b. Conteo de movimientos ocultos (CONF/MODF con activo=false) ignorados en el período.
  // Solo para aviso de descuadre: el stock_actual sí incluye su efecto vía trigger.
  let movimientosOcultosIgnorados = 0
  try {
    const { count } = await supabase
      .from('nota_detalle_productos')
      .select('id, notas_inventario!inner (id, activo, fecha_nota, cat_estados_nota!inner (codigo))', { count: 'exact', head: true })
      .in('producto_id', productosIds.length > 0 ? productosIds : [-1])
      .gte('notas_inventario.fecha_nota', desde)
      .lte('notas_inventario.fecha_nota', hasta)
      .eq('notas_inventario.activo', false)
      .in('notas_inventario.cat_estados_nota.codigo', ['CONF', 'MODF'])
    movimientosOcultosIgnorados = count ?? 0
  } catch (_) {
    movimientosOcultosIgnorados = 0
  }

  // 4c. Notas CANC con activo=true en el período — SOLO visual (gris), nunca suman.
  // Se devuelven aparte cuando el toggle "Ver canceladas" está ON. Default OFF → lista vacía.
  const incluirCanceladas = filtros.incluir_canceladas === true
  let canceladas: NotaCanceladaResumen[] = []
  if (incluirCanceladas && productosIds.length > 0) {
    try {
      const { data: cancRaw } = await supabase
        .from('nota_detalle_productos')
        .select(`
          id,
          nota_id,
          producto_id,
          cajas,
          notas_inventario!inner (
            id,
            numero_nota,
            fecha_nota,
            observaciones,
            bodega_origen_id,
            bodega_destino_id,
            activo,
            cat_tipos_movimiento (codigo, nombre),
            cat_estados_nota (codigo)
          )
        `)
        .in('producto_id', productosIds)
        .gte('notas_inventario.fecha_nota', desde)
        .lte('notas_inventario.fecha_nota', hasta)
        .eq('notas_inventario.activo', true)
        .eq('notas_inventario.cat_estados_nota.codigo', 'CANC')
        .order('id')
        .limit(500)
      canceladas = ((cancRaw || []) as any[])
        .filter((m: any) => {
          if (!bodegaAlcance) return true
          const nota = m.notas_inventario
          return Number(nota?.bodega_origen_id) === bodegaAlcance.id || Number(nota?.bodega_destino_id) === bodegaAlcance.id
        })
        .map((m: any) => {
        const nota = m.notas_inventario
        const prod = productosMap.get(m.producto_id)
        return {
          nota_id: nota?.id ?? m.nota_id,
          numero_nota: String(nota?.numero_nota || ''),
          fecha_nota: nota?.fecha_nota || '',
          tipo_codigo: nota?.cat_tipos_movimiento?.codigo || 'SAL',
          tipo_nombre: nota?.cat_tipos_movimiento?.nombre || 'Movimiento',
          producto_id: m.producto_id,
          sku_base: prod?.sku_base || '',
          cajas: Number(m.cajas) || 0,
          origen_bodega: nota?.bodega_origen_id ? String(nota.bodega_origen_id) : null,
          destino_bodega: nota?.bodega_destino_id ? String(nota.bodega_destino_id) : null,
          observaciones: nota?.observaciones || null,
        }
      })
    } catch (_) {
      canceladas = []
    }
  }

  // 4d. Notas en trámite (PEND/PROC con activo=true) — para resaltado amarillo.
  // No filtran por fecha_nota: el trámite abierto afecta el pronóstico aunque la nota sea anterior.
  // Se guardan 2 valores: entradas (+) y salidas (−) con sus conteos de notas.
  const pendientesPorProducto = new Map<number, PendienteDetalle>()
  try {
    if (productosIds.length > 0) {
      const { data: pendRaw } = await supabase
        .from('nota_detalle_productos')
        .select(`
          id,
          nota_id,
          producto_id,
          cajas,
          notas_inventario!inner (
            id,
            numero_nota,
            bodega_origen_id,
            bodega_destino_id,
            activo,
            cat_tipos_movimiento (codigo, afecta_inventario),
            cat_estados_nota (codigo)
          )
        `)
        .in('producto_id', productosIds)
        .eq('notas_inventario.activo', true)
        .in('notas_inventario.cat_estados_nota.codigo', ['PEND', 'PROC'])
        .order('id')
        .limit(2000)
      ;((pendRaw || []) as any[]).forEach((m: any) => {
        const nota = m.notas_inventario
        const tipoCod = String(nota?.cat_tipos_movimiento?.codigo || '').toUpperCase()
        const afecta = Number(nota?.cat_tipos_movimiento?.afecta_inventario ?? 0)
        const cajas = Number(m.cajas) || 0
        // Delta direccional simple a nivel empresa: ENT/DEV suma, SAL resta, TRF neutro global pero marca trámite
        let delta = 0
        if (tipoCod === 'ENT' || tipoCod === 'DEV' || afecta > 0) delta = Math.abs(cajas)
        else if (tipoCod === 'SAL' || afecta < 0) delta = -Math.abs(cajas)
        else if (tipoCod === 'TRF') delta = 0
        else delta = afecta < 0 ? -Math.abs(cajas) : Math.abs(cajas)
        // Alcance a bodega: el trámite solo cuenta si toca esa bodega
        if (bodegaAlcance && Number(nota?.bodega_origen_id) !== bodegaAlcance.id && Number(nota?.bodega_destino_id) !== bodegaAlcance.id) {
          return
        }
        const entry = pendientesPorProducto.get(m.producto_id) || { delta: 0, entradas: 0, salidas: 0, n_entradas: 0, n_salidas: 0, notas: [] }
        entry.delta += delta
        if (delta > 0) { entry.entradas += delta; entry.n_entradas += 1 }
        else if (delta < 0) { entry.salidas += Math.abs(delta); entry.n_salidas += 1 }
        entry.notas.push({
          nota_id: nota?.id ?? m.nota_id,
          numero_nota: String(nota?.numero_nota || ''),
          tipo_codigo: tipoCod,
          delta,
          cajas,
        })
        pendientesPorProducto.set(m.producto_id, entry)
      })
    }
  } catch (_) {
    // sin pendientes → sin resaltado
  }

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
    // Blindaje defensivo: aunque el filtro SQL ya excluye, nunca sumar CANC ni activo=false.
    if (nota?.activo === false) return
    const estadoCod = String(nota?.cat_estados_nota?.codigo || 'CONF').toUpperCase()
    if (estadoCod !== 'CONF' && estadoCod !== 'MODF') return
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

    // Alcance a bodega: solo movimientos donde la bodega es origen o destino
    if (bodegaAlcance && Number(nota.bodega_origen_id) !== bodegaAlcance.id && Number(nota.bodega_destino_id) !== bodegaAlcance.id) {
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
          nota_id: nota?.id ?? m.nota_id,
          numero_nota: nota?.numero_nota || '',
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

      const pend = pendientesPorProducto.get(pId)
      const tienePendiente = Boolean(pend && pend.notas.length > 0)
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
        tiene_pendiente: tienePendiente,
        delta_pendiente: pend?.delta ?? 0,
        pend_entradas: pend?.entradas ?? 0,
        pend_salidas: pend?.salidas ?? 0,
        pend_n_entradas: pend?.n_entradas ?? 0,
        pend_n_salidas: pend?.n_salidas ?? 0,
        notas_pendientes: pend?.notas ?? [],
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
      if (skuRow.tiene_pendiente) {
        fGroup.tiene_pendiente = true
        fGroup.delta_pendiente = (fGroup.delta_pendiente ?? 0) + (skuRow.delta_pendiente ?? 0)
        fGroup.pend_entradas = (fGroup.pend_entradas ?? 0) + (skuRow.pend_entradas ?? 0)
        fGroup.pend_salidas = (fGroup.pend_salidas ?? 0) + (skuRow.pend_salidas ?? 0)
        fGroup.pend_n_entradas = (fGroup.pend_n_entradas ?? 0) + (skuRow.pend_n_entradas ?? 0)
        fGroup.pend_n_salidas = (fGroup.pend_n_salidas ?? 0) + (skuRow.pend_n_salidas ?? 0)
        fGroup.notas_pendientes = [...(fGroup.notas_pendientes ?? []), ...(skuRow.notas_pendientes ?? [])].slice(0, 20)
      }
      fGroup.skus?.push(skuRow)

      Object.entries(p.salidas_por_ciudad).forEach(([cd, cant]) => {
        fGroup.salidas_por_ciudad[cd] = (fGroup.salidas_por_ciudad[cd] || 0) + cant
      })
      Object.entries(stockInfo.por_ciudad).forEach(([cd, cant]) => {
        fGroup.stock_por_ciudad[cd] = (fGroup.stock_por_ciudad[cd] || 0) + cant
      })
      fGroup.traspasos_flujo.push(...p.traspasos_flujo)
    })

    // Ordenamiento canónico: familias descendentes (Z→A) con SIN_FAMILIA al final,
    // SKUs dentro de cada familia en ascendente alfabético (respeta descripción canónica)
    Object.values(familiasAgrupadas).forEach((fg) => {
      fg.skus?.sort((a, b) => compareSkuAsc(a.sku_base, b.sku_base))
    })
    matriz = Object.values(familiasAgrupadas).sort((a, b) => compareFamiliaDesc(a.familia, b.familia))
  } else {
    matriz = Array.from(prodAcumulados.values())
      .map((p) => {
        const stockInfo = stockActualPorProducto.get(p.producto_id) || { total: 0, por_ciudad: {} }
        const stockActual = stockInfo.total
        const stockInicial = Math.max(0, stockActual - p.entradas + p.salidas)
        const pend = pendientesPorProducto.get(p.producto_id)

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
          tiene_pendiente: Boolean(pend && pend.notas.length > 0),
          delta_pendiente: pend?.delta ?? 0,
          pend_entradas: pend?.entradas ?? 0,
          pend_salidas: pend?.salidas ?? 0,
          pend_n_entradas: pend?.n_entradas ?? 0,
          pend_n_salidas: pend?.n_salidas ?? 0,
          notas_pendientes: pend?.notas ?? [],
        }
      })
      .filter((r) => !bodegaAlcance || r.stock_actual > 0 || r.total_entradas > 0 || r.total_salidas > 0 || r.total_traspasos > 0 || r.tiene_pendiente)
      .sort((a, b) => {
        const famCmp = compareFamiliaDesc(a.familia, b.familia)
        if (famCmp !== 0) return famCmp
        return compareSkuAsc(a.sku_base, b.sku_base)
      })
  }

  // En alcance a bodega se ocultan las familias sin movimiento ni stock en ella
  if (bodegaAlcance && agruparPor === 'familia') {
    matriz = matriz.filter((f) => f.stock_actual > 0 || f.total_entradas > 0 || f.total_salidas > 0 || f.total_traspasos > 0 || f.tiene_pendiente)
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
      incluirCanceladas,
      bodegaId: bodegaAlcance?.id,
      bodegaNombre: bodegaAlcance?.nombre,
      bodegaCiudad: bodegaAlcance?.ciudad,
    },
    avisos: {
      movimientosOcultosIgnorados,
      canceladasVisibles: canceladas.length,
      pendientesEnTramite: pendientesPorProducto.size,
    },
    canceladas,
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
    bodegasDisponibles,
    matriz,
  }
}

export async function fetchProductoTimeline(
  productoId: number,
  fechaDesde?: string,
  fechaHasta?: string,
  incluirCanceladas = false
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
        activo,
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
    .eq('notas_inventario.activo', true)
    .order('id', { ascending: false })

  if (fechaDesde) {
    query = query.gte('notas_inventario.fecha_nota', fechaDesde)
  }
  if (fechaHasta) {
    query = query.lte('notas_inventario.fecha_nota', fechaHasta)
  }

  const { data, error } = await query
  if (error) throw error

  const filtrados = (data || []).filter((m: any) => {
    const nota = m.notas_inventario
    // activo=false nunca sale (borrado suave admin)
    if (nota?.activo === false) return false
    const est = String(nota?.cat_estados_nota?.codigo || 'CONF').toUpperCase()
    // Base: CONF/MODF normal + PEND/PROC amarillo. CANC solo con toggle ON.
    if (est === 'CANC') return incluirCanceladas
    return true
  })

  return filtrados.map((m: any) => {
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

// ─────────────────────────────────────────────────────────────────────────────
// SKUs de una familia con stock actual > 0 — para el modo dual del modal Kardex
// (clic en fila familia → lista de SKUs rastreables).
// ─────────────────────────────────────────────────────────────────────────────
export interface SkuConStock {
  producto_id: number
  sku_base: string
  descripcion: string | null
  stock_cajas: number
}

export async function fetchFamiliaSkusConStock(familia: string, limite = 100): Promise<SkuConStock[]> {
  const supabase = await createClient()
  const fam = (familia || '').trim()
  if (!fam) return []

  let prodQuery = supabase
    .from('productos')
    .select('id, sku_base, descripcion, familia')
    .eq('activo', true)
  if (fam.toUpperCase() === 'SIN FAMILIA' || fam.toUpperCase() === 'SIN_FAMILIA' || fam === 'F000-000C') {
    prodQuery = (prodQuery as any).or('familia.is.null,familia.eq.F000-000C,familia.eq.F000-000')
  } else {
    prodQuery = (prodQuery as any).eq('familia', fam)
  }
  const { data: prods } = await (prodQuery as any).order('sku_base', { ascending: true }).limit(500)
  if (!prods || prods.length === 0) return []
  const ids = (prods as any[]).map((p) => p.id)

  const { data: stockRows } = await supabase
    .from('inventario_stock')
    .select('producto_id, cajas')
    .in('producto_id', ids)
    .is('caja_id', null)

  const porProducto = new Map<number, number>()
  ;((stockRows || []) as any[]).forEach((s) => {
    porProducto.set(Number(s.producto_id), (porProducto.get(Number(s.producto_id)) || 0) + (Number(s.cajas) || 0))
  })

  return (prods as any[])
    .map((p) => ({
      producto_id: Number(p.id),
      sku_base: String(p.sku_base || ''),
      descripcion: p.descripcion || null,
      stock_cajas: porProducto.get(Number(p.id)) || 0,
    }))
    .filter((s) => s.stock_cajas > 0)
    .slice(0, Math.min(Math.max(limite, 1), 200))
}

// ─────────────────────────────────────────────────────────────────────────────
// Movimientos recientes de una ciudad (origen o destino) — alimenta la columna
// de rastreo del diagrama. Solo CONF/MODF con activo=true (+CANC con toggle).
// ─────────────────────────────────────────────────────────────────────────────
export interface MovimientoCiudad {
  nota_id: number
  numero_nota: string
  fecha_nota: string
  tipo_codigo: string
  tipo_nombre: string
  estado_codigo: string
  producto_id: number
  sku_base: string
  cajas: number
  origen_bodega: string | null
  destino_bodega: string | null
  es_origen: boolean
}

export async function fetchMovimientosPorCiudad(
  ciudad: string,
  fechaDesde?: string,
  fechaHasta?: string,
  opts?: { familia?: string; q?: string; incluirCanceladas?: boolean; limite?: number }
): Promise<MovimientoCiudad[]> {
  const supabase = await createClient()
  const cd = (ciudad || '').trim().toUpperCase()
  if (!cd) return []

  const { data: bodegas } = await supabase.from('bodegas').select('id, ciudad').eq('activa', true)
  const ids = ((bodegas || []) as any[])
    .filter((b) => ((b.ciudad || 'VIRTUAL').trim().toUpperCase()) === cd)
    .map((b) => b.id)
  if (ids.length === 0) return []

  const estados = opts?.incluirCanceladas ? ['CONF', 'MODF', 'CANC'] : ['CONF', 'MODF']
  let query = supabase
    .from('nota_detalle_productos')
    .select(`
      id,
      nota_id,
      producto_id,
      cajas,
      productos (sku_base, familia),
      notas_inventario!inner (
        id,
        numero_nota,
        fecha_nota,
        bodega_origen_id,
        bodega_destino_id,
        activo,
        cat_tipos_movimiento (codigo, nombre),
        cat_estados_nota (codigo),
        bodega_origen:bodegas!bodega_origen_id (nombre),
        bodega_destino:bodegas!bodega_destino_id (nombre)
      )
    `)
    .eq('notas_inventario.activo', true)
    .in('notas_inventario.cat_estados_nota.codigo', estados)
    .order('id', { ascending: false })

  if (fechaDesde) query = query.gte('notas_inventario.fecha_nota', fechaDesde)
  if (fechaHasta) query = query.lte('notas_inventario.fecha_nota', fechaHasta)

  const limite = Math.min(Math.max(opts?.limite ?? 60, 1), 200)
  query = (query as any).limit(limite * 4)

  const { data, error } = await (query as any).or(
    `bodega_origen_id.in.(${ids.join(',')}),bodega_destino_id.in.(${ids.join(',')})`,
    { foreignTable: 'notas_inventario' }
  )
  if (error || !data) return []

  const famFiltro = (opts?.familia || '').trim()
  const qFiltro = (opts?.q || '').trim().toLowerCase()

  const out: MovimientoCiudad[] = []
  for (const m of data as any[]) {
    const nota = m.notas_inventario
    if (!nota || nota.activo === false) continue
    const prod = Array.isArray(m.productos) ? m.productos[0] : m.productos
    if (famFiltro && (prod?.familia || '') !== famFiltro) continue
    if (qFiltro && !String(prod?.sku_base || '').toLowerCase().includes(qFiltro)) continue
    const esOrigen = nota.bodega_origen_id !== null && ids.includes(Number(nota.bodega_origen_id))
    out.push({
      nota_id: nota.id,
      numero_nota: String(nota.numero_nota || ''),
      fecha_nota: nota.fecha_nota,
      tipo_codigo: nota.cat_tipos_movimiento?.codigo || 'SAL',
      tipo_nombre: nota.cat_tipos_movimiento?.nombre || 'Movimiento',
      estado_codigo: nota.cat_estados_nota?.codigo || 'CONF',
      producto_id: m.producto_id,
      sku_base: prod?.sku_base || '',
      cajas: Number(m.cajas) || 0,
      origen_bodega: nota.bodega_origen?.nombre || null,
      destino_bodega: nota.bodega_destino?.nombre || null,
      es_origen: esOrigen,
    })
    if (out.length >= limite) break
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Notas de una celda de la matriz (producto o familia × ciudad/bodega) —
// alimenta el popover anclado. Firmado direccional respecto al alcance:
// SAL −, ENT/DEV +, TRF − en origen / + en destino. PEND/PROC aparte en amarillo.
// ─────────────────────────────────────────────────────────────────────────────
export interface NotaCelda {
  nota_id: number
  numero_nota: string
  fecha_nota: string
  tipo_codigo: string
  estado_codigo: string
  producto_id: number
  sku_base: string
  cajas: number
  firmado: number
  origen_bodega: string | null
  destino_bodega: string | null
}

export interface NotasCeldaRespuesta {
  notas: NotaCelda[]
  pendientes: NotaCelda[]
  total: number
}

function firmadoRespectoAlcance(
  tipoCodigo: string,
  afecta: number,
  cajas: number,
  esOrigen: boolean,
  esDestino: boolean
): number {
  const t = (tipoCodigo || '').toUpperCase()
  const abs = Math.abs(cajas)
  if (t === 'SAL') return -abs
  if (t === 'ENT' || t === 'DEV') return abs
  if (t === 'TRF') {
    if (esOrigen && !esDestino) return -abs
    if (esDestino && !esOrigen) return abs
    return 0
  }
  if (t === 'AJU') return cajas >= 0 ? abs : -abs
  if (esOrigen && !esDestino) return afecta < 0 ? -abs : abs
  if (esDestino && !esOrigen) return abs
  return 0
}

export async function fetchNotasCelda(opts: {
  productoId?: number
  familia?: string
  ciudad?: string
  bodegaId?: number
  desde: string
  hasta: string
  incluirCanceladas?: boolean
  limite?: number
}): Promise<NotasCeldaRespuesta> {
  const supabase = await createClient()
  const limite = Math.min(Math.max(opts.limite ?? 15, 1), 50)

  const { data: bodegas } = await supabase.from('bodegas').select('id, nombre, ciudad').eq('activa', true)
  const bodMap = new Map<number, { nombre: string; ciudad: string }>()
  ;((bodegas || []) as any[]).forEach((b) => {
    bodMap.set(Number(b.id), { nombre: String(b.nombre), ciudad: ((b.ciudad || 'VIRTUAL').trim().toUpperCase()) })
  })

  // Alcance: bodega exacta, todas las de la ciudad, o global (sin filtro de bodega)
  let ids: number[] = []
  if (opts.bodegaId) {
    if (!bodMap.has(opts.bodegaId)) return { notas: [], pendientes: [], total: 0 }
    ids = [opts.bodegaId]
  } else if (opts.ciudad) {
    const cd = opts.ciudad.trim().toUpperCase()
    ids = Array.from(bodMap.entries()).filter(([, b]) => b.ciudad === cd).map(([id]) => id)
    if (ids.length === 0) return { notas: [], pendientes: [], total: 0 }
  }

  async function traer(estados: string[], conFechas: boolean, max: number) {
    let query = supabase
      .from('nota_detalle_productos')
      .select(`
        id,
        nota_id,
        producto_id,
        cajas,
        productos (sku_base, familia),
        notas_inventario!inner (
          id,
          numero_nota,
          fecha_nota,
          bodega_origen_id,
          bodega_destino_id,
          activo,
          cat_tipos_movimiento (codigo, afecta_inventario),
          cat_estados_nota (codigo)
        )
      `)
      .eq('notas_inventario.activo', true)
      .in('notas_inventario.cat_estados_nota.codigo', estados)
      .order('id', { ascending: false })
    if (opts.productoId) query = query.eq('producto_id', opts.productoId)
    if (conFechas) {
      query = query.gte('notas_inventario.fecha_nota', opts.desde)
      query = (query as any).lte('notas_inventario.fecha_nota', opts.hasta)
    }
    query = (query as any).limit(max)
    const q2 = ids.length > 0
      ? (query as any).or(`bodega_origen_id.in.(${ids.join(',')}),bodega_destino_id.in.(${ids.join(',')})`, { foreignTable: 'notas_inventario' })
      : query
    const { data, error } = await q2
    if (error || !data) return []
    const fam = (opts.familia || '').trim()
    const out: NotaCelda[] = []
    for (const m of data as any[]) {
      const nota = m.notas_inventario
      if (!nota || nota.activo === false) continue
      const prod = Array.isArray(m.productos) ? m.productos[0] : m.productos
      if (fam && (prod?.familia || '') !== fam) continue
      const oId = nota.bodega_origen_id !== null ? Number(nota.bodega_origen_id) : null
      const dId = nota.bodega_destino_id !== null ? Number(nota.bodega_destino_id) : null
      const tipoCod = String(nota?.cat_tipos_movimiento?.codigo || 'SAL')
      const tUp = tipoCod.toUpperCase()
      // Sin alcance de bodega/ciudad: firmado por tipo (SAL −, ENT/DEV +, TRF según flujo)
      const esOrigen = ids.length > 0 ? (oId !== null && ids.includes(oId)) : (tUp === 'SAL' || tUp === 'TRF')
      const esDestino = ids.length > 0 ? (dId !== null && ids.includes(dId)) : (tUp === 'ENT' || tUp === 'DEV')
      if (ids.length > 0 && !esOrigen && !esDestino) continue
      const oNom = oId !== null ? bodMap.get(oId)?.nombre || null : null
      const dNom = dId !== null ? bodMap.get(dId)?.nombre || null : null
      out.push({
        nota_id: nota.id,
        numero_nota: String(nota.numero_nota || ''),
        fecha_nota: nota.fecha_nota,
        tipo_codigo: tipoCod.toUpperCase(),
        estado_codigo: String(nota?.cat_estados_nota?.codigo || 'CONF'),
        producto_id: m.producto_id,
        sku_base: prod?.sku_base || '',
        cajas: Number(m.cajas) || 0,
        firmado: firmadoRespectoAlcance(tipoCod, Number(nota?.cat_tipos_movimiento?.afecta_inventario ?? 0), Number(m.cajas) || 0, esOrigen, esDestino),
        origen_bodega: oNom,
        destino_bodega: dNom,
      })
      if (out.length >= max) break
    }
    return out
  }

  const estadosBase = opts.incluirCanceladas ? ['CONF', 'MODF', 'CANC'] : ['CONF', 'MODF']
  const [notas, pendientes] = await Promise.all([
    traer(estadosBase, true, limite * 3),
    traer(['PEND', 'PROC'], false, 30),
  ])
  return { notas: notas.slice(0, limite), pendientes: pendientes.slice(0, 15), total: notas.length }
}
