// app/(admin)/configuracion/roles/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Roles y Permisos' }

export default function RolesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roles y Permisos</h1>
        <p className="text-muted-foreground">
          Configuración de roles y matriz de permisos
        </p>
      </div>
      <p className="text-sm text-muted-foreground py-8 text-center">
        Módulo en desarrollo — Fase 8
      </p>
    </div>
  )
}
