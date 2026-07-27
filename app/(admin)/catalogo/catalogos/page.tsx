// app/(admin)/catalogo/catalogos/page.tsx
import type { Metadata } from 'next'
import { Pagination } from '@/components/admin/Pagination'
import { fetchProductosCatalogo } from '@/modules/catalogo/queries'
import type { FiltrosCatalogo, CatalogoSortBy } from '@/modules/catalogo/types'
import { CatalogoFilters } from '@/app/(admin)/catalogo/CatalogoFilters'
import { CatalogosReadOnlyTable } from './components/CatalogosReadOnlyTable'
import { CatalogosReadOnlyGrid } from './components/CatalogosReadOnlyGrid'
import { CatalogosReadOnlyVistaToggle } from './components/CatalogosReadOnlyVistaToggle'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Consulta de Catálogo',
}

const VALID_SORT_BY: CatalogoSortBy[] = ['id', 'sku_base', 'familia', 'marca_id', 'pz_en_caja', 'precio_ec', 'estado']

type CatalogoSearchParams = {
  q?: string
  estado?: string
  marca_id?: string
  genero_id?: string
  destacados?: string
  incluir_inactivos?: string
  page?: string
  sort_by?: string
  order?: string
  vista?: string
}

function parseOptionalInt(value?: string) {
  if (!value) return undefined

  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? undefined : parsed
}

async function CatalogoData({
  filtros,
  sortBy,
  order,
  vista,
}: {
  filtros: FiltrosCatalogo
  sortBy: CatalogoSortBy
  order: 'asc' | 'desc'
  vista: 'grid' | 'tabla'
}) {
  const { productos, total, catalogos } = await fetchProductosCatalogo(filtros)

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Consulta de Catálogo
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} producto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''} (Solo lectura)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CatalogosReadOnlyVistaToggle />
        </div>
      </div>

      <CatalogoFilters catalogos={catalogos} sortBy={sortBy} order={order} />

      {vista === 'grid' ? (
        <CatalogosReadOnlyGrid productos={productos} />
      ) : (
        <CatalogosReadOnlyTable
          productos={productos}
          catalogos={catalogos}
          sortBy={sortBy}
          order={order}
        />
      )}

      <Pagination total={total} />
    </>
  )
}

function CatalogoSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  )
}

export default async function CatalogoReadOnlyPage({
  searchParams,
}: {
  searchParams: Promise<CatalogoSearchParams>
}) {
  const params = await searchParams

  const sortBy = (VALID_SORT_BY.includes(params.sort_by as CatalogoSortBy)
    ? params.sort_by
    : 'id') as CatalogoSortBy
  const order = params.order === 'asc' ? 'asc' : 'desc'

  const filtros: FiltrosCatalogo = {
    q: params.q,
    estado: params.estado,
    marca_id: parseOptionalInt(params.marca_id),
    genero_id: parseOptionalInt(params.genero_id),
    destacados: params.destacados === 'true',
    incluir_inactivos: params.incluir_inactivos === 'true',
    page: parseOptionalInt(params.page) ?? 1,
    sort_by: sortBy,
    order,
  }

  const vista = params.vista === 'tabla' ? 'tabla' : 'grid'

  return (
    <div className="space-y-4">
      <Suspense fallback={<CatalogoSkeleton />}>
        <CatalogoData filtros={filtros} sortBy={sortBy} order={order} vista={vista} />
      </Suspense>
    </div>
  )
}
