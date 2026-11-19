// modules/despachos/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/queries'
import { can, isClienteEcommerce } from '@/lib/auth/permissions'
import { confirmarNotaAction, cancelarNotaAction } from '@/modules/inventario/actions'
import { fetchNotaTraspasoDespacho } from './queries'
import type { DespachoFormData } from './types'
import type { CrearNotaResponse } from '@/lib/types/tables'

export type ActionResult = {
  success: boolean
  error?: string
  despacho_id?: number
  nota_id?: number
  numero_nota?: string
}

// ════════════════════════════════════════════════════════════
// CREAR DESPACHO + NOTA TRASPASO ÚNICA (PEND, modo solo cajas)
// ════════════════════════════════════════════════════════════

/**
 * Un despacho es UN solo traslado: nota TRF bodega virtual → física.
 * La nota nace en PEND (borrador, como en notas): no mueve stock hasta
 * confirmarse. La edición de líneas y la confirmación ocurren en la nota.
 */
export async function crearDespachoAction(
  data: DespachoFormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }
  if (isClienteEcommerce(user) || !can(user, 'despachos', 'puede_crear')) {
    return { success: false, error: 'No autorizado para crear despachos.' }
  }

  const supabase = await createClient()

  // ── Validaciones ────────────────────────────────────────
  if (!data.bodega_origen_id || !data.bodega_destino_id) {
    return { success: false, error: 'Bodega origen y destino son requeridos.' }
  }
  if (data.bodega_origen_id === data.bodega_destino_id) {
    return { success: false, error: 'La bodega origen y destino deben ser diferentes.' }
  }
  if (data.productos.length === 0) {
    return { success: false, error: 'Agrega al menos un producto al despacho.' }
  }
  if (data.productos.some((p) => p.cantidad_cajas <= 0)) {
    return { success: false, error: 'Todas las cantidades deben ser mayores a 0.' }
  }

  // Tipo de movimiento TRF (traslado único origen → destino)
  const { data: tipoTrf } = await supabase
    .from('cat_tipos_movimiento')
    .select('id')
    .eq('codigo', 'TRF')
    .single()

  if (!tipoTrf) {
    return { success: false, error: 'No se encontró el tipo de movimiento TRF.' }
  }

  // Pre-chequeo de disponible en origen (mensaje claro temprano;
  // el trigger es la verdad final al confirmar)
  const { data: stockOrigen } = await supabase
    .from('inventario_stock')
    .select('producto_id, cajas')
    .eq('bodega_id', data.bodega_origen_id)
    .in('producto_id', data.productos.map((p) => p.producto_id))

  const disponible = new Map<number, number>()
  for (const row of (stockOrigen ?? [])) {
    disponible.set(row.producto_id, (disponible.get(row.producto_id) ?? 0) + Number(row.cajas ?? 0))
  }
  const faltantes = data.productos.filter(
    (p) => (disponible.get(p.producto_id) ?? 0) < p.cantidad_cajas
  )
  if (faltantes.length > 0) {
    return {
      success: false,
      error: `Stock insuficiente en bodega origen para ${faltantes.length} producto(s). Revisa las cantidades.`,
    }
  }

  // ── 1. Crear despacho ───────────────────────────────────
  const { data: despachoData, error: despachoError } = await supabase
    .from('despachos')
    .insert({
      bodega_origen_id: data.bodega_origen_id,
      bodega_destino_id: data.bodega_destino_id,
      vehiculo_info: data.vehiculo_info || null,
      chofer: data.chofer || null,
      estado: 'Programado',
      fecha_programada: data.fecha_programada || null,
    })
    .select('id')
    .single()

  if (despachoError || !despachoData) {
    return { success: false, error: despachoError?.message ?? 'Error al crear despacho.' }
  }

  const despachoId = despachoData.id

  // ── 2. Crear detalles del despacho ────────────────────────
  for (const prod of data.productos) {
    const { error: detError } = await supabase
      .from('despachos_detalles')
      .insert({
        despacho_id: despachoId,
        producto_id: prod.producto_id,
        caja_id: prod.caja_id ?? null,
        cantidad_cajas_solicitadas: prod.cantidad_cajas,
      })
    if (detError) {
      return { success: false, error: `Error al agregar producto al despacho: ${detError.message}` }
    }
  }

  // ── 3. Crear nota TRASPASO única en PEND (borrador) ─────────
  // No se confirma aquí: queda en "Por Confirmar" como en notas, hasta
  // revisar la mercancía. Al confirmarse, el trigger descuenta origen y
  // suma destino en un solo movimiento.
  const { data: notaData, error: notaError } = await supabase.rpc('sp_crear_nota', {
    p_tipo_movimiento_id: tipoTrf.id,
    p_bodega_origen_id: data.bodega_origen_id,
    p_bodega_destino_id: data.bodega_destino_id,
    p_usuario_id: user.id,
    p_nota_referencia: `Despacho ${despachoId}`,
    p_observaciones: `Traslado de despacho ${despachoId} a bodega física. Solo cajas, piezas 0.`,
  })

  if (notaError) {
    return { success: false, error: `Error al crear nota de traslado: ${notaError.message}` }
  }

  const notaResult = (Array.isArray(notaData) ? notaData[0] : notaData) as CrearNotaResponse | null
  const notaId = notaResult?.nota_id

  if (!notaId) {
    return { success: false, error: 'No se pudo obtener el ID de la nota de traslado.' }
  }

  // Solo cajas, piezas 0 (modo solo cajas)
  for (const prod of data.productos) {
    const { error: prodError } = await supabase.rpc('sp_agregar_producto_nota', {
      p_nota_id: notaId,
      p_cajas: prod.cantidad_cajas,
      p_producto_id: prod.producto_id,
      p_variante_id: undefined,
      p_piezas_sueltas: 0,
      p_caja_id: prod.caja_id || undefined,
    })
    if (prodError) {
      return { success: false, error: `Error en nota de traslado: ${prodError.message}` }
    }
  }

  // La nota queda en PEND (borrador). Revalidar para verla en "Por Confirmar".
  revalidatePath('/despachos')
  revalidatePath('/inventario/notas')
  revalidatePath('/inventario/stock')

  return { success: true, despacho_id: despachoId, nota_id: notaId, numero_nota: notaResult?.numero_nota }
}

// ════════════════════════════════════════════════════════════
// CONFIRMAR SALIDA (cambiar estado a "En Tránsito" — solo logístico)
// ════════════════════════════════════════════════════════════

export async function confirmarSalidaDespachoAction(
  despachoId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }
  if (isClienteEcommerce(user) || !can(user, 'despachos', 'puede_editar')) {
    return { success: false, error: 'No autorizado para confirmar salida de despachos.' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('despachos')
    .update({
      estado: 'En Tránsito',
      fecha_real_salida: new Date().toISOString(),
    })
    .eq('id', despachoId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/despachos/${despachoId}`)
  revalidatePath('/despachos')
  return { success: true }
}

// ════════════════════════════════════════════════════════════
// RECIBIR EN BODEGA FÍSICA (confirmar nota TRF vinculada)
// ════════════════════════════════════════════════════════════

/**
 * La edición de cajas ocurre en la nota (como una nota normal).
 * Aquí solo se confirma su traslado: PEND/PROC → CONF mueve el stock
 * (descuenta virtual, suma física) en un solo movimiento.
 */
export async function recibirDespachoAction(
  despachoId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }
  if (isClienteEcommerce(user) || !can(user, 'despachos', 'puede_editar')) {
    return { success: false, error: 'No autorizado para recibir despachos.' }
  }

  const supabase = await createClient()

  const nota = await fetchNotaTraspasoDespacho(despachoId)
  if (!nota) {
    return { success: false, error: 'El despacho no tiene nota de traslado vinculada.' }
  }
  if (nota.estado_codigo === 'CANC') {
    return { success: false, error: `La nota ${nota.numero_nota} está cancelada.` }
  }

  if (nota.estado_codigo === 'PEND' || nota.estado_codigo === 'PROC') {
    const conf = await confirmarNotaAction(nota.id)
    if (!conf.success) {
      return { success: false, error: conf.error ?? 'No se pudo confirmar el traslado.' }
    }
  }
  // Si ya estaba CONF (confirmada desde notas), solo se alinea el despacho.

  const { error: updError } = await supabase
    .from('despachos')
    .update({
      estado: 'Recibido',
      fecha_recepcion: new Date().toISOString(),
    })
    .eq('id', despachoId)

  if (updError) {
    return { success: false, error: updError.message }
  }

  revalidatePath(`/despachos/${despachoId}`)
  revalidatePath('/despachos')
  revalidatePath('/inventario/notas')
  revalidatePath('/inventario/stock')

  return { success: true }
}

// ════════════════════════════════════════════════════════════
// CANCELAR DESPACHO (cascada solo si la nota sigue pendiente)
// ════════════════════════════════════════════════════════════

export async function cancelarDespachoAction(
  despachoId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }
  if (isClienteEcommerce(user) || !can(user, 'despachos', 'puede_eliminar')) {
    return { success: false, error: 'No autorizado para cancelar despachos.' }
  }

  const supabase = await createClient()

  const nota = await fetchNotaTraspasoDespacho(despachoId)
  if (nota && (nota.estado_codigo === 'PEND' || nota.estado_codigo === 'PROC')) {
    const canc = await cancelarNotaAction(nota.id, `Cancelación del despacho ${despachoId}`)
    if (!canc.success) {
      return { success: false, error: canc.error ?? 'No se pudo cancelar la nota de traslado.' }
    }
  } else if (nota && nota.estado_codigo !== 'CANC') {
    return {
      success: false,
      error: `La nota ${nota.numero_nota} ya está confirmada y movió stock; no se puede cancelar el despacho.`,
    }
  }

  const { error } = await supabase
    .from('despachos')
    .update({ estado: 'Cancelado' })
    .eq('id', despachoId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/despachos/${despachoId}`)
  revalidatePath('/despachos')
  revalidatePath('/inventario/notas')
  return { success: true }
}

export async function fetchStockVirtualAction(bodegaVirtualId: number) {
  const user = await getCurrentUser()
  if (!user) throw new Error('No autenticado')
  if (
    isClienteEcommerce(user) ||
    (!can(user, 'despachos', 'puede_leer') && !can(user, 'inventario_virtual', 'puede_leer'))
  ) {
    throw new Error('No autorizado')
  }
  const { fetchStockVirtual } = await import('./queries')
  return fetchStockVirtual(bodegaVirtualId)
}

// ════════════════════════════════════════════════════════════
// CREAR / SINCRONIZAR DESPACHO DESDE NOTA TRF (SIN DUPLICAR NOTA)
// ════════════════════════════════════════════════════════════

export async function crearDespachoDesdeNotaAction(input: {
  notaId: number
  vehiculo_info?: string
  chofer?: string
}): Promise<ActionResult & { despacho_estado?: string; nota_referencia?: string }> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }
  if (isClienteEcommerce(user) || !can(user, 'despachos', 'puede_crear')) {
    return { success: false, error: 'No autorizado para crear despachos.' }
  }

  const supabase = await createClient()

  // 1. Leer cabecera de la nota + bodegas + tipo + estado
  const { data: notaRaw, error: notaErr } = await supabase
    .from('notas_inventario')
    .select(`
      id, numero_nota, fecha_nota, fecha_confirmacion, nota_referencia,
      bodega_origen_id, bodega_destino_id, activo,
      tipo:cat_tipos_movimiento!notas_inventario_tipo_movimiento_id_fkey ( codigo ),
      estado:cat_estados_nota!notas_inventario_estado_id_fkey ( codigo ),
      bodega_origen:bodegas!notas_inventario_bodega_origen_id_fkey ( id, es_virtual ),
      bodega_destino:bodegas!notas_inventario_bodega_destino_id_fkey ( id, es_virtual )
    `)
    .eq('id', input.notaId)
    .single()

  if (notaErr || !notaRaw) {
    return { success: false, error: 'No se encontró la nota.' }
  }

  const nota: any = notaRaw
  const tipoCod = String((Array.isArray(nota.tipo) ? nota.tipo[0] : nota.tipo)?.codigo ?? '').toUpperCase()
  const estadoCod = String((Array.isArray(nota.estado) ? nota.estado[0] : nota.estado)?.codigo ?? '').toUpperCase()
  const origen = Array.isArray(nota.bodega_origen) ? nota.bodega_origen[0] : nota.bodega_origen
  const destino = Array.isArray(nota.bodega_destino) ? nota.bodega_destino[0] : nota.bodega_destino

  if (nota.activo === false || estadoCod === 'CANC') {
    return { success: false, error: 'No se puede generar un despacho de una nota cancelada.' }
  }
  if (tipoCod !== 'TRF') {
    return { success: false, error: 'Solo se puede generar despacho desde notas de Traslado (TRF).' }
  }
  if (!origen?.es_virtual) {
    return { success: false, error: 'La bodega origen debe ser una bodega virtual.' }
  }
  if (!nota.bodega_destino_id || destino?.es_virtual) {
    return { success: false, error: 'La bodega destino debe ser una bodega física.' }
  }

  const { extractDespachoIdFromReferencia } = await import('./queries')
  const existenteId = extractDespachoIdFromReferencia(nota.nota_referencia)
  if (existenteId) {
    return { success: false, error: `Esta nota ya está vinculada al Despacho #${existenteId}.` }
  }

  // 2. Leer detalles de la nota
  const { data: detalles, error: detErr } = await supabase
    .from('nota_detalle_productos')
    .select('producto_id, caja_id, cajas')
    .eq('nota_id', input.notaId)
    .order('id')

  if (detErr || !detalles || detalles.length === 0) {
    return { success: false, error: 'La nota no tiene productos para despachar.' }
  }

  const yaConfirmada = estadoCod === 'CONF' || estadoCod === 'MODF'
  const estadoDespacho = yaConfirmada ? 'Recibido' : 'Programado'
  const fechaProgramada = nota.fecha_nota
    ? String(nota.fecha_nota).slice(0, 10)
    : new Date().toISOString().slice(0, 10)

  // 3. Crear despacho (solo registro logístico; la nota TRF ya existe)
  const { data: despachoData, error: despErr } = await supabase
    .from('despachos')
    .insert({
      bodega_origen_id: nota.bodega_origen_id,
      bodega_destino_id: nota.bodega_destino_id,
      vehiculo_info: input.vehiculo_info?.trim() || null,
      chofer: input.chofer?.trim() || null,
      estado: estadoDespacho,
      fecha_programada: fechaProgramada,
      fecha_recepcion: yaConfirmada ? (nota.fecha_confirmacion || new Date().toISOString()) : null,
    })
    .select('id')
    .single()

  if (despErr || !despachoData) {
    return { success: false, error: despErr?.message ?? 'Error al crear el despacho.' }
  }

  const despachoId = despachoData.id

  // 4. Copiar líneas de la nota a despachos_detalles
  const rowsDetalles = detalles
    .filter((d) => d.producto_id != null && Number(d.cajas ?? 0) > 0)
    .map((d) => ({
      despacho_id: despachoId,
      producto_id: d.producto_id,
      caja_id: d.caja_id ?? null,
      cantidad_cajas_solicitadas: Number(d.cajas ?? 0),
    }))

  if (rowsDetalles.length > 0) {
    const { error: insDetErr } = await supabase
      .from('despachos_detalles')
      .insert(rowsDetalles)

    if (insDetErr) {
      return { success: false, error: `Despacho #${despachoId} creado, pero fallaron sus detalles: ${insDetErr.message}` }
    }
  }

  // 5. Vincular nota sin perder la referencia OCR previa
  const refOriginal = (nota.nota_referencia ?? '').trim()
  const nuevaReferencia = refOriginal
    ? `Despacho ${despachoId} · ${refOriginal}`
    : `Despacho ${despachoId}`

  const { error: updRefErr } = await supabase
    .from('notas_inventario')
    .update({ nota_referencia: nuevaReferencia })
    .eq('id', input.notaId)

  if (updRefErr) {
    return { success: false, error: `Despacho #${despachoId} creado, pero no se pudo vincular la referencia en la nota: ${updRefErr.message}` }
  }

  revalidatePath('/despachos')
  revalidatePath(`/despachos/${despachoId}`)
  revalidatePath('/inventario/notas')
  revalidatePath(`/inventario/notas/${input.notaId}`)

  return {
    success: true,
    despacho_id: despachoId,
    despacho_estado: estadoDespacho,
    nota_referencia: nuevaReferencia,
    nota_id: input.notaId,
    numero_nota: nota.numero_nota,
  }
}

export async function sincronizarDespachoDesdeNotaAction(
  notaId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }
  if (isClienteEcommerce(user) || !can(user, 'despachos', 'puede_editar')) {
    return { success: false, error: 'No autorizado para sincronizar despachos.' }
  }

  const supabase = await createClient()
  const { data: nota } = await supabase
    .from('notas_inventario')
    .select('id, nota_referencia')
    .eq('id', notaId)
    .single()

  const { extractDespachoIdFromReferencia } = await import('./queries')
  const despachoId = extractDespachoIdFromReferencia(nota?.nota_referencia)
  if (!despachoId) {
    return { success: false, error: 'Esta nota no tiene un despacho vinculado.' }
  }

  const { data: detalles, error: detErr } = await supabase
    .from('nota_detalle_productos')
    .select('producto_id, caja_id, cajas')
    .eq('nota_id', notaId)
    .order('id')

  if (detErr || !detalles || detalles.length === 0) {
    return { success: false, error: 'La nota no tiene líneas para sincronizar.' }
  }

  await supabase.from('despachos_detalles').delete().eq('despacho_id', despachoId)

  const rows = detalles
    .filter((d) => d.producto_id != null && Number(d.cajas ?? 0) > 0)
    .map((d) => ({
      despacho_id: despachoId,
      producto_id: d.producto_id,
      caja_id: d.caja_id ?? null,
      cantidad_cajas_solicitadas: Number(d.cajas ?? 0),
    }))

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from('despachos_detalles').insert(rows)
    if (insErr) {
      return { success: false, error: insErr.message }
    }
  }

  revalidatePath(`/despachos/${despachoId}`)
  revalidatePath(`/inventario/notas/${notaId}`)
  return { success: true, despacho_id: despachoId }
}
