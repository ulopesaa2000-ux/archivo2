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

  return NextResponse.json({
    authenticated: true,
    authUser: {
      id: user.id,
      email: user.email,
    },
    checks: results,
  })
}
