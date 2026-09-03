// C:\Users\uriel\Downloads\enero 26\archivo2\app\(admin)\catalogo\page.tsx
import type { Metadata } from 'next'
import { Pagination } from '@/components/admin/Pagination'
import { fetchProductosCatalogo, fetchCatalogosParaFiltros } from '@/modules/catalogo/queries'
import type { FiltrosCatalogo, CatalogoSortBy, CatalogosParaFiltros } from '@/modules/catalogo/types'
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
 * Componente asíncrono para la tabla/grid y paginación.
 * Solo este componente se suspende y re-renderiza con los searchParams.
 */
async function CatalogoTableData({ 
  filtros, 
  sortBy, 
  order,
  vista,
  catalogos,
}: { 
  filtros: FiltrosCatalogo
  sortBy: CatalogoSortBy
  order: 'asc' | 'desc'
  vista: 'grid' | 'tabla'
  catalogos: CatalogosParaFiltros
}) {
  const [{ productos, total }, tableConfig] = await Promise.all([
    fetchProductosCatalogo(filtros),
    fetchUserTableConfig('/catalogo')
  ])

  const userFeatures = tableConfig.config
  const features = {
    ...getDefaultFeatures('/catalogo'),
    ...userFeatures,
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {total} producto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
      </p>

      {vista === 'grid' ? (
        <CatalogoGrid productos={productos} />
      ) : (
        <CatalogoTable 
          productos={productos} 
          catalogos={catalogos} 
          sortBy={sortBy} 
          order={order} 
          initialFeatures={features} 
        />
      )}
      <Pagination total={total} />
    </div>
  )
}

function CatalogoTableSkeleton({ vista }: { vista: 'grid' | 'tabla' }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-36" />
      {vista === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="border-b bg-muted/50 p-3">
            <Skeleton className="h-4 w-full" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border-b p-3">
              <Skeleton className="h-6 w-full" />
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-48" />
      </div>
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

  const [params, catalogos] = await Promise.all([
    searchParams,
    fetchCatalogosParaFiltros(),
  ])

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

  const createHref = (() => {
    const p = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v && k !== 'modal' && k !== 'edit_id' && k !== 'delete_id') {
          p.set(k, v)
        }
      })
    }
    p.set('modal', 'create')
    return `/catalogo?${p.toString()}`
  })()

  return (
    <div className="space-y-4">
      {/* ── Encabezado fijo y estable ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Catálogo de Productos
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <CatalogoVistaToggle />
          {puedeCrear && (
            <>
              <Link 
                href={createHref} 
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

      {/* ── Modal de creación ── */}
      {puedeCrear && <CatalogoCreateDialog catalogos={catalogos} />}

      {/* ── Filtros fijos y estables (NUNCA se desmontan ni muestran skeletons) ── */}
      <CatalogoFilters catalogos={catalogos} sortBy={sortBy} order={order} />

      {/* ── Solo la tabla o grid y su paginación se suspenden dinámicamente ── */}
      <Suspense fallback={<CatalogoTableSkeleton vista={vista} />}>
        <CatalogoTableData 
          filtros={filtros} 
          sortBy={sortBy} 
          order={order} 
          vista={vista} 
          catalogos={catalogos}
        />
      </Suspense>
    </div>
  )
}
