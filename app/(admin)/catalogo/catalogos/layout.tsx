// C:\Users\uriel\Downloads\enero 26\archivo2\app\(admin)\catalogo\catalogos\layout.tsx
import { requirePermission } from '@/lib/dal'

export default async function CatalogosSoporteLayout({ children }: { children: React.ReactNode }) {
  await requirePermission('catalogo_catalogos')
  return <>{children}</>
}
