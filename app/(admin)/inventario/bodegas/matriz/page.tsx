// app/(admin)/inventario/bodegas/matriz/page.tsx
import type { Metadata } from 'next'
import { fetchBodegas, fetchTodasAsignacionesBodega } from '@/modules/inventario/queries'
import { fetchUsuarios } from '@/modules/config/queries'
import { getCurrentUser } from '@/modules/auth/queries'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import { MatrizPermisosClient } from './MatrizPermisosClient'
import { ShieldCheck, ChevronLeft, Building2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Matriz de Permisos - Admin',
}

export default async function MatrizPermisosPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // Permitido solo a Nivel 1 (Super Admin) y Nivel 2 (Jefes de Area / Comercial / Inventario)
  const nivelAcceso = user.rol?.nivel_acceso ?? 99
  if (nivelAcceso > 2) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/40 border border-muted/50 rounded-xl max-w-lg mx-auto shadow-sm">
        <Building2 className="h-16 w-16 text-muted-foreground/50 stroke-[1.5]" />
        <h2 className="text-xl font-bold mt-4 text-foreground">Acceso Denegado</h2>
        <p className="text-sm mt-2 text-center max-w-sm px-6">
          No cuentas con los permisos suficientes para gestionar la matriz consolidada de bodegas. Esta sección es exclusiva para Directivos y Jefes de Operación.
        </p>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-6')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Volver al Dashboard
        </Link>
      </div>
    )
  }

  // Carga de datos en paralelo
  const [bodegas, usuarios, asignaciones] = await Promise.all([
    fetchBodegas(),
    fetchUsuarios(),
    fetchTodasAsignacionesBodega(),
  ])

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
        <Link href="/dashboard" className="hover:text-primary transition-colors">
          Inicio
        </Link>
        <span>/</span>
        <Link href="/inventario/bodegas" className="hover:text-primary transition-colors">
          Bodegas
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Matriz de Permisos</span>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 bg-gradient-to-r from-foreground to-foreground/75 bg-clip-text text-transparent">
            <ShieldCheck className="h-8 w-8 text-primary shrink-0" />
            Matriz de Permisos por Bodega
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión centralizada de accesos y autorizaciones operativas para Jefes Operativos y Encargados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/inventario/bodegas"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Regresar a Bodegas
          </Link>
        </div>
      </div>

      {/* Client-side visual matrix */}
      <MatrizPermisosClient 
        bodegas={bodegas}
        usuarios={usuarios}
        asignacionesIniciales={asignaciones}
      />
    </div>
  )
}
