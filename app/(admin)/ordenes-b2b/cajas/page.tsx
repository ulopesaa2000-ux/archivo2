// app/(admin)/ordenes-b2b/cajas/page.tsx
import type { Metadata } from 'next'
import { fetchCajasListado, fetchCatalogosB2B, fetchCatalogoTallasColores } from '@/modules/ordenes-b2b/queries'
import { fetchUserTableConfig } from '@/modules/admin-table/config/queries'
import { getDefaultFeatures } from '@/modules/admin-table/config/defaults'
import { CajasFilters } from './CajasFilters'
import { CajasTable } from './CajasTable'
import { Pagination } from '@/components/admin/Pagination'
import type { FiltrosCajas } from '@/modules/ordenes-b2b/types'
import { requirePermission } from '@/lib/dal'
import { getCurrentUser } from '@/modules/auth/queries'
import { can } from '@/lib/auth/permissions'

export const metadata: Metadata = { title: 'Cajas de Producto' }

type CajasSearchParams = {
  q?: string
  proveedor_id?: string
  anio?: string
  año?: string
  page?: string
  sort_by?: string
  order?: string
}

export default async function CajasPage({
  searchParams,
}: {
  searchParams: Promise<CajasSearchParams>
}) {
  await requirePermission('b2b_cajas')

  const params = await searchParams
  const yearParam = params.anio ?? params.año

  const filtros: FiltrosCajas = {
    q: params.q,
    proveedor_id: params.proveedor_id ? parseInt(params.proveedor_id, 10) : undefined,
    año: yearParam ? parseInt(yearParam, 10) : undefined,
    page: params.page ? parseInt(params.page, 10) : 1,
    sort_by: params.sort_by ?? 'codigo_caja',
    order: params.order === 'asc' ? 'asc' : 'desc',
  }

  const user = await getCurrentUser()
  const puedeCrear = can(user, 'b2b_cajas', 'puede_crear')

  const [{ items, total }, catalogos, tableConfig, catalogoCajas] = await Promise.all([
    fetchCajasListado(filtros),
    fetchCatalogosB2B(),
    fetchUserTableConfig('/ordenes-b2b/cajas'),
    fetchCatalogoTallasColores(),
  ])

  const features = {
    ...getDefaultFeatures('/ordenes-b2b/cajas'),
    ...tableConfig.config,
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cajas de Producto</h1>
        <p className="text-sm text-muted-foreground">{total} caja{total !== 1 ? 's' : ''}</p>
      </div>
      <CajasFilters catalogos={catalogos} catalogoCajas={catalogoCajas} puedeCrear={puedeCrear} />
      <CajasTable
        items={items}
        initialFeatures={features}
        sortKey={filtros.sort_by}
        sortOrder={filtros.order}
      />
      <Pagination total={total} />
    </div>
  )
}
