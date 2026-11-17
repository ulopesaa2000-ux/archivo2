// modules/config/tablas-soporte/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/queries'
import { canWithFallback, isClienteEcommerce, type PermissionAction } from '@/lib/auth/permissions'
import { TABLAS_SOPORTE_CONFIG, type TablaSoporteKey } from './types'

export type ActionResponse = {
  success: boolean
  message?: string
  error?: string
}

async function authorizeTablaSoporte(
  tabla: TablaSoporteKey,
  action: PermissionAction
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Object.prototype.hasOwnProperty.call(TABLAS_SOPORTE_CONFIG, tabla)) {
    return { ok: false, error: 'Tabla de soporte no permitida.' }
  }
  const user = await getCurrentUser()
  if (!user || isClienteEcommerce(user) || !canWithFallback(user, 'config_tablas_soporte', action)) {
    return { ok: false, error: 'No autorizado para modificar tablas de soporte.' }
  }
  return { ok: true }
}

export async function createTablaSoporteRecordAction(
  tabla: TablaSoporteKey,
  formDataPayload: Record<string, any>
): Promise<ActionResponse> {
  try {
    const auth = await authorizeTablaSoporte(tabla, 'puede_crear')
    if (!auth.ok) return { success: false, error: auth.error }

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
    // Invalida catálogos cacheados (marcas, géneros, prendas, edades, telas) al momento.
    revalidateTag('catalogo-filtros', 'max')
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
    const auth = await authorizeTablaSoporte(tabla, 'puede_editar')
    if (!auth.ok) return { success: false, error: auth.error }

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
    // Invalida catálogos cacheados (marcas, géneros, prendas, edades, telas) al momento.
    revalidateTag('catalogo-filtros', 'max')
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
    const auth = await authorizeTablaSoporte(tabla, 'puede_editar')
    if (!auth.ok) return { success: false, error: auth.error }

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
    // Invalida catálogos cacheados (marcas, géneros, prendas, edades, telas) al momento.
    revalidateTag('catalogo-filtros', 'max')
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
    const auth = await authorizeTablaSoporte(tabla, 'puede_eliminar')
    if (!auth.ok) return { success: false, error: auth.error }

    const supabase = await createClient()

    const { error } = await (supabase.from(tabla as any) as any)
      .delete()
      .eq('id', id)

    if (error) {
      console.error(`deleteTablaSoporteRecordAction (${tabla}, ${id}) error:`, error)
      return { success: false, error: error.message || 'No se pudo eliminar el registro (puede tener llaves foráneas asociadas)' }
    }

    revalidatePath('/configuracion/tablas-soporte')
    // Invalida catálogos cacheados (marcas, géneros, prendas, edades, telas) al momento.
    revalidateTag('catalogo-filtros', 'max')
    return {
      success: true,
      message: `Registro #${id} eliminado correctamente de ${TABLAS_SOPORTE_CONFIG[tabla]?.label || tabla}`,
    }
  } catch (err: any) {
    console.error(`deleteTablaSoporteRecordAction exception:`, err)
    return { success: false, error: err.message || 'Error inesperado del servidor' }
  }
}
