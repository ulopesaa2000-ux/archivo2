// app/(admin)/configuracion/tablas/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function TablasLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-60" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="border rounded-xl p-4 space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}
