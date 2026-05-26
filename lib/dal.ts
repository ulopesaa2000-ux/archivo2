// lib/dal.ts
// Data Access Layer - Capa de acceso a datos para autenticación
// Documentación: https://nextjs.org/docs/app/guides/authentication

import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/modules/auth/queries'
import type { UsuarioConRol } from '@/lib/types/tables'
import {
  can,
  getEffectivePermissions,
  isSuperAdmin,
  type PermissionAction,
  type PermissionModule,
} from '@/lib/auth/permissions'

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

/**
 * Obtiene el alcance comercial (CommercialScope) de un usuario.
 * Resuelve y memoiza qué Clientes B2B y Proveedores tiene permitido ver o gestionar.
 *
 * @param user - El usuario autenticado
 * @returns {Promise<CommercialScope>}
 */
import { createClient } from '@/lib/supabase/server'
import type { CommercialScope, PersonaAsignadaComercial } from '@/lib/types/tables'

export const getCommercialScope = cache(async (user: UsuarioConRol): Promise<CommercialScope> => {
  const level = user.rol?.nivel_acceso ?? 99

  // Caso 1: Super Admin o Administrador Senior (nivel <= 1) -> Acceso Global completo
  if (isSuperAdmin(user) || level <= 1) {
    return {
      is_super_admin: true,
      primary_persona_id: null,
      primary_persona_tipo: null,
      assigned_persona_ids: [],
      allowed_cliente_ids: [],
      allowed_proveedor_ids: [],
      assigned_personas: [],
      restricts_b2b: false,
    }
  }

  // Caso 2: Cliente B2B (nivel 4) -> Aislado estricto a su propia persona
  if (level === 4) {
    const personaId = user.persona?.id ?? null
    return {
      is_super_admin: false,
      primary_persona_id: personaId,
      primary_persona_tipo: user.persona?.tipo_entidad ?? 'Cliente B2B',
      assigned_persona_ids: personaId ? [personaId] : [],
      allowed_cliente_ids: personaId ? [personaId] : [],
      allowed_proveedor_ids: [],
      assigned_personas: [],
      restricts_b2b: true,
    }
  }

  // Caso 3: Proveedor B2B (nivel 5) -> Aislado estricto a su propia persona
  if (level === 5) {
    const personaId = user.persona?.id ?? null
    return {
      is_super_admin: false,
      primary_persona_id: personaId,
      primary_persona_tipo: user.persona?.tipo_entidad ?? 'Proveedor',
      assigned_persona_ids: personaId ? [personaId] : [],
      allowed_cliente_ids: [],
      allowed_proveedor_ids: personaId ? [personaId] : [],
      assigned_personas: [],
      restricts_b2b: true,
    }
  }

  // Caso 4: Empleados / Intermediarios Comerciales (nivel 2 o 3, como Diana)
  const supabase = await createClient()
  const { data: assignments, error } = await (supabase.from('usuario_personas' as any) as any)
    .select(`
      persona_id,
      persona:personas!usuario_personas_persona_id_fkey (
        id,
        nombre_completo,
        tipo_entidad,
        created_at
      )
    `)
    .eq('usuario_id', user.id)

  if (error) {
    console.error('[getCommercialScope] Error cargando asignaciones usuario_personas:', error)
  }

  const assignedPersonas = (assignments ?? [])
    .map((a: any) => a.persona)
    .filter(Boolean) as any[]

  const assignedPersonaIds = assignedPersonas.map((p) => p.id)
  const allowedClientes = assignedPersonas
    .filter((p) => p.tipo_entidad === 'Cliente B2B')
    .map((p) => p.id)
  const allowedProveedores = assignedPersonas
    .filter((p) => p.tipo_entidad === 'Proveedor')
    .map((p) => p.id)

  // Si es un Administrador (nivel 2) y no tiene asignaciones asignadas, ve todo por defecto
  // Si es un Operativo / Comercial B2B (nivel 3) y no tiene asignaciones, está restringido a vacío (Opción A)
  const restrictsB2B = level === 3 || assignedPersonaIds.length > 0

  return {
    is_super_admin: false,
    primary_persona_id: user.persona?.id ?? null,
    primary_persona_tipo: user.persona?.tipo_entidad ?? null,
    assigned_persona_ids: assignedPersonaIds,
    allowed_cliente_ids: allowedClientes,
    allowed_proveedor_ids: allowedProveedores,
    assigned_personas: assignedPersonas.map((p) => ({
      id: p.id,
      nombre_completo: p.nombre_completo,
      tipo_entidad: p.tipo_entidad,
      rol_asignacion: null,
      created_at: p.created_at,
    })) as PersonaAsignadaComercial[],
    restricts_b2b: restrictsB2B,
  }
})

