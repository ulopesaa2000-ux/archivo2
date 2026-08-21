// app/(auth)/login/page.tsx
import type { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { LoginForm } from './LoginForm'
import { getCurrentUser } from '@/modules/auth/queries'

export const metadata: Metadata = {
  title: 'Iniciar Sesión | Idol Navy',
  description: 'Accede al catálogo y sistema de administración Idol Navy',
}

/**
 * Página de login.
 * 
 * Es un Server Component que verifica de manera integral:
 * 1. Si el usuario existe en nuestra DB (getCurrentUser hace esto internamente validando Supabase Auth).
 * 2. Si es válido, lo envía en un solo salto a /dashboard o / según su rol.
 * 3. Si no es válido (ej. falta token, o usuario inactivo), muestra el form.
 */
async function LoginContent({
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
    const isClientRole = verifiedUser.rol_id === 19 || (verifiedUser.rol?.nombre || '').toLowerCase().includes('cliente')
    const finalRedirect = (isClientRole && redirectTo === '/dashboard') ? '/' : redirectTo
    redirect(finalRedirect);
  }

  return (
    <>
      <div className="text-center space-y-3">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-white p-1 flex items-center justify-center shadow-xl shadow-slate-900/10 ring-1 ring-slate-200/60 dark:ring-slate-800">
          <Image
            src="/icons/icon-192.png"
            alt="Idol Navy Logo"
            width={56}
            height={56}
            className="w-full h-full object-contain rounded-xl"
            priority
          />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Idol Navy
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Catálogo • B2B • E-commerce
          </p>
        </div>
      </div>

      {sessionExpired && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-sm text-amber-600 dark:text-amber-400 text-center animate-in fade-in slide-in-from-top-1 duration-200">
          Tu sesión ha expirado. Inicia sesión de nuevo.
        </div>
      )}
      
      {noProfile && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-sm text-red-600 dark:text-red-400 text-center animate-in fade-in slide-in-from-top-1 duration-200">
          Tu cuenta no tiene un perfil válido o permisos en el sistema. Contacta al administrador.
        </div>
      )}

      <LoginForm redirectTo={redirectTo} />
    </>
  )
}

function LoginFallback() {
  return (
    <div className="space-y-4">
      <div className="mx-auto h-12 w-12 rounded-xl bg-muted animate-pulse" />
      <div className="mx-auto h-8 w-40 rounded bg-muted animate-pulse" />
      <div className="h-48 rounded-lg bg-muted animate-pulse" />
    </div>
  )
}

export default function LoginPage(props: {
  searchParams: Promise<{ redirect?: string; expired?: string; error?: string }>
}) {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent {...props} />
    </Suspense>
  )
}
