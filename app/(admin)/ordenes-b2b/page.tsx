// app/(admin)/ordenes-b2b/page.tsx
import type { Metadata } from 'next'
import { fetchOrdenesB2B, fetchCatalogosB2B } from '@/modules/ordenes-b2b/queries'
import { OrdenesFilters } from './OrdenesFilters'
import { OrdenesTable } from './OrdenesTable'
import { Pagination } from '@/components/admin/Pagination'
import { OrdenFormDialog } from './OrdenFormDialog'
import type { FiltrosOrdenesB2B } from '@/modules/ordenes-b2b/types'

export const metadata: Metadata = { title: 'Órdenes B2B' }

export default async function OrdenesB2BPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; proveedor_id?: string; año?: string; page?: string }>
}) {
  const params = await searchParams;
  const filtros: FiltrosOrdenesB2B = {
    q: params.q,
    estado: params.estado,
    proveedor_id: params.proveedor_id ? parseInt(params.proveedor_id) : undefined,
    año: params.año ? parseInt(params.año) : undefined,
    page: params.page ? parseInt(params.page) : 1,
  }

  const [{ items, total }, catalogos] = await Promise.all([
    fetchOrdenesB2B(filtros),
    fetchCatalogosB2B(),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Órdenes B2B</h1>
          <p className="text-sm text-muted-foreground">{total} orden{total !== 1 ? 'es' : ''}</p>
        </div>
        <OrdenFormDialog mode="create" catalogos={catalogos} />
      </div>
      <OrdenesFilters catalogos={catalogos} />
      <OrdenesTable items={items} catalogos={catalogos} />
      <Pagination total={total} />
    </div>
  )
}
