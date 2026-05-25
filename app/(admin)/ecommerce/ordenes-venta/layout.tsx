// C:\Users\uriel\Downloads\enero 26\archivo2\app\(admin)\ecommerce\ordenes-venta\layout.tsx
import { requirePermission } from '@/lib/dal'

export default async function EcommerceOrdenesLayout({ children }: { children: React.ReactNode }) {
  await requirePermission('ecommerce_ordenes')
  return <>{children}</>
}
