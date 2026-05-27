// app/(admin)/contenedores/page.tsx
import type { Metadata } from 'next'
import { fetchContenedores } from '@/modules/contenedores/queries'
import { fetchUserTableConfig } from '@/modules/admin-table/config/queries'
import { getDefaultFeatures } from '@/modules/admin-table/config/defaults'
import { ContenedoresFilters } from './ContenedoresFilters'
import { ContenedoresTable } from './ContenedoresTable'
import { Pagination } from '@/components/admin/Pagination'
import { ContenedorFormDialog } from './ContenedorFormDialog'
import type { FiltrosContenedores, ContenedorSortBy } from '@/modules/contenedores/types'
import { getCurrentUser } from '@/modules/auth/queries'
import { requirePermission } from '@/lib/dal'
import { can } from '@/lib/auth/permissions'

export const metadata: Metadata = { title: 'Contenedores' }

const VALID_SORT_BY: ContenedorSortBy[] = [
  'fecha_eta',
  'fecha_etd',
  'codigo_contenedor',
  'numero_contenedor',
  'total_ordenes',
  'cajas_totales',
  'estado',
]

type ContenedoresSearchParams = {
  q?: string
  estado?: string
  anio?: string
  page?: string
  sort_by?: string
  order?: string
}

export default async function ContenedoresPage({
  searchParams,
}: {
  searchParams: Promise<ContenedoresSearchParams>
}) {
  await requirePermission('b2b_contenedores')

  const params = await searchParams
  const user = await getCurrentUser()
  const puedeCrear = can(user, 'b2b_contenedores', 'puede_crear')

  const sortBy = (VALID_SORT_BY.includes(params.sort_by as ContenedorSortBy)
    ? params.sort_by
    : 'fecha_eta') as ContenedorSortBy
  const order = params.order === 'asc' ? 'asc' : 'desc'

  const filtros: FiltrosContenedores = {
    q: params.q,
    estado: params.estado,
    anio: params.anio ? parseInt(params.anio, 10) : undefined,
    page: params.page ? parseInt(params.page, 10) : 1,
    sort_by: sortBy,
    order,
  }

  const [{ items, total }, tableConfig] = await Promise.all([
    fetchContenedores(filtros),
    fetchUserTableConfig('/contenedores'),
  ])

  const features = {
    ...getDefaultFeatures('/contenedores'),
    ...tableConfig.config,
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contenedores</h1>
          <p className="text-sm text-muted-foreground">
            {total} contenedor{total !== 1 ? 'es' : ''}
          </p>
        </div>
        {puedeCrear && <ContenedorFormDialog mode="create" />}
      </div>
      <ContenedoresFilters sortBy={sortBy} order={order} />
      <ContenedoresTable items={items} sortBy={sortBy} order={order} initialFeatures={features} />
      <Pagination total={total} />
    </div>
  )
}
