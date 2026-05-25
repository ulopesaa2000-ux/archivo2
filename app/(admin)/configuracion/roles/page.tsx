import type { Metadata } from 'next'
import { fetchRolesConPermisos } from '@/modules/config/queries'
import { getCurrentUser } from '@/modules/auth/queries'
import { RolesManager } from './RolesManager'

export const metadata: Metadata = { title: 'Roles y Permisos' }

export default async function RolesPage() {
  const [roles, currentUser] = await Promise.all([
    fetchRolesConPermisos(),
    getCurrentUser(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roles y Permisos</h1>
        <p className="text-sm text-muted-foreground">
          Configura permisos reales por módulo para menú, páginas y acciones.
        </p>
      </div>
      <RolesManager
        roles={roles}
        currentUser={currentUser}
      />
    </div>
  )
}
