// app/(store)/catalogo/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { fetchProductosWebPublicos } from '@/modules/ecommerce/queries'
import { fetchConfigEcommerce } from '@/modules/ecommerce/queries'
import { ProductGrid } from '@/components/store/catalogo/ProductGrid'
import { FilterSidebar } from '@/components/store/catalogo/FilterSidebar'
import { CatalogSkeleton } from '@/components/store/catalogo/CatalogSkeleton'

export const metadata: Metadata = {
  title: 'Catálogo',
}

interface CatalogoPageProps {
  searchParams: Promise<{
    q?: string
    marca?: string
    tipo?: string
    oferta?: string
    nuevo?: string
    destacado?: string
    page?: string
  }>
}

export default async function CatalogoPage({ searchParams }: CatalogoPageProps) {
  const params = await searchParams
  const config = await fetchConfigEcommerce()
  
  const filtros = {
    q: params.q,
    marca_id: params.marca ? parseInt(params.marca) : undefined,
    tipo_prenda_id: params.tipo ? parseInt(params.tipo) : undefined,
    en_oferta: params.oferta === 'true',
    nuevo: params.nuevo === 'true',
    destacado: params.destacado === 'true',
    page: params.page ? parseInt(params.page) : 1,
  }

  const { productos, total } = await fetchProductosWebPublicos(filtros)

  return (
    <div className="flex flex-col min-h-screen">
      <div className="py-4 px-8 bg-store-bg border-b border-store-border text-[12px] text-store-ink3">
        Inicio &rarr; <strong className="text-store-ink font-medium">Catálogo</strong>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] flex-1">
        {/* Sidebar filtros */}
        <aside className="border-r border-store-border bg-store-bg pt-6 px-6 pb-12">
          <Suspense fallback={<div className="h-96 bg-store-surface animate-pulse rounded-lg border border-store-border" />}>
            <FilterSidebar />
          </Suspense>
        </aside>

        {/* Grid productos */}
        <main className="bg-store-surface pt-6 px-8 pb-12">
          <div className="flex justify-between items-center bg-store-surface pb-4 mb-6 border-b border-store-border">
            <div className="text-[14px] text-store-ink2">
              <strong className="text-store-ink">{total}</strong> productos encontrados
            </div>
          </div>

          <Suspense fallback={<CatalogSkeleton />}>
            <ProductGrid 
              productos={productos} 
              config={config}
              total={total}
              currentPage={filtros.page || 1}
            />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
