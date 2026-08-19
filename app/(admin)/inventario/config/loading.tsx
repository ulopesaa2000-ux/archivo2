// app/(admin)/inventario/config/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function InventarioConfigLoading() {
  return (
    <div className="space-y-6 animate-pulse p-1">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-4 w-96 rounded-md" />
      </div>

      <div className="flex gap-2 border-b pb-2">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-44 rounded-lg" />
        <Skeleton className="h-10 w-44 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      <div className="space-y-4 rounded-xl border p-6 bg-card">
        <Skeleton className="h-6 w-48 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
