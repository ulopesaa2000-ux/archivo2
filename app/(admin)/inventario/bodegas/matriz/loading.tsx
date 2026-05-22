// app/(admin)/inventario/bodegas/matriz/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function MatrizLoading() {
  return (
    <div className="space-y-6">
      {/* Header breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Skeleton className="h-4 w-16" />
        <span>/</span>
        <Skeleton className="h-4 w-16" />
        <span>/</span>
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Main title & description block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-4 w-[500px]" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>

      {/* Matrix Card Skeleton */}
      <div className="border rounded-xl bg-card overflow-hidden">
        {/* Table Filter header */}
        <div className="p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-9 w-80" />
        </div>

        {/* Matrix Table body */}
        <div className="p-0 overflow-x-auto">
          <div className="min-w-full">
            {/* Header row */}
            <div className="flex border-b bg-muted/20 p-4 gap-4">
              <Skeleton className="h-6 w-[280px]" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 flex-1 min-w-[200px]" />
              ))}
            </div>
            {/* Table Rows */}
            {Array.from({ length: 5 }).map((_, r) => (
              <div key={r} className="flex border-b p-4 gap-4 items-center">
                <div className="w-[280px] space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                {Array.from({ length: 4 }).map((_, c) => (
                  <div key={c} className="flex-1 min-w-[200px] flex justify-center">
                    <Skeleton className="h-16 w-36 rounded-lg" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
