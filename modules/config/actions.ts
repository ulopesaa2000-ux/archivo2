// modules/config/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ModuloPermiso, PermisoModulo, TipoPermiso } from './types'
import { buildPermisosCompletos } from './types'
import { can, isSuperAdmin } from '@/lib/auth/permissions'
import { getCurrentUser } from '@/modules/auth/queries'
import type { Database } from '@/lib/types/database.types'

type ActionResult = { success: boolean; error?: string }

function isMissingCommercialTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { code?: string; message?: string }
  return maybeError.code === '42P01' || maybeError.code === 'PGRST205' || maybeError.message?.toLowerCase().includes('does not exist') === true
}

async function requireConfigPermission(action: 'puede_crear' | 'puede_editar' | 'puede_eliminar'): Promise<ActionResult | null> {
  const user = await getCurrentUser()
  if (!user || !can(user, 'config_usuarios', action)) {
    return { success: false, error: 'No tienes permisos para modificar usuarios o roles.' }
  }
  return null
}

async function requireSuperAdminAction(): Promise<ActionResult | null> {
  const user = await getCurrentUser()
  if (!isSuperAdmin(user)) {
    return { success: false, error: 'Solo Super Admin puede modificar roles y permisos.' }
  }
  return null
}

/** Activa o desactiva un usuario */
export async function toggleUsuarioActivo(
  usuarioId: number,
  activo: boolean
): Promise<ActionResult> {
  const denied = await requireConfigPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()

  // Obtener auth_user_id antes de cambiar
  const { data: userRow } = await supabase
    .from('usuarios')
    .select('auth_user_id')
    .eq('id', usuarioId)
    .single()

  const { error } = await supabase
    .from('usuarios')
    .update({ activo })
    .eq('id', usuarioId)

  if (error) {
    console.error('toggleUsuarioActivo error:', error.message)
    return { success: false, error: 'No se pudo actualizar el estado del usuario.' }
  }

  // Sincronizar claims para el usuario modificado
  if (userRow?.auth_user_id) {
    const { syncUserClaims } = await import('../auth/actions')
    await syncUserClaims(userRow.auth_user_id).catch(err => {
      console.error('[toggleUsuarioActivo] Error syncing claims:', err)
    })
  }

  revalidatePath('/configuracion/usuarios')
  return { success: true }
}

/** Cambia el rol de un usuario — columna real: rol_id */
export async function cambiarRolUsuario(
  usuarioId: number,
  rolId: number
): Promise<ActionResult> {
  const denied = await requireConfigPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()

  const { data: targetRole } = await supabase
    .from('roles')
    .select('nivel_acceso')
    .eq('id', rolId)
    .single()

  if ((targetRole?.nivel_acceso ?? 99) <= 1) {
    return { success: false, error: 'Super Admin no se puede asignar desde esta accion.' }
  }

  // Obtener auth_user_id antes de cambiar
  const { data: userRow } = await supabase
    .from('usuarios')
    .select('auth_user_id')
    .eq('id', usuarioId)
    .single()

  const { error } = await supabase
    .from('usuarios')
    .update({ rol_id: rolId })
    .eq('id', usuarioId)

  if (error) {
    console.error('cambiarRolUsuario error:', error.message)
    return { success: false, error: 'No se pudo cambiar el rol del usuario.' }
  }

  // Sincronizar claims para el usuario modificado
  if (userRow?.auth_user_id) {
    const { syncUserClaims } = await import('../auth/actions')
    await syncUserClaims(userRow.auth_user_id).catch(err => {
      console.error('[cambiarRolUsuario] Error syncing claims:', err)
    })
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
  const denied = await requireSuperAdminAction()
  if (denied) return denied

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

  // Sincronizar claims para todos los usuarios que tengan este rol y estén activos
  const { data: usersToSync } = await supabase
    .from('usuarios')
    .select('auth_user_id')
    .eq('rol_id', rolId)
    .eq('activo', true)

  if (usersToSync && usersToSync.length > 0) {
    const { syncUserClaims } = await import('../auth/actions')
    for (const u of usersToSync) {
      if (u.auth_user_id) {
        await syncUserClaims(u.auth_user_id).catch(err => {
          console.error('[toggleRolPermiso] Error syncing claims for user:', u.auth_user_id, err)
        })
      }
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
  const denied = await requireSuperAdminAction()
  if (denied) return denied

  const supabase = await createClient()
  const permisosCompletos = Object.values(buildPermisosCompletos(permisos))

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
  if (permisosCompletos.length > 0) {
    const { error: permError } = await supabase
      .from('rol_permisos')
      .insert(
        permisosCompletos.map((p) => ({
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
  const denied = await requireSuperAdminAction()
  if (denied) return denied

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
  const denied = await requireConfigPermission('puede_editar')
  if (denied) return denied

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
  const supabaseAdmin = createSupabaseClient<Database, 'inv-tienda'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'inv-tienda' },
    }
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
  const denied = await requireConfigPermission('puede_crear')
  if (denied) return denied

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { success: false, error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor para crear usuarios.' }
  }

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createSupabaseClient<Database, 'inv-tienda'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'inv-tienda' },
    }
  )

  const supabase = await createClient()
  const { data: role } = await supabase
    .from('roles')
    .select('nivel_acceso')
    .eq('id', payload.rolId)
    .single()

  if ((role?.nivel_acceso ?? 99) <= 1) {
    return { success: false, error: 'Super Admin no se puede asignar desde aqui.' }
  }

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

  // Sincronizar claims para el nuevo usuario
  const { syncUserClaims } = await import('../auth/actions')
  await syncUserClaims(authData.user.id).catch(err => {
    console.error('[crearUsuarioAction] Error syncing claims:', err)
  })

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
  const denied = await requireConfigPermission('puede_crear')
  if (denied) return denied

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { success: false, error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY.' }
  }

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createSupabaseClient<Database, 'inv-tienda'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'inv-tienda' },
    }
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

  // Sincronizar claims para el usuario sincronizado
  const { syncUserClaims } = await import('../auth/actions')
  await syncUserClaims(authData.user.id).catch(err => {
    console.error('[sincronizarUsuarioAction] Error syncing claims:', err)
  })

  revalidatePath('/configuracion/usuarios')
  return { success: true }
}

/**
 * Vincula o desvincula una persona comercial con un usuario del sistema.
 */
export async function vincularPersonaUsuarioAction(
  personaId: number,
  usuarioId: number | null
): Promise<ActionResult> {
  const denied = await requireConfigPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()

  if (usuarioId) {
    const { data: existente } = await supabase
      .from('personas')
      .select('id, nombre_completo')
      .eq('usuario_id', usuarioId)
      .neq('id', personaId)
      .maybeSingle()

    if (existente) {
      return { success: false, error: `El usuario ya está vinculado a la persona "${existente.nombre_completo}".` }
    }
  }

  const { data: personaPrev } = await supabase
    .from('personas')
    .select('usuario_id')
    .eq('id', personaId)
    .single()

  const { error } = await supabase
    .from('personas')
    .update({ usuario_id: usuarioId })
    .eq('id', personaId)

  if (error) {
    console.error('vincularPersonaUsuarioAction error:', error.message)
    return { success: false, error: 'No se pudo guardar la vinculación en la base de datos.' }
  }

  const { syncUserClaims } = await import('../auth/actions')
  
  if (personaPrev?.usuario_id) {
    const { data: uPrev } = await supabase.from('usuarios').select('auth_user_id').eq('id', personaPrev.usuario_id).single()
    if (uPrev?.auth_user_id) {
      await syncUserClaims(uPrev.auth_user_id).catch(() => {})
    }
  }

  if (usuarioId) {
    const { data: uNew } = await supabase.from('usuarios').select('auth_user_id').eq('id', usuarioId).single()
    if (uNew?.auth_user_id) {
      await syncUserClaims(uNew.auth_user_id).catch(() => {})
    }
  }

  revalidatePath('/configuracion/personas')
  revalidatePath('/configuracion/usuarios')
  return { success: true }
}

export async function guardarAsignacionesComercialesAction(
  usuarioId: number,
  personaIds: number[]
): Promise<ActionResult> {
  const denied = await requireConfigPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()
  const uniquePersonaIds = Array.from(new Set(personaIds.filter((id) => Number.isInteger(id) && id > 0)))

  const { data: personaInterna } = await supabase
    .from('personas')
    .select('id, tipo_entidad')
    .eq('usuario_id', usuarioId)
    .maybeSingle()

  if (personaInterna && !['Empleado', 'Administrador'].includes(personaInterna.tipo_entidad ?? '')) {
    return { success: false, error: 'Solo empleados o administradores pueden recibir asignaciones comerciales.' }
  }

  if (uniquePersonaIds.length > 0) {
    const { data: personasDestino, error: personasError } = await supabase
      .from('personas')
      .select('id, tipo_entidad')
      .in('id', uniquePersonaIds)

    if (personasError) {
      return { success: false, error: 'No se pudieron validar las personas asignadas.' }
    }

    const invalidas = (personasDestino ?? []).filter((persona) => !['Cliente B2B', 'Proveedor'].includes(persona.tipo_entidad ?? ''))
    if (invalidas.length > 0) {
      return { success: false, error: 'Las asignaciones comerciales solo aceptan clientes B2B o proveedores.' }
    }
  }

  const { error: deleteError } = await ((supabase as any).from('usuario_personas') as any)
    .delete()
    .eq('usuario_id', usuarioId)

  if (deleteError) {
    if (isMissingCommercialTable(deleteError)) {
      return { success: false, error: 'La tabla usuario_personas aun no existe en Supabase. Falta aprobar y crear la estructura aditiva.' }
    }
    return { success: false, error: 'No se pudieron limpiar las asignaciones actuales.' }
  }

  if (uniquePersonaIds.length > 0) {
    const { error: insertError } = await ((supabase as any).from('usuario_personas') as any)
      .insert(
        uniquePersonaIds.map((personaId) => ({
          usuario_id: usuarioId,
          persona_id: personaId,
          rol_asignacion: 'Intermediario Comercial',
        }))
      )

    if (insertError) {
      if (isMissingCommercialTable(insertError)) {
        return { success: false, error: 'La tabla usuario_personas aun no existe en Supabase. Falta aprobar y crear la estructura aditiva.' }
      }
      return { success: false, error: 'No se pudieron guardar las asignaciones comerciales.' }
    }
  }

  revalidatePath('/configuracion/personas')
  revalidatePath('/ordenes-b2b')
  revalidatePath('/contenedores')
  return { success: true }
}

/**
 * Envía una invitación de Supabase Auth por email para un cliente o proveedor,
 * creando su registro de usuario y vinculándolo de manera automática.
 */
export async function invitarPersonaAction(payload: {
  personaId: number
  email: string
  rolId: number
}): Promise<ActionResult> {
  const denied = await requireConfigPermission('puede_crear')
  if (denied) return denied

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { success: false, error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.' }
  }

  const supabase = await createClient()

  const { data: persona } = await supabase
    .from('personas')
    .select('*')
    .eq('id', payload.personaId)
    .single()

  if (!persona) {
    return { success: false, error: 'La persona comercial no fue encontrada.' }
  }

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createSupabaseClient<Database, 'inv-tienda'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'inv-tienda' },
    }
  )

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    payload.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login`,
    }
  )

  if (authError || !authData.user) {
    console.error('invitarPersonaAction invite error:', authError)
    return { success: false, error: authError?.message || 'Error al enviar la invitación por correo.' }
  }

  const { data: nuevoUsuario, error: dbError } = await supabaseAdmin
    .from('usuarios')
    .insert({
      auth_user_id: authData.user.id,
      email: payload.email,
      nombre_completo: persona.nombre_completo,
      rol_id: payload.rolId,
      activo: true,
      username: payload.email.split('@')[0],
      tenant: 'inv-tienda',
    })
    .select('id')
    .single()

  if (dbError) {
    console.error('invitarPersonaAction db error:', dbError.message)
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return { success: false, error: 'Se envió la invitación pero no se pudo crear el usuario en el sistema.' }
  }

  const { error: linkError } = await supabase
    .from('personas')
    .update({
      usuario_id: nuevoUsuario.id,
      email_contacto: payload.email,
    })
    .eq('id', payload.personaId)

  if (linkError) {
    console.error('invitarPersonaAction link error:', linkError.message)
  }

  const { syncUserClaims } = await import('../auth/actions')
  await syncUserClaims(authData.user.id).catch(() => {})

  revalidatePath('/configuracion/personas')
  revalidatePath('/configuracion/usuarios')
  return { success: true }
}

/**
 * Guarda las asignaciones comerciales (clientes B2B y proveedores) para un empleado/intermediario.
 * Sincroniza automáticamente los JWT Claims en Supabase Auth de forma inmediata.
 */
export async function guardarAsignacionesUsuarioAction(
  usuarioId: number,
  personaIds: number[]
): Promise<ActionResult> {
  const denied = await requireConfigPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()

  // 1. Obtener el UUID del usuario destino para la sincronización de claims posterior
  const { data: userRow } = await supabase
    .from('usuarios')
    .select('auth_user_id')
    .eq('id', usuarioId)
    .single()

  if (!userRow || !userRow.auth_user_id) {
    return { success: false, error: 'Usuario no encontrado o no tiene cuenta vinculada.' }
  }

  const authUserId = userRow.auth_user_id

  // 2. Eliminar asignaciones previas filtrando por el ID de usuario numérico entero
  const { error: deleteError } = await (supabase.from('usuario_personas' as any) as any)
    .delete()
    .eq('usuario_id', usuarioId)

  if (deleteError) {
    console.error('[guardarAsignacionesUsuarioAction] delete error:', deleteError.message)
    return { success: false, error: 'No se pudieron limpiar las asignaciones anteriores.' }
  }

  // 3. Insertar las nuevas asignaciones usando el ID de usuario numérico entero
  if (personaIds.length > 0) {
    const payload = personaIds.map(pId => ({
      usuario_id: usuarioId,
      persona_id: pId
    }))

    const { error: insertError } = await (supabase.from('usuario_personas' as any) as any)
      .insert(payload)

    if (insertError) {
      console.error('[guardarAsignacionesUsuarioAction] insert error:', insertError.message)
      return { success: false, error: 'No se pudieron guardar las nuevas asignaciones.' }
    }
  }

  // 4. Sincronizar claims para el usuario usando su UUID de autenticación
  const { syncUserClaims } = await import('../auth/actions')
  await syncUserClaims(authUserId).catch(err => {
    console.error('[guardarAsignacionesUsuarioAction] Error al sincronizar claims:', err)
  })

  revalidatePath('/configuracion/usuarios')
  return { success: true }
}

