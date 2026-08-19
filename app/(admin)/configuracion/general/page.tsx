// app/(admin)/configuracion/general/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser, fetchBodegasUsuario } from '@/modules/auth/queries'
import { ConfiguracionGeneralForm } from './ConfiguracionGeneralForm'
import { ChevronRight, Home, Settings } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Configuración General | inv-tienda',
  description: 'Administración de interfaz, dashboard por roles y preferencias generales',
}

export default async function ConfiguracionGeneralPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=/configuracion/general')
  }

  const bodegas = await fetchBodegasUsuario(user.id, user.rol?.nivel_acceso ?? 99)

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      {/* ── Breadcrumbs ── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
        <Link
          href="/configuracion/usuarios"
          className="hover:text-foreground transition-colors"
        >
          <span>Configuración</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
        <span className="text-foreground font-semibold flex items-center gap-1">
          <Settings className="w-3.5 h-3.5 text-primary" />
          <span>General</span>
        </span>
      </nav>

      {/* ── Encabezado ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Configuración General del Sistema
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Personaliza las vistas del dashboard, gestiona el comportamiento del menú y visualiza los permisos por nivel de usuario.
        </p>
      </div>

      {/* ── Formulario y Configuración ── */}
      <ConfiguracionGeneralForm user={user} bodegas={bodegas} />
    </div>
  )
}
