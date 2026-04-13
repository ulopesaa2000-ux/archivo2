// app/(admin)/loading.tsx
import { ListPageSkeleton } from '@/components/admin/PageSkeleton'

/**
 * Loading genérico del admin.
 * Se muestra DENTRO del shell (sidebar + header ya están visibles).
 * Solo se muestra el skeleton del contenido.
 */
export default function AdminLoading() {
  return <ListPageSkeleton />
}
