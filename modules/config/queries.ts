// modules/config/queries.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type { RolConPermisos, UsuarioConDetalle, PermisoModulo, ModuloPermiso } from './types'

/** Trae todos los usuarios con su rol (activos primero → nivel_acceso ascendente) */
export async function fetchUsuarios(): Promise<UsuarioConDetalle[]> {
  const supabase = await createClient()

  // Cast any: tabla roles y sus columnas no están en database.types.ts generado
  const { data, error } = await (supabase as any)
    .from('usuarios')
    .select(`
      id,
      nombre_completo,
      username,
      email,
      activo,
      rol_id,
      ultimo_acceso,
      created_at,
      rol:roles (
        id,
        nombre,
        nivel_acceso,
        descripcion
      )
    `)
    .order('activo', { ascending: false })

  if (error || !data) {
    console.error('fetchUsuarios error:', error?.message ?? error)
    return []
  }

  return (data as UsuarioConDetalle[]).sort((a, b) => {
    if (a.activo !== b.activo) return a.activo ? -1 : 1
    const nivelA = a.rol?.nivel_acceso ?? 99
    const nivelB = b.rol?.nivel_acceso ?? 99
    return nivelA - nivelB
  })
}

/** Trae todos los roles con sus permisos por módulo */
export async function fetchRolesConPermisos(): Promise<RolConPermisos[]> {
  const supabase = await createClient()

  // Cast any: tabla roles con columna nivel_acceso no está en database.types.ts
  const { data: rolesData, error: rolesError } = await (supabase as any)
    .from('roles')
    .select('id, nombre, descripcion, nivel_acceso')
    .order('nivel_acceso')

  if (rolesError || !rolesData) {
    console.error('fetchRolesConPermisos roles error:', rolesError?.message ?? rolesError)
    return []
  }

  // Tabla: rol_permisos — columnas confirmadas: rol_id, puede_leer, puede_crear, puede_editar, puede_eliminar
  const { data: permisosData, error: permisosError } = await supabase
    .from('rol_permisos')
    .select('rol_id, modulo, puede_leer, puede_crear, puede_editar, puede_eliminar')

  if (permisosError) {
    console.error('fetchRolesConPermisos permisos error:', permisosError?.message ?? permisosError)
  }

  const permisosMap = new Map<number, PermisoModulo[]>()
  for (const p of (permisosData ?? [])) {
    if (!permisosMap.has(p.rol_id)) permisosMap.set(p.rol_id, [])
    permisosMap.get(p.rol_id)!.push({
      modulo:         p.modulo         as ModuloPermiso,
      puede_leer:     p.puede_leer     ?? false,
      puede_crear:    p.puede_crear    ?? false,
      puede_editar:   p.puede_editar   ?? false,
      puede_eliminar: p.puede_eliminar ?? false,
    })
  }

  return (rolesData as any[]).map((r) => ({
    id:           r.id           as number,
    nombre:       r.nombre       as string,
    descripcion:  r.descripcion  as string | null ?? null,
    nivel_acceso: r.nivel_acceso as number,
    permisos:     permisosMap.get(r.id) ?? [],
  }))
}
