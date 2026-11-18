// app/(admin)/inventario/notas/propuestas/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function PropuestasNotasLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Skeleton className="h-7 w-64" />
      <div className="border rounded-xl p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  )
}
