// C:\Users\uriel\Downloads\enero 26\archivo2\app\(admin)\ecommerce\config\layout.tsx
import { requirePermission } from '@/lib/dal'

export default async function EcommerceConfigLayout({ children }: { children: React.ReactNode }) {
  await requirePermission('ecommerce_config')
  return <>{children}</>
}
