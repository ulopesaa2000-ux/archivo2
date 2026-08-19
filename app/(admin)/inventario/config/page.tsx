// app/(admin)/inventario/config/page.tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Settings, ChevronLeft, ShieldCheck, Warehouse } from 'lucide-react'
import { getCurrentUser } from '@/modules/auth/queries'
import { isSuperAdmin } from '@/lib/auth/permissions'
import { fetchConfigInventarioLive } from '@/modules/inventario/config-queries'
import { fetchBodegas, fetchTodasAsignacionesBodega } from '@/modules/inventario/queries'
import { fetchRolesConPermisos, fetchUsuarios } from '@/modules/config/queries'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import { InventarioConfigForm } from '@/components/admin/inventario/config/InventarioConfigForm'
import type { RolRow } from '@/lib/types/tables'

export const metadata: Metadata = {
  title: 'Configuración de Inventario',
  description: 'Gestión global de políticas, permisos de notas, orden de bodegas y vistas de stock.',
}

export default async function InventarioConfigPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const nivel = user.rol?.nivel_acceso ?? 99
  if (nivel > 2 && !isSuperAdmin(user)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/40 border rounded-xl max-w-lg mx-auto shadow-sm">
        <Warehouse className="h-16 w-16 text-muted-foreground/50 stroke-[1.5]" />
        <h2 className="text-xl font-bold mt-4 text-foreground">Acceso Denegado</h2>
        <p className="text-sm mt-2 text-center max-w-sm px-6">
          No cuentas con los permisos necesarios para modificar la configuración global de inventario.
        </p>
        <Link
          href="/inventario/stock"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-6')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Volver al Stock
        </Link>
      </div>
    )
  }

  // Carga de datos en paralelo
  const [config, bodegas, rolesConPermisos, usuarios, asignaciones] = await Promise.all([
    fetchConfigInventarioLive(),
    fetchBodegas(),
    fetchRolesConPermisos(),
    fetchUsuarios(),
    fetchTodasAsignacionesBodega(),
  ])

  const roles: RolRow[] = rolesConPermisos.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    nivel_acceso: r.nivel_acceso,
    created_at: null,
  }))

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
        <Link href="/dashboard" className="hover:text-primary transition-colors">
          Inicio
        </Link>
        <span>/</span>
        <Link href="/inventario/stock" className="hover:text-primary transition-colors">
          Inventario
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Configuración</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2.5 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            <Settings className="h-8 w-8 text-primary shrink-0" />
            Configuración de Inventario
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control global de políticas operativas, permisos por tipo de movimiento, orden de bodegas y reportes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/inventario/stock"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Ir a Stock
          </Link>
        </div>
      </div>

      {/* Formulario Principal con Pestañas */}
      <InventarioConfigForm
        initialConfig={config}
        bodegas={bodegas}
        roles={roles}
        usuarios={usuarios}
        asignaciones={asignaciones}
      />
    </div>
  )
}
