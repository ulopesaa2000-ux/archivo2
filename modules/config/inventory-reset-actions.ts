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
 * Hace que los listados de notas e historial aparezcan aparentemente vacíos
 * sin eliminar registros físicos ni violar llaves foráneas.
 */
export async function resetNotasAction(): Promise<ResetResult> {
  const user = await getCurrentUser()
  if (!user || user.rol?.nivel_acceso !== 1) {
    return {
      success: false,
      error: 'Acceso Denegado: Esta acción está reservada exclusivamente para la Administración General (Super Admin Nivel 1).',
    }
  }

  const supabase = await createClient()

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
    message: 'Se han ocultado las notas de inventario exitosamente. El listado de notas aparece ahora vacío.',
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
