// C:\Users\uriel\Downloads\enero 26\archivo2\app\(admin)\ecommerce\productos-web\layout.tsx
import { requirePermission } from '@/lib/dal'

export default async function EcommerceProductosLayout({ children }: { children: React.ReactNode }) {
  await requirePermission('ecommerce_catalogo')
  return <>{children}</>
}
