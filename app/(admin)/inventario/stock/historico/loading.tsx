// app/(admin)/inventario/stock/historico/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function StockHistoricoLoading() {
  return (
    <div className="space-y-4 pb-12">
      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-[170px]" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-36" />
      </div>

      <div className="rounded-md border">
        <div className="border-b bg-muted/50 p-3">
          <Skeleton className="h-4 w-full" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="border-b p-3">
            <Skeleton className="h-6 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
