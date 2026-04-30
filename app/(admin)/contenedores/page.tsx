// app/(admin)/contenedores/page.tsx
import type { Metadata } from 'next'
import { fetchContenedores } from '@/modules/contenedores/queries'
import { fetchUserTableConfig } from '@/modules/admin-table/config/queries'
import { getDefaultFeatures } from '@/modules/admin-table/config/defaults'
import { ContenedoresFilters } from './ContenedoresFilters'
import { ContenedoresTable } from './ContenedoresTable'
import { Pagination } from '@/components/admin/Pagination'
import { ContenedorFormDialog } from './ContenedorFormDialog'
import type { FiltrosContenedores } from '@/modules/contenedores/types'

export const metadata: Metadata = { title: 'Contenedores' }

export default async function ContenedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; año?: string; page?: string }>
}) {
  const params = await searchParams;
  const filtros: FiltrosContenedores = {
    q: params.q,
    estado: params.estado,
    año: params.año ? parseInt(params.año) : undefined,
    page: params.page ? parseInt(params.page) : 1,
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
        <ContenedorFormDialog mode="create" />
      </div>
      <ContenedoresFilters />
      <ContenedoresTable items={items} initialFeatures={features} />
      <Pagination total={total} />
    </div>
  )
}
