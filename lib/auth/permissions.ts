// C:\Users\uriel\Downloads\enero 26\archivo2\lib\auth\permissions.ts
import type { RolPermisoRow, UsuarioConRol } from '@/lib/types/tables'

export const PERMISSION_ACTIONS = [
  'puede_leer',
  'puede_crear',
  'puede_editar',
  'puede_eliminar',
] as const

export type PermissionAction = typeof PERMISSION_ACTIONS[number]

export const PERMISSION_MODULES = [
  'catalogo_productos',
  'catalogo_catalogos',
  'catalogo_imagenes',
  'catalogo_familias',
  'inventario_stock',
  'inventario_notas',
  'inventario_bodegas',
  'inventario_virtual',
  'b2b_ordenes',
  'b2b_cajas',
  'b2b_contenedores',
  'despachos',
  'ecommerce_catalogo',
  'ecommerce_ordenes',
  'ecommerce_config',
  'config_usuarios',
  'config_roles',
  'config_auditoria_productos',
  'config_tablas',
] as const

export type PermissionModule = typeof PERMISSION_MODULES[number]

export type PermissionMatrix = Record<PermissionModule, Record<PermissionAction, boolean>>

export type PermissionClaimsV2 = {
  version: 2
  modules: PermissionMatrix
}

export const MODULE_LABELS: Record<PermissionModule, { label: string; grupo: string }> = {
  catalogo_productos: { label: 'Catalogo Productos', grupo: 'Catalogo' },
  catalogo_catalogos: { label: 'Catalogos Soporte', grupo: 'Catalogo' },
  catalogo_imagenes: { label: 'Imagenes', grupo: 'Catalogo' },
  catalogo_familias: { label: 'Familias de Productos', grupo: 'Catalogo' },
  inventario_stock: { label: 'Stock', grupo: 'Inventario' },
  inventario_notas: { label: 'Notas', grupo: 'Inventario' },
  inventario_bodegas: { label: 'Bodegas', grupo: 'Inventario' },
  inventario_virtual: { label: 'Bodegas Virtuales', grupo: 'Inventario' },
  b2b_ordenes: { label: 'Ordenes B2B', grupo: 'B2B' },
  b2b_cajas: { label: 'Cajas', grupo: 'B2B' },
  b2b_contenedores: { label: 'Contenedores', grupo: 'B2B' },
  despachos: { label: 'Despachos', grupo: 'B2B' },
  ecommerce_catalogo: { label: 'Catalogo Web', grupo: 'Ecommerce' },
  ecommerce_ordenes: { label: 'Ordenes Venta', grupo: 'Ecommerce' },
  ecommerce_config: { label: 'Config Ecommerce', grupo: 'Ecommerce' },
  config_usuarios: { label: 'Usuarios', grupo: 'Config' },
  config_roles: { label: 'Roles', grupo: 'Config' },
  config_auditoria_productos: { label: 'Auditoria Productos', grupo: 'Config' },
  config_tablas: { label: 'Configuracion de Tablas', grupo: 'Config' },
}

export const ROUTE_PERMISSION_MAP = [
  { prefix: '/catalogo/catalogos', modulo: 'catalogo_catalogos' },
  { prefix: '/catalogo/imagenes', modulo: 'catalogo_imagenes' },
  { prefix: '/catalogo/familias', modulo: 'catalogo_familias' },
  { prefix: '/catalogo', modulo: 'catalogo_productos' },
  { prefix: '/inventario/stock', modulo: 'inventario_stock' },
  { prefix: '/inventario/notas', modulo: 'inventario_notas' },
  { prefix: '/inventario/bodegas', modulo: 'inventario_bodegas' },
  { prefix: '/inventario-virtual', modulo: 'inventario_virtual' },
  { prefix: '/ordenes-b2b/cajas', modulo: 'b2b_cajas' },
  { prefix: '/ordenes-b2b', modulo: 'b2b_ordenes' },
  { prefix: '/contenedores', modulo: 'b2b_contenedores' },
  { prefix: '/despachos', modulo: 'despachos' },
  { prefix: '/ecommerce/productos-web', modulo: 'ecommerce_catalogo' },
  { prefix: '/ecommerce/ordenes-venta', modulo: 'ecommerce_ordenes' },
  { prefix: '/ecommerce/config', modulo: 'ecommerce_config' },
  { prefix: '/configuracion/usuarios', modulo: 'config_usuarios' },
  { prefix: '/configuracion/personas', modulo: 'config_usuarios' },
  { prefix: '/configuracion/roles', modulo: 'config_roles' },
  { prefix: '/configuracion/auditoria_producto', modulo: 'config_auditoria_productos' },
  { prefix: '/configuracion/tablas', modulo: 'config_tablas' },
  { prefix: '/configuracion/tablas-soporte', modulo: 'config_tablas' },
] as const satisfies readonly { prefix: string; modulo: PermissionModule }[]

export function createEmptyPermissionMatrix(): PermissionMatrix {
  return Object.fromEntries(
    PERMISSION_MODULES.map((modulo) => [
      modulo,
      {
        puede_leer: modulo === 'catalogo_catalogos',
        puede_crear: false,
        puede_editar: false,
        puede_eliminar: false,
      },
    ])
  ) as PermissionMatrix
}

export function isSuperAdmin(user: Pick<UsuarioConRol, 'rol' | 'permisos'> | null | undefined): boolean {
  return user?.permisos?.es_super_admin === true || (user?.rol?.nivel_acceso ?? 99) <= 1
}

export function buildPermissionMatrix(permisos: Partial<RolPermisoRow>[] | null | undefined): PermissionMatrix {
  const matrix = createEmptyPermissionMatrix()

  for (const permiso of permisos ?? []) {
    const modulo = permiso.modulo as PermissionModule
    if (!PERMISSION_MODULES.includes(modulo)) continue

    matrix[modulo] = {
      puede_leer: permiso.puede_leer ?? false,
      puede_crear: permiso.puede_crear ?? false,
      puede_editar: permiso.puede_editar ?? false,
      puede_eliminar: permiso.puede_eliminar ?? false,
    }
  }

  matrix.catalogo_catalogos.puede_leer = true
  return matrix
}

export function getEffectivePermissions(user: UsuarioConRol | null | undefined): PermissionMatrix {
  const existing = user?.effective_permissions

  if (existing) {
    const matrix = buildPermissionMatrix([])
    for (const modulo of PERMISSION_MODULES) {
      matrix[modulo] = {
        ...matrix[modulo],
        ...(existing as Partial<PermissionMatrix>)[modulo],
      }
    }
    const nivel = user?.rol?.nivel_acceso ?? 99
    if (nivel === 4 || nivel === 5) {
      matrix.b2b_ordenes = { puede_leer: true, puede_crear: false, puede_editar: false, puede_eliminar: false }
      matrix.b2b_contenedores = { puede_leer: true, puede_crear: false, puede_editar: false, puede_eliminar: false }
    }
    return matrix
  }

  if (isSuperAdmin(user)) {
    return Object.fromEntries(
      PERMISSION_MODULES.map((modulo) => [
        modulo,
        {
          puede_leer: true,
          puede_crear: true,
          puede_editar: true,
          puede_eliminar: true,
        },
      ])
    ) as PermissionMatrix
  }

  return createEmptyPermissionMatrix()
}

export function can(
  user: UsuarioConRol | null | undefined,
  modulo: PermissionModule,
  action: PermissionAction
): boolean {
  if (isSuperAdmin(user)) return true
  return getEffectivePermissions(user)[modulo]?.[action] === true
}

export function canReadCatalog(user: UsuarioConRol | null | undefined): boolean {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  return (
    can(user, 'catalogo_productos', 'puede_leer') ||
    can(user, 'catalogo_catalogos', 'puede_leer')
  )
}

export function canEditCatalog(user: UsuarioConRol | null | undefined): boolean {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  return (
    can(user, 'catalogo_productos', 'puede_editar') ||
    can(user, 'catalogo_productos', 'puede_crear')
  )
}

export function permissionForPath(pathname: string): PermissionModule | null {
  const match = ROUTE_PERMISSION_MAP.find((item) =>
    pathname === item.prefix || pathname.startsWith(`${item.prefix}/`)
  )

  return match?.modulo ?? null
}
