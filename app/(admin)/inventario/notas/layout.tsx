// C:\Users\uriel\Downloads\enero 26\archivo2\app\(admin)\inventario\notas\layout.tsx
import { requirePermission } from '@/lib/dal'

export default async function InventarioNotasLayout({ children }: { children: React.ReactNode }) {
  await requirePermission('inventario_notas')
  return <>{children}</>
}
