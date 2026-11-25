// app/(admin)/layout.tsx
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { isClienteEcommerce } from '@/lib/auth/permissions'
import { fetchBodegasUsuario } from '@/modules/auth/queries'
import { fetchDocsRegistry } from '@/modules/docs/storage'
import { AdminLayoutClient } from '@/components/admin/AdminLayoutClient'
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

  if (isClienteEcommerce(user)) {
    redirect('/')
  }

  const [bodegas, { registry }] = await Promise.all([
    fetchBodegasUsuario(user.id, user.rol?.nivel_acceso ?? 99),
    fetchDocsRegistry(),
  ])

  return (
    <AdminLayoutClient user={user} bodegas={bodegas} docItems={registry.items}>
      {children}
    </AdminLayoutClient>
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

