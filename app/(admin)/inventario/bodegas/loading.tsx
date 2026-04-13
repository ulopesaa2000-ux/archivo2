// app/(admin)/inventario/bodegas/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function BodegasLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-36" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[160px] w-full rounded-lg" />
      ))}
    </div>
  )
}
