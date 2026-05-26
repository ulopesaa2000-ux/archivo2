// modules/config/queries.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type { RolConPermisos, UsuarioConDetalle, PermisoModulo, ModuloPermiso } from './types'
import { fetchAssignedCommercialPersonas } from '@/lib/auth/commercial-scope'
import type { PersonaAsignadaComercial } from '@/lib/types/tables'

type RolBaseRow = {
  id: number
  nombre: string
  descripcion: string | null
  nivel_acceso: number
}

/** Trae todos los usuarios con su rol (activos primero → nivel_acceso ascendente) */
export async function fetchUsuarios(): Promise<UsuarioConDetalle[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('usuarios')
    .select(`
      id,
      auth_user_id,
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
    console.error('fetchUsuarios error:', error ? {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    } : 'No data')
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

  const { data: rolesData, error: rolesError } = await supabase
    .from('roles')
    .select('id, nombre, descripcion, nivel_acceso')
    .order('nivel_acceso')

  if (rolesError || !rolesData) {
    console.error('fetchRolesConPermisos roles error:', rolesError ? {
      message: rolesError.message,
      details: rolesError.details,
      hint: rolesError.hint,
      code: rolesError.code,
    } : 'No data')
    return []
  }

  // Tabla: rol_permisos — columnas confirmadas: rol_id, puede_leer, puede_crear, puede_editar, puede_eliminar
  const { data: permisosData, error: permisosError } = await supabase
    .from('rol_permisos')
    .select('rol_id, modulo, puede_leer, puede_crear, puede_editar, puede_eliminar')

  if (permisosError) {
    console.error('fetchRolesConPermisos permisos error:', {
      message: permisosError.message,
      details: permisosError.details,
      hint: permisosError.hint,
      code: permisosError.code,
    })
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

  return (rolesData as RolBaseRow[]).map((r) => ({
    id:           r.id,
    nombre:       r.nombre,
    descripcion:  r.descripcion ?? null,
    nivel_acceso: r.nivel_acceso,
    permisos:     permisosMap.get(r.id) ?? [],
  }))
}

export async function fetchAssignedPersonas(usuarioId: number): Promise<PersonaAsignadaComercial[]> {
  const supabase = await createClient()
  return fetchAssignedCommercialPersonas(supabase, usuarioId)
}

import type { PersonaRow } from '@/lib/types/tables'

/** Trae todas las personas activas de tipo Cliente B2B o Proveedor */
export async function fetchPersonasComercialesActivas(): Promise<PersonaRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .in('tipo_entidad', ['Cliente B2B', 'Proveedor'])
    .eq('activo', true)
    .order('nombre_completo')

  if (error || !data) {
    console.error('[fetchPersonasComercialesActivas] error:', error)
    return []
  }
  return data as PersonaRow[]
}

/** Trae todas las filas de usuario_personas para visualización de alcance en la lista */
export async function fetchTodosUsuarioPersonas(): Promise<{ usuario_id: number; persona_id: number }[]> {
  const supabase = await createClient()
  const { data, error } = await (supabase.from('usuario_personas' as any) as any)
    .select('usuario_id, persona_id')

  if (error || !data) {
    console.error('[fetchTodosUsuarioPersonas] error:', error ? {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    } : 'No data')
    return []
  }
  return data
}


