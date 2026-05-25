// C:\Users\uriel\Downloads\enero 26\archivo2\app\(admin)\inventario\bodegas\layout.tsx
import { requirePermission } from '@/lib/dal'

export default async function InventarioBodegasLayout({ children }: { children: React.ReactNode }) {
  await requirePermission('inventario_bodegas')
  return <>{children}</>
}
