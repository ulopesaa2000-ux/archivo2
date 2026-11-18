// app/(admin)/ordenes-b2b/cajas/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function CajasB2BLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="border rounded-xl p-4 space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}
