// app/(admin)/despachos/nuevo/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function NuevoDespachoLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="border rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  )
}
