// modules/config/tablas-soporte/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { TABLAS_SOPORTE_CONFIG, type TablaSoporteKey } from './types'

export type ActionResponse = {
  success: boolean
  message?: string
  error?: string
}

export async function createTablaSoporteRecordAction(
  tabla: TablaSoporteKey,
  formDataPayload: Record<string, any>
): Promise<ActionResponse> {
  try {
    const supabase = await createClient()

    // Clean payload: remove empty strings if column accepts null
    const cleanedPayload: Record<string, any> = {}
    for (const [key, val] of Object.entries(formDataPayload)) {
      if (val === '' || val === undefined) {
        cleanedPayload[key] = null
      } else {
        cleanedPayload[key] = val
      }
    }

    const { error } = await (supabase.from(tabla as any) as any)
      .insert(cleanedPayload)

    if (error) {
      console.error(`createTablaSoporteRecordAction (${tabla}) error:`, error)
      return { success: false, error: error.message || 'Error al crear el registro' }
    }

    revalidatePath('/configuracion/tablas-soporte')
    return {
      success: true,
      message: `Registro creado exitosamente en ${TABLAS_SOPORTE_CONFIG[tabla]?.label || tabla}`,
    }
  } catch (err: any) {
    console.error(`createTablaSoporteRecordAction exception:`, err)
    return { success: false, error: err.message || 'Error inesperado del servidor' }
  }
}

export async function updateTablaSoporteRecordAction(
  tabla: TablaSoporteKey,
  id: number,
  formDataPayload: Record<string, any>
): Promise<ActionResponse> {
  try {
    const supabase = await createClient()

    const cleanedPayload: Record<string, any> = {}
    for (const [key, val] of Object.entries(formDataPayload)) {
      if (val === '' || val === undefined) {
        cleanedPayload[key] = null
      } else {
        cleanedPayload[key] = val
      }
    }

    // Never mutate id column
    delete cleanedPayload.id

    const { error } = await (supabase.from(tabla as any) as any)
      .update(cleanedPayload)
      .eq('id', id)

    if (error) {
      console.error(`updateTablaSoporteRecordAction (${tabla}, ${id}) error:`, error)
      return { success: false, error: error.message || 'Error al actualizar el registro' }
    }

    revalidatePath('/configuracion/tablas-soporte')
    return {
      success: true,
      message: `Registro #${id} actualizado correctamente en ${TABLAS_SOPORTE_CONFIG[tabla]?.label || tabla}`,
    }
  } catch (err: any) {
    console.error(`updateTablaSoporteRecordAction exception:`, err)
    return { success: false, error: err.message || 'Error inesperado del servidor' }
  }
}

export async function toggleActiveTablaSoporteRecordAction(
  tabla: TablaSoporteKey,
  id: number,
  currentActive: boolean | null
): Promise<ActionResponse> {
  try {
    const supabase = await createClient()
    const newActiveState = !currentActive

    const { error } = await (supabase.from(tabla as any) as any)
      .update({ activo: newActiveState })
      .eq('id', id)

    if (error) {
      console.error(`toggleActiveTablaSoporteRecordAction (${tabla}, ${id}) error:`, error)
      return { success: false, error: error.message || 'Error al cambiar estado' }
    }

    revalidatePath('/configuracion/tablas-soporte')
    return {
      success: true,
      message: `Estado de registro #${id} cambiado a ${newActiveState ? 'Activo' : 'Inactivo'}`,
    }
  } catch (err: any) {
    console.error(`toggleActiveTablaSoporteRecordAction exception:`, err)
    return { success: false, error: err.message || 'Error inesperado del servidor' }
  }
}

export async function deleteTablaSoporteRecordAction(
  tabla: TablaSoporteKey,
  id: number
): Promise<ActionResponse> {
  try {
    const supabase = await createClient()

    const { error } = await (supabase.from(tabla as any) as any)
      .delete()
      .eq('id', id)

    if (error) {
      console.error(`deleteTablaSoporteRecordAction (${tabla}, ${id}) error:`, error)
      return { success: false, error: error.message || 'No se pudo eliminar el registro (puede tener llaves foráneas asociadas)' }
    }

    revalidatePath('/configuracion/tablas-soporte')
    return {
      success: true,
      message: `Registro #${id} eliminado correctamente de ${TABLAS_SOPORTE_CONFIG[tabla]?.label || tabla}`,
    }
  } catch (err: any) {
    console.error(`deleteTablaSoporteRecordAction exception:`, err)
    return { success: false, error: err.message || 'Error inesperado del servidor' }
  }
}
