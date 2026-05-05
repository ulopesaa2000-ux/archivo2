// modules/config/types.ts
// Nombres de columna confirmados por MCP (information_schema):
//   usuarios:    nombre_completo, rol_id, auth_user_id
//   roles:       nivel_acceso
//   rol_permisos: rol_id, puede_leer, puede_crear, puede_editar, puede_eliminar

export type ModuloPermiso =
  | 'catalogo_productos'
  | 'catalogo_catalogos'
  | 'inventario_stock'
  | 'inventario_notas'
  | 'inventario_bodegas'
  | 'b2b_ordenes'
  | 'b2b_contenedores'
  | 'ecommerce_catalogo'
  | 'ecommerce_ordenes'
  | 'config_usuarios'
  | 'config_roles'

export const MODULOS_ORDEN: ModuloPermiso[] = [
  'catalogo_productos',
  'catalogo_catalogos',
  'inventario_stock',
  'inventario_notas',
  'inventario_bodegas',
  'b2b_ordenes',
  'b2b_contenedores',
  'ecommerce_catalogo',
  'ecommerce_ordenes',
  'config_usuarios',
  'config_roles',
]

export const MODULO_LABELS: Record<ModuloPermiso, { label: string; grupo: string }> = {
  catalogo_productos:  { label: 'Catálogo Productos',  grupo: 'Catálogo' },
  catalogo_catalogos:  { label: 'Catálogos Soporte',   grupo: 'Catálogo' },
  inventario_stock:    { label: 'Stock',                grupo: 'Inventario' },
  inventario_notas:    { label: 'Notas',               grupo: 'Inventario' },
  inventario_bodegas:  { label: 'Bodegas',              grupo: 'Inventario' },
  b2b_ordenes:         { label: 'Órdenes B2B',          grupo: 'B2B' },
  b2b_contenedores:    { label: 'Contenedores',         grupo: 'B2B' },
  ecommerce_catalogo:  { label: 'Catálogo Web',         grupo: 'Ecommerce' },
  ecommerce_ordenes:   { label: 'Órdenes Venta',        grupo: 'Ecommerce' },
  config_usuarios:     { label: 'Usuarios',             grupo: 'Config' },
  config_roles:        { label: 'Roles',                grupo: 'Config' },
}

// Nombres REALES de columna en rol_permisos (confirmados por MCP)
export type TipoPermiso = 'puede_leer' | 'puede_crear' | 'puede_editar' | 'puede_eliminar'

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

/** Helper: genera la matriz completa de permisos para un rol (rellenando vacíos con false) */
export function buildPermisosCompletos(permisos: PermisoModulo[]): Record<ModuloPermiso, PermisoModulo> {
  const map: Partial<Record<ModuloPermiso, PermisoModulo>> = {}
  for (const p of permisos) map[p.modulo] = p
  const result: Partial<Record<ModuloPermiso, PermisoModulo>> = {}
  for (const mod of MODULOS_ORDEN) {
    result[mod] = map[mod] ?? {
      modulo: mod,
      puede_leer:     false,
      puede_crear:    false,
      puede_editar:   false,
      puede_eliminar: false,
    }
  }
  return result as Record<ModuloPermiso, PermisoModulo>
}

export type UsuarioConDetalle = {
  id: number
  auth_user_id: string | null     // Columna añadida para validar si está en Auth
  nombre_completo: string | null  // columna real: nombre_completo
  username: string | null
  email: string | null
  activo: boolean
  rol_id: number                  // columna real: rol_id
  ultimo_acceso: string | null
  created_at: string | null
  rol: {
    id: number
    nombre: string
    nivel_acceso: number          // columna real: nivel_acceso
    descripcion: string | null
  } | null
}
