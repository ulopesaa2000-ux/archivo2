// app/(admin)/inventario/trazabilidad/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function TrazabilidadLoading() {
  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="space-y-1">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Controles de Filtros */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <Skeleton className="h-9 lg:col-span-4 rounded-md" />
          <Skeleton className="h-9 lg:col-span-3 rounded-md" />
          <Skeleton className="h-9 lg:col-span-2 rounded-md" />
          <Skeleton className="h-9 lg:col-span-2 rounded-md" />
          <Skeleton className="h-9 lg:col-span-1 rounded-md" />
        </div>
      </div>

      {/* 4 KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* 2 Widgets de Rotación */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>

      {/* Tabla Matriz */}
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
}
