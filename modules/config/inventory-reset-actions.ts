// modules/config/inventory-reset-actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser, fetchBodegasUsuario } from '@/modules/auth/queries'
import { can, isClienteEcommerce, isSuperAdmin } from '@/lib/auth/permissions'
import { esFilaCajasNoCero, payloadCierreCajas } from '@/lib/inventario/reset-stock'

export type BodegaResetReport = {
  bodegaId: number
  bodegaNombre: string
  linesCount: number
  notaIds: number[]
  zeroVerified: boolean
  error?: string
}

export type ResetResult = {
  success: boolean
  error?: string
  message?: string
  runId?: string
  dryRun?: boolean
  totalBodegas?: number
  totalLineas?: number
  notaIds?: number[]
  bodegas?: BodegaResetReport[]
}

type CajasNoCeroRow = {
  id: number
  producto_id: number
  caja_id: number | null
  cajas: number
  /** Solo diagnóstico: el cierre opera exclusivamente sobre cajas. */
  piezas_sueltas: number
}

const MAX_CONCURRENT_BODEGAS = 3
const MAX_POST_CONF_RETRIES = 2

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function runner() {
    while (nextIndex < items.length) {
      const idx = nextIndex++
      results[idx] = await worker(items[idx])
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runner())
  await Promise.all(workers)
  return results
}

/**
 * Lee únicamente las filas con CAJAS distintas de 0 en la bodega.
 *
 * La unidad oficial de stock es CAJAS (AGENTS.md 3.1.3) y el motor de Stock
 * Histórico ignora `piezas_sueltas`. Por eso el cierre no incluye filas que
 * solo tienen piezas: no se pueden restar vía nota AJU (el detalle exige
 * `piezas_sueltas >= 0`) y no forman parte del Kardex.
 */
async function fetchCajasNoCeroBodega(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bodegaId: number
): Promise<CajasNoCeroRow[]> {
  const rows: CajasNoCeroRow[] = []
  let from = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('inventario_stock')
      .select('id, producto_id, caja_id, cajas, piezas_sueltas')
      .eq('bodega_id', bodegaId)
      .neq('cajas', 0)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      throw new Error(`Error al leer stock de bodega ${bodegaId}: ${error.message}`)
    }
    if (!data || data.length === 0) break

    for (const r of data) {
      const cajas = Number(r.cajas ?? 0)
      if (!esFilaCajasNoCero({ cajas })) continue
      rows.push({
        id: Number(r.id),
        producto_id: Number(r.producto_id),
        caja_id: r.caja_id !== null && r.caja_id !== undefined ? Number(r.caja_id) : null,
        cajas,
        piezas_sueltas: Number(r.piezas_sueltas ?? 0),
      })
    }

    if (data.length < pageSize) break
    from += pageSize
  }

  return rows
}

/**
 * Descarta una nota borrador que falló antes de confirmarse.
 *
 * No se borra físicamente porque `historial_estados_nota.nota_id` no tiene
 * ON DELETE CASCADE: el DELETE fallaría y dejaría la nota PEND huérfana.
 * Marcarla `activo = false` la oculta de los listados sin disparar stock
 * (`fn_procesar_nota_inventario` retorna temprano si el estado no cambió).
 */
async function descartarNotaBorrador(
  supabase: Awaited<ReturnType<typeof createClient>>,
  notaId: number,
  motivo: string
): Promise<void> {
  const { error } = await supabase
    .from('notas_inventario')
    .update({
      activo: false,
      observaciones: `Cierre abortado: ${motivo}`,
    })
    .eq('id', notaId)

  if (error) {
    console.error(
      `[AUDIT_INVENTORY_RESET] No se pudo descartar la nota borrador #${notaId}: ${error.message}`
    )
  }
}

/**
 * Procesa el cierre a 0 de las CAJAS de una bodega exclusivamente vía nota AJU
 * (codigo='AJU') + sp_crear_nota + sp_agregar_producto_nota (-cajas, 0 piezas,
 * respetando caja_id) + CONF (fn_procesar_nota_inventario).
 *
 * Las `piezas_sueltas` son legado informativo: no se envían en el detalle (el
 * CHECK exige piezas >= 0) ni se usan para verificar el cierre. Así una fila
 * con cajas = 0 y piezas > 0 no bloquea el reset.
 *
 * NOTA IMPORTANTE DE BD: cat_tipos_movimiento.AJU tiene afecta_inventario = 0 en esquema,
 * pero fn_procesar_nota_inventario SI procesa AJU cuando estado pasa a CONF y registra
 * AJUSTE en auditoria_inventario. No modificar ese flag en BD.
 */
async function resetBodegaViaNotaAju(
  supabase: Awaited<ReturnType<typeof createClient>>,
  usuarioId: number,
  bodegaId: number,
  bodegaNombre: string,
  tipoAjuId: number,
  estadoConfId: number,
  runId: string,
  dryRun: boolean
): Promise<BodegaResetReport> {
  const initialRows = await fetchCajasNoCeroBodega(supabase, bodegaId)
  if (initialRows.length === 0) {
    return {
      bodegaId,
      bodegaNombre,
      linesCount: 0,
      notaIds: [],
      zeroVerified: true,
    }
  }

  if (dryRun) {
    return {
      bodegaId,
      bodegaNombre,
      linesCount: initialRows.length,
      notaIds: [],
      zeroVerified: true,
    }
  }

  const createdNotaIds: number[] = []
  let totalLines = 0
  let pendingRows = initialRows

  for (let attempt = 0; attempt <= MAX_POST_CONF_RETRIES && pendingRows.length > 0; attempt++) {
    const suffix = attempt === 0 ? '' : `-R${attempt}`
    const { data: notaData, error: notaError } = await supabase.rpc('sp_crear_nota', {
      p_tipo_movimiento_id: tipoAjuId,
      p_bodega_origen_id: bodegaId,
      p_bodega_destino_id: null as any,
      p_usuario_id: usuarioId,
      p_nota_referencia: `AJU-CIERRE-${runId}-B${bodegaId}${suffix}`,
      p_observaciones: `Reinicio operativo a 0 vía nota AJU (${bodegaNombre}, run ${runId}, ${pendingRows.length} líneas${suffix ? `, reintento ${attempt}` : ''})`,
    })

    if (notaError) {
      return {
        bodegaId,
        bodegaNombre,
        linesCount: totalLines,
        notaIds: createdNotaIds,
        zeroVerified: false,
        error: `Error al crear nota AJU en ${bodegaNombre}: ${notaError.message}`,
      }
    }

    const resultado = Array.isArray(notaData) ? notaData[0] : notaData
    const notaId = Number(resultado?.nota_id || 0)
    if (!notaId) {
      return {
        bodegaId,
        bodegaNombre,
        linesCount: totalLines,
        notaIds: createdNotaIds,
        zeroVerified: false,
        error: `sp_crear_nota no devolvió nota_id para ${bodegaNombre}.`,
      }
    }

    // Agregar líneas en serie dentro de la misma nota (evita locks/contención en la misma nota)
    for (const row of pendingRows) {
      const payload = payloadCierreCajas(row)
      if (!payload) continue

      const { error: addErr } = await supabase.rpc('sp_agregar_producto_nota', {
        p_nota_id: notaId,
        p_producto_id: row.producto_id,
        p_variante_id: undefined,
        ...payload,
      })

      if (addErr) {
        await descartarNotaBorrador(supabase, notaId, addErr.message)
        return {
          bodegaId,
          bodegaNombre,
          linesCount: totalLines,
          notaIds: createdNotaIds,
          zeroVerified: false,
          error: `Error al agregar producto ${row.producto_id} a nota #${notaId} (${bodegaNombre}): ${addErr.message}`,
        }
      }
    }

    // Confirmar nota -> dispara fn_procesar_nota_inventario
    const { error: confErr } = await supabase
      .from('notas_inventario')
      .update({ estado_id: estadoConfId })
      .eq('id', notaId)

    if (confErr) {
      await descartarNotaBorrador(supabase, notaId, confErr.message)
      return {
        bodegaId,
        bodegaNombre,
        linesCount: totalLines,
        notaIds: createdNotaIds,
        zeroVerified: false,
        error: `Error al confirmar nota #${notaId} (${bodegaNombre}): ${confErr.message}`,
      }
    }

    createdNotaIds.push(notaId)
    totalLines += pendingRows.length

    // Verificación post-CONF: solo cajas (las piezas legacy no bloquean)
    pendingRows = await fetchCajasNoCeroBodega(supabase, bodegaId)
  }

  const zeroVerified = pendingRows.length === 0
  if (!zeroVerified) {
    return {
      bodegaId,
      bodegaNombre,
      linesCount: totalLines,
      notaIds: createdNotaIds,
      zeroVerified: false,
      error: `Quedaron ${pendingRows.length} filas con cajas distintas de 0 en ${bodegaNombre} tras ${MAX_POST_CONF_RETRIES} reintentos.`,
    }
  }

  console.info(
    '[AUDIT_INVENTORY_RESET]',
    JSON.stringify({
      runId,
      actorId: usuarioId,
      bodegaId,
      bodegaNombre,
      linesCount: totalLines,
      notaIds: createdNotaIds,
      zeroVerified,
    })
  )

  return {
    bodegaId,
    bodegaNombre,
    linesCount: totalLines,
    notaIds: createdNotaIds,
    zeroVerified: true,
  }
}

async function getAjuAndConfIds(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [{ data: tipoAju }, { data: estadoConf }] = await Promise.all([
    supabase.from('cat_tipos_movimiento').select('id').eq('codigo', 'AJU').single(),
    supabase.from('cat_estados_nota').select('id').eq('codigo', 'CONF').single(),
  ])

  if (!tipoAju?.id || !estadoConf?.id) {
    throw new Error('No se encontraron los catálogos AJU o CONF en la base de datos.')
  }

  return { tipoAjuId: Number(tipoAju.id), estadoConfId: Number(estadoConf.id) }
}

async function executeBodegasReset(
  supabase: Awaited<ReturnType<typeof createClient>>,
  usuarioId: number,
  bodegas: Array<{ id: number; nombre: string }>,
  dryRun: boolean
): Promise<ResetResult> {
  const runId = `${Date.now().toString(36).toUpperCase()}`
  const { tipoAjuId, estadoConfId } = await getAjuAndConfIds(supabase)

  const reports = await runWithConcurrency(bodegas, MAX_CONCURRENT_BODEGAS, (b) =>
    resetBodegaViaNotaAju(supabase, usuarioId, b.id, b.nombre, tipoAjuId, estadoConfId, runId, dryRun)
  )

  const failed = reports.filter((r) => Boolean(r.error) || !r.zeroVerified)
  const totalLineas = reports.reduce((acc, r) => acc + r.linesCount, 0)
  const notaIds = reports.flatMap((r) => r.notaIds)

  if (!dryRun) {
    revalidatePath('/inventario/stock')
    revalidatePath('/inventario/notas')
    revalidatePath('/configuracion/inventario')
  }

  if (failed.length > 0) {
    const summary = failed.map((f) => `${f.bodegaNombre}: ${f.error || 'No quedó en 0'}`).join(' | ')
    return {
      success: false,
      error: `Falló el cierre en ${failed.length} bodega(s): ${summary}`,
      runId,
      dryRun,
      totalBodegas: reports.length,
      totalLineas,
      notaIds,
      bodegas: reports,
    }
  }

  if (dryRun) {
    const bodegasConStock = reports.filter((r) => r.linesCount > 0).length
    return {
      success: true,
      dryRun: true,
      runId,
      totalBodegas: bodegasConStock,
      totalLineas,
      notaIds: [],
      bodegas: reports,
      message: `Simulación (dry-run): se generarían notas AJU para ${bodegasConStock} bodega(s) (${totalLineas} líneas con cajas ≠ 0).`,
    }
  }

  return {
    success: true,
    dryRun: false,
    runId,
    totalBodegas: reports.filter((r) => r.notaIds.length > 0).length,
    totalLineas,
    notaIds,
    bodegas: reports,
    message:
      totalLineas === 0
        ? 'El inventario ya se encontraba en 0 cajas. No fue necesario crear notas AJU.'
        : `Reinicio a 0 completado vía ${notaIds.length} nota(s) AJU confirmadas (${totalLineas} líneas de cajas procesadas en Kardex y auditoría).`,
  }
}

/**
 * Deshabilitado permanentemente (Regla 3.1.1 / Kardex):
 * Marcar notas CONF/MODF con activo = false descuadra el Kardex y la Trazabilidad.
 */
export async function resetNotasAction(_bodegaId?: number): Promise<ResetResult> {
  return {
    success: false,
    error:
      'Operación deshabilitada: ocultar notas con activo=false descuadra el Kardex y la Trazabilidad. Utiliza el cierre vía nota AJU.',
  }
}

/**
 * Super Admin Nivel 1: Reinicia existencias a 0 en todas las bodegas mediante notas AJU -> CONF.
 */
export async function resetStockCeroAction(options?: { dryRun?: boolean }): Promise<ResetResult> {
  const user = await getCurrentUser()
  if (!user || isClienteEcommerce(user) || user.rol?.nivel_acceso !== 1) {
    return {
      success: false,
      error: 'Acceso Denegado: Esta acción está reservada exclusivamente para Super Admin Nivel 1.',
    }
  }

  const supabase = await createClient()
  const { data: bodegas, error } = await supabase
    .from('bodegas')
    .select('id, nombre')
    .eq('activa', true)
    .order('id', { ascending: true })

  if (error) {
    return { success: false, error: `Error al consultar bodegas: ${error.message}` }
  }

  return executeBodegasReset(
    supabase,
    user.id,
    (bodegas ?? []).map((b) => ({ id: Number(b.id), nombre: String(b.nombre) })),
    Boolean(options?.dryRun)
  )
}

/**
 * Super Admin Nivel 1: Cierre operativo completo vía notas AJU -> CONF.
 * PROHIBIDO ocultar notas históricas con activo=false (el corte se deriva de las notas AJU de cierre).
 */
export async function resetCompletoInventarioAction(options?: { dryRun?: boolean }): Promise<ResetResult> {
  return resetStockCeroAction(options)
}

/**
 * Super Admin Nivel 1: Reinicia existencias a 0 de una bodega específica vía nota AJU -> CONF.
 */
export async function resetStockCeroBodegaAction(
  bodegaId: number,
  options?: { dryRun?: boolean }
): Promise<ResetResult> {
  const user = await getCurrentUser()
  if (!user || isClienteEcommerce(user) || user.rol?.nivel_acceso !== 1) {
    return {
      success: false,
      error: 'Acceso Denegado: Esta acción está reservada exclusivamente para Super Admin Nivel 1.',
    }
  }

  if (!bodegaId || bodegaId <= 0) {
    return { success: false, error: 'ID de bodega inválido.' }
  }

  const supabase = await createClient()
  const { data: bodega, error } = await supabase
    .from('bodegas')
    .select('id, nombre')
    .eq('id', bodegaId)
    .single()

  if (error || !bodega) {
    return { success: false, error: `Bodega #${bodegaId} no encontrada.` }
  }

  return executeBodegasReset(
    supabase,
    user.id,
    [{ id: Number(bodega.id), nombre: String(bodega.nombre) }],
    Boolean(options?.dryRun)
  )
}

/**
 * Permiso diferenciado para Importación Masiva (ImportStepConfirm -> resetStockPrevio):
 * Exige permiso de notas (`inventario_notas` `puede_crear`) + scope de bodega (`canAccessBodega`),
 * sin exigir nivel 1. Si falla parcialmente, la importación debe abortarse.
 */
export async function resetStockParaImportacionAction(bodegaIds?: number[]): Promise<ResetResult> {
  const user = await getCurrentUser()
  if (!user || isClienteEcommerce(user)) {
    return { success: false, error: 'No autenticado.' }
  }

  const tienePermisoNotas = isSuperAdmin(user) || can(user, 'inventario_notas', 'puede_crear')
  if (!tienePermisoNotas) {
    return {
      success: false,
      error: 'No tienes permiso para crear notas de ajuste (inventario_notas: puede_crear) para reiniciar el stock previo.',
    }
  }

  const supabase = await createClient()
  const bodegasAutorizadas = await fetchBodegasUsuario(user.id, user.rol?.nivel_acceso ?? 99)
  const allowedIds = new Set(bodegasAutorizadas.map((b) => Number(b.id)))
  let targetBodegas: Array<{ id: number; nombre: string }> = []

  if (bodegaIds && bodegaIds.length > 0) {
    const uniqueIds = Array.from(new Set(bodegaIds.filter((id) => Number.isInteger(id) && id > 0)))
    for (const bId of uniqueIds) {
      if (!isSuperAdmin(user) && !allowedIds.has(bId)) {
        return {
          success: false,
          error: `No tienes acceso a la bodega #${bId} para reiniciar su stock previo.`,
        }
      }
    }

    const { data, error } = await supabase
      .from('bodegas')
      .select('id, nombre')
      .in('id', uniqueIds)
      .order('id', { ascending: true })

    if (error) {
      return { success: false, error: `Error al consultar bodegas: ${error.message}` }
    }
    targetBodegas = (data ?? []).map((b) => ({ id: Number(b.id), nombre: String(b.nombre) }))
  } else {
    targetBodegas = bodegasAutorizadas.map((b) => ({ id: Number(b.id), nombre: String(b.nombre) }))
  }

  if (targetBodegas.length === 0) {
    return { success: false, error: 'No hay bodegas autorizadas para reiniciar.' }
  }

  return executeBodegasReset(supabase, user.id, targetBodegas, false)
}
