// app/(admin)/inventario/stock/page.tsx
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { fetchStockByBodega, fetchCatalogosInventario, fetchStockMatrix } from '@/modules/inventario/queries'
import { StockFilters } from '@/app/(admin)/inventario/stock/StockFilters'
import { StockTable } from '@/app/(admin)/inventario/stock/StockTable'
import { StockMatrixFilters } from '@/app/(admin)/inventario/stock/StockMatrixFilters'
import { StockMatrixTable } from '@/app/(admin)/inventario/stock/StockMatrixTable'
import { Pagination } from '@/components/admin/Pagination'
import { Warehouse, Grid3X3 } from 'lucide-react'
import type { FiltrosStock, FiltrosStockMatrix, StockMatrixItem } from '@/modules/inventario/types'

export const metadata: Metadata = {
  title: 'Stock por Bodega',
}

function parseArray(val: string | string[] | undefined): string[] {
  if (!val) return []
  return Array.isArray(val) ? val : [val]
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

    let items: StockMatrixItem[] = []
    let total = 0
    let bodegasColumnas = catalogos.bodegas

    if (!isNone) {
      const res = await fetchStockMatrix(filtros, catalogos.bodegas)
      items = res.items
      total = res.total

      // Determinar las columnas de bodegas a mostrar en la matriz
      if (filtros.ciudades && filtros.ciudades.length > 0) {
        bodegasColumnas = bodegasColumnas.filter(b => filtros.ciudades!.includes(b.ciudad || 'sin_asignar'))
      }
      if (filtros.bodegas && filtros.bodegas.length > 0) {
        bodegasColumnas = bodegasColumnas.filter(b => filtros.bodegas!.includes(b.id))
      }
    } else {
      bodegasColumnas = []
    }

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Consolidado (Matriz)</h1>
          <p className="text-sm text-muted-foreground">
            Todas las bodegas disponibles — {total} producto{total !== 1 ? 's' : ''}
          </p>
        </div>
        <StockMatrixFilters bodegas={catalogos.bodegas} />
        <StockMatrixTable items={items} bodegasColumnas={bodegasColumnas} total={total} />
      </div>
    )
  }

  // Vista Normal (Una sola bodega)
  const filtros: FiltrosStock = {
    q: sp.q,
    con_stock_cero: sp.con_stock_cero === 'true',
    page: sp.page ? parseInt(sp.page) : 1,
  }

  const { items, total } = await fetchStockByBodega(bodegaActivaId, filtros)
  const bodegaActiva = catalogos.bodegas.find((b) => b.id === bodegaActivaId)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock por Bodega</h1>
        <p className="text-sm text-muted-foreground">
          {bodegaActiva?.nombre ?? 'Bodega seleccionada'} — {total} producto{total !== 1 ? 's' : ''}
        </p>
      </div>
      <StockFilters />
      <StockTable items={items} bodegaId={bodegaActivaId} />
      <Pagination total={total} />
    </div>
  )
}
