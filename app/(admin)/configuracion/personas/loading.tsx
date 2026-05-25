// app/(admin)/configuracion/personas/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function PersonasLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="hidden sm:flex gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="text-center space-y-1">
              <Skeleton className="h-7 w-8 mx-auto" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Selector skeleton */}
      <Skeleton className="h-10 w-80 rounded-lg" />

      {/* List skeleton */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <Skeleton className="h-10 w-full" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 border-b last:border-0">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-8 w-32 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
