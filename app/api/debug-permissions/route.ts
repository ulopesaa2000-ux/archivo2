// C:\Users\uriel\Downloads\enero 26\archivo2\app\api\debug-permissions\route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CHECKS = [
  { name: 'usuarios', table: 'usuarios' },
  { name: 'roles', table: 'roles' },
  { name: 'usuario_permisos', table: 'usuario_permisos' },
  { name: 'ordenes_b2b', table: 'ordenes_b2b' },
  { name: 'personas', table: 'personas' },
  { name: 'auditoria_productos', table: 'auditoria_productos' },
  { name: 'v_auditoria_productos', table: 'v_auditoria_productos' },
] as const

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      {
        authenticated: false,
        authError: authError
          ? {
              message: authError.message,
              code: authError.code,
            }
          : null,
      },
      { status: 401 }
    )
  }

  const results = await Promise.all(
    CHECKS.map(async ({ name, table }) => {
      const { data, count, error } = await supabase
        .from(table as any)
        .select('*', { count: 'exact' })
        .limit(1)

      return {
        name,
        ok: !error,
        count,
        sampleRows: data?.length ?? 0,
        error: error
          ? {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
            }
          : null,
      }
    })
  )

  const [usuariosPage, rolesPage, ordenesPage, tableDefaults, userTableConfigs] =
    await Promise.all([
      supabase
        .from('usuarios')
        .select(
          `
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
        `,
          { count: 'exact' }
        )
        .limit(1),
      supabase
        .from('roles')
        .select('id, nombre, descripcion, nivel_acceso', { count: 'exact' })
        .limit(1),
      supabase
        .from('ordenes_b2b')
        .select(
          `
          id, folio_proveedor, estado, moneda, tipo_cambio,
          total_cajas, total_piezas, cbm_orden, observaciones,
          fecha_orden, contenedor_id,
          contenedor:contenedores!ordenes_b2b_contenedor_id_fkey (
            codigo_contenedor
          ),
          proveedor:personas!ordenes_b2b_proveedor_id_fkey (
            nombre_completo
          ),
          cliente:personas!ordenes_b2b_cliente_b2b_id_fkey (
            nombre_completo
          )
        `,
          { count: 'exact' }
        )
        .limit(1),
      (supabase as any)
        .from('table_config_defaults')
        .select('route, features', { count: 'exact' })
        .in('route', ['/ordenes-b2b', '/configuracion/usuarios']),
      (supabase as any)
        .from('user_table_configs')
        .select('route, features, is_default', { count: 'exact' })
        .limit(5),
    ])

  const pageChecks = [
    { name: 'usuarios-page-query', result: usuariosPage },
    { name: 'roles-page-query', result: rolesPage },
    { name: 'ordenes-b2b-page-query', result: ordenesPage },
    { name: 'table-config-defaults', result: tableDefaults },
    { name: 'user-table-configs', result: userTableConfigs },
  ].map(({ name, result }) => ({
    name,
    ok: !result.error,
    count: result.count,
    sampleRows: result.data?.length ?? 0,
    error: result.error
      ? {
          message: result.error.message,
          details: result.error.details,
          hint: result.error.hint,
          code: result.error.code,
        }
      : null,
  }))

  return NextResponse.json({
    authenticated: true,
    authUser: {
      id: user.id,
      email: user.email,
    },
    checks: results,
    pageChecks,
  })
}
