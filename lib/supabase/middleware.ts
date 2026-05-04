import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_ROUTES = [
  '/dashboard',
  '/catalogo',
  '/configuracion',
  '/contenedores',
  '/ecommerce',
  '/inventario',
  '/ordenes-b2b',
  '/api/debug-permissions',
  '/api/debug-user',
  '/api/inventario',
  '/api/ordenes-b2b',
]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
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
    }
  )

  const { pathname } = request.nextUrl

  // Obtener estado de Auth desde Supabase (solo valida JWT, no si está en la DB relacional)
  const { data: { user } } = await supabase.auth.getUser()

  const isProtectedRoute = PROTECTED_ROUTES.some(route =>
    pathname.startsWith(route)
  )

  // 1. Si no hay sesión válida y trata de acceder a lugar protegido -> a login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // IMPORTANTE: Ya NO redirigimos automáticamente de /login a /dashboard basados solo en el JWT.
  // ¿Por qué? Porque si el usuario fue eliminado o está inactivo en la base de datos "usuarios",
  // el JWT local seguiría diciendo "activo", causando un loop infinito entre proxy y layout.
  // La redirección de usuarios logueados se manejará en la página principal (login/page.tsx) 
  // usando una validación a nivel de base de datos total.

  return supabaseResponse
}
