// app/(admin)/catalogo/[id]/components/TabStock.tsx
import { fetchStockProductoPorBodegas, fetchStockPronosticadoProducto } from '@/modules/catalogo/queries'
import { StockDashboardView } from './StockDashboardView'

export async function TabStock({
  productoId,
  stockPromise,
}: {
  productoId: number
  skuBase?: string
  pzEnCaja?: number | null
  stockPromise: ReturnType<typeof fetchStockProductoPorBodegas>
}) {
  const [stockItems, stockForecast] = await Promise.all([
    stockPromise,
    fetchStockPronosticadoProducto(productoId),
  ])

  return (
    <StockDashboardView
      stockItems={stockItems}
      stockForecast={stockForecast}
    />
  )
}

