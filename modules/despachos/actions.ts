// modules/despachos/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/queries'
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
