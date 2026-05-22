// app/(admin)/inventario-virtual/layout.tsx
import { verifyModuleAccess } from '@/lib/dal'

export default async function InventarioVirtualLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await verifyModuleAccess('inventario-virtual')
  return <>{children}</>
}
