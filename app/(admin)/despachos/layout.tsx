// app/(admin)/despachos/layout.tsx
import { verifyModuleAccess } from '@/lib/dal'

export default async function DespachosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await verifyModuleAccess('despachos')
  return <>{children}</>
}
