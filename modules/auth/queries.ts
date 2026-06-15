// C:\Users\uriel\Downloads\enero 26\archivo2\modules\auth\queries.ts
import 'server-only'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { UsuarioConRol, BodegaRow, UsuarioBodegaRow, UsuarioRow } from '@/lib/types/tables'
import { buildPermissionMatrix, type PermissionMatrix } from '@/lib/auth/permissions'

const ULTIMO_ACCESO_THROTTLE_MS = 15 * 60 * 1000

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

function shouldRefreshUltimoAcceso(ultimoAcceso: string | null | undefined): boolean {
  if (!ultimoAcceso) return true

  const ultimoAccesoMs = new Date(ultimoAcceso).getTime()
  if (Number.isNaN(ultimoAccesoMs)) return true

  return Date.now() - ultimoAccesoMs >= ULTIMO_ACCESO_THROTTLE_MS
}

function queueUltimoAccesoRefresh(
  supabase: SupabaseServerClient,
  usuarioId: number,
  ultimoAcceso: string | null | undefined
) {
  if (!shouldRefreshUltimoAcceso(ultimoAcceso)) {
    return
  }

  supabase
    .from('usuarios')
    .update({ ultimo_acceso: new Date().toISOString() })
    .eq('id', usuarioId)
    .then(
      () => {},
      (error: unknown) => {
        console.error('[getCurrentUser] No se pudo refrescar ultimo_acceso:', error)
      }
    )
}

export async function getSession() {
  const supabase = await createClient()

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) return null
    return user
  } catch (error) {
    console.error('Auth getSession error:', error)
    return null
  }
}

export const getCurrentUser = cache(async (): Promise<UsuarioConRol | null> => {
  const supabase = await createClient()

  try {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) return null

    const claims = authUser.app_metadata?.inv_tienda_claims
    const effectivePermissions = claims?.version === 2
      ? (claims.permissions?.modules as PermissionMatrix | undefined)
      : undefined

    if (claims && effectivePermissions) {
      return {
        id: claims.usuario_id,
        auth_user_id: authUser.id,
        username: claims.username,
        nombre_completo: claims.nombre_completo,
        email: authUser.email,
        rol_id: claims.rol_id,
        activo: true,
        tenant: 'inv-tienda',
        ultimo_acceso: authUser.last_sign_in_at ?? null,
        rol: {
          id: claims.rol_id,
          nombre: claims.rol_nombre,
          nivel_acceso: claims.nivel_acceso,
          descripcion: claims.rol_descripcion,
        },
        permisos: claims.permisos,
        effective_permissions: effectivePermissions,
        persona: claims.persona_id ? {
          id: claims.persona_id,
          tipo_entidad: claims.persona_tipo,
        } : null,
      } as unknown as UsuarioConRol
    }

    console.log(`[getCurrentUser] Claims no encontrados u obsoletos para ${authUser.email}. Cargando de DB y autocurando...`)

    const { data: usuarioData, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .eq('activo', true)
      .single()
    const usuario = usuarioData as UsuarioRow | null

    if (userError || !usuario) {
      console.error('getCurrentUser query error:', userError)
      return null
    }

    const rolPromise = supabase
      .from('roles')
      .select('id, nombre, nivel_acceso, descripcion')
      .eq('id', usuario.rol_id)
      .single()

    const permisosPromise = supabase
      .from('usuario_permisos')
      .select(`
        es_super_admin,
        puede_gestionar_compras_b2b,
        puede_gestionar_contenedores,
        puede_gestionar_ecommerce,
        puede_ver_inventario,
        puede_crear_notas_inventario,
        puede_aprobar_notas_inventario
      `)
      .eq('usuario_id', usuario.id)
      .single()

    const rolPermisosPromise = supabase
      .from('rol_permisos')
      .select('modulo, puede_leer, puede_crear, puede_editar, puede_eliminar')
      .eq('rol_id', usuario.rol_id)

    const [rolResult, permisosResult, rolPermisosResult] = await Promise.allSettled([
      rolPromise,
      permisosPromise,
      rolPermisosPromise,
    ])

    const rol = rolResult.status === 'fulfilled' && !rolResult.value.error
      ? rolResult.value.data
      : null

    const permisos = permisosResult.status === 'fulfilled' && !permisosResult.value.error
      ? permisosResult.value.data
      : null

    const matrix = rolPermisosResult.status === 'fulfilled' && !rolPermisosResult.value.error
      ? buildPermissionMatrix(rolPermisosResult.value.data ?? [])
      : buildPermissionMatrix([])

    const { data: personaData } = await supabase
      .from('personas')
      .select('id, tipo_entidad')
      .eq('usuario_id', usuario.id)
      .eq('activo', true)
      .maybeSingle()

    queueUltimoAccesoRefresh(supabase, usuario.id, usuario.ultimo_acceso)

    const { syncUserClaims } = await import('./actions')
    syncUserClaims(authUser.id).catch((err) => {
      console.error('[getCurrentUser] Error al autocurar claims:', err)
    })

    return {
      ...usuario,
      rol,
      permisos,
      effective_permissions: matrix,
      persona: personaData ? {
        id: personaData.id,
        tipo_entidad: personaData.tipo_entidad,
      } : null,
    } as UsuarioConRol
  } catch (error) {
    console.error('Auth getCurrentUser error:', error)
    return null
  }
})

export const fetchBodegasUsuario = cache(async (
  usuarioId: number,
  nivelAcceso: number
): Promise<(BodegaRow & { permisos_bodega?: UsuarioBodegaRow })[]> => {
  const supabase = await createClient()

  if (nivelAcceso <= 2) {
    const { data, error } = await supabase
      .from('bodegas')
      .select('*')
      .eq('activa', true)
      .order('nombre')

    if (error || !data) return []
    return data
  }

  const { data, error } = await supabase
    .from('usuario_bodegas')
    .select(`
      *,
      bodega:bodegas!usuario_bodegas_bodega_id_fkey (*)
    `)
    .eq('usuario_id', usuarioId)
    .eq('puede_consultar', true)

  if (error || !data) return []

  return (data as (UsuarioBodegaRow & { bodega: BodegaRow | BodegaRow[] })[])
    .filter((ub) => {
      const bodega = Array.isArray(ub.bodega) ? ub.bodega[0] : ub.bodega
      return bodega?.activa === true
    })
    .map((ub) => {
      const bodega = Array.isArray(ub.bodega) ? ub.bodega[0] : ub.bodega
      return {
        ...bodega,
        permisos_bodega: {
          id: ub.id,
          usuario_id: ub.usuario_id,
          bodega_id: ub.bodega_id,
          puede_consultar: ub.puede_consultar,
          puede_crear_notas: ub.puede_crear_notas,
          puede_confirmar_notas: ub.puede_confirmar_notas,
          puede_transferir: ub.puede_transferir,
          created_at: ub.created_at,
        },
      }
    })
})
