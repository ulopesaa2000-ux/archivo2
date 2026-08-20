// app/(admin)/catalogo/[id]/components/StockPronosticadoSection.tsx
import { fetchStockPronosticadoProducto } from '@/modules/catalogo/queries'
import { StockPronosticadoWidget } from './StockPronosticadoWidget'

export async function StockPronosticadoSection({
  productoId,
}: {
  productoId: number
}) {
  const stock = await fetchStockPronosticadoProducto(productoId)
  return <StockPronosticadoWidget stock={stock} />
}
