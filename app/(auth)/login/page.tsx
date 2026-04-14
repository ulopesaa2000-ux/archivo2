// app/(auth)/login/page.tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LoginForm } from './LoginForm'
import { getCurrentUser } from '@/modules/auth/queries'

export const metadata: Metadata = {
  title: 'Iniciar Sesión',
  description: 'Accede al panel de administración de inv-tienda',
}

/**
 * Página de login.
 * 
 * Es un Server Component que verifica de manera integral:
 * 1. Si el usuario existe en nuestra DB (getCurrentUser hace esto internamente validando Supabase Auth).
 * 2. Si es válido, lo envía en un solo salto a /dashboard.
 * 3. Si no es válido (ej. falta token, o usuario inactivo), muestra el form.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; expired?: string; error?: string }>
}) {
  const params = await searchParams;
  const redirectTo = params?.redirect || '/dashboard';
  const sessionExpired = params?.expired === 'true';
  const noProfile = params?.error === 'no_profile';

  // Validación final: si de verdad tiene una cuenta activa en base de datos
  // salta directo, si no, se queda en el login a ver por qué falló su validación
  const verifiedUser = await getCurrentUser();
  if (verifiedUser) {
    redirect(redirectTo);
  }

  return (
    <>
      <div className="text-center space-y-2">
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

      <LoginForm redirectTo={redirectTo} />
    </>
  )
}
