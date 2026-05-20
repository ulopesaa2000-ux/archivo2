// app/(admin)/contenedores/[id]/components/ContenedorPacking.tsx
import { Badge } from '@/components/ui/badge'
import { formatCurrency, cn } from '@/lib/utils'
import { Package } from 'lucide-react'
import { ESTADO_ORDEN_B2B_COLORS } from '@/lib/constants'
import type { ContenedorPackingItem } from '@/modules/contenedores/types'

type GrupoOrden = {
  ordenId: number
  folio: string | null
  estado: string | null
  items: ContenedorPackingItem[]
  subtotal: { cajas: number; piezas_reales: number; piezas_planeadas: number; importe: number }
}

function agrupar(items: ContenedorPackingItem[]): GrupoOrden[] {
  const map = new Map<number, GrupoOrden>()
  for (const item of items) {
    const oid = item.orden_id
    if (!map.has(oid)) {
      map.set(oid, {
        ordenId: oid,
        folio: item.folio_proveedor,
        estado: item.estado_orden,
        items: [],
        subtotal: { cajas: 0, piezas_reales: 0, piezas_planeadas: 0, importe: 0 },
      })
    }
    const g = map.get(oid)!
    g.items.push(item)
    g.subtotal.cajas += item.cantidad_cajas ?? 0
    g.subtotal.piezas_reales += item.piezas_reales ?? 0
    g.subtotal.piezas_planeadas += item.piezas_planeadas ?? 0
    g.subtotal.importe += item.importe_total ?? 0
  }
  return Array.from(map.values())
}

export function ContenedorPacking({ items }: { items: ContenedorPackingItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-muted-foreground mt-4">
        <Package className="h-8 w-8" /><p className="text-sm mt-2">Sin packing list.</p>
      </div>
    )
  }

  const grupos = agrupar(items)
  const granTotal = grupos.reduce(
    (acc, g) => ({
      cajas: acc.cajas + g.subtotal.cajas,
      piezas_reales: acc.piezas_reales + g.subtotal.piezas_reales,
      piezas_planeadas: acc.piezas_planeadas + g.subtotal.piezas_planeadas,
      importe: acc.importe + g.subtotal.importe,
    }),
    { cajas: 0, piezas_reales: 0, piezas_planeadas: 0, importe: 0 },
  )

  return (
    <div className="space-y-6 mt-4">
      {grupos.map((grupo) => (
        <div key={grupo.ordenId} className="rounded-lg border overflow-auto">
          <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 border-b">
            <span className="font-mono text-xs text-primary font-semibold">#{grupo.ordenId}</span>
            <span className="font-medium text-sm">{grupo.folio ?? '—'}</span>
            {grupo.estado && (
              <Badge variant="secondary" className={cn('text-[10px]', ESTADO_ORDEN_B2B_COLORS[grupo.estado] ?? '')}>
                {grupo.estado}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {grupo.items.length} línea{grupo.items.length !== 1 ? 's' : ''}
            </span>
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/20 font-semibold text-muted-foreground">
                <th className="px-3 py-2 text-left">SKU</th>
                <th className="px-3 py-2 text-left">Producto</th>
                <th className="px-3 py-2 text-left">Caja</th>
                <th className="px-3 py-2 text-center">Cajas</th>
                <th className="px-3 py-2 text-right">Pz Reales</th>
                <th className="px-3 py-2 text-right">Pz Pedidas</th>
                <th className="px-3 py-2 text-right">Dif</th>
                <th className="px-3 py-2 text-right">P.Unit</th>
                <th className="px-3 py-2 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {grupo.items.map((item, i) => {
                const real = item.piezas_reales ?? 0
                const plan = item.piezas_planeadas ?? 0
                const dif = real - plan
                return (
                  <tr key={i} className="border-t hover:bg-muted/10">
                    <td className="px-3 py-2 font-mono">{item.sku_base ?? '—'}</td>
                    <td className="px-3 py-2 max-w-[200px]">
                      <div className="truncate text-xs font-medium">{item.producto_descripcion ?? item.producto_nombre ?? '—'}</div>
                      {item.producto_nombre && item.producto_descripcion && (
                        <div className="text-[10px] text-muted-foreground truncate leading-tight">{item.producto_nombre}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono">{item.codigo_caja ?? '—'}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{item.cantidad_cajas ?? 0}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{real}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{plan || '—'}</td>
                    <td className={cn('px-3 py-2 text-right tabular-nums', dif !== 0 ? 'text-amber-600 font-semibold' : 'text-muted-foreground')}>
                      {dif !== 0 ? (dif > 0 ? `+${dif}` : dif) : '0'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{item.precio_unitario ? formatCurrency(item.precio_unitario, 'USD') : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{item.importe_total ? formatCurrency(item.importe_total, 'USD') : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/20 font-semibold text-xs">
                <td colSpan={3} className="px-3 py-2 text-muted-foreground">Subtotal</td>
                <td className="px-3 py-2 text-center tabular-nums">{grupo.subtotal.cajas}</td>
                <td className="px-3 py-2 text-right tabular-nums">{grupo.subtotal.piezas_reales}</td>
                <td className="px-3 py-2 text-right tabular-nums">{grupo.subtotal.piezas_planeadas}</td>
                <td className="px-3 py-2 text-right tabular-nums text-amber-600 font-semibold">
                  {grupo.subtotal.piezas_reales - grupo.subtotal.piezas_planeadas !== 0
                    ? (grupo.subtotal.piezas_reales - grupo.subtotal.piezas_planeadas > 0
                      ? `+${grupo.subtotal.piezas_reales - grupo.subtotal.piezas_planeadas}`
                      : grupo.subtotal.piezas_reales - grupo.subtotal.piezas_planeadas)
                    : '0'}
                </td>
                <td></td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(grupo.subtotal.importe, 'USD')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ))}

      <div className="rounded-lg border bg-muted/10">
        <div className="flex items-center justify-between px-4 py-3 text-sm font-bold">
          <span>Total General</span>
          <div className="flex items-center gap-6 tabular-nums">
            <span>{granTotal.cajas} cajas</span>
            <span>{granTotal.piezas_reales} pz reales</span>
            <span>{granTotal.piezas_planeadas} pz pedidas</span>
            <span className={granTotal.piezas_reales - granTotal.piezas_planeadas !== 0 ? 'text-amber-600' : ''}>
              {granTotal.piezas_reales - granTotal.piezas_planeadas !== 0
                ? `Dif: ${granTotal.piezas_reales - granTotal.piezas_planeadas > 0 ? '+' : ''}${granTotal.piezas_reales - granTotal.piezas_planeadas}`
                : 'Sin diferencia'}
            </span>
            <span>{formatCurrency(granTotal.importe, 'USD')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
