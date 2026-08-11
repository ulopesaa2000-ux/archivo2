// app/(admin)/configuracion/tablas-soporte/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function TablasSoporteLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2 overflow-x-auto border-b pb-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-lg" />
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 bg-card p-4 rounded-xl border">
        <Skeleton className="h-10 w-full sm:w-80" />
        <Skeleton className="h-10 w-44" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}
