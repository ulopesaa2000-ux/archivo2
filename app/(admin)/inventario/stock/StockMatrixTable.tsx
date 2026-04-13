'use client'

import { Download, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/admin/Pagination'
import type { StockMatrixItem } from '@/modules/inventario/types'
import type { BodegaRow } from '@/lib/types/tables'

type Props = {
  items: StockMatrixItem[]
  bodegasColumnas: BodegaRow[]
  total: number
}

export function StockMatrixTable({ items, bodegasColumnas, total }: Props) {
  const downloadCsv = () => {
    const headers = [
      'SKU',
      'Producto',
      'Pz x Caja',
      'Total Est. (Cajas)',
      ...bodegasColumnas.map(b => b.nombre)
    ]

    const rows = items.map(item => {
      const cols = [
        item.producto_sku,
        item.producto_nombre ?? '',
        item.pz_en_caja?.toString() ?? '1',
        item.total_general.toString(),
      ]
      bodegasColumnas.forEach(b => {
        const stock = item.stock_por_bodega[b.id]?.total ?? 0
        cols.push(stock.toString())
      })
      // Escape strings containing quotes or commas
      return cols.map(c => `"${c.replace(/"/g, '""')}"`).join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `inventario_completo_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (bodegasColumnas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/20">
        <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm font-medium">No se han seleccionado bodegas.</p>
        <p className="text-sm text-muted-foreground max-w-sm mt-1">
          Seleccione al menos una bodega, o la opción "Todas las bodegas" en los filtros superiores, para visualizar el inventario.
        </p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg">
        <Package className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No se encontraron productos con stock en las bodegas seleccionadas.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={downloadCsv}>
          <Download className="mr-2 h-4 w-4" />
          Exportar a CSV
        </Button>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b font-semibold text-muted-foreground">
              <th className="px-4 py-3 text-left sticky left-0 bg-muted/90 z-20 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b]">SKU / Producto</th>
              <th className="px-4 py-3 text-center border-l bg-muted/50" title="Solo enumera cajas completas">TOTAL CAJAS</th>
              {bodegasColumnas.map(b => (
                <th key={b.id} className="px-4 py-3 text-center border-l whitespace-nowrap">
                  <span className="block truncate max-w-[120px] mx-auto" title={b.nombre}>
                    {b.nombre}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.producto_id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 sticky left-0 bg-background/95 backdrop-blur z-10 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] max-w-[300px]">
                  <span className="font-mono font-medium block whitespace-nowrap truncate">{item.producto_sku}</span>
                  {item.producto_nombre && (
                    <span className="text-xs text-muted-foreground block truncate" title={item.producto_nombre}>
                      {item.producto_nombre}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center tabular-nums font-semibold bg-muted/10 border-l border-r">
                  {item.total_general}
                </td>
                {bodegasColumnas.map(b => {
                  const val = item.stock_por_bodega[b.id]?.total ?? 0
                  return (
                    <td key={b.id} className="px-4 py-3 text-center tabular-nums border-l border-muted/50">
                      {val > 0 ? (
                        <span className="font-medium text-primary">{val}</span>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination total={total} />
    </div>
  )
}
