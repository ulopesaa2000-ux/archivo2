// app/(admin)/inventario/notas/page.tsx
import type { Metadata } from 'next'
import { fetchNotas, fetchCatalogosInventario } from '@/modules/inventario/queries'
import { NotasFilters } from './NotasFilters'
import { NotasTable } from './NotasTable'
import { Pagination } from '@/components/admin/Pagination'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { ADMIN_ROUTES } from '@/lib/constants'
import type { FiltrosNotas } from '@/modules/inventario/types'

export const metadata: Metadata = {
  title: 'Notas de Inventario',
}

export default async function NotasPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    tipo_movimiento_id?: string
    estado_codigo?: string
    bodega_origen_id?: string
    fecha_desde?: string
    fecha_hasta?: string
    page?: string
  }>
}) {
  const sp = await searchParams
  
  const filtros: FiltrosNotas = {
    q: sp.q,
    tipo_movimiento_id: sp.tipo_movimiento_id
      ? parseInt(sp.tipo_movimiento_id)
      : undefined,
    estado_codigo: sp.estado_codigo,
    bodega_origen_id: sp.bodega_origen_id
      ? parseInt(sp.bodega_origen_id)
      : undefined,
    fecha_desde: sp.fecha_desde,
    fecha_hasta: sp.fecha_hasta,
    page: sp.page ? parseInt(sp.page) : 1,
  }

  const [{ notas, total }, catalogos] = await Promise.all([
    fetchNotas(filtros),
    fetchCatalogosInventario(),
  ])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Notas de Inventario
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} nota{total !== 1 ? 's' : ''} encontrada{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href={ADMIN_ROUTES.inventario.notaNueva}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Nota
          </Button>
        </Link>
      </div>

      {/* Filtros (Client, FIJOS) */}
      <NotasFilters catalogos={catalogos} />

      {/* Tabla (Server, se re-renderiza) */}
      <NotasTable notas={notas} />

      {/* Paginación */}
      <Pagination total={total} />
    </div>
  )
}
