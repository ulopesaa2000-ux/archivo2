// modules/config/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ModuloPermiso, TipoPermiso } from './types'

type ActionResult = { success: boolean; error?: string }

/** Activa o desactiva un usuario */
export async function toggleUsuarioActivo(
  usuarioId: number,
  activo: boolean
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('usuarios')
    .update({ activo })
    .eq('id', usuarioId)

  if (error) {
    console.error('toggleUsuarioActivo error:', error.message)
    return { success: false, error: 'No se pudo actualizar el estado del usuario.' }
  }

  revalidatePath('/configuracion/usuarios')
  return { success: true }
}

/** Cambia el rol de un usuario — columna real: rol_id */
export async function cambiarRolUsuario(
  usuarioId: number,
  rolId: number
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('usuarios')
    .update({ rol_id: rolId } as any)
    .eq('id', usuarioId)

  if (error) {
    console.error('cambiarRolUsuario error:', error.message)
    return { success: false, error: 'No se pudo cambiar el rol del usuario.' }
  }

  revalidatePath('/configuracion/usuarios')
  return { success: true }
}

/**
 * Toggle de permiso en rol_permisos.
 * Columnas confirmadas por MCP: rol_id, puede_leer, puede_crear, puede_editar, puede_eliminar
 */
export async function toggleRolPermiso(
  rolId: number,
  modulo: ModuloPermiso,
  tipo: TipoPermiso,
  valor: boolean
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: existing, error: checkError } = await supabase
    .from('rol_permisos')
    .select('rol_id')
    .eq('rol_id', rolId)
    .eq('modulo', modulo)
    .maybeSingle()

  if (checkError) {
    console.error('toggleRolPermiso check error:', checkError.message)
    return { success: false, error: 'Error al verificar el permiso.' }
  }

  if (existing) {
    const { error } = await supabase
      .from('rol_permisos')
      .update({ [tipo]: valor } as any)
      .eq('rol_id', rolId)
      .eq('modulo', modulo)

    if (error) {
      console.error('toggleRolPermiso UPDATE error:', error.message)
      return { success: false, error: 'No se pudo actualizar el permiso.' }
    }
  } else {
    const { error } = await supabase
      .from('rol_permisos')
      .insert({
        rol_id:         rolId,
        modulo,
        puede_leer:     tipo === 'puede_leer'     ? valor : false,
        puede_crear:    tipo === 'puede_crear'     ? valor : false,
        puede_editar:   tipo === 'puede_editar'    ? valor : false,
        puede_eliminar: tipo === 'puede_eliminar'  ? valor : false,
      } as any)

    if (error) {
      console.error('toggleRolPermiso INSERT error:', error.message)
      return { success: false, error: 'No se pudo crear el permiso.' }
    }
  }

  revalidatePath('/configuracion/usuarios')
  revalidatePath('/configuracion/roles')
  return { success: true }
}

/**
 * Crea un nuevo rol y sus permisos iniciales
 */
export async function crearRolAction(
  nombre: string,
  descripcion: string,
  nivel_acceso: number,
  permisos: { modulo: ModuloPermiso; puede_leer: boolean; puede_crear: boolean; puede_editar: boolean; puede_eliminar: boolean }[]
): Promise<ActionResult> {
  const supabase = await createClient() as any

  // 1. Insertar el rol
  const { data: nuevoRol, error: rolError } = await supabase
    .from('roles')
    .insert({
      nombre,
      descripcion,
      nivel_acceso,
    })
    .select()
    .single()

  if (rolError) {
    console.error('crearRolAction error:', rolError.message)
    return { success: false, error: 'No se pudo crear el rol.' }
  }

  // 2. Insertar permisos
  if (permisos.length > 0) {
    const { error: permError } = await supabase
      .from('rol_permisos')
      .insert(
        permisos.map((p) => ({
          rol_id: nuevoRol.id,
          modulo: p.modulo,
          puede_leer: p.puede_leer,
          puede_crear: p.puede_crear,
          puede_editar: p.puede_editar,
          puede_eliminar: p.puede_eliminar,
        }))
      )

    if (permError) {
      console.error('crearRolAction permissions error:', permError.message)
      // No revertimos el rol por ahora, pero informamos el error
      return { success: false, error: 'Rol creado pero hubo un error al asignar permisos.' }
    }
  }

  revalidatePath('/configuracion/usuarios')
  return { success: true }
}

/**
 * Elimina un rol y sus permisos asociados
 */
export async function eliminarRolAction(rolId: number): Promise<ActionResult> {
  const supabase = await createClient()

  // 1. Borrar permisos
  const { error: permError } = await supabase
    .from('rol_permisos')
    .delete()
    .eq('rol_id', rolId)

  if (permError) {
    console.error('eliminarRolAction permissions error:', permError.message)
    return { success: false, error: 'No se pudo borrar los permisos del rol.' }
  }

  // 2. Borrar el rol
  const { error: rolError } = await supabase
    .from('roles')
    .delete()
    .eq('id', rolId)

  if (rolError) {
    console.error('eliminarRolAction error:', rolError.message)
    return { success: false, error: 'No se pudo borrar el rol. Asegúrate de que no haya usuarios asignados a él.' }
  }

  revalidatePath('/configuracion/usuarios')
  return { success: true }
}

export type { TipoPermiso }
