// app/(admin)/contenedores/[id]/components/ContenedorPacking.tsx
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { Package } from 'lucide-react'
import type { ContenedorPackingItem } from '@/modules/contenedores/types'

export function ContenedorPacking({ items }: { items: ContenedorPackingItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-muted-foreground">
        <Package className="h-8 w-8" /><p className="text-sm mt-2">Sin packing list.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-auto mt-4">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 font-semibold text-muted-foreground">
            <th className="px-3 py-2 text-left">SKU</th>
            <th className="px-3 py-2 text-left">Producto</th>
            <th className="px-3 py-2 text-left">Proveedor</th>
            <th className="px-3 py-2 text-left">Caja</th>
            <th className="px-3 py-2 text-center">Cajas</th>
            <th className="px-3 py-2 text-center">Pz Pedidas</th>
            <th className="px-3 py-2 text-right">P.Unit</th>
            <th className="px-3 py-2 text-right">Importe</th>
            <th className="px-3 py-2 text-right">CBM</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-2 font-mono">{item.sku_base ?? '—'}</td>
              <td className="px-3 py-2 truncate max-w-[150px]">{item.producto_nombre ?? '—'}</td>
              <td className="px-3 py-2 text-muted-foreground">{item.proveedor ?? '—'}</td>
              <td className="px-3 py-2 font-mono">{item.codigo_caja ?? '—'}</td>
              <td className="px-3 py-2 text-center tabular-nums">{item.cajas_pedidas ?? 0}</td>
              <td className="px-3 py-2 text-center tabular-nums">{item.piezas_pedidas ?? 0}</td>
              <td className="px-3 py-2 text-right tabular-nums">{item.precio_unitario ? formatCurrency(item.precio_unitario, 'USD') : '—'}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">{item.importe_total ? formatCurrency(item.importe_total, 'USD') : '—'}</td>
              <td className="px-3 py-2 text-right tabular-nums">{item.cbm_detalle ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
