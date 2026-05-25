// C:\Users\uriel\Downloads\enero 26\archivo2\app\(admin)\catalogo\imagenes\layout.tsx
import { requirePermission } from '@/lib/dal'

export default async function CatalogoImagenesLayout({ children }: { children: React.ReactNode }) {
  await requirePermission('catalogo_imagenes')
  return <>{children}</>
}
