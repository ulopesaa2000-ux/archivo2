// C:\Users\uriel\Downloads\enero 26\archivo2\lib\supabase\middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { permissionForPath, type PermissionAction } from '@/lib/auth/permissions'
import { Database } from '../types/database.types'
import { SUPABASE_OPTIONS, SUPABASE_SCHEMA } from './constants'

const PROTECTED_ROUTES = [
  '/dashboard',
  '/perfil',
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

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  const { pathname } = request.nextUrl
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      '[Middleware] Warning: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing from environment variables.'
    )
    if (isProtectedRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  const supabase = createServerClient<Database, typeof SUPABASE_SCHEMA>(
    supabaseUrl,
    supabaseAnonKey,
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Redirección inteligente en la raíz "/":
  // Si un usuario de staff (Admin, Bodeguero, etc.) entra a la raíz "/", enviarlo a /dashboard.
  // Si es un visitante sin login o un "Cliente Ecomerce", permanece en la tienda "/".
  if (user && pathname === '/') {
    const claims = user.app_metadata?.inv_tienda_claims
    const rolNombre = (claims?.rol_nombre || user.user_metadata?.rol || '').toLowerCase()
    const isCliente = claims?.rol_id === 19 || rolNombre.includes('cliente')

    if (!isCliente && (claims || (claims?.nivel_acceso ?? 99) <= 3)) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
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
