// app/(admin)/ordenes-b2b/orden-rapida/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function OrdenRapidaLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Skeleton className="h-7 w-60" />
      <div className="border rounded-xl p-6 space-y-4">
        <Skeleton className="h-10 w-full max-w-lg" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </div>
  )
}
