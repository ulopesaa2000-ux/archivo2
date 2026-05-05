// modules/config/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ModuloPermiso, PermisoModulo, TipoPermiso } from './types'

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
    .update({ rol_id: rolId })
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
    const updatePayload = { [tipo]: valor } as any
    const { error } = await supabase
      .from('rol_permisos')
      .update(updatePayload)
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
      })

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
  const supabase = await createClient()

  // 1. Insertar el rol
  const { data: nuevoRol, error: rolError } = await supabase
    .from('roles')
    .insert({
      nombre,
      descripcion,
      nivel_acceso,
    })
    .select('id')
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
      // Rollback compensatorio: evitar rol huérfano sin permisos.
      const { error: rollbackError } = await supabase
        .from('roles')
        .delete()
        .eq('id', nuevoRol.id)

      if (rollbackError) {
        console.error('crearRolAction rollback error:', rollbackError.message)
        return {
          success: false,
          error:
            'Falló la asignación de permisos y no se pudo revertir el rol creado. Se requiere revisión manual.',
        }
      }

      return { success: false, error: 'No se pudo crear el rol porque falló la asignación inicial de permisos.' }
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

/**
 * Cambia la contraseña de un usuario en auth.users
 * Requiere SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.
 */
export async function cambiarPasswordAction(
  usuarioId: number,
  nuevaPassword: string
): Promise<ActionResult> {
  const supabase = await createClient()

  // 1. Obtener el auth_user_id del usuario
  const { data: user, error: fetchError } = await supabase
    .from('usuarios')
    .select('auth_user_id')
    .eq('id', usuarioId)
    .single()

  if (fetchError || !user?.auth_user_id) {
    console.error('cambiarPasswordAction error:', fetchError?.message)
    return { success: false, error: 'Usuario no encontrado.' }
  }

  // 2. Usar cliente con Service Role para cambiar contraseña
  // Nota: Esto requiere que el cliente de Supabase tenga permisos de admin.
  // Como no hay un supabase.auth.admin sin Service Role, usaremos el cliente
  // con la variable de entorno SUPABASE_SERVICE_ROLE_KEY si existe.
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { success: false, error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor para realizar esta acción.' }
  }

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    user.auth_user_id,
    { password: nuevaPassword }
  )

  if (updateError) {
    console.error('cambiarPasswordAction update error:', updateError.message)
    return { success: false, error: 'No se pudo actualizar la contraseña en Auth.' }
  }

  return { success: true }
}

/**
 * Crea un nuevo usuario en auth.users y luego en inv-tienda.usuarios
 * Requiere SUPABASE_SERVICE_ROLE_KEY
 */
export async function crearUsuarioAction(payload: {
  nombreCompleto: string
  email: string
  password: string
  rolId: number
}): Promise<ActionResult> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { success: false, error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor para crear usuarios.' }
  }

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Crear en auth.users
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    console.error('crearUsuarioAction auth error:', authError?.message)
    return { success: false, error: authError?.message || 'Error al crear usuario en Auth.' }
  }

  // 2. Crear en inv-tienda.usuarios usando el cliente normal (ya validado por el context actual o el mismo admin)
  // Pero el trigger trg_auto_slug o un trigger after_insert_auth_user podría ya crearlo si existe. 
  // Verificaremos si existe, y si no, lo insertamos.
  const supabase = await createClient()
  
  // Asumimos que no hay trigger automático creando todo completo, lo insertamos/actualizamos.
  const { error: dbError } = await supabase
    .from('usuarios')
    .upsert({
      auth_user_id: authData.user.id,
      email: payload.email,
      nombre_completo: payload.nombreCompleto,
      rol_id: payload.rolId,
      activo: true,
      username: payload.email.split('@')[0], // default username
    }, { onConflict: 'auth_user_id' })

  if (dbError) {
    console.error('crearUsuarioAction db error:', dbError.message)
    // Rollback
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return { success: false, error: 'No se pudo crear el registro del usuario en la base de datos.' }
  }

  revalidatePath('/configuracion/usuarios')
  return { success: true }
}

/**
 * Sincroniza un usuario existente en la BD que no tiene auth_user_id
 * creándolo en auth.users y vinculando su UUID.
 */
export async function sincronizarUsuarioAction(payload: {
  usuarioId: number
  email: string
  password: string
}): Promise<ActionResult> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { success: false, error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY.' }
  }

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Crear en auth.users
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    console.error('sincronizarUsuarioAction auth error:', authError?.message)
    return { success: false, error: authError?.message || 'Error al crear usuario en Auth.' }
  }

  // 2. Actualizar en inv-tienda.usuarios
  const supabase = await createClient()
  const { error: updateError } = await supabase
    .from('usuarios')
    .update({ auth_user_id: authData.user.id })
    .eq('id', payload.usuarioId)

  if (updateError) {
    console.error('sincronizarUsuarioAction db error:', updateError.message)
    // Rollback
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return { success: false, error: 'No se pudo actualizar el registro del usuario.' }
  }

  revalidatePath('/configuracion/usuarios')
  return { success: true }
}
