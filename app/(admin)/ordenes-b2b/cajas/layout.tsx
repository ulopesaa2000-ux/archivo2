// C:\Users\uriel\Downloads\enero 26\archivo2\app\(admin)\ordenes-b2b\cajas\layout.tsx
import { requirePermission } from '@/lib/dal'

export default async function B2BCajasLayout({ children }: { children: React.ReactNode }) {
  await requirePermission('b2b_cajas')
  return <>{children}</>
}
