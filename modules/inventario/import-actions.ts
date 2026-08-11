// modules/inventario/import-actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/queries'
import { fetchTipoMovimientoAjuste } from './import-queries'

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

async function crearNotaAjusteParaBodega(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filas: ImportFilaValida[],
  bodegaId: number,
  bodegaNombre: string,
  usuarioId: number,
  tipoAjuId: number,
  modo: ModoAjuste
): Promise<NotaBodegaResult> {
  let filasProcesar = filas

  if (modo === 'absoluto' || modo === 'global') {
    const productoIds = filas.map(f => f.producto_id)
    const stockMap = await fetchStockActual(supabase, bodegaId, productoIds)

    filasProcesar = filas.map(f => {
      const stockActual = stockMap.get(f.producto_id) ?? 0
      const delta = f.cajas - stockActual
      return { ...f, cajas: delta }
    }).filter(f => f.cajas !== 0)
  }

  if (filasProcesar.length === 0) {
    throw new Error(`No hay diferencias de stock para ajustar en ${bodegaNombre}.`)
  }

  const modoLabel = modo === 'global' ? 'Corte Global' : modo === 'absoluto' ? 'Inventario total' : 'Ajuste delta'
  const fechaRef = new Date().toISOString().slice(0, 10)
  const notaReferencia = `Ajuste importado (${modoLabel}) - ${fechaRef}`
  const observaciones = `Importacion masiva (${modoLabel}): ${filasProcesar.length} productos - Bodega: ${bodegaNombre}`

  const { data: notaData, error: notaError } = await supabase.rpc('sp_crear_nota', {
    p_tipo_movimiento_id: tipoAjuId,
    p_bodega_origen_id: bodegaId,
    p_bodega_destino_id: null as any,
    p_usuario_id: usuarioId,
    p_nota_referencia: notaReferencia,
    p_observaciones: observaciones,
  })

  if (notaError) {
    throw new Error(`Error al crear nota para ${bodegaNombre}: ${notaError.message}`)
  }

  const resultado = Array.isArray(notaData) ? notaData[0] : notaData
  const notaId = resultado?.nota_id
  const numeroNota = resultado?.numero_nota

  if (!notaId) {
    throw new Error(`No se pudo crear la nota de ajuste para ${bodegaNombre}.`)
  }

  let productosProcesados = 0
  for (const fila of filasProcesar) {
    const { error: prodError } = await supabase.rpc('sp_agregar_producto_nota', {
      p_nota_id: notaId,
      p_cajas: fila.cajas,
      p_producto_id: fila.producto_id,
      p_variante_id: undefined,
      p_piezas_sueltas: 0,
      p_caja_id: undefined,
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

export async function crearAjustesImportAction(
  filas: ImportFilaValida[],
  modo: ModoAjuste = 'delta'
): Promise<ImportAjusteResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  if (filas.length === 0) return { success: false, error: 'No hay filas validas para importar.' }

  const supabase = await createClient()

  const tipoAjuId = await fetchTipoMovimientoAjuste()
  if (!tipoAjuId) {
    return { success: false, error: 'No se encontro el tipo de movimiento AJU en catalogo.' }
  }

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
      const notaResult = await crearNotaAjusteParaBodega(
        supabase, filasBodega, bodegaId, bodegaNombre, user.id, tipoAjuId, modo
      )
      notas.push(notaResult)
      totalProcesados += notaResult.productos_procesados
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
