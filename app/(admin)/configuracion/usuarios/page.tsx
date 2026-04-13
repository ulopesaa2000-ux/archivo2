// app/(admin)/configuracion/usuarios/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Usuarios' }

export default function UsuariosPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground">
          Gestión de usuarios, permisos y accesos
        </p>
      </div>
      <p className="text-sm text-muted-foreground py-8 text-center">
        Módulo en desarrollo — Fase 8
      </p>
    </div>
  )
}
