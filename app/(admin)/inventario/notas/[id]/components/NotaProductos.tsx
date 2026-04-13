// app/(admin)/inventario/notas/[id]/components/NotaProductos.tsx
import { Badge } from '@/components/ui/badge'
import { Package } from 'lucide-react'
import type { NotaDetalleResuelto } from '@/modules/inventario/types'

export function NotaProductos({
  detalles,
}: {
  detalles: NotaDetalleResuelto[]
}) {
  if (detalles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Package className="h-8 w-8" />
        <p className="text-sm mt-2">Sin productos en esta nota.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">
        Productos ({detalles.length})
      </h3>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-xs font-semibold text-muted-foreground">
              <th className="px-4 py-2 text-left">SKU</th>
              <th className="px-4 py-2 text-left">Producto</th>
              <th className="px-4 py-2 text-left hidden sm:table-cell">Caja</th>
              <th className="px-4 py-2 text-center">Cajas</th>
              <th className="px-4 py-2 text-center">Piezas</th>
              <th className="px-4 py-2 text-right">Total est.</th>
            </tr>
          </thead>
          <tbody>
            {detalles.map((d) => {
              const totalEst = (d.cajas * (d.producto_pz_en_caja ?? 0)) + d.piezas_sueltas
              return (
                <tr key={d.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">
                    {d.producto_sku ?? d.variante_sku ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {d.producto_nombre ?? '—'}
                    {d.talla_codigo && (
                      <Badge variant="outline" className="ml-1 text-[10px]">{d.talla_codigo}</Badge>
                    )}
                    {d.color_nombre && (
                      <Badge variant="outline" className="ml-1 text-[10px]">{d.color_nombre}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground hidden sm:table-cell">
                    {d.caja_codigo ?? '—'}
                    {d.caja_nombre_pack && (
                      <span className="text-[10px] ml-1">({d.caja_nombre_pack})</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center tabular-nums">{d.cajas}</td>
                  <td className="px-4 py-2 text-center tabular-nums">{d.piezas_sueltas}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">{totalEst}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
