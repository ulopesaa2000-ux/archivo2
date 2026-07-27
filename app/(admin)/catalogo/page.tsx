// C:\Users\uriel\Downloads\enero 26\archivo2\app\(admin)\catalogo\page.tsx
import type { Metadata } from 'next'
import { Pagination } from '@/components/admin/Pagination'
import { fetchProductosCatalogo } from '@/modules/catalogo/queries'
import type { FiltrosCatalogo, CatalogoSortBy } from '@/modules/catalogo/types'
import { CatalogoCreateDialog } from './CatalogoCreateDialog'
import { CatalogoFilters } from './CatalogoFilters'
import { CatalogoTable } from './CatalogoTable'
import { fetchUserTableConfig } from '@/modules/admin-table/config/queries'
import { getDefaultFeatures } from '@/modules/admin-table/config/defaults'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ImportCsvButton } from './components/ImportCsvButton'
import { CatalogoVistaToggle } from './components/CatalogoVistaToggle'
import { CatalogoGrid } from './components/CatalogoGrid'
import { requirePermission } from '@/lib/dal'
import { can } from '@/lib/auth/permissions'
import { getCurrentUser } from '@/modules/auth/queries'

export const metadata: Metadata = {
  title: 'Catálogo de Productos',
}

const VALID_SORT_BY: CatalogoSortBy[] = ['id', 'sku_base', 'familia', 'marca_id', 'pz_en_caja', 'precio_ec', 'estado']

type CatalogoSearchParams = {
  q?: string
  estado?: string
  marca_id?: string
  genero_id?: string
  destacados?: string
  incluir_inactivos?: string
  page?: string
  sort_by?: string
  order?: string
  modal?: string
  edit_id?: string
  delete_id?: string
  vista?: string
}

function parseOptionalInt(value?: string) {
  if (!value) return undefined

  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? undefined : parsed
}

/**
 * Listado del catálogo.
 *
 * Arquitectura:
 * - `CatalogoFilters` es client y permanece montado entre cambios de filtro.
 * - `CatalogoTable` es server y se vuelve a resolver con los search params.
 * - `Pagination` actualiza la URL sin recargar el shell admin.
 */
async function CatalogoData({ 
  filtros, 
  sortBy, 
  order,
  vista,
  puedeCrear,
}: { 
  filtros: FiltrosCatalogo
  sortBy: CatalogoSortBy
  order: 'asc' | 'desc'
  vista: 'grid' | 'tabla'
  puedeCrear: boolean
}) {
  const [{ productos, total, catalogos }, tableConfig] = await Promise.all([
    fetchProductosCatalogo(filtros),
    fetchUserTableConfig('/catalogo')
  ])

  const userFeatures = tableConfig.config
  const features = {
    ...getDefaultFeatures('/catalogo'),
    ...userFeatures,
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Catálogo de Productos
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} producto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CatalogoVistaToggle />
          {puedeCrear && (
            <>
              <Link 
                href="/catalogo?modal=create" 
                scroll={false} 
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Producto
              </Link>
              <ImportCsvButton />
            </>
          )}
        </div>
      </div>

      {puedeCrear && <CatalogoCreateDialog catalogos={catalogos} />}

      <CatalogoFilters catalogos={catalogos} sortBy={sortBy} order={order} />
      {vista === 'grid' ? (
        <CatalogoGrid productos={productos} />
      ) : (
        <CatalogoTable productos={productos} catalogos={catalogos} sortBy={sortBy} order={order} initialFeatures={features} />
      )}
      <Pagination total={total} />
    </>
  )
}

function CatalogoSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  )
}

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<CatalogoSearchParams>
}) {
  await requirePermission('catalogo_productos')

  const user = await getCurrentUser()
  const puedeCrear = can(user, 'catalogo_productos', 'puede_crear')

  const params = await searchParams

  const sortBy = (VALID_SORT_BY.includes(params.sort_by as CatalogoSortBy)
    ? params.sort_by
    : 'id') as CatalogoSortBy
  const order = params.order === 'asc' ? 'asc' : 'desc'

  const filtros: FiltrosCatalogo = {
    q: params.q,
    estado: params.estado,
    marca_id: parseOptionalInt(params.marca_id),
    genero_id: parseOptionalInt(params.genero_id),
    destacados: params.destacados === 'true',
    incluir_inactivos: params.incluir_inactivos === 'true',
    page: parseOptionalInt(params.page) ?? 1,
    sort_by: sortBy,
    order,
  }

  const vista = params.vista === 'tabla' ? 'tabla' : 'grid'

  return (
    <div className="space-y-4">
      <Suspense fallback={<CatalogoSkeleton />}>
        <CatalogoData filtros={filtros} sortBy={sortBy} order={order} vista={vista} puedeCrear={puedeCrear} />
      </Suspense>
    </div>
  )
}
