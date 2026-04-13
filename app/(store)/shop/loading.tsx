// app/(store)/catalogo/loading.tsx
import { CatalogSkeleton } from '@/components/store/catalogo/CatalogSkeleton'

export default function CatalogoLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-64 flex-shrink-0">
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
        </aside>
        <main className="flex-1">
          <div className="mb-6">
            <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
          <CatalogSkeleton />
        </main>
      </div>
    </div>
  )
}
