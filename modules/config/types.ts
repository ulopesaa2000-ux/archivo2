// C:\Users\uriel\Downloads\enero 26\archivo2\modules\config\types.ts
import {
  MODULE_LABELS,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  type PermissionAction,
  type PermissionModule,
} from '@/lib/auth/permissions'

export type ModuloPermiso = PermissionModule
export type TipoPermiso = PermissionAction

export const MODULOS_ORDEN: ModuloPermiso[] = [...PERMISSION_MODULES]
export const MODULO_LABELS = MODULE_LABELS
export const TIPO_PERMISOS: TipoPermiso[] = [...PERMISSION_ACTIONS]

export type PermisoModulo = {
  modulo: ModuloPermiso
  puede_leer: boolean
  puede_crear: boolean
  puede_editar: boolean
  puede_eliminar: boolean
}

export type RolConPermisos = {
  id: number
  nombre: string
  descripcion: string | null
  nivel_acceso: number
  permisos: PermisoModulo[]
}

export function buildPermisosCompletos(permisos: PermisoModulo[]): Record<ModuloPermiso, PermisoModulo> {
  const map: Partial<Record<ModuloPermiso, PermisoModulo>> = {}
  for (const permiso of permisos) map[permiso.modulo] = permiso

  const result: Partial<Record<ModuloPermiso, PermisoModulo>> = {}
  for (const modulo of MODULOS_ORDEN) {
    result[modulo] = map[modulo] ?? {
      modulo,
      puede_leer: modulo === 'catalogo_catalogos',
      puede_crear: false,
      puede_editar: false,
      puede_eliminar: false,
    }
  }

  return result as Record<ModuloPermiso, PermisoModulo>
}

export type UsuarioConDetalle = {
  id: number
  auth_user_id: string | null
  nombre_completo: string | null
  username: string | null
  email: string | null
  activo: boolean
  rol_id: number
  ultimo_acceso: string | null
  created_at: string | null
  rol: {
    id: number
    nombre: string
    nivel_acceso: number
    descripcion: string | null
  } | null
}

/**
 * Acceso especial Admin Operativo Inventario en Configuración > Usuarios.
 * Fuente única de verdad compartida por servidor (actions) y UI (page/Manager).
 */
export const NOMBRE_ROL_ADMIN_INVENTARIO = 'Admin Operativo Inventario'

/** Allowlist de roles gestionables por el Admin Inventario (en minúsculas). */
export const ROLES_BODEGA_GESTIONABLES = ['bodeguero', 'encargado de bodega'] as const

/** Doble candado: nombre en allowlist Y nivel no privilegiado (> 2). */
export function esRolBodegaGestionable(
  nombre: string | null | undefined,
  nivel: number | null | undefined
): boolean {
  if ((nivel ?? 99) <= 2) return false
  return (ROLES_BODEGA_GESTIONABLES as readonly string[]).includes(
    (nombre ?? '').trim().toLowerCase()
  )
}

/** Actor con acceso especial restringido (en servidor se valida además que no sea Super Admin). */
export function esActorAdminInventarioRestringido(
  nombre: string | null | undefined,
  nivel: number | null | undefined
): boolean {
  return (nivel ?? 99) > 1 && (nombre ?? '').trim() === NOMBRE_ROL_ADMIN_INVENTARIO
}
