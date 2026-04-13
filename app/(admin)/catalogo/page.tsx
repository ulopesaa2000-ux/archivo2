// C:\Users\uriel\Downloads\enero 26\archivo2\app\(admin)\catalogo\page.tsx
import type { Metadata } from 'next'
import { Pagination } from '@/components/admin/Pagination'
import { fetchProductosCatalogo } from '@/modules/catalogo/queries'
import type { FiltrosCatalogo } from '@/modules/catalogo/types'
import { CatalogoCreateDialog } from './CatalogoCreateDialog'
import { CatalogoFilters } from './CatalogoFilters'
import { CatalogoTable } from './CatalogoTable'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Catálogo de Productos',
}

type CatalogoSearchParams = {
  q?: string
  estado?: string
  marca_id?: string
  genero_id?: string
  destacados?: string
  incluir_inactivos?: string
  page?: string
  modal?: string
  edit_id?: string
  delete_id?: string
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
export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<CatalogoSearchParams>
}) {
  const params = await searchParams

  const filtros: FiltrosCatalogo = {
    q: params.q,
    estado: params.estado,
    marca_id: parseOptionalInt(params.marca_id),
    genero_id: parseOptionalInt(params.genero_id),
    destacados: params.destacados === 'true',
    incluir_inactivos: params.incluir_inactivos === 'true',
    page: parseOptionalInt(params.page) ?? 1,
  }

  const { productos, total, catalogos } = await fetchProductosCatalogo(filtros)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Catálogo de Productos
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} producto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
          </p>
        </div>

        <Link 
          href="/catalogo?modal=create" 
          scroll={false} 
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Link>
      </div>

      <CatalogoCreateDialog catalogos={catalogos} />

      <CatalogoFilters catalogos={catalogos} />
      <CatalogoTable productos={productos} catalogos={catalogos} />
      <Pagination total={total} />
    </div>
  )
}
