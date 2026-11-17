// modules/auth/claims-sync.ts
import 'server-only'
import { getActiveSupabaseConfig } from '@/lib/supabase/env'
import type { Database } from '@/lib/types/database.types'
import { buildPermissionMatrix } from '@/lib/auth/permissions'

/**
 * Sincroniza el rol y los permisos del usuario de PostgreSQL a app_metadata de Supabase Auth.
 * Esto codifica los permisos directamente en el JWT firmado, logrando 0 DB hits en validación de páginas.
 * Uso exclusivo server-only (no exportar como Server Action).
 */
export async function syncUserClaims(authUserId: string): Promise<boolean> {
  console.log('[syncUserClaims] Sincronizando claims para authUserId:', authUserId)
  const { supabaseUrl, supabaseServiceRoleKey } = getActiveSupabaseConfig()
  if (!supabaseServiceRoleKey) {
    console.warn('[syncUserClaims] No se encontró service role key para el entorno actual. Omitiendo actualización de claims.')
    return false
  }

  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient<Database, 'inv-tienda'>(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        db: { schema: 'inv-tienda' },
      }
    )

    const { data: usuario, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('auth_user_id', authUserId)
      .eq('activo', true)
      .maybeSingle()

    if (userError || !usuario) {
      console.error('[syncUserClaims] Error al buscar usuario o inactivo:', userError)
      return false
    }

    const { data: rol, error: rolError } = await supabaseAdmin
      .from('roles')
      .select('*')
      .eq('id', usuario.rol_id)
      .maybeSingle()

    if (rolError || !rol) {
      console.error('[syncUserClaims] Error al buscar rol:', rolError)
      return false
    }

    const { data: permisos, error: permError } = await supabaseAdmin
      .from('usuario_permisos')
      .select('*')
      .eq('usuario_id', usuario.id)
      .maybeSingle()

    if (permError) {
      console.error('[syncUserClaims] Error al buscar permisos de usuario:', permError)
    }

    const { data: persona } = await supabaseAdmin
      .from('personas')
      .select('id, tipo_entidad')
      .eq('usuario_id', usuario.id)
      .eq('activo', true)
      .maybeSingle()

    const { data: rolPermisos, error: rolPermisosError } = await supabaseAdmin
      .from('rol_permisos')
      .select('modulo, puede_leer, puede_crear, puede_editar, puede_eliminar')
      .eq('rol_id', usuario.rol_id)

    if (rolPermisosError) {
      console.error('[syncUserClaims] Error al buscar permisos del rol:', rolPermisosError)
    }

    const effectivePermissions = buildPermissionMatrix(rolPermisos ?? [])

    const claims = {
      version: 2,
      usuario_id: usuario.id,
      username: usuario.username,
      nombre_completo: usuario.nombre_completo,
      rol_id: usuario.rol_id,
      rol_nombre: rol.nombre,
      nivel_acceso: rol.nivel_acceso,
      rol_descripcion: rol.descripcion,
      permisos: permisos ? {
        es_super_admin: permisos.es_super_admin,
        puede_gestionar_compras_b2b: permisos.puede_gestionar_compras_b2b,
        puede_gestionar_contenedores: permisos.puede_gestionar_contenedores,
        puede_gestionar_ecommerce: permisos.puede_gestionar_ecommerce,
        puede_ver_inventario: permisos.puede_ver_inventario,
        puede_crear_notas_inventario: permisos.puede_crear_notas_inventario,
        puede_aprobar_notas_inventario: permisos.puede_aprobar_notas_inventario,
      } : null,
      persona_id: persona?.id || null,
      persona_tipo: persona?.tipo_entidad || null,
      permissions: {
        version: 2,
        modules: effectivePermissions,
      },
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authUserId,
      {
        app_metadata: {
          inv_tienda_claims: claims,
        },
      }
    )

    if (updateError) {
      console.error('[syncUserClaims] Error al actualizar app_metadata:', updateError.message)
      return false
    }

    console.log(`[syncUserClaims] Claims sincronizados con éxito para: ${usuario.username}`)
    return true
  } catch (error) {
    console.error('[syncUserClaims] Error inesperado en sincronización:', error)
    return false
  }
}
