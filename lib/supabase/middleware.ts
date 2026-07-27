// C:\Users\uriel\Downloads\enero 26\archivo2\lib\supabase\middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { permissionForPath, type PermissionAction } from '@/lib/auth/permissions'
import { Database } from '../types/database.types'
import { SUPABASE_OPTIONS, SUPABASE_SCHEMA } from './constants'

const PROTECTED_ROUTES = [
  '/dashboard',
  '/catalogo',
  '/configuracion',
  '/contenedores',
  '/despachos',
  '/ecommerce',
  '/inventario',
  '/inventario-virtual',
  '/ordenes-b2b',
  '/unauthorized',
  '/api/debug-permissions',
  '/api/debug-user',
  '/api/inventario',
  '/api/ordenes-b2b',
]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database, typeof SUPABASE_SCHEMA>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
      ...SUPABASE_OPTIONS,
    }
  )

  const { pathname } = request.nextUrl
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  if (user && isProtectedRoute && pathname !== '/unauthorized') {
    const claims = user.app_metadata?.inv_tienda_claims
    const modulo = permissionForPath(pathname)

    if (modulo && claims?.version === 2) {
      const action: PermissionAction = 'puede_leer'
      const isSuperAdmin = claims.permisos?.es_super_admin === true || (claims.nivel_acceso ?? 99) <= 1
      let hasAccess = isSuperAdmin || claims.permissions?.modules?.[modulo]?.[action] === true

      if (!hasAccess && modulo === 'catalogo_productos') {
        hasAccess = claims.permissions?.modules?.catalogo_catalogos?.puede_leer === true
      }

      if (!hasAccess) {
        const url = request.nextUrl.clone()
        url.pathname = '/unauthorized'
        url.searchParams.set('from', pathname)
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
