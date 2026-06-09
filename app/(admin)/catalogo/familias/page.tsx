// app/(admin)/catalogo/familias/page.tsx
import type { Metadata } from 'next'
import { fetchResumenFamilias } from '@/modules/catalogo/queries'
import { getCurrentUser } from '@/modules/auth/queries'
import { redirect } from 'next/navigation'
import { can } from '@/lib/auth/permissions'
import { FamiliasOrganizerClient } from '@/app/(admin)/catalogo/familias/FamiliasOrganizerClient'

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
    <FamiliasOrganizerClient
      initialFamilias={familias}
      puedeEditar={puedeEditar}
    />
  )
}
