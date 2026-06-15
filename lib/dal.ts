// lib/dal.ts
// Data Access Layer - Capa de acceso a datos para autenticación
// Documentación: https://nextjs.org/docs/app/guides/authentication

import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/modules/auth/queries'
import type { UsuarioConRol } from '@/lib/types/tables'
import {
  can,
  getEffectivePermissions,
  isSuperAdmin,
  type PermissionAction,
  type PermissionModule,
} from '@/lib/auth/permissions'
import { resolveCommercialScope } from '@/lib/auth/commercial-scope'
import type { CommercialScope } from '@/lib/types/tables'

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

  if (!isSuperAdmin(session.user) && userLevel > minLevel) {
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

/**
 * Verifica si el usuario tiene acceso a un módulo específico del panel de administración.
 * Si no tiene acceso, lo redirige al dashboard principal con un query param '?unauthorized=true'.
 *
 * @param modulo - El identificador del módulo a proteger.
 * @throws {redirect} - Redirige si el usuario no tiene permisos suficientes.
 */
const LEGACY_MODULE_GROUPS: Record<string, PermissionModule[]> = {
  configuracion: ['config_usuarios', 'config_roles', 'config_auditoria_productos', 'config_tablas'],
  inventario: ['inventario_stock', 'inventario_notas', 'inventario_bodegas'],
  'inventario-virtual': ['inventario_virtual'],
  'ordenes-b2b': ['b2b_ordenes', 'b2b_cajas'],
  contenedores: ['b2b_contenedores'],
  despachos: ['despachos'],
  ecommerce: ['ecommerce_catalogo', 'ecommerce_ordenes', 'ecommerce_config'],
}

export const verifyModuleAccess = cache(async (
  modulo: PermissionModule | keyof typeof LEGACY_MODULE_GROUPS
): Promise<{ isAuth: true; user: UsuarioConRol }> => {
  const session = await verifySession()
  const user = session.user

  const userLevel = user.rol?.nivel_acceso ?? 99

  // Si es un rol B2B/Proveedor restringido (nivel 4 o 5)
  if (userLevel === 4 || userLevel === 5) {
    const allowed = ['ordenes-b2b', 'contenedores', 'b2b_ordenes', 'b2b_cajas', 'b2b_contenedores']
    if (!allowed.includes(modulo as string)) {
      redirect('/dashboard?unauthorized=true')
    }
  }

  if (isSuperAdmin(user)) {
    return session
  }

  const modules = LEGACY_MODULE_GROUPS[modulo] ?? [modulo as PermissionModule]
  const hasAccess = modules.some((item) => can(user, item, 'puede_leer'))

  if (!hasAccess) {
    redirect('/dashboard?unauthorized=true')
  }

  return session
})

export const requirePermission = cache(async (
  modulo: PermissionModule,
  action: PermissionAction = 'puede_leer'
): Promise<{ isAuth: true; user: UsuarioConRol }> => {
  const session = await verifySession()

  if (!can(session.user, modulo, action)) {
    redirect('/unauthorized')
  }

  return session
})

export function getSessionPermissions(user: UsuarioConRol) {
  return getEffectivePermissions(user)
}

export const getCommercialScope = cache(async (): Promise<CommercialScope> => {
  const [user, supabase] = await Promise.all([
    getCurrentUser(),
    createClient(),
  ])

  return resolveCommercialScope(supabase, user)
})
