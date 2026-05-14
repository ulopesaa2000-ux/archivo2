// modules/despachos/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/queries'
import type { DespachoFormData } from './types'

export type ActionResult = {
  success: boolean
  error?: string
  despacho_id?: number
}

// ════════════════════════════════════════════════════════════
// CREAR DESPACHO + NOTA SALIDA (virtual) + NOTA ENTRADA (física)
// ════════════════════════════════════════════════════════════

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

  // Obtener tipo de movimiento SAL (Salida) y ENT (Entrada)
  const { data: tipoSal } = await supabase
    .from('cat_tipos_movimiento')
    .select('id')
    .eq('codigo', 'SAL')
    .single()
  const { data: tipoEnt } = await supabase
    .from('cat_tipos_movimiento')
    .select('id')
    .eq('codigo', 'ENT')
    .single()

  if (!tipoSal || !tipoEnt) {
    return { success: false, error: 'No se encontraron los tipos de movimiento SAL o ENT.' }
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

  // ── 3. Crear nota SALIDA en bodega virtual (CONF automática) ──
  const { data: notaSalData, error: notaSalError } = await supabase.rpc('sp_crear_nota', {
    p_tipo_movimiento_id: tipoSal.id,
    p_bodega_origen_id: data.bodega_origen_id,
    p_bodega_destino_id: data.bodega_destino_id,
    p_usuario_id: user.id,
    p_nota_referencia: `Despacho ${despachoId}`,
    p_observaciones: `Despacho desde bodega virtual a física. Despacho ID: ${despachoId}`,
  }) as { data: any; error: any }

  if (notaSalError) {
    return { success: false, error: `Error al crear nota de salida: ${notaSalError.message}` }
  }

  const notaSalResult = Array.isArray(notaSalData) ? notaSalData[0] : notaSalData
  const notaSalId = notaSalResult?.nota_id

  // Agregar productos a nota SAL con cantidades negativas (salida)
  // Espera... sp_agregar_producto_nota usa cajas como cantidad positiva
  // pero como es SAL, el trigger fn_procesar_nota_inventario ya maneja la lógica
  // del tipo de movimiento. Entonces pasamos cajas positivas.
  for (const prod of data.productos) {
    const { error: prodError } = await supabase.rpc('sp_agregar_producto_nota', {
      p_nota_id: notaSalId,
      p_cajas: prod.cantidad_cajas,
      p_producto_id: prod.producto_id,
      p_variante_id: undefined,
      p_piezas_sueltas: 0,
      p_caja_id: prod.caja_id || undefined,
    })
    if (prodError) {
      return { success: false, error: `Error en nota de salida: ${prodError.message}` }
    }
  }

  // Confirmar nota SAL inmediatamente (para descargar stock virtual)
  const { data: estadoConf } = await supabase
    .from('cat_estados_nota')
    .select('id')
    .eq('codigo', 'CONF')
    .single()

  if (estadoConf) {
    await supabase
      .from('notas_inventario')
      .update({ estado_id: estadoConf.id })
      .eq('id', notaSalId)
  }

  // ── 4. Crear nota ENTRADA en bodega física (PEND) ─────────
  const { data: notaEntData, error: notaEntError } = await supabase.rpc('sp_crear_nota', {
    p_tipo_movimiento_id: tipoEnt.id,
    p_bodega_origen_id: data.bodega_destino_id,
    p_bodega_destino_id: null as any,
    p_usuario_id: user.id,
    p_nota_referencia: `Despacho ${despachoId}`,
    p_observaciones: `Recepción pendiente del despacho ${despachoId}. Confirmar al recibir físicamente.`,
  }) as { data: any; error: any }

  if (notaEntError) {
    return { success: false, error: `Error al crear nota de entrada: ${notaEntError.message}` }
  }

  const notaEntResult = Array.isArray(notaEntData) ? notaEntData[0] : notaEntData
  const notaEntId = notaEntResult?.nota_id

  for (const prod of data.productos) {
    const { error: prodError } = await supabase.rpc('sp_agregar_producto_nota', {
      p_nota_id: notaEntId,
      p_cajas: prod.cantidad_cajas,
      p_producto_id: prod.producto_id,
      p_variante_id: undefined,
      p_piezas_sueltas: 0,
      p_caja_id: prod.caja_id || undefined,
    })
    if (prodError) {
      return { success: false, error: `Error en nota de entrada: ${prodError.message}` }
    }
  }

  // Nota ENT queda en PEND hasta que se reciba físicamente en bodega

  revalidatePath('/despachos')
  revalidatePath('/inventario/notas')
  revalidatePath('/inventario/stock')

  return { success: true, despacho_id: despachoId }
}

// ════════════════════════════════════════════════════════════
// CONFIRMAR SALIDA (cambiar estado a "En Tránsito")
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
// RECIBIR EN BODEGA FÍSICA (confirmar nota ENT)
// ════════════════════════════════════════════════════════════

export async function recibirDespachoAction(
  despachoId: number,
  cantidadesRecibidas: Record<number, number> // detalle_id -> cantidad_recibida
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  // 1. Actualizar cantidades recibidas en detalles
  for (const [detalleId, cantidad] of Object.entries(cantidadesRecibidas)) {
    const { error } = await supabase
      .from('despachos_detalles')
      .update({ cantidad_cajas_recibidas: cantidad })
      .eq('id', parseInt(detalleId))

    if (error) {
      return { success: false, error: `Error al actualizar detalle: ${error.message}` }
    }
  }

  // 2. Cambiar estado del despacho
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

  // 3. Buscar y confirmar la nota de entrada asociada
  const { data: notaEnt } = await supabase
    .from('notas_inventario')
    .select('id')
    .ilike('nota_referencia', `Despacho ${despachoId}`)
    .eq('tipo_movimiento_id', 1) // ENT
    .eq('estado_id', 1) // PEND
    .single()

  if (notaEnt) {
    const { data: estadoConf } = await supabase
      .from('cat_estados_nota')
      .select('id')
      .eq('codigo', 'CONF')
      .single()

    if (estadoConf) {
      const { error: confError } = await supabase
        .from('notas_inventario')
        .update({ estado_id: estadoConf.id })
        .eq('id', notaEnt.id)

      if (confError) {
        // No es crítico que falle, se puede confirmar manualmente
        console.error('Error confirmando nota entrada:', confError)
      }
    }
  }

  revalidatePath(`/despachos/${despachoId}`)
  revalidatePath('/despachos')
  revalidatePath('/inventario/notas')
  revalidatePath('/inventario/stock')

  return { success: true }
}

// ════════════════════════════════════════════════════════════
// CANCELAR DESPACHO
// ════════════════════════════════════════════════════════════

export async function cancelarDespachoAction(
  despachoId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('despachos')
    .update({ estado: 'Cancelado' })
    .eq('id', despachoId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/despachos/${despachoId}`)
  revalidatePath('/despachos')
  return { success: true }
}
