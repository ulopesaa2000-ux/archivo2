// app/(admin)/layout.tsx
import { Suspense } from 'react'
import { verifySession } from '@/lib/dal'
import { fetchBodegasUsuario } from '@/modules/auth/queries'
import { Sidebar } from '@/components/admin/Sidebar'
import { Header } from '@/components/admin/Header'
import type { UsuarioConRol, BodegaRow } from '@/lib/types/tables'

export type AdminContext = {
  user: UsuarioConRol
  bodegas: BodegaRow[]
}

// ✅ 1. Componente interno con la lógica pesada
// Usa verifySession del DAL que automaticamente redirige si no hay sesión
// y usa React.cache() para evitar múltiples llamadas a la DB
async function AdminShell({ children }: { children: React.ReactNode }) {
  const { user } = await verifySession()

  const bodegas = await fetchBodegasUsuario(
    user.id,
    user.rol?.nivel_acceso ?? 99
  )

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} bodegas={bodegas} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

// ✅ 2. Layout principal envuelto en Suspense
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    }>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  )
}
