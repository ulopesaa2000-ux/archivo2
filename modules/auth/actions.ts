// modules/auth/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
  // Validación básica
  const cleanEmail = email?.trim().toLowerCase()

  if (!cleanEmail || !password) {
    return {
      success: false,
      error: 'Email y contraseña son obligatorios.',
    }
  }

  const supabase = await createClient()

  // 1. Intentar login con Supabase Auth
  let authData;
  let authError;
  
  try {
    const res = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })
    authData = res.data;
    authError = res.error;
  } catch (error: any) {
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
    return {
      success: false,
      error: 'No se pudo verificar tu identidad. Intenta de nuevo.',
    }
  }

  const { data: usuarioData, error: userError } = await supabase
    .from('usuarios')
    .select('id, activo, nombre_completo')
    .eq('auth_user_id', authData.user.id)
    .single()

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

  // 3. Todo bien → invalidar cache para que el layout cargue el usuario
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
