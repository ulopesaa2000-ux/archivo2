import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ListPageSkeleton } from '@/components/admin/PageSkeleton'
import {
  fetchOrdenesB2B,
  fetchOrdenesB2BAgrupadasPorContenedor,
  fetchCatalogosB2B,
} from '@/modules/ordenes-b2b/queries'
import { fetchUserTableConfig } from '@/modules/admin-table/config/queries'
import { getDefaultFeatures } from '@/modules/admin-table/config/defaults'
import { OrdenesFilters } from './OrdenesFilters'
import { OrdenesTable } from './OrdenesTable'
import { OrdenesVistaToggle } from './_components/OrdenesVistaToggle'
import { VistaAgrupadaOrdenes } from './_components/VistaAgrupadaOrdenes'
import { Pagination } from '@/components/admin/Pagination'
import { OrdenFormDialog } from './OrdenFormDialog'
import type { FiltrosOrdenesB2B } from '@/modules/ordenes-b2b/types'
import type { TableFeatures } from '@/components/admin/DataTable/types'
import { requirePermission } from '@/lib/dal'
import { getCurrentUser } from '@/modules/auth/queries'
import { can } from '@/lib/auth/permissions'

const PAGE_SIZE_AGRUPADO = 12

type SearchParams = Promise<{
  q?: string
  estado?: string
  proveedor_id?: string
  page?: string
  vista?: string
} & Record<string, string | undefined>>

export const metadata: Metadata = { title: 'Ordenes B2B' }

async function buildFiltros(searchParams: SearchParams): Promise<FiltrosOrdenesB2B> {
  const params = await searchParams
  const yearParam = params.anio ?? params['año'] ?? params['aÃ±o']

  const filtros: FiltrosOrdenesB2B = {
    q: params.q,
    estado: params.estado,
    proveedor_id: params.proveedor_id ? parseInt(params.proveedor_id, 10) : undefined,
    page: params.page ? parseInt(params.page, 10) : 1,
    sort_by: params.sort_by ?? 'id',
    order: params.order === 'asc' ? 'asc' : 'desc',
  }

  if (yearParam) {
    ; (filtros as unknown as Record<string, number>).año = parseInt(yearParam, 10)
  }

  return filtros
}

function ToolbarSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="h-9 w-full max-w-sm animate-pulse rounded bg-muted" />
      <div className="h-9 w-44 animate-pulse rounded bg-muted" />
      <div className="h-9 w-48 animate-pulse rounded bg-muted" />
      <div className="ml-auto h-9 w-32 animate-pulse rounded bg-muted" />
    </div>
  )
}

async function OrdenesB2BToolbar({ puedeCrear }: { puedeCrear: boolean }) {
  const catalogos = await fetchCatalogosB2B()

  return (
    <div className="space-y-3">
      {puedeCrear && (
        <div className="flex justify-end">
          <OrdenFormDialog mode="create" catalogos={catalogos} />
        </div>
      )}
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
  const params = await searchParams
  const vista = params.vista === 'tabla' ? 'tabla' : 'agrupado'
  const filtros = await buildFiltros(searchParams)

  if (vista === 'agrupado') {
    const [{ grupos, totalGrupos, totalOrdenes }, catalogos] = await Promise.all([
      fetchOrdenesB2BAgrupadasPorContenedor(filtros, PAGE_SIZE_AGRUPADO),
      fetchCatalogosB2B(),
    ])

    return (
      <div className="space-y-4">
        <VistaAgrupadaOrdenes
          grupos={grupos}
          totalGrupos={totalGrupos}
          totalOrdenes={totalOrdenes}
          catalogos={catalogos}
          canEdit={puedeEditar}
          canDelete={puedeEliminar}
        />
        <Pagination total={totalGrupos} pageSize={PAGE_SIZE_AGRUPADO} />
      </div>
    )
  }

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

export default async function OrdenesB2BPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission('b2b_ordenes')
  const user = await getCurrentUser()

  const puedeCrear = can(user, 'b2b_ordenes', 'puede_crear')
  const puedeEditar = can(user, 'b2b_ordenes', 'puede_editar')
  const puedeEliminar = can(user, 'b2b_ordenes', 'puede_eliminar')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Ordenes B2B</h1>
        <OrdenesVistaToggle />
      </div>
      <Suspense fallback={<ToolbarSkeleton />}>
        <OrdenesB2BToolbar puedeCrear={puedeCrear} />
      </Suspense>
      <Suspense fallback={<ListPageSkeleton />}>
        <OrdenesB2BTable searchParams={searchParams} puedeEditar={puedeEditar} puedeEliminar={puedeEliminar} />
      </Suspense>
    </div>
  )
}
