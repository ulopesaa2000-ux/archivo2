// app/(admin)/configuracion/usuarios/page.tsx
import type { Metadata } from 'next'
import { Shield } from 'lucide-react'
import { fetchUsuarios, fetchRolesConPermisos, fetchPersonasComercialesActivas, fetchTodosUsuarioPersonas } from '@/modules/config/queries'
import { getCurrentUser } from '@/modules/auth/queries'
import { UsuariosManager } from './UsuariosManager'

export const metadata: Metadata = {
  title: 'Usuarios y Permisos',
}

export default async function UsuariosPage() {
  const [usuarios, roles, currentUser, personasDisponibles, todasLasAsignaciones] = await Promise.all([
    fetchUsuarios(),
    fetchRolesConPermisos(),
    getCurrentUser(),
    fetchPersonasComercialesActivas(),
    fetchTodosUsuarioPersonas(),
  ])


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Usuarios y Permisos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona el acceso, roles y permisos por módulo de cada usuario.
          </p>
        </div>

        {/* Resumen rápido */}
        <div className="hidden sm:flex gap-4 text-sm shrink-0">
          <div className="text-center">
            <p className="font-semibold text-lg">{usuarios.filter((u) => u.activo).length}</p>
            <p className="text-muted-foreground text-xs">Activos</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg text-muted-foreground">{usuarios.filter((u) => !u.activo).length}</p>
            <p className="text-muted-foreground text-xs">Inactivos</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg">{roles.length}</p>
            <p className="text-muted-foreground text-xs">Roles</p>
          </div>
        </div>
      </div>

      {/* Manager interactivo */}
      <UsuariosManager
        usuarios={usuarios}
        roles={roles}
        currentUser={currentUser}
        personasDisponibles={personasDisponibles}
        todasLasAsignaciones={todasLasAsignaciones}
      />
    </div>
  )
}
