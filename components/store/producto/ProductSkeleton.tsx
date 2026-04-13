// components/store/producto/ProductSkeleton.tsx
import { Skeleton } from '@/components/ui/skeleton'

export function ProductSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
      {/* Galería skeleton */}
      <div className="space-y-4">
        <Skeleton className="aspect-square rounded-lg" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-20 h-20 rounded-md" />
          ))}
        </div>
      </div>

      {/* Info skeleton */}
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-8 w-48" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-14" />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-24" />
            ))}
          </div>
        </div>

        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  )
}
