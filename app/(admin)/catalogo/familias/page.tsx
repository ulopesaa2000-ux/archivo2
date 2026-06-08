// app/(admin)/catalogo/familias/page.tsx
import type { Metadata } from 'next'
import { fetchResumenFamilias } from '@/modules/catalogo/queries'
import { getCurrentUser } from '@/modules/auth/queries'
import { redirect } from 'next/navigation'
import { can } from '@/lib/auth/permissions'
import { FamiliasOrganizerClient } from './FamiliasOrganizerClient'

export const metadata: Metadata = {
  title: 'Organizador de Familias',
  description: 'Clasifica y organiza productos en familias de indumentaria.',
}

export default async function FamiliasPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  // Verificar si tiene permiso para leer el catálogo
  if (!can(user, 'catalogo_productos', 'puede_leer')) {
    redirect('/unauthorized')
  }

  // Cargar resumen de familias desde la BD
  const familias = await fetchResumenFamilias()

  // Saber si el usuario tiene permiso para editar (mover/renombrar)
  const puedeEditar = can(user, 'catalogo_productos', 'puede_editar')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organizador de Familias</h1>
        <p className="text-sm text-muted-foreground">
          Agrupa y clasifica productos por familias. Usa la bandeja de trabajo para reacomodar productos en lotes.
        </p>
      </div>

      <FamiliasOrganizerClient
        initialFamilias={familias}
        puedeEditar={puedeEditar}
      />
    </div>
  )
}
