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
import { requirePermission } from '@/lib/dal'
import { getCurrentUser } from '@/modules/auth/queries'
import { can } from '@/lib/auth/permissions'

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
    sort_by: params.sort_by,
    order: params.order as 'asc' | 'desc',
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

async function OrdenesB2BToolbar({ puedeCrear }: { puedeCrear: boolean }) {
  const catalogos = await fetchCatalogosB2B()

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {puedeCrear && <OrdenFormDialog mode="create" catalogos={catalogos} />}
      </div>
      <OrdenesFilters catalogos={catalogos} />
    </div>
  )
}

async function OrdenesB2BTable({
  searchParams,
  puedeEditar,
  puedeEliminar,
}: {
  searchParams: SearchParams
  puedeEditar: boolean
  puedeEliminar: boolean
}) {
  const filtros = await buildFiltros(searchParams)
  const [tableConfig, { items, total }, catalogos] = await Promise.all([
    fetchUserTableConfig('/ordenes-b2b'),
    fetchOrdenesB2B(filtros),
    fetchCatalogosB2B(),
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
      <OrdenesTable 
        items={items} 
        catalogos={catalogos}
        initialFeatures={features} 
        sortKey={filtros.sort_by}
        sortOrder={filtros.order}
        canEdit={puedeEditar}
        canDelete={puedeEliminar}
      />
      <Pagination total={total} />
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { getCommercialScope } from '@/lib/auth/commercial-scope'

export default async function OrdenesB2BPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission('b2b_ordenes')
  const user = await getCurrentUser()
  const supabase = await createClient()
  const scope = await getCommercialScope(supabase, user)

  const puedeCrear = can(user, 'b2b_ordenes', 'puede_crear')
  const puedeEditar = can(user, 'b2b_ordenes', 'puede_editar')
  const puedeEliminar = can(user, 'b2b_ordenes', 'puede_eliminar')

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Órdenes B2B</h1>
      <Suspense fallback={<ToolbarSkeleton />}>
        <OrdenesB2BToolbar puedeCrear={puedeCrear} />
      </Suspense>
      <Suspense fallback={<ListPageSkeleton />}>
        <OrdenesB2BTable searchParams={searchParams} puedeEditar={puedeEditar} puedeEliminar={puedeEliminar} />
      </Suspense>
    </div>
  )
}
