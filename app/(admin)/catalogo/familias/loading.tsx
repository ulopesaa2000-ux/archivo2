// app/(admin)/catalogo/familias/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function FamiliasLoading() {
  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Barra de herramientas superior */}
      <div className="p-3 bg-card border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-72 rounded-md" />
          <Skeleton className="h-7 w-48 rounded-md" />
          <Skeleton className="h-7 w-40 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      {/* Contenedor 3 Columnas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Columna Izquierda: Bandeja Sin Asignar */}
        <aside className="w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-card shrink-0 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28 rounded" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-7 w-full rounded" />
          <div className="space-y-2 pt-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 p-2 border rounded">
                <Skeleton className="h-8 w-8 rounded shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-20 rounded" />
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Columna Central: Directorio / Workspace */}
        <main className="flex-1 flex flex-col p-6 space-y-4 overflow-hidden bg-muted/10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 bg-card space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-28 rounded" />
                  <Skeleton className="h-5 w-10 rounded-full" />
                </div>
                <Skeleton className="h-3.5 w-3/4 rounded" />
                <div className="flex gap-2 pt-2 border-t">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Columna Derecha: Inspector y Cambios */}
        <aside className="w-80 border-l border-zinc-200 dark:border-zinc-800 flex flex-col bg-card shrink-0 p-4 space-y-4">
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="w-full aspect-[4/3] rounded-lg" />
          <div className="space-y-2 pt-2 border-t">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-14 w-full rounded" />
            <Skeleton className="h-14 w-full rounded" />
          </div>
        </aside>
      </div>
    </div>
  )
}
