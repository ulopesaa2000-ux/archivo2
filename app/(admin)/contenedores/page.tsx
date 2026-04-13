// app/(admin)/contenedores/page.tsx
import type { Metadata } from 'next'
import { fetchContenedores } from '@/modules/contenedores/queries'
import { ContenedoresFilters } from './ContenedoresFilters'
import { ContenedoresTable } from './ContenedoresTable'
import { Pagination } from '@/components/admin/Pagination'
import { ContenedorFormDialog } from './ContenedorFormDialog'
import type { FiltrosContenedores } from '@/modules/contenedores/types'

export const metadata: Metadata = { title: 'Contenedores' }

export default async function ContenedoresPage(
  props: {
    searchParams: Promise<{ q?: string; estado?: string; año?: string; page?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const filtros: FiltrosContenedores = {
    q: searchParams.q,
    estado: searchParams.estado,
    año: searchParams.año ? parseInt(searchParams.año) : undefined,
    page: searchParams.page ? parseInt(searchParams.page) : 1,
  }

  const { items, total } = await fetchContenedores(filtros)

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
      <ContenedoresTable items={items} />
      <Pagination total={total} />
    </div>
  )
}
