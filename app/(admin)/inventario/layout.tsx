// app/(admin)/inventario/layout.tsx
import { verifyModuleAccess } from '@/lib/dal'

export default async function InventarioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await verifyModuleAccess('inventario')
  return <>{children}</>
}
