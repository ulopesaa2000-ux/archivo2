// app/(admin)/configuracion/usuarios/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function UsuariosLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="hidden sm:flex gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="text-center space-y-1">
              <Skeleton className="h-7 w-8 mx-auto" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Tab skeleton */}
      <Skeleton className="h-10 w-64 rounded-lg" />

      {/* List skeleton */}
      <div className="border rounded-lg overflow-hidden">
        <Skeleton className="h-10 w-full" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 border-b last:border-0">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-44 rounded-md" />
              <Skeleton className="h-6 w-10 rounded-full" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
