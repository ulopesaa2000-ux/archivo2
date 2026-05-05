// app/(admin)/ordenes-b2b/cajas/page.tsx
import type { Metadata } from 'next'
import { fetchCajasListado, fetchCatalogosB2B } from '@/modules/ordenes-b2b/queries'
import { fetchUserTableConfig } from '@/modules/admin-table/config/queries'
import { getDefaultFeatures } from '@/modules/admin-table/config/defaults'
import { CajasFilters } from './CajasFilters'
import { CajasTable } from './CajasTable'
import { Pagination } from '@/components/admin/Pagination'
import type { FiltrosCajas } from '@/modules/ordenes-b2b/types'

export const metadata: Metadata = { title: 'Cajas de Producto' }

export default async function CajasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; proveedor_id?: string; año?: string; page?: string }>
}) {
  const params = await searchParams;
  const filtros: FiltrosCajas = {
    q: params.q,
    proveedor_id: params.proveedor_id ? parseInt(params.proveedor_id) : undefined,
    año: params.año ? parseInt(params.año) : undefined,
    page: params.page ? parseInt(params.page) : 1,
    sort_by: (params as any).sort_by,
    order: (params as any).order,
  }

  const [{ items, total }, catalogos, tableConfig] = await Promise.all([
    fetchCajasListado(filtros),
    fetchCatalogosB2B(),
    fetchUserTableConfig('/ordenes-b2b/cajas'),
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
      <CajasFilters catalogos={catalogos} />
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
