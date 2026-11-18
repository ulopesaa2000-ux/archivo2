// app/(admin)/configuracion/roles/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function RolesLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="border rounded-xl p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  )
}
