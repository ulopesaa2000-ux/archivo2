// modules/auth/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/lib/types/database.types'
import { buildPermissionMatrix } from '@/lib/auth/permissions'

/**
 * Resultado tipado de las acciones de auth.
 * success: true  → todo bien, el frontend puede redirigir
 * success: false → error con mensaje amigable para mostrar
 */
export type AuthResult = {
  success: boolean
  error?: string
}

/**
 * Inicia sesión con email y contraseña.
 * 
 * Flujo:
 *   1. Valida inputs
 *   2. Intenta signIn con Supabase Auth
 *   3. Verifica que el usuario exista en inv-tienda.usuarios
 *   4. Verifica que esté activo
 *   5. Si algo falla → cierra sesión de auth y retorna error
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  console.log('[Server] signIn llamado con email:', email)

  // Validación básica
  const cleanEmail = email?.trim().toLowerCase()

  if (!cleanEmail || !password) {
    console.log('[Server] Error: Email o password vacíos')
    return {
      success: false,
      error: 'Email y contraseña son obligatorios.',
    }
  }

  console.log('[Server] Creando cliente Supabase...')
  const supabase = await createClient()

  // 1. Intentar login con Supabase Auth
  let authData;
  let authError;
  
  try {
    console.log('[Server] Intentando signInWithPassword...')
    const res = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })
    authData = res.data;
    authError = res.error;
    console.log('[Server] Respuesta auth:', { success: !res.error, error: res.error?.message })
  } catch (error: any) {
    console.error('[Server] Error en signInWithPassword:', error)
    return {
      success: false,
      error: 'No se pudo conectar con el servidor de autenticación. Verifica tu conexión o intenta más tarde.',
    }
  }

  if (authError) {
    const mensajesAuth: Record<string, string> = {
      'Invalid login credentials': 'Email o contraseña incorrectos.',
      'Email not confirmed': 'Tu email no ha sido confirmado. Revisa tu bandeja.',
      'Too many requests': 'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
      'User not found': 'No existe una cuenta con ese email.',
    }

    return {
      success: false,
      error: mensajesAuth[authError.message] || 'Error al iniciar sesión. Intenta de nuevo.',
    }
  }

  // 2. Verificar que el usuario existe en inv-tienda.usuarios
  if (!authData?.user) {
    console.log('[Server] Error: No hay authData.user')
    return {
      success: false,
      error: 'No se pudo verificar tu identidad. Intenta de nuevo.',
    }
  }

  console.log('[Server] Verificando usuario en tabla usuarios...')
  const { data: usuarioData, error: userError } = await supabase
    .from('usuarios')
    .select('id, activo, nombre_completo')
    .eq('auth_user_id', authData.user.id)
    .single()

  console.log('[Server] Resultado query usuarios:', { found: !!usuarioData, error: userError?.message })
  const usuario = usuarioData as any;

  // No existe en la tabla usuarios
  if (userError || !usuario) {
    await supabase.auth.signOut()
    return {
      success: false,
      error: 'Tu cuenta no está registrada en el sistema. Contacta al administrador.',
    }
  }

  // Existe pero está inactivo
  if (!usuario.activo) {
    await supabase.auth.signOut()
    return {
      success: false,
      error: 'Tu cuenta está desactivada. Contacta al administrador.',
    }
  }

  // Sincronizar claims de forma asíncrona pero esperando para asegurar carga inicial
  await syncUserClaims(authData.user.id).catch((err) => {
    console.error('[Server] Error al sincronizar claims en signIn:', err)
  })

  // 3. Todo bien → invalidar cache para que el layout cargue el usuario
  console.log('[Server] Login exitoso! Invalidando cache...')
  revalidatePath('/', 'layout')

  return { success: true }
}

/**
 * Cierra sesión y redirige a login.
 * Se usa desde el botón de logout en el Header.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
}

import { redirect } from 'next/navigation';

/**
 * Server Action estructurado para usar con React 19 `useActionState`
 */
export async function loginAction(
  prevState: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTo = formData.get('redirectTo') as string || '/dashboard'

  if (!email || !password) {
    return { success: false, error: 'Email y contraseña son obligatorios.' }
  }

  const result = await signIn(email, password)
  
  if (!result.success) {
    return result;
  }
  
  // En Next.js, redirect() siempre debe tirarse DESPUÉS y fuera de los bloques catch que pueden tragar el error THE_REDIRECT
  redirect(redirectTo)
}

/**
 * Sincroniza el rol y los permisos del usuario de PostgreSQL a app_metadata de Supabase Auth.
 * Esto codifica los permisos directamente en el JWT firmado, logrando 0 DB hits en validación de páginas.
 */
export async function syncUserClaims(authUserId: string): Promise<boolean> {
  console.log('[syncUserClaims] Sincronizando claims para authUserId:', authUserId)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.warn('[syncUserClaims] No se encontró SUPABASE_SERVICE_ROLE_KEY. Omitiendo actualización de claims.')
    return false
  }

  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient<Database, 'inv-tienda'>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        db: { schema: 'inv-tienda' },
      }
    )

    // 1. Obtener usuario de inv-tienda.usuarios
    const { data: usuario, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('auth_user_id', authUserId)
      .eq('activo', true)
      .maybeSingle()

    if (userError || !usuario) {
      console.error('[syncUserClaims] Error al buscar usuario o inactivo:', userError)
      return false
    }

    // 2. Obtener rol
    const { data: rol, error: rolError } = await supabaseAdmin
      .from('roles')
      .select('*')
      .eq('id', usuario.rol_id)
      .maybeSingle()

    if (rolError || !rol) {
      console.error('[syncUserClaims] Error al buscar rol:', rolError)
      return false
    }

    // 3. Obtener permisos individuales de usuario_permisos
    const { data: permisos, error: permError } = await supabaseAdmin
      .from('usuario_permisos')
      .select('*')
      .eq('usuario_id', usuario.id)
      .maybeSingle()

    if (permError) {
      console.error('[syncUserClaims] Error al buscar permisos de usuario:', permError)
    }

    // 3.5 Obtener persona vinculada si existe
    const { data: persona } = await supabaseAdmin
      .from('personas')
      .select('id, tipo_entidad')
      .eq('usuario_id', usuario.id)
      .eq('activo', true)
      .maybeSingle()

    const { data: rolPermisos, error: rolPermisosError } = await supabaseAdmin
      .from('rol_permisos')
      .select('modulo, puede_leer, puede_crear, puede_editar, puede_eliminar')
      .eq('rol_id', usuario.rol_id)

    if (rolPermisosError) {
      console.error('[syncUserClaims] Error al buscar permisos del rol:', rolPermisosError)
    }

    const effectivePermissions = buildPermissionMatrix(rolPermisos ?? [])

    // 4. Armar el objeto de claims personalizado
    const claims = {
      version: 2,
      usuario_id: usuario.id,
      username: usuario.username,
      nombre_completo: usuario.nombre_completo,
      rol_id: usuario.rol_id,
      rol_nombre: rol.nombre,
      nivel_acceso: rol.nivel_acceso,
      rol_descripcion: rol.descripcion,
      permisos: permisos ? {
        es_super_admin: permisos.es_super_admin,
        puede_gestionar_compras_b2b: permisos.puede_gestionar_compras_b2b,
        puede_gestionar_contenedores: permisos.puede_gestionar_contenedores,
        puede_gestionar_ecommerce: permisos.puede_gestionar_ecommerce,
        puede_ver_inventario: permisos.puede_ver_inventario,
        puede_crear_notas_inventario: permisos.puede_crear_notas_inventario,
        puede_aprobar_notas_inventario: permisos.puede_aprobar_notas_inventario,
      } : null,
      persona_id: persona?.id || null,
      persona_tipo: persona?.tipo_entidad || null,
      permissions: {
        version: 2,
        modules: effectivePermissions,
      },
    }

    // 5. Actualizar app_metadata en Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authUserId,
      {
        app_metadata: {
          inv_tienda_claims: claims
        }
      }
    )

    if (updateError) {
      console.error('[syncUserClaims] Error al actualizar app_metadata:', updateError.message)
      return false
    }

    console.log(`[syncUserClaims] Claims sincronizados con éxito para: ${usuario.username}`)
    return true
  } catch (error) {
    console.error('[syncUserClaims] Error inesperado en sincronización:', error)
    return false
  }
}

/**
 * Server Action estructurado para registrar un nuevo usuario de ecommerce (Cliente Retail).
 */
export async function registerAction(
  prevState: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  console.log('[Server] registerAction llamado')
  const nombreCompleto = formData.get('nombre_completo') as string
  const email = formData.get('email') as string
  const telefono = formData.get('telefono') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm_password') as string
  const redirectTo = formData.get('redirectTo') as string || '/dashboard'

  if (!nombreCompleto || !email || !password || !confirmPassword) {
    return { success: false, error: 'Todos los campos excepto el teléfono son obligatorios.' }
  }

  if (password !== confirmPassword) {
    return { success: false, error: 'Las contraseñas no coinciden.' }
  }

  const cleanEmail = email.trim().toLowerCase()
  const cleanNombre = nombreCompleto.trim()
  const cleanTelefono = telefono?.trim() || null

  const supabase = await createClient()

  // 1. Intentar el registro en Supabase Auth con rol 'Cliente Ecomerce'
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        nombre_completo: cleanNombre,
        telefono: cleanTelefono,
        rol: 'Cliente Ecomerce',
      }
    }
  })

  if (authError) {
    console.error('[Register] Error en signUp:', authError.message)
    const mensajesAuth: Record<string, string> = {
      'User already registered': 'El correo electrónico ya está registrado.',
      'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
      'Signup requires a valid email': 'Ingresa un correo electrónico válido.',
    }
    return {
      success: false,
      error: mensajesAuth[authError.message] || authError.message || 'Error al crear la cuenta. Intenta de nuevo.',
    }
  }

  if (!authData?.user) {
    return { success: false, error: 'No se pudo crear la cuenta de usuario.' }
  }

  // Buscar el rol Cliente Ecomerce (id 19 o por nombre)
  const { data: rolCliente } = await supabase
    .from('roles')
    .select('id')
    .ilike('nombre', 'Cliente Ecomerce%')
    .limit(1)
    .maybeSingle()

  const clienteRolId = rolCliente?.id || 19

  // Esperar o asegurar registro en inv-tienda.usuarios
  let usuario = null
  for (let i = 0; i < 5; i++) {
    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('id, rol_id')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle()

    if (usuarioData) {
      usuario = usuarioData
      // Si el trigger le asignó otro rol por fallback, forzar rol de Cliente Ecomerce
      if (usuarioData.rol_id !== clienteRolId) {
        await supabase
          .from('usuarios')
          .update({ rol_id: clienteRolId, activo: true })
          .eq('id', usuarioData.id)
      }
      break
    }
    // Pequeño delay de 200ms
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  if (!usuario) {
    // Si el trigger de BD tardó o no corrió, crearlo directamente vía service role / client
    const { data: nuevoUsuario } = await supabase
      .from('usuarios')
      .insert({
        auth_user_id: authData.user.id,
        username: cleanEmail.split('@')[0],
        nombre_completo: cleanNombre,
        email: cleanEmail,
        telefono: cleanTelefono,
        rol_id: clienteRolId,
        tenant: 'inv-tienda',
        activo: true,
      })
      .select('id')
      .maybeSingle()

    usuario = nuevoUsuario
  }

  // 2. Crear o actualizar el registro en la tabla personas
  if (usuario?.id) {
    try {
      await supabase
        .from('personas')
        .upsert({
          tipo_entidad: 'Cliente Retail',
          nombre_completo: cleanNombre,
          email_contacto: cleanEmail,
          telefono_contacto: cleanTelefono,
          usuario_id: usuario.id,
          activo: true,
        }, { onConflict: 'usuario_id' })
    } catch (err) {
      console.error('[Register] Error al registrar persona:', err)
    }

    // Sincronizar claims para que tenga permisos en JWT de inmediato
    await syncUserClaims(authData.user.id).catch((err: unknown) => {
      console.error('[Register] Error al sincronizar claims:', err)
    })
  }

  // 3. Iniciar sesión automáticamente
  const loginResult = await signIn(cleanEmail, password)
  if (!loginResult.success) {
    return {
      success: true,
      error: 'Cuenta creada con éxito, pero debes iniciar sesión manualmente con tus datos.',
    }
  }

  // Clientes nuevos redirigen por defecto a la tienda "/" si el redirect era a /dashboard
  const targetRedirect = (!redirectTo || redirectTo === '/dashboard') ? '/' : redirectTo
  redirect(targetRedirect)
}

export type ProfileUpdateResult = {
  success: boolean
  error?: string
  message?: string
}

/**
 * Actualiza la información básica del usuario autenticado (nombre, username, teléfono).
 * Mantiene campos delicados (rol, auth_user_id, email, tenant) protegidos.
 */
export async function updatePerfilAction(
  prevState: ProfileUpdateResult,
  formData: FormData
): Promise<ProfileUpdateResult> {
  try {
    const nombreCompleto = formData.get('nombre_completo')?.toString()?.trim()
    const username = formData.get('username')?.toString()?.trim()
    const telefono = formData.get('telefono')?.toString()?.trim() || null

    if (!nombreCompleto || !username) {
      return {
        success: false,
        error: 'El nombre completo y nombre de usuario son obligatorios.',
      }
    }

    const supabase = await createClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return {
        success: false,
        error: 'No se encontró una sesión activa.',
      }
    }

    // 1. Verificar si el username ya existe en otro usuario distinto
    const { data: existingUser } = await supabase
      .from('usuarios')
      .select('id')
      .eq('username', username)
      .neq('auth_user_id', authUser.id)
      .maybeSingle()

    if (existingUser) {
      return {
        success: false,
        error: `El nombre de usuario "${username}" ya está en uso. Por favor elige otro.`,
      }
    }

    // 2. Actualizar registro en inv-tienda.usuarios
    const { data: updatedUser, error: updateError } = await supabase
      .from('usuarios')
      .update({
        nombre_completo: nombreCompleto,
        username,
        telefono,
      })
      .eq('auth_user_id', authUser.id)
      .select('id')
      .single()

    if (updateError) {
      console.error('[updatePerfilAction] Error al actualizar usuarios:', updateError)
      return {
        success: false,
        error: 'No se pudo guardar la información en la base de datos.',
      }
    }

    // 3. Sincronizar tabla personas si existe una persona vinculada
    if (updatedUser?.id) {
      await supabase
        .from('personas')
        .update({
          nombre_completo: nombreCompleto,
          telefono_contacto: telefono,
        })
        .eq('usuario_id', updatedUser.id)
    }

    // 4. Sincronizar claims en auth.users
    await syncUserClaims(authUser.id).catch((err) => {
      console.error('[updatePerfilAction] Error al sincronizar claims:', err)
    })

    revalidatePath('/perfil')
    revalidatePath('/dashboard')
    revalidatePath('/', 'layout')

    return {
      success: true,
      message: '¡Información de perfil actualizada con éxito!',
    }
  } catch (error) {
    console.error('[updatePerfilAction] Error inesperado:', error)
    return {
      success: false,
      error: 'Ocurrió un error inesperado al actualizar el perfil.',
    }
  }
}

