// app/(admin)/perfil/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser, fetchBodegasUsuario } from '@/modules/auth/queries'
import { PerfilForm } from './PerfilForm'
import { ChevronRight, Home, User } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Mi Perfil | inv-tienda',
  description: 'Información y configuración del perfil de usuario',
}

export default async function PerfilPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=/perfil')
  }

  const bodegas = await fetchBodegasUsuario(user.id, user.rol?.nivel_acceso ?? 3)

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-5xl mx-auto">
      {/* ── Breadcrumb ── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
        <span className="text-foreground font-semibold flex items-center gap-1">
          <User className="w-3.5 h-3.5 text-primary" />
          <span>Mi Perfil</span>
        </span>
      </nav>

      {/* ── Formulario y Vistas del Perfil ── */}
      <PerfilForm user={user} bodegas={bodegas} />
    </div>
  )
}
