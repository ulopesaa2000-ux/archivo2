// app/(admin)/ecommerce/layout.tsx
import { verifyModuleAccess } from '@/lib/dal'

export default async function EcommerceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await verifyModuleAccess('ecommerce')
  return <>{children}</>
}
