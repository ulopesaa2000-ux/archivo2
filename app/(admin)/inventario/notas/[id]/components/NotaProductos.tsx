// app/(admin)/inventario/notas/[id]/components/NotaProductos.tsx
'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { NotaDetalleResuelto } from '@/modules/inventario/types'

export function NotaProductos({
  detalles,
}: {
  detalles: NotaDetalleResuelto[]
}) {
  const [copied, setCopied] = useState(false)

  if (!detalles || detalles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Package className="h-8 w-8" />
        <p className="text-sm mt-2">Sin productos en esta nota.</p>
      </div>
    )
  }

  const handleCopyExcel = async () => {
    try {
      const header = ['SKU', 'Producto', 'Caja', 'Cajas', 'Piezas', 'Total est.'].join('\t')
      const rows = detalles.map((d) => {
        const sku = d.producto_sku ?? d.variante_sku ?? '—'
        const nombre = d.producto_nombre ?? '—'
        const caja = d.caja_codigo ? `${d.caja_codigo}${d.caja_nombre_pack ? ` (${d.caja_nombre_pack})` : ''}` : '—'
        const totalEst = (d.cajas * (d.producto_pz_en_caja ?? 0)) + d.piezas_sueltas

        return [sku, nombre, caja, d.cajas, d.piezas_sueltas, totalEst].join('\t')
      })

      const tsvContent = [header, ...rows].join('\n')
      await navigator.clipboard.writeText(tsvContent)

      setCopied(true)
      toast.success('¡Tabla copiada al portapapeles en formato Excel!')
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      toast.error('No se pudo copiar la tabla al portapapeles.')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold text-foreground">
            Productos ({detalles.length})
          </h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleCopyExcel}
            className="h-8 px-3 text-xs font-bold gap-1.5 rounded-xl border border-muted shadow-sm bg-muted hover:bg-accent text-foreground transition-all"
            title="Copiar tabla para pegar directamente en Excel o Google Sheets"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-500" />
                <span className="text-emerald-600 font-bold">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-primary" />
                <span className="font-bold">Copiar Tabla (Excel)</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/70 text-xs font-semibold text-muted-foreground">
              <th className="px-4 py-2.5 text-left">SKU</th>
              <th className="px-4 py-2.5 text-left">Producto</th>
              <th className="px-4 py-2.5 text-left hidden sm:table-cell">Caja</th>
              <th className="px-4 py-2.5 text-center">Cajas</th>
              <th className="px-4 py-2.5 text-center">Piezas</th>
              <th className="px-4 py-2.5 text-right">Total est.</th>
            </tr>
          </thead>
          <tbody>
            {detalles.map((d) => {
              const totalEst = (d.cajas * (d.producto_pz_en_caja ?? 0)) + d.piezas_sueltas
              return (
                <tr key={d.id} className="border-t hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs font-bold text-primary">
                    {d.producto_sku ?? d.variante_sku ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-medium">
                    {d.producto_nombre ?? '—'}
                    {d.talla_codigo && (
                      <Badge variant="outline" className="ml-1 text-[10px]">{d.talla_codigo}</Badge>
                    )}
                    {d.color_nombre && (
                      <Badge variant="outline" className="ml-1 text-[10px]">{d.color_nombre}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell font-mono">
                    {d.caja_codigo ?? '—'}
                    {d.caja_nombre_pack && (
                      <span className="text-[10px] ml-1">({d.caja_nombre_pack})</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center tabular-nums font-bold text-sm">{d.cajas}</td>
                  <td className="px-4 py-2.5 text-center tabular-nums text-muted-foreground">{d.piezas_sueltas}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-bold text-sm">{totalEst}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
