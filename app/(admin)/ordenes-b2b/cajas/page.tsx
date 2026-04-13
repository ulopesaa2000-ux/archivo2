// app/(admin)/ordenes-b2b/cajas/page.tsx
import type { Metadata } from 'next'
import { fetchCajasListado, fetchCatalogosB2B } from '@/modules/ordenes-b2b/queries'
import { CajasFilters } from './CajasFilters'
import { CajasTable } from './CajasTable'
import { Pagination } from '@/components/admin/Pagination'
import type { FiltrosCajas } from '@/modules/ordenes-b2b/types'

export const metadata: Metadata = { title: 'Cajas de Producto' }

export default async function CajasPage(
  props: {
    searchParams: Promise<{ q?: string; proveedor_id?: string; año?: string; page?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const filtros: FiltrosCajas = {
    q: searchParams.q,
    proveedor_id: searchParams.proveedor_id ? parseInt(searchParams.proveedor_id) : undefined,
    año: searchParams.año ? parseInt(searchParams.año) : undefined,
    page: searchParams.page ? parseInt(searchParams.page) : 1,
  }

  const [{ items, total }, catalogos] = await Promise.all([
    fetchCajasListado(filtros),
    fetchCatalogosB2B(),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cajas de Producto</h1>
        <p className="text-sm text-muted-foreground">{total} caja{total !== 1 ? 's' : ''}</p>
      </div>
      <CajasFilters catalogos={catalogos} />
      <CajasTable items={items} />
      <Pagination total={total} />
    </div>
  )
}
