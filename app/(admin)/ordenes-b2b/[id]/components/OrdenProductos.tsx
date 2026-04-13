// app/(admin)/ordenes-b2b/[id]/components/OrdenProductos.tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Loader2, Package } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ESTADO_DETALLE_B2B_COLORS } from '@/lib/constants'
import { eliminarDetalleOrdenAction } from '@/modules/ordenes-b2b/actions'
import type { OrdenDetalleResuelto } from '@/modules/ordenes-b2b/types'

export function OrdenProductos({ detalles, ordenId }: { detalles: OrdenDetalleResuelto[]; ordenId: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDelete = (detalleId: number) => {
    startTransition(async () => {
      await eliminarDetalleOrdenAction(detalleId, ordenId)
      router.refresh()
    })
  }

  if (detalles.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-muted-foreground">
        <Package className="h-8 w-8" /><p className="text-sm mt-2">Sin productos.</p>
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
            <th className="px-3 py-2 text-center">Pz Pedidas</th>
            <th className="px-3 py-2 text-center">Cajas</th>
            <th className="px-3 py-2 text-right">P.Unit</th>
            <th className="px-3 py-2 text-right">Yuan</th>
            <th className="px-3 py-2 text-right">Importe</th>
            <th className="px-3 py-2 text-right">CBM</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2 w-[40px]"></th>
          </tr>
        </thead>
        <tbody>
          {detalles.map((d) => {
            const estadoColor = ESTADO_DETALLE_B2B_COLORS[d.estado_producto ?? ''] ?? ''
            return (
              <tr key={d.id} className="border-t">
                <td className="px-3 py-2 font-mono">{d.producto_sku ?? '—'}</td>
                <td className="px-3 py-2 truncate max-w-[150px]">{d.producto_nombre ?? '—'}</td>
                <td className="px-3 py-2 text-center tabular-nums">{d.piezas_pedidas ?? 0}</td>
                <td className="px-3 py-2 text-center tabular-nums">{d.cajas_pedidas ?? 0}</td>
                <td className="px-3 py-2 text-right tabular-nums">{d.precio_unitario ? formatCurrency(d.precio_unitario, 'USD') : '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{d.precio_yuan ?? '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">{d.importe_total ? formatCurrency(d.importe_total, 'USD') : '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{d.cbm_detalle ?? '—'}</td>
                <td className="px-3 py-2">
                  <Badge variant="secondary" className={`text-[10px] ${estadoColor}`}>{d.estado_producto}</Badge>
                </td>
                <td className="px-3 py-2">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(d.id)} disabled={isPending}>
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
