// modules/config/inventory-reset-actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/queries'

export type ResetResult = {
  success: boolean
  error?: string
  message?: string
}

/**
 * Reinicia las notas de inventario marcando activo = false.
 * Puede aplicarse a todas las bodegas (bodegaId = undefined | 0)
 * o a una bodega específica (bodega_origen_id = bodegaId OR bodega_destino_id = bodegaId).
 * Hace que los listados de notas e historial aparezcan aparentemente vacíos
 * sin eliminar registros físicos ni violar llaves foráneas con nota_detalles.
 */
export async function resetNotasAction(bodegaId?: number): Promise<ResetResult> {
  const user = await getCurrentUser()
  if (!user || user.rol?.nivel_acceso !== 1) {
    return {
      success: false,
      error: 'Acceso Denegado: Esta acción está reservada exclusivamente para la Administración General (Super Admin Nivel 1).',
    }
  }

  const supabase = await createClient()

  if (bodegaId && bodegaId > 0) {
    // 1. Obtener datos de la bodega para mensaje de confirmación
    const { data: bodega } = await supabase
      .from('bodegas')
      .select('id, nombre')
      .eq('id', bodegaId)
      .single()

    const bodegaNombre = bodega?.nombre || `Bodega #${bodegaId}`

    // 2. Ocultar notas asociadas a la bodega (origen o destino)
    const { error } = await supabase
      .from('notas_inventario')
      .update({ activo: false } as any)
      .or(`bodega_origen_id.eq.${bodegaId},bodega_destino_id.eq.${bodegaId}`)

    if (error) {
      console.error(`Error al ocultar notas de la bodega ${bodegaId}:`, error)
      return { success: false, error: `Error al ocultar notas de ${bodegaNombre}: ${error.message}` }
    }

    revalidatePath('/inventario/notas')
    revalidatePath('/configuracion/inventario')

    return {
      success: true,
      message: `Se han ocultado las notas de inventario asociadas a la bodega '${bodegaNombre}' (ID: ${bodegaId}) exitosamente.`,
    }
  }

  // Si no se especifica bodegaId (o es 0), se desactivan TODAS las notas de inventario
  const { error } = await supabase
    .from('notas_inventario')
    .update({ activo: false } as any)
    .not('id', 'is', null)

  if (error) {
    console.error('Error al ocultar notas de inventario:', error)
    return { success: false, error: `Error al ocultar notas: ${error.message}` }
  }

  revalidatePath('/inventario/notas')
  revalidatePath('/configuracion/inventario')

  return {
    success: true,
    message: 'Se han ocultado todas las notas de inventario del sistema exitosamente. El listado de notas aparece ahora vacío.',
  }
}

/**
 * Reinicia las existencias de inventario poniendo cajas = 0 y piezas_sueltas = 0
 * para todos los registros de inventario en todas las bodegas.
 */
export async function resetStockCeroAction(): Promise<ResetResult> {
  const user = await getCurrentUser()
  if (!user || user.rol?.nivel_acceso !== 1) {
    return {
      success: false,
      error: 'Acceso Denegado: Esta acción está reservada exclusivamente para la Administración General (Super Admin Nivel 1).',
    }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('inventario_stock')
    .update({ cajas: 0, piezas_sueltas: 0 } as any)
    .not('id', 'is', null)

  if (error) {
    console.error('Error al reiniciar stock a 0:', error)
    return { success: false, error: `Error al reiniciar stock: ${error.message}` }
  }

  revalidatePath('/inventario/stock')
  revalidatePath('/configuracion/inventario')

  return {
    success: true,
    message: 'Se ha reiniciado el stock a 0 en todas las bodegas exitosamente.',
  }
}

/**
 * Ejecuta el reinicio completo del inventario:
 * 1. Oculta el historial de notas (activo = false).
 * 2. Pone las existencias de stock a 0 en todas las bodegas.
 */
export async function resetCompletoInventarioAction(): Promise<ResetResult> {
  const user = await getCurrentUser()
  if (!user || user.rol?.nivel_acceso !== 1) {
    return {
      success: false,
      error: 'Acceso Denegado: Esta acción está reservada exclusivamente para la Administración General (Super Admin Nivel 1).',
    }
  }

  const supabase = await createClient()

  // 1. Ocultar notas de inventario
  const { error: errorNotas } = await supabase
    .from('notas_inventario')
    .update({ activo: false } as any)
    .not('id', 'is', null)

  if (errorNotas) {
    console.error('Error ocultando notas:', errorNotas)
    return { success: false, error: `Error ocultando notas: ${errorNotas.message}` }
  }

  // 2. Reiniciar stock a 0 en todas las bodegas
  const { error: errorStock } = await supabase
    .from('inventario_stock')
    .update({ cajas: 0, piezas_sueltas: 0 } as any)
    .not('id', 'is', null)

  if (errorStock) {
    console.error('Error al poner stock en 0:', errorStock)
    return { success: false, error: `Error poniendo stock a 0: ${errorStock.message}` }
  }

  revalidatePath('/inventario/notas')
  revalidatePath('/inventario/stock')
  revalidatePath('/configuracion/inventario')

  return {
    success: true,
    message: '¡Reinicio Total completado! Todas las notas se han ocultado y el stock se ha puesto a 0 en todas las bodegas.',
  }
}

/**
 * Reinicia las existencias de inventario poniendo cajas = 0 y piezas_sueltas = 0
 * únicamente para una bodega específica (WHERE bodega_id = bodegaId).
 */
export async function resetStockCeroBodegaAction(bodegaId: number): Promise<ResetResult> {
  const user = await getCurrentUser()
  if (!user || user.rol?.nivel_acceso !== 1) {
    return {
      success: false,
      error: 'Acceso Denegado: Esta acción está reservada exclusivamente para la Administración General (Super Admin Nivel 1).',
    }
  }

  if (!bodegaId || isNaN(bodegaId)) {
    return { success: false, error: 'ID de bodega no válido.' }
  }

  const supabase = await createClient()

  // 1. Obtener nombre de la bodega para mensaje descriptivo
  const { data: bodega } = await supabase
    .from('bodegas')
    .select('id, nombre')
    .eq('id', bodegaId)
    .single()

  const bodegaNombre = bodega?.nombre || `Bodega #${bodegaId}`

  // 2. Actualizar inventario_stock solo para esta bodega
  const { error } = await supabase
    .from('inventario_stock')
    .update({ cajas: 0, piezas_sueltas: 0 } as any)
    .eq('bodega_id', bodegaId)

  if (error) {
    console.error(`Error al reiniciar stock a 0 para bodega ${bodegaId}:`, error)
    return { success: false, error: `Error al reiniciar stock de ${bodegaNombre}: ${error.message}` }
  }

  revalidatePath('/inventario/stock')
  revalidatePath('/configuracion/inventario')

  return {
    success: true,
    message: `Se ha reiniciado el stock a 0 en la bodega '${bodegaNombre}' (ID: ${bodegaId}) exitosamente.`,
  }
}
