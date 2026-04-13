// app/(auth)/login/page.tsx
import type { Metadata } from 'next'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = {
  title: 'Iniciar Sesión',
  description: 'Accede al panel de administración de inv-tienda',
}

/**
 * Página de login.
 * 
 * Es un Server Component que:
 *   1. Renderiza la marca/logo
 *   2. Lee el searchParam ?redirect= para pasarlo al form
 *   3. Renderiza el LoginForm (Client Component)
 * 
 * El middleware ya se encargó de verificar:
 *   - Si hay sesión activa → redirigió a /dashboard
 *   - Si no hay sesión → dejó pasar a esta página
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; expired?: string; error?: string }>
}) {
  const params = await searchParams;
  const redirectTo = params?.redirect || '/dashboard'
  const sessionExpired = params?.expired === 'true'
  const noProfile = params?.error === 'no_profile'

  return (
    <>
      {/* ── Logo / Marca ──────────────────────────────────── */}
      <div className="text-center space-y-2">
        {/* Reemplazar con logo real si existe */}
        <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-lg">IT</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          inv-tienda
        </h1>
        <p className="text-sm text-muted-foreground">
          Panel de administración
        </p>
      </div>

      {/* ── Avisos de error ──────────────────────── */}
      {sessionExpired && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700 text-center">
          Tu sesión ha expirado. Inicia sesión de nuevo.
        </div>
      )}
      
      {noProfile && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive text-center">
          Tu cuenta no tiene un perfil válido o permisos en el sistema. Contacta al administrador.
        </div>
      )}

      {/* ── Formulario ────────────────────────────────────── */}
      <LoginForm redirectTo={redirectTo} />
    </>
  )
}
