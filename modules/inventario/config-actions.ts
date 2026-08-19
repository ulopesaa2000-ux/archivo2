// modules/inventario/config-actions.ts
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/modules/auth/queries'
import { isSuperAdmin } from '@/lib/auth/permissions'
import type { ConfigInventarioUpdate, CriterioOrdenBodegas } from './config-types'

/**
 * Actualiza la configuración global del módulo de inventario.
 * Requiere nivel de acceso 1 (Super Admin) o 2 (Admin Operativo).
 */
export async function actualizarConfigInventarioAction(data: ConfigInventarioUpdate) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'No autorizado: Sesión no encontrada' }
    }

    const nivel = user.rol?.nivel_acceso ?? 99
    if (nivel > 2 && !isSuperAdmin(user)) {
      return { success: false, error: 'No cuentas con permisos para editar la configuración de inventario' }
    }

    const supabase = await createClient()

    const payload = {
      ...data,
      id: 1,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }

    const { error } = await supabase
      .from('config_inventario' as any)
      .upsert(payload, { onConflict: 'id' })

    if (error) {
      console.error('Error al actualizar config_inventario:', error)
      return { success: false, error: error.message }
    }

    revalidateTag('inventario-config', 'max')
    revalidatePath('/inventario/config')
    revalidatePath('/inventario/stock')
    revalidatePath('/inventario/notas')
    revalidatePath('/inventario/bodegas')
    revalidatePath('/inventario/bodegas/matriz')

    return { success: true }
  } catch (err: any) {
    console.error('Exception in actualizarConfigInventarioAction:', err)
    return { success: false, error: err.message || 'Error inesperado al guardar la configuración' }
  }
}

/**
 * Guarda el orden de aparición de bodegas y ciudades en reportes y matriz de existencias.
 */
export async function guardarOrdenBodegasAction(
  bodegaIds: number[],
  ciudades: string[],
  criterio: CriterioOrdenBodegas = 'por_ciudad',
  virtualesAlFinal: boolean = true
) {
  return actualizarConfigInventarioAction({
    orden_bodegas_ids: bodegaIds,
    orden_ciudades: ciudades,
    criterio_orden_bodegas: criterio,
    bodegas_virtuales_al_final: virtualesAlFinal,
  })
}

/**
 * Asignación / Revocación masiva de todas las bodegas de una ciudad para múltiples usuarios.
 */
export async function asignarCiudadMasivaAction(params: {
  ciudad: string
  usuarioIds: number[]
  permisos: {
    puede_consultar: boolean
    puede_crear_notas: boolean
    puede_confirmar_notas: boolean
    puede_transferir: boolean
  }
  accion: 'asignar' | 'revocar'
}) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'No autorizado' }
    }

    const nivel = user.rol?.nivel_acceso ?? 99
    if (nivel > 2 && !isSuperAdmin(user)) {
      return { success: false, error: 'Permisos insuficientes para asignar bodegas' }
    }

    const { ciudad, usuarioIds, permisos, accion } = params

    if (!usuarioIds || usuarioIds.length === 0) {
      return { success: false, error: 'Debes seleccionar al menos un usuario' }
    }

    const supabase = await createClient()

    // 1. Obtener todas las bodegas activas de la ciudad seleccionada
    let queryBodegas = supabase
      .from('bodegas')
      .select('id, nombre, ciudad, es_virtual')
      .eq('activa', true)

    if (ciudad === '__VIRTUALES__') {
      queryBodegas = queryBodegas.eq('es_virtual', true)
    } else if (ciudad === '__SIN_CIUDAD__') {
      queryBodegas = queryBodegas.is('ciudad', null).eq('es_virtual', false)
    } else {
      queryBodegas = queryBodegas.eq('ciudad', ciudad)
    }

    const { data: bodegasEnCiudad, error: errBodegas } = await queryBodegas

    if (errBodegas || !bodegasEnCiudad || bodegasEnCiudad.length === 0) {
      return { success: false, error: 'No se encontraron bodegas activas para la ciudad seleccionada' }
    }

    const bodegaIds = bodegasEnCiudad.map((b) => b.id)

    if (accion === 'revocar') {
      // Eliminar asignaciones existentes
      const { error: delErr } = await supabase
        .from('usuario_bodegas')
        .delete()
        .in('usuario_id', usuarioIds)
        .in('bodega_id', bodegaIds)

      if (delErr) {
        console.error('Error al revocar bodegas por ciudad:', delErr)
        return { success: false, error: delErr.message }
      }
    } else {
      // Asignar / Actualizar con permisos
      const rowsToUpsert: any[] = []
      for (const uId of usuarioIds) {
        for (const bId of bodegaIds) {
          rowsToUpsert.push({
            usuario_id: uId,
            bodega_id: bId,
            puede_consultar: permisos.puede_consultar,
            puede_crear_notas: permisos.puede_crear_notas,
            puede_confirmar_notas: permisos.puede_confirmar_notas,
            puede_transferir: permisos.puede_transferir,
          })
        }
      }

      const { error: upsertErr } = await supabase
        .from('usuario_bodegas')
        .upsert(rowsToUpsert, { onConflict: 'usuario_id,bodega_id' })

      if (upsertErr) {
        console.error('Error al asignar bodegas masivamente:', upsertErr)
        return { success: false, error: upsertErr.message }
      }
    }

    revalidatePath('/inventario/bodegas')
    revalidatePath('/inventario/bodegas/matriz')
    revalidatePath('/inventario/config')
    revalidatePath('/inventario/stock')

    return {
      success: true,
      mensaje: `${accion === 'asignar' ? 'Asignadas' : 'Revocadas'} ${bodegasEnCiudad.length} bodegas para ${usuarioIds.length} usuario(s).`,
    }
  } catch (err: any) {
    console.error('Exception in asignarCiudadMasivaAction:', err)
    return { success: false, error: err.message || 'Error en la asignación masiva' }
  }
}

/**
 * Guarda el permiso individual de Devolución (DEV) para una combinación usuario-bodega en config_inventario.
 */
export async function guardarPermisoDevolucionUsuarioBodegaAction(
  usuarioId: number,
  bodegaId: number,
  permitido: boolean
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'No autorizado' }
    }

    const nivel = user.rol?.nivel_acceso ?? 99
    if (nivel > 2 && !isSuperAdmin(user)) {
      return { success: false, error: 'Sin permisos suficientes' }
    }

    const supabase = await createClient()

    // Obtener config actual
    const { data: currentConfig } = await supabase
      .from('config_inventario' as any)
      .select('permisos_devolucion_usuario_bodega')
      .eq('id', 1)
      .maybeSingle()

    const currentMap = (currentConfig as any)?.permisos_devolucion_usuario_bodega || {}
    const key = `${usuarioId}_${bodegaId}`
    const updatedMap = {
      ...currentMap,
      [key]: permitido,
    }

    const { error } = await supabase
      .from('config_inventario' as any)
      .upsert({
        id: 1,
        permisos_devolucion_usuario_bodega: updatedMap,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      }, { onConflict: 'id' })

    if (error) {
      console.error('Error al guardar permiso de devolución:', error)
      return { success: false, error: error.message }
    }

    revalidateTag('inventario-config', 'max')
    revalidatePath('/inventario/config')
    revalidatePath('/inventario/bodegas/matriz')
    revalidatePath('/inventario/notas/nueva')

    return { success: true }
  } catch (err: any) {
    console.error('Exception in guardarPermisoDevolucionUsuarioBodegaAction:', err)
    return { success: false, error: err.message || 'Error al guardar permiso de devolución' }
  }
}
