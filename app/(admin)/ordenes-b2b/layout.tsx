// app/(admin)/ordenes-b2b/layout.tsx
import { verifyModuleAccess } from '@/lib/dal'

export default async function OrdenesB2BLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await verifyModuleAccess('ordenes-b2b')
  return <>{children}</>
}
