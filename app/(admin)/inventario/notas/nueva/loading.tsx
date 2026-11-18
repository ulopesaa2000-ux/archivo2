// app/(admin)/inventario/notas/nueva/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function NuevaNotaLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Skeleton className="h-7 w-56" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  )
}
