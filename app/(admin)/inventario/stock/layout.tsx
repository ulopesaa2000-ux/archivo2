// C:\Users\uriel\Downloads\enero 26\archivo2\app\(admin)\inventario\stock\layout.tsx
import { requirePermission } from '@/lib/dal'

export default async function InventarioStockLayout({ children }: { children: React.ReactNode }) {
  await requirePermission('inventario_stock')
  return <>{children}</>
}
