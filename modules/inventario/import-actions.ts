// modules/inventario/import-actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/queries'
import { fetchTiposMovimientoImport, type TiposMovimientoMap } from './import-queries'

export type ModoAjuste = 'delta' | 'absoluto' | 'global'

export type ImportFilaValida = {
  sku: string
  producto_id: number
  producto_nombre: string | null
  cajas: number
  bodega_id: number
  bodega_nombre: string
}

export type NotaBodegaResult = {
  bodega_id: number
  bodega_nombre: string
  nota_id: number
  numero_nota: string
  productos_procesados: number
}

export type ImportAjusteResult = {
  success: boolean
  error?: string
  notas?: NotaBodegaResult[]
  productos_procesados?: number
}

async function fetchStockActual(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bodegaId: number,
  productoIds: number[]
): Promise<Map<number, number>> {
  const map = new Map<number, number>()
  if (productoIds.length === 0) return map

  const { data } = await supabase
    .from('inventario_stock')
    .select('producto_id, cajas')
    .eq('bodega_id', bodegaId)
    .in('producto_id', productoIds)

  if (!data) return map

  for (const row of data) {
    const existing = map.get(row.producto_id) ?? 0
    map.set(row.producto_id, existing + Number(row.cajas ?? 0))
  }

  return map
}

async function crearNotaSubconjunto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filas: { producto_id: number; sku: string; cajas: number }[],
  bodegaId: number,
  bodegaNombre: string,
  usuarioId: number,
  tipoMovimientoId: number,
  tipoCodigo: 'ENT' | 'SAL',
  modo: ModoAjuste
): Promise<NotaBodegaResult> {
  const modoShort = modo === 'global' ? 'Global' : modo === 'absoluto' ? 'Inv. Total' : 'Delta'
  const fechaRef = new Date().toISOString().slice(0, 10)
  const tipoShort = tipoCodigo === 'ENT' ? '+ENT' : '-SAL'
  const notaReferencia = `Ajuste ${modoShort} ${tipoShort} ${fechaRef}`.slice(0, 50)
  const observaciones = `Importacion masiva (${modoShort} ${tipoShort}): ${filas.length} productos - Bodega: ${bodegaNombre}`

  const { data: notaData, error: notaError } = await supabase.rpc('sp_crear_nota', {
    p_tipo_movimiento_id: tipoMovimientoId,
    p_bodega_origen_id: bodegaId,
    p_bodega_destino_id: null as any,
    p_usuario_id: usuarioId,
    p_nota_referencia: notaReferencia,
    p_observaciones: observaciones,
  })

  if (notaError) {
    throw new Error(`Error al crear nota (${tipoShort}) para ${bodegaNombre}: ${notaError.message}`)
  }

  const resultado = Array.isArray(notaData) ? notaData[0] : notaData
  const notaId = resultado?.nota_id
  const numeroNota = resultado?.numero_nota

  if (!notaId) {
    throw new Error(`No se pudo crear la nota para ${bodegaNombre}.`)
  }

  let productosProcesados = 0
  for (const fila of filas) {
    const { error: prodError } = await supabase.rpc('sp_agregar_producto_nota', {
      p_nota_id: notaId,
      p_cajas: Math.abs(fila.cajas), // SIEMPRE POSITIVO para cumplir chk_detalle_positivo
      p_producto_id: fila.producto_id,
      p_variante_id: undefined,
      p_piezas_sueltas: 0,
      p_caja_id: undefined,
      p_codigo_original: fila.sku || undefined,
    })

    if (prodError) {
      throw new Error(`Error al agregar ${fila.sku} en ${bodegaNombre}: ${prodError.message}`)
    }
    productosProcesados++
  }

  const { data: estadoConf } = await supabase
    .from('cat_estados_nota')
    .select('id')
    .eq('codigo', 'CONF')
    .single()

  if (!estadoConf) {
    throw new Error(`Nota ${numeroNota} creada pero no se encontro estado CONF para confirmar.`)
  }

  const { error: confirmError } = await supabase
    .from('notas_inventario')
    .update({ estado_id: estadoConf.id })
    .eq('id', notaId)

  if (confirmError) {
    throw new Error(`Nota ${numeroNota} creada pero error al confirmar: ${confirmError.message}`)
  }

  return {
    bodega_id: bodegaId,
    bodega_nombre: bodegaNombre,
    nota_id: notaId,
    numero_nota: numeroNota,
    productos_procesados: productosProcesados,
  }
}

async function procesarBodega(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filasBodega: ImportFilaValida[],
  bodegaId: number,
  bodegaNombre: string,
  usuarioId: number,
  tiposMap: TiposMovimientoMap,
  modo: ModoAjuste
): Promise<NotaBodegaResult[]> {
  // 1. Consolidar/agrupar filas con el mismo producto_id en esta bodega (suma existencias/deltas)
  const consolidadoMap = new Map<number, ImportFilaValida>()
  for (const f of filasBodega) {
    const existing = consolidadoMap.get(f.producto_id)
    if (existing) {
      existing.cajas += f.cajas
    } else {
      consolidadoMap.set(f.producto_id, { ...f })
    }
  }
  const filasConsolidadas = Array.from(consolidadoMap.values())

  // 2. Calcular deltas reales según el modo
  let deltasCalculados: { producto_id: number; sku: string; delta: number }[] = []

  if (modo === 'absoluto' || modo === 'global') {
    const productoIds = filasConsolidadas.map(f => f.producto_id)
    const stockMap = await fetchStockActual(supabase, bodegaId, productoIds)

    deltasCalculados = filasConsolidadas.map(f => {
      const stockActual = stockMap.get(f.producto_id) ?? 0
      const delta = f.cajas - stockActual
      return { producto_id: f.producto_id, sku: f.sku, delta }
    }).filter(d => d.delta !== 0)
  } else {
    // modo === 'delta'
    deltasCalculados = filasConsolidadas.map(f => ({
      producto_id: f.producto_id,
      sku: f.sku,
      delta: f.cajas,
    })).filter(d => d.delta !== 0)
  }

  if (deltasCalculados.length === 0) {
    return []
  }

  // 3. Dividir en incrementos (Entradas) y reducciones (Salidas)
  const positivos = deltasCalculados
    .filter(d => d.delta > 0)
    .map(d => ({ producto_id: d.producto_id, sku: d.sku, cajas: d.delta }))

  const negativos = deltasCalculados
    .filter(d => d.delta < 0)
    .map(d => ({ producto_id: d.producto_id, sku: d.sku, cajas: Math.abs(d.delta) }))

  const resultados: NotaBodegaResult[] = []

  // Crear nota de Entrada para incrementos de stock
  if (positivos.length > 0) {
    const resEnt = await crearNotaSubconjunto(
      supabase,
      positivos,
      bodegaId,
      bodegaNombre,
      usuarioId,
      tiposMap.ENT,
      'ENT',
      modo
    )
    resultados.push(resEnt)
  }

  // Crear nota de Salida para deducciones de stock
  if (negativos.length > 0) {
    const resSal = await crearNotaSubconjunto(
      supabase,
      negativos,
      bodegaId,
      bodegaNombre,
      usuarioId,
      tiposMap.SAL,
      'SAL',
      modo
    )
    resultados.push(resSal)
  }

  return resultados
}

export async function crearAjustesImportAction(
  filas: ImportFilaValida[],
  modo: ModoAjuste = 'delta'
): Promise<ImportAjusteResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }
  const { can: canGlobal, isClienteEcommerce } = await import('@/lib/auth/permissions')
  if (
    isClienteEcommerce(user) ||
    (!canGlobal(user, 'inventario_notas', 'puede_crear') && !canGlobal(user, 'inventario_stock', 'puede_editar'))
  ) {
    return { success: false, error: 'No autorizado para importar ajustes de inventario.' }
  }

  if (filas.length === 0) return { success: false, error: 'No hay filas validas para importar.' }

  const supabase = await createClient()

  const tiposMap = await fetchTiposMovimientoImport()
  if (!tiposMap) {
    return { success: false, error: 'No se encontraron los tipos de movimiento ENT y SAL en el catálogo.' }
  }

  // Agrupar filas por bodega_id
  const porBodega = new Map<number, ImportFilaValida[]>()
  for (const fila of filas) {
    if (!porBodega.has(fila.bodega_id)) {
      porBodega.set(fila.bodega_id, [])
    }
    porBodega.get(fila.bodega_id)!.push(fila)
  }

  const notas: NotaBodegaResult[] = []
  let totalProcesados = 0

  for (const [bodegaId, filasBodega] of porBodega) {
    const bodegaNombre = filasBodega[0].bodega_nombre

    try {
      const notasBodega = await procesarBodega(
        supabase, filasBodega, bodegaId, bodegaNombre, user.id, tiposMap, modo
      )
      for (const n of notasBodega) {
        notas.push(n)
        totalProcesados += n.productos_procesados
      }
    } catch (err: any) {
      revalidatePath('/inventario/notas')
      revalidatePath('/inventario/stock')

      return {
        success: false,
        error: err.message,
        notas: notas.length > 0 ? notas : undefined,
        productos_procesados: totalProcesados > 0 ? totalProcesados : undefined,
      }
    }
  }

  revalidatePath('/inventario/notas')
  revalidatePath('/inventario/stock')

  return {
    success: true,
    notas,
    productos_procesados: totalProcesados,
  }
}

export type FilaAjusteAplicar = {
  producto_id: number
  sku: string
  delta: number
}

export type FilaSoloSistemaCero = {
  producto_id: number
  sku: string
  stock_actual: number
}

/**
 * Aplica la conciliación de Inventario Total para una bodega:
 * - Movimientos de Entrada (ENT) para productos que aumentan o son nuevos.
 * - Movimientos de Salida (SAL) para productos que disminuyen y los de "SOLO SISTEMA" marcados para mandar a cero.
 * Todo se procesa con sp_crear_nota y estado CONF, cumpliendo la Regla Inquebrantable 3.1.
 */
export async function aplicarConciliacionInventarioTotalAction(
  bodegaId: number,
  bodegaNombre: string,
  filasComparacion: FilaAjusteAplicar[],
  soloSistemaMandarCero: FilaSoloSistemaCero[]
): Promise<ImportAjusteResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }
  const { can: canGlobal, isClienteEcommerce } = await import('@/lib/auth/permissions')
  if (
    isClienteEcommerce(user) ||
    (!canGlobal(user, 'inventario_notas', 'puede_crear') && !canGlobal(user, 'inventario_stock', 'puede_editar'))
  ) {
    return { success: false, error: 'No autorizado para aplicar conciliación de inventario.' }
  }

  const supabase = await createClient()

  const tiposMap = await fetchTiposMovimientoImport()
  if (!tiposMap) {
    return { success: false, error: 'No se encontraron los tipos de movimiento ENT y SAL en el catálogo.' }
  }

  // 1. Filtrar entradas (positivos)
  const positivos = filasComparacion
    .filter((f) => f.delta > 0)
    .map((f) => ({ producto_id: f.producto_id, sku: f.sku, cajas: f.delta }))

  // 2. Filtrar salidas (negativos de la comparativa + solo sistema marcados a cero)
  const negativosComparativa = filasComparacion
    .filter((f) => f.delta < 0)
    .map((f) => ({ producto_id: f.producto_id, sku: f.sku, cajas: Math.abs(f.delta) }))

  const negativosSoloSistema = soloSistemaMandarCero
    .filter((s) => s.stock_actual > 0)
    .map((s) => ({ producto_id: s.producto_id, sku: s.sku, cajas: s.stock_actual }))

  const negativos = [...negativosComparativa, ...negativosSoloSistema]

  if (positivos.length === 0 && negativos.length === 0) {
    return {
      success: true,
      notas: [],
      productos_procesados: 0,
    }
  }

  const notas: NotaBodegaResult[] = []
  let totalProcesados = 0

  try {
    // Crear nota de Entrada para los aumentos de stock
    if (positivos.length > 0) {
      const resEnt = await crearNotaSubconjunto(
        supabase,
        positivos,
        bodegaId,
        bodegaNombre,
        user.id,
        tiposMap.ENT,
        'ENT',
        'absoluto'
      )
      notas.push(resEnt)
      totalProcesados += resEnt.productos_procesados
    }

    // Crear nota de Salida para las reducciones y mandados a cero
    if (negativos.length > 0) {
      const resSal = await crearNotaSubconjunto(
        supabase,
        negativos,
        bodegaId,
        bodegaNombre,
        user.id,
        tiposMap.SAL,
        'SAL',
        'absoluto'
      )
      notas.push(resSal)
      totalProcesados += resSal.productos_procesados
    }
  } catch (err: any) {
    revalidatePath('/inventario/notas')
    revalidatePath('/inventario/stock')

    return {
      success: false,
      error: err.message,
      notas: notas.length > 0 ? notas : undefined,
      productos_procesados: totalProcesados > 0 ? totalProcesados : undefined,
    }
  }

  revalidatePath('/inventario/notas')
  revalidatePath('/inventario/stock')

  return {
    success: true,
    notas,
    productos_procesados: totalProcesados,
  }
}

async function requireInventarioImportRead() {
  const user = await getCurrentUser()
  if (!user) throw new Error('No autenticado')
  const { can, isClienteEcommerce } = await import('@/lib/auth/permissions')
  if (
    isClienteEcommerce(user) ||
    (!can(user, 'inventario_stock', 'puede_leer') && !can(user, 'inventario_notas', 'puede_crear'))
  ) {
    throw new Error('No autorizado')
  }
  return user
}

export async function buscarProductosPorSkuBatchAction(skus: string[]) {
  await requireInventarioImportRead()
  const { buscarProductosPorSkuBatch } = await import('./import-queries')
  return buscarProductosPorSkuBatch(skus)
}

export async function buscarBodegasBatchAction(nombres: string[]) {
  await requireInventarioImportRead()
  const { buscarBodegasBatch } = await import('./import-queries')
  return buscarBodegasBatch(nombres)
}

export async function buscarProductosCatalogoAction(query: string) {
  await requireInventarioImportRead()
  const { buscarProductosCatalogo } = await import('./import-queries')
  return buscarProductosCatalogo(query)
}

export async function generarConciliacionInventarioTotalAction(
  bodegaId: number,
  filas: ImportFilaValida[]
) {
  await requireInventarioImportRead()
  const { generarConciliacionInventarioTotal } = await import('./import-queries')
  return generarConciliacionInventarioTotal(bodegaId, filas)
}

