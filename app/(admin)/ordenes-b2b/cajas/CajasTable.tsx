// app/(admin)/ordenes-b2b/cajas/CajasTable.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Eye, Package } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { DetalleCajaSheet } from './DetalleCajaSheet'
import type { CajaListItem } from '@/modules/ordenes-b2b/types'

export function CajasTable({ items }: { items: CajaListItem[] }) {
  const [cajaSeleccionada, setCajaSeleccionada] = useState<number | null>(null)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground rounded-lg border">
        <Package className="h-12 w-12" /><p className="text-sm mt-4">No se encontraron cajas.</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-xs font-semibold text-muted-foreground">
              <th className="px-4 py-2 text-left">Código</th>
              <th className="px-4 py-2 text-left">Producto</th>
              <th className="px-4 py-2 text-left hidden md:table-cell">Proveedor</th>
              <th className="px-4 py-2 text-center">Pz/Caja</th>
              <th className="px-4 py-2 text-left hidden lg:table-cell">Tallas</th>
              <th className="px-4 py-2 text-left hidden lg:table-cell">Colores</th>
              <th className="px-4 py-2 text-right">CBM</th>
              <th className="px-4 py-2 w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 font-mono text-xs font-medium">{c.codigo_caja}</td>
                <td className="px-4 py-2 text-xs">
                  <span className="font-mono">{c.producto_sku ?? '—'}</span>
                  {c.producto_nombre && <span className="text-muted-foreground ml-1">({c.producto_nombre})</span>}
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground hidden md:table-cell">{c.proveedor_nombre ?? '—'}</td>
                <td className="px-4 py-2 text-center tabular-nums">{c.piezas_por_caja ?? '—'}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground hidden lg:table-cell">{c.tallas ?? '—'}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground hidden lg:table-cell">{c.colores ?? '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums text-xs">{c.cbm ?? '—'}</td>
                <td className="px-4 py-2">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                    title={`Ver caja ${c.id}`}
                    onClick={() => setCajaSeleccionada(c.id)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={!!cajaSeleccionada} onOpenChange={() => setCajaSeleccionada(null)}>
        <SheetContent side="right" className="w-[480px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Detalle de Caja</SheetTitle>
          </SheetHeader>
          {cajaSeleccionada && <DetalleCajaSheet cajaId={cajaSeleccionada} />}
        </SheetContent>
      </Sheet>
    </>
  )
}
