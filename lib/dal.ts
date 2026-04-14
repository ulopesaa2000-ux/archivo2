// lib/dal.ts
// Data Access Layer - Capa de acceso a datos para autenticación
// Documentación: https://nextjs.org/docs/app/guides/authentication

import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/modules/auth/queries'
import type { UsuarioConRol } from '@/lib/types/tables'

/**
 * Verifica la sesión del usuario.
 * Usa React.cache() para memoizar el resultado durante el render pass,
 * evitando múltiples llamadas a la base de datos.
 *
 * @returns {Promise<{isAuth: true, user: UsuarioConRol}>} - Si hay sesión válida
 * @throws {redirect} - Redirige a /login si no hay sesión
 *
 * @example
 * // En un Server Component o Server Action
 * const session = await verifySession()
 * // Ahora puedes usar session.user.nombre_completo, session.user.rol, etc.
 */
export const verifySession = cache(async (): Promise<{ isAuth: true; user: UsuarioConRol }> => {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return { isAuth: true, user }
})

/**
 * Verifica la sesión sin redirección automática.
 * Útil cuando quieres manejar el caso de no autenticado manualmente.
 *
 * @returns {Promise<{isAuth: boolean; user: UsuarioConRol | null}>}
 *
 * @example
 * const session = await verifySessionOptional()
 * if (!session.isAuth) {
 *   // Manejar caso no autenticado
 * }
 */
export const verifySessionOptional = cache(async (): Promise<{
  isAuth: boolean
  user: UsuarioConRol | null
}> => {
  const user = await getCurrentUser()

  if (!user) {
    return { isAuth: false, user: null }
  }

  return { isAuth: true, user }
})

/**
 * Verifica si el usuario tiene un rol específico o nivel de acceso.
 * Lanza redirect si no tiene permisos suficientes.
 *
 * @param minLevel - Nivel de acceso mínimo requerido (número más bajo = más permisos)
 * @throws {redirect} - Redirige si no tiene permisos
 *
 * @example
 * // Solo admins (nivel 1-5)
 * await verifyRole(5)
 */
export const verifyRole = cache(async (minLevel: number): Promise<{ isAuth: true; user: UsuarioConRol }> => {
  const session = await verifySession()
  const userLevel = session.user.rol?.nivel_acceso ?? 99

  if (userLevel > minLevel) {
    redirect('/dashboard')
  }

  return session
})

/**
 * Data Transfer Object (DTO) para el usuario.
 * Retorna solo los campos seguros, nunca datos sensibles.
 *
 * @returns {Promise<SafeUserDTO | null>}
 */
export type SafeUserDTO = {
  id: number
  nombre_completo: string | null
  email: string | null
  rol: {
    id: number
    nombre: string
    nivel_acceso: number
  } | null
}

export const getUserDTO = cache(async (): Promise<SafeUserDTO | null> => {
  const user = await getCurrentUser()

  if (!user) return null

  return {
    id: user.id,
    nombre_completo: user.nombre_completo,
    email: user.email,
    rol: user.rol
      ? {
          id: user.rol.id,
          nombre: user.rol.nombre,
          nivel_acceso: user.rol.nivel_acceso,
        }
      : null,
  }
})
