// app/(admin)/catalogo/imagenes/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-4">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
        <Skeleton className="h-9 w-64" />
      </div>

      {/* Filters Skeleton */}
      <Skeleton className="h-10 w-full" />

      {/* Banner Skeleton con feedback visual */}
      <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
        <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
        <span className="text-xs font-medium text-primary animate-pulse">
          Agrupando imágenes de lo más reciente a lo más antiguo...
        </span>
      </div>

      {/* Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-72 rounded-xl border bg-muted/20 animate-pulse p-3 space-y-2">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-48 bg-muted/40 rounded-lg" />
            <div className="h-3 w-36 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
