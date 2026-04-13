// lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database.types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient<Database, 'inv-tienda'>(
    supabaseUrl,
    supabaseAnonKey,
    {
      db: { schema: 'inv-tienda' },
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
            supabaseResponse.cookies.set(name, value, {
              ...options,
              sameSite: 'none',
              secure: true,
            })
          )
        },
      },
    }
  )

  // IMPORTANTE: getUser() verifica con el servidor de Supabase.
  // getSession() solo lee el JWT local (menos seguro).
  let user = null;
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user;
  } catch (error) {
    // Silently handle auth errors in middleware
  }

  const pathname = request.nextUrl.pathname

  // ── Definir rutas protegidas del admin ────────────────────
  // Los route groups (admin) NO aparecen en la URL.
  // Estas son las rutas reales que ve el browser:
  const adminPrefixes = [
    '/dashboard',
    '/catalogo',
    '/inventario',
    '/ordenes-b2b',
    '/contenedores',
    '/ecommerce',
    '/configuracion',
  ]

  const isAdminRoute = adminPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  // ── Sin sesión intentando acceder a admin ─────────────────
  if (isAdminRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'

    // Guardar la ruta a la que intentaba acceder
    if (pathname !== '/dashboard') {
      url.searchParams.set('redirect', pathname)
    }

    return NextResponse.redirect(url)
  }

  // ── Con sesión intentando acceder a login ─────────────────
  if (pathname === '/login' && user) {
    // Evitar loop infinito si el usuario no tiene perfil o permisos en la BD
    if (request.nextUrl.searchParams.get('error') === 'no_profile') {
      return supabaseResponse
    }

    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard'
    const url = request.nextUrl.clone()
    url.pathname = redirectTo
    url.searchParams.delete('redirect')
    url.searchParams.delete('expired')
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
