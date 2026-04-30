// app/(admin)/inventario/stock/page.tsx
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { fetchStockByBodega, fetchCatalogosInventario, fetchStockMatrix } from '@/modules/inventario/queries'
import { fetchUserTableConfig } from '@/modules/admin-table/config/queries'
import { getDefaultFeatures } from '@/modules/admin-table/config/defaults'
import { StockFilters } from '@/app/(admin)/inventario/stock/StockFilters'
import { StockTable } from '@/app/(admin)/inventario/stock/StockTable'
import { StockMatrixFilters } from '@/app/(admin)/inventario/stock/StockMatrixFilters'
import { StockMatrixTable } from '@/app/(admin)/inventario/stock/StockMatrixTable'
import { StockPageHeader } from '@/app/(admin)/inventario/stock/StockPageHeader'
import { Pagination } from '@/components/admin/Pagination'
import { Warehouse, Loader2 } from 'lucide-react'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import type { FiltrosStock, FiltrosStockMatrix, StockMatrixItem } from '@/modules/inventario/types'
import type { BodegaRow } from '@/lib/types/tables'

export const metadata: Metadata = {
  title: 'Stock por Bodega',
}

function parseArray(val: string | string[] | undefined): string[] {
  if (!val) return []
  return Array.isArray(val) ? val : [val]
}

async function StockMatrixData({
  filtros,
  isNone,
  bodegas,
  bodegaActivaId,
  agruparPor,
}: {
  filtros: FiltrosStockMatrix
  isNone: boolean
  bodegas: BodegaRow[]
  bodegaActivaId: number
  agruparPor?: string
}) {
  let items: StockMatrixItem[] = []
  let total = 0
  let bodegasColumnas = bodegas

  if (!isNone) {
    const res = await fetchStockMatrix(filtros, bodegas)
    items = res.items
    total = res.total

    if (filtros.ciudades && filtros.ciudades.length > 0) {
      bodegasColumnas = bodegasColumnas.filter((b) => filtros.ciudades!.includes(b.ciudad || 'sin_asignar'))
    }
    if (filtros.bodegas && filtros.bodegas.length > 0) {
      bodegasColumnas = bodegasColumnas.filter((b) => filtros.bodegas!.includes(b.id))
    }
  } else {
    bodegasColumnas = []
  }

  const tableConfig = await fetchUserTableConfig('/inventario/stock')
  const features = {
    ...getDefaultFeatures('/inventario/stock'),
    ...tableConfig.config,
  }

  return (
    <div className="space-y-4">
      <StockPageHeader
        title="Stock Consolidado (Matriz)"
        subtitle={`Todas las bodegas disponibles — ${total} producto${total !== 1 ? 's' : ''}`}
        bodegas={bodegas}
        bodegaActivaId={bodegaActivaId}
      />
      <StockMatrixFilters bodegas={bodegas} />
      <StockMatrixTable items={items} bodegasColumnas={bodegasColumnas} total={total} agruparPor={agruparPor} />
    </div>
  )
}

async function StockNormalData({
  filtros,
  bodegas,
  bodegaActivaId,
  agruparPor,
}: {
  filtros: FiltrosStock
  bodegas: BodegaRow[]
  bodegaActivaId: number
  agruparPor?: string
}) {
  const { items, total } = await fetchStockByBodega(bodegaActivaId, filtros)
  const bodegaActiva = bodegas.find((b) => b.id === bodegaActivaId)

  const tableConfig = await fetchUserTableConfig('/inventario/stock')
  const features = {
    ...getDefaultFeatures('/inventario/stock'),
    ...tableConfig.config,
  }

  return (
    <div className="space-y-4">
      <StockPageHeader
        title="Stock por Bodega"
        subtitle={`${bodegaActiva?.nombre ?? 'Bodega seleccionada'} — ${total} producto${total !== 1 ? 's' : ''}`}
        bodegas={bodegas}
        bodegaActivaId={bodegaActivaId}
      />
      <StockFilters />
      <StockTable items={items} bodegaId={bodegaActivaId} agruparPor={agruparPor} />
      <Pagination total={total} />
    </div>
  )
}

function StockSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-1" />
        </div>
        <Skeleton className="h-9 w-48" />
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando stock...
      </div>
    </div>
  )
}

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    marca_id?: string
    con_stock_cero?: string
    page?: string
    ciudades?: string | string[]
    bodegas?: string | string[]
    agrupar_por?: string
  }>
}) {
  const cookieStore = await cookies()
  const bodegaCookie = cookieStore.get('bodega_activa_id')?.value
  const bodegaActivaId = bodegaCookie ? parseInt(bodegaCookie, 10) : null

  if (bodegaActivaId === null || isNaN(bodegaActivaId)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Warehouse className="h-12 w-12" />
        <p className="text-sm mt-4">Selecciona una bodega en el header para ver el stock.</p>
      </div>
    )
  }

  const sp = await searchParams
  // catalogos loads from cache
  const catalogos = await fetchCatalogosInventario()

  if (bodegaActivaId === 0) {
    const rawBodegas = parseArray(sp.bodegas)
    const rawCiudades = parseArray(sp.ciudades)
    const isNoneBodegas = rawBodegas.length === 1 && rawBodegas[0] === 'none'
    const isNoneCiudades = rawCiudades.length === 1 && rawCiudades[0] === 'none'
    const isNone = isNoneBodegas || isNoneCiudades

    const filtros: FiltrosStockMatrix = {
      q: sp.q,
      con_stock_cero: sp.con_stock_cero === 'true',
      page: sp.page ? parseInt(sp.page) : 1,
      ciudades: rawCiudades.filter(v => v !== 'none'),
      bodegas: rawBodegas.filter(v => v !== 'none').map(v => parseInt(v, 10)),
    }

    return (
      <Suspense fallback={<StockSkeleton />}>
        <StockMatrixData 
          filtros={filtros} 
          isNone={isNone} 
          bodegas={catalogos.bodegas} 
          bodegaActivaId={bodegaActivaId} 
          agruparPor={sp.agrupar_por}
        />
      </Suspense>
    )
  }

  const filtros: FiltrosStock = {
    q: sp.q,
    con_stock_cero: sp.con_stock_cero === 'true',
    page: sp.page ? parseInt(sp.page) : 1,
  }

  return (
    <Suspense fallback={<StockSkeleton />}>
      <StockNormalData 
        filtros={filtros} 
        bodegas={catalogos.bodegas} 
        bodegaActivaId={bodegaActivaId} 
        agruparPor={sp.agrupar_por}
      />
    </Suspense>
  )
}
