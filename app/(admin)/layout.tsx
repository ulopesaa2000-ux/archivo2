// app/(admin)/layout.tsx
import { redirect } from 'next/navigation'
import { getCurrentUser, fetchBodegasUsuario } from '@/modules/auth/queries'
import { Sidebar } from '@/components/admin/Sidebar'
import { Header } from '@/components/admin/Header'
import type { UsuarioConRol, BodegaRow } from '@/lib/types/tables'

export type AdminContext = {
  user: UsuarioConRol
  bodegas: BodegaRow[]
}

/**
 * LAYOUT PERSISTENTE DEL ADMIN
 * 
 * Este componente se renderiza UNA SOLA VEZ cuando el usuario
 * entra al admin. Al navegar entre /catalogo, /inventario, etc.
 * SOLO {children} se reemplaza vía client-side navigation.
 * 
 * El Sidebar, Header y BodegaSelector NUNCA se re-renderizan
 * ni pierden su estado durante la navegación.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ── Verificar autenticación ───────────────────────────────
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // ── Cargar bodegas accesibles ─────────────────────────────
  const bodegas = await fetchBodegasUsuario(
    user.id,
    user.rol?.nivel_acceso ?? 99
  )

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* ── Sidebar (Desktop: fijo, Mobile: drawer) ──────── */}
      <Sidebar user={user} />

      {/* ── Área principal ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Header (sticky, siempre visible) ─────────── */}
        <Header user={user} bodegas={bodegas} />

        {/* ── Contenido ({children} = lo único que cambia) ─ */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
