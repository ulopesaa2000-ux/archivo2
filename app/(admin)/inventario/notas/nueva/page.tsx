// app/(admin)/inventario/notas/nueva/page.tsx
import type { Metadata } from 'next'
import { fetchCatalogosInventario } from '@/modules/inventario/queries'
import { verifySession } from '@/lib/dal'
import { fetchBodegasUsuario } from '@/modules/auth/queries'
import { NoteDraftBuilder } from './NoteDraftBuilder'

export const metadata: Metadata = {
  title: 'Nueva Nota de Inventario',
}

/**
 * Página de creación de nota.
 * Server Component que carga catálogos y pasa todo al Client Component.
 * El usuario arma la nota completamente en local (draft).
 * Solo al presionar "Guardar como Borrador" o "Confirmar" se escribe a BD.
 */
export default async function NuevaNotaPage() {
  const catalogosPromise = fetchCatalogosInventario()
  const [{ user }, catalogos] = await Promise.all([
    verifySession(),
    catalogosPromise,
  ])

  const userBodegas = await fetchBodegasUsuario(user.id, user.rol?.nivel_acceso ?? 3)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Nueva Nota de Inventario
        </h1>
        <p className="text-sm text-muted-foreground">
          Configura y agrega productos. Nada se guarda hasta que presiones un botón.
        </p>
      </div>

      <NoteDraftBuilder
        catalogos={catalogos}
        usuarioId={user.id}
        mode="create"
        currentUserLevel={user.rol?.nivel_acceso ?? 3}
        userBodegas={userBodegas}
      />
    </div>
  )
}
