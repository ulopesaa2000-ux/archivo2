// hooks/useSession.ts
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

type SessionState = {
  session: Session | null
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

/**
 * Hook para Client Components que necesitan reactividad de auth.
 * 
 * Usos principales:
 *   - Detectar cuando la sesión expira → redirigir a login
 *   - Mostrar/ocultar elementos según autenticación
 *   - Refrescar datos cuando cambia el usuario
 * 
 * NO usar para proteger rutas (eso lo hace el middleware).
 * NO usar en Server Components (usar getCurrentUser() en su lugar).
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    session: null,
    user: null,
    isLoading: true,
    isAuthenticated: false,
  })

  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        session,
        user: session?.user ?? null,
        isLoading: false,
        isAuthenticated: !!session,
      })
    })

    // Suscribirse a cambios de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setState({
        session,
        user: session?.user ?? null,
        isLoading: false,
        isAuthenticated: !!session,
      })

      // Si la sesión expira mientras está navegando → redirect a login
      if (event === 'SIGNED_OUT') {
        router.push('/login?expired=true')
      }

      // Si se refresca el token → refrescar datos del server
      if (event === 'TOKEN_REFRESHED') {
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return state
}
