// modules/auth/queries.ts
'use server'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { UsuarioConRol, BodegaRow, UsuarioBodegaRow } from '@/lib/types/tables'

/**
 * Obtiene la sesión actual de Supabase Auth.
 * Usar en Server Components para verificar si hay usuario autenticado.
 */
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
    console.error("Auth getSession error:", error);
    return null;
  }
}

/**
 * Obtiene el usuario completo del sistema inv-tienda.
 * Hace JOIN con roles y usuario_permisos.
 * 
 * Este es el método principal que usa el layout del admin
 * para saber quién está logueado y qué puede hacer.
 * 
 * Retorna null si:
 *   - No hay sesión de auth
 *   - El usuario no existe en inv-tienda.usuarios
 *   - El usuario está inactivo
 */
export const getCurrentUser = cache(async (): Promise<UsuarioConRol | null> => {
  const supabase = await createClient()

  try {
    // 1. Verificar auth (SIEMPRE getUser, nunca getSession, por seguridad)
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) return null

    // ── OPTIMIZACIÓN: Leer claims del JWT (app_metadata) ──
    const meta = authUser.app_metadata
    if (meta && meta.inv_tienda_claims) {
      const claims = meta.inv_tienda_claims
      
      // Actualizar último acceso (fire and forget)
      ;(supabase as any)
        .from('usuarios')
        .update({ ultimo_acceso: new Date().toISOString() })
        .eq('id', claims.usuario_id)
        .then(() => {})

      return {
        id: claims.usuario_id,
        auth_user_id: authUser.id,
        username: claims.username,
        nombre_completo: claims.nombre_completo,
        email: authUser.email,
        rol_id: claims.rol_id,
        activo: true,
        tenant: 'inv-tienda',
        ultimo_acceso: new Date().toISOString(),
        rol: {
          id: claims.rol_id,
          nombre: claims.rol_nombre,
          nivel_acceso: claims.nivel_acceso,
          descripcion: claims.rol_descripcion
        },
        permisos: claims.permisos
      } as UsuarioConRol
    }

    // ── FALLBACK A BASE DE DATOS Y AUTOCURACIÓN ──
    console.log(`[getCurrentUser] Claims no encontrados en JWT para ${authUser.email}. Cargando de DB y autocurando...`)

    // 2. Traer usuario del esquema inv-tienda
    const { data: usuarioData, error: userError } = await supabase
      .from('usuarios')
      .select(`*`)
      .eq('auth_user_id', authUser.id)
      .eq('activo', true)
      .single()

    const usuario = usuarioData as any;

    if (userError || !usuario) {
      console.error("getCurrentUser query error:", userError);
      return null
    }

    // 2.5 Intentar traer rol
    let rol = null;
    const rolPromise = supabase
      .from('roles')
      .select(`
        id,
        nombre,
        nivel_acceso,
        descripcion
      `)
      .eq('id', usuario.rol_id)
      .single()

    // 2.6 Intentar traer permisos
    let permisos = null;
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

    const [rolResult, permisosResult] = await Promise.allSettled([
      rolPromise,
      permisosPromise,
    ])

    if (rolResult.status === 'fulfilled' && !rolResult.value.error) {
      rol = rolResult.value.data
    }
    if (permisosResult.status === 'fulfilled' && !permisosResult.value.error) {
      permisos = permisosResult.value.data
    }

    // 3. Actualizar último acceso (fire and forget, no bloquea)
    ;(supabase as any)
      .from('usuarios')
      .update({ ultimo_acceso: new Date().toISOString() })
      .eq('id', usuario.id)
      .then(() => {})

    // Autocuración: Disparar sincronización asíncrona de claims para guardar en JWT para la próxima visita
    const { syncUserClaims } = await import('./actions')
    syncUserClaims(authUser.id).catch((err) => {
      console.error('[getCurrentUser] Error al autocurar claims:', err)
    })

    return {
      ...usuario,
      rol,
      permisos,
    } as UsuarioConRol
  } catch (error) {
    console.error("Auth getCurrentUser error:", error);
    return null;
  }
})

/**
 * Trae las bodegas a las que el usuario tiene acceso.
 * 
 * - Nivel 1-2 (super/admin): TODAS las bodegas activas
 * - Nivel 3+: solo las de usuario_bodegas con puede_consultar=true
 * 
 * Se usa para poblar el BodegaSelector en el Header.
 */
export const fetchBodegasUsuario = cache(async (
  usuarioId: number,
  nivelAcceso: number
): Promise<(BodegaRow & { permisos_bodega?: UsuarioBodegaRow })[]> => {
  const supabase = await createClient()

  // Nivel 1-2: acceso total
  if (nivelAcceso <= 2) {
    const { data, error } = await supabase
      .from('bodegas')
      .select('*')
      .eq('activa', true)
      .order('nombre')

    if (error || !data) return []
    return data
  }

  // Nivel 3+: solo bodegas asignadas
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
