import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ListPageSkeleton } from '@/components/admin/PageSkeleton'
import { fetchOrdenesB2B, fetchCatalogosB2B } from '@/modules/ordenes-b2b/queries'
import { fetchUserTableConfig } from '@/modules/admin-table/config/queries'
import { getDefaultFeatures } from '@/modules/admin-table/config/defaults'
import { OrdenesFilters } from './OrdenesFilters'
import { OrdenesTable } from './OrdenesTable'
import { Pagination } from '@/components/admin/Pagination'
import { OrdenFormDialog } from './OrdenFormDialog'
import type { FiltrosOrdenesB2B } from '@/modules/ordenes-b2b/types'
import type { TableFeatures } from '@/components/admin/DataTable/types'

type SearchParams = Promise<{
  q?: string
  estado?: string
  proveedor_id?: string
  page?: string
} & Record<string, string | undefined>>

export const metadata: Metadata = { title: 'Órdenes B2B' }

async function buildFiltros(searchParams: SearchParams): Promise<FiltrosOrdenesB2B> {
  const params = await searchParams
  const yearParam = params['a\u00f1o'] ?? params['a\u00c3\u00b1o'] ?? params.anio
  const filtros: FiltrosOrdenesB2B = {
    q: params.q,
    estado: params.estado,
    proveedor_id: params.proveedor_id ? parseInt(params.proveedor_id) : undefined,
    page: params.page ? parseInt(params.page) : 1,
  }

  if (yearParam) {
    ;(filtros as unknown as Record<string, number>)['a\u00c3\u00b1o'] = parseInt(yearParam)
  }

  return filtros
}

function ToolbarSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="h-9 w-full max-w-sm rounded bg-muted animate-pulse" />
      <div className="h-9 w-44 rounded bg-muted animate-pulse" />
      <div className="h-9 w-48 rounded bg-muted animate-pulse" />
      <div className="ml-auto h-9 w-32 rounded bg-muted animate-pulse" />
    </div>
  )
}

async function OrdenesB2BToolbar() {
  const catalogos = await fetchCatalogosB2B()

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <OrdenFormDialog mode="create" catalogos={catalogos} />
      </div>
      <OrdenesFilters catalogos={catalogos} />
    </div>
  )
}

async function OrdenesB2BTable({ searchParams }: { searchParams: SearchParams }) {
  const filtros = await buildFiltros(searchParams)
  const [tableConfig, { items, total }] = await Promise.all([
    fetchUserTableConfig('/ordenes-b2b'),
    fetchOrdenesB2B(filtros),
  ])

  const { config: userFeatures } = tableConfig
  const features: TableFeatures = {
    ...getDefaultFeatures('/ordenes-b2b'),
    ...userFeatures,
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {total} orden{total !== 1 ? 'es' : ''}
      </p>
      <OrdenesTable items={items} initialFeatures={features} />
      <Pagination total={total} />
    </div>
  )
}

export default function OrdenesB2BPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Órdenes B2B</h1>
      <Suspense fallback={<ToolbarSkeleton />}>
        <OrdenesB2BToolbar />
      </Suspense>
      <Suspense fallback={<ListPageSkeleton />}>
        <OrdenesB2BTable searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
