// app/(admin)/inventario/stock/StockTable.tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, Loader2, Package } from 'lucide-react'
import { Fecha } from '@/components/shared/Fecha'
import type { StockListItem, StockDetalleCaja } from '@/modules/inventario/types'

export function StockTable({
  items,
  bodegaId,
}: {
  items: StockListItem[]
  bodegaId: number
}) {
  const [expanded, setExpanded] = useState<Record<number, StockDetalleCaja[] | null>>({})
  const [loading, setLoading] = useState<Record<number, boolean>>({})

  const toggleExpand = async (productoId: number) => {
    if (expanded[productoId] !== undefined) {
      setExpanded((prev) => {
        const next = { ...prev }
        delete next[productoId]
        return next
      })
      return
    }

    setLoading((prev) => ({ ...prev, [productoId]: true }))

    try {
      const res = await fetch(
        `/api/inventario/stock-detalle?bodega_id=${bodegaId}&producto_id=${productoId}`
      )
      if (res.ok) {
        const data = await res.json()
        setExpanded((prev) => ({ ...prev, [productoId]: data }))
      }
    } catch {
      setExpanded((prev) => ({ ...prev, [productoId]: [] }))
    }

    setLoading((prev) => ({ ...prev, [productoId]: false }))
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground rounded-lg border">
        <Package className="h-12 w-12" />
        <p className="text-sm mt-4">No hay stock registrado en esta bodega.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-xs font-semibold text-muted-foreground">
            <th className="px-2 py-2 w-[40px]"></th>
            <th className="px-4 py-2 text-left">SKU</th>
            <th className="px-4 py-2 text-left hidden md:table-cell">Producto</th>
            <th className="px-4 py-2 text-left hidden lg:table-cell">Marca</th>
            <th className="px-4 py-2 text-center">Cajas</th>
            <th className="px-4 py-2 text-center">Pz Sueltas</th>
            <th className="px-4 py-2 text-right">Total Piezas</th>
            <th className="px-4 py-2 text-left hidden xl:table-cell">Ubicación</th>
            <th className="px-4 py-2 text-right hidden xl:table-cell">Actualizado</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const totalPiezas = (item.cajas * (item.producto_pz_en_caja ?? 0)) + item.piezas_sueltas
            const isExpanded = expanded[item.producto_id] !== undefined
            const isLoading = loading[item.producto_id]
            const detalles = expanded[item.producto_id]

            return (
              <React.Fragment key={item.id}>
                <tr className="border-t hover:bg-muted/30">
                  <td className="px-2 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => toggleExpand(item.producto_id)}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs font-medium">
                    {item.producto_sku}
                  </td>
                  <td className="px-4 py-2 text-xs hidden md:table-cell truncate max-w-[200px]">
                    {item.producto_nombre ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground hidden lg:table-cell">
                    {item.marca_nombre ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-center tabular-nums font-medium">
                    {item.cajas}
                  </td>
                  <td className="px-4 py-2 text-center tabular-nums">
                    {item.piezas_sueltas}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-bold">
                    {totalPiezas}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground hidden xl:table-cell">
                    {item.ubicacion_pasillo ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-right hidden xl:table-cell">
                    <Fecha valor={item.updated_at} formato="relativo" className="text-xs text-muted-foreground" />
                  </td>
                </tr>

                {/* Fila expandida: detalle por caja */}
                {isExpanded && detalles && detalles.length > 0 && (
                  <tr key={`${item.id}-detail`} className="bg-muted/20">
                    <td></td>
                    <td colSpan={8} className="px-4 py-3">
                      <div className="rounded border overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="px-3 py-1.5 text-left">Caja</th>
                              <th className="px-3 py-1.5 text-left">Pack</th>
                              <th className="px-3 py-1.5 text-center">Cajas</th>
                              <th className="px-3 py-1.5 text-center">Piezas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detalles.map((d) => (
                              <tr key={d.id} className="border-t">
                                <td className="px-3 py-1.5 font-mono">{d.caja_codigo ?? '—'}</td>
                                <td className="px-3 py-1.5 text-muted-foreground">{d.caja_nombre_pack ?? '—'}</td>
                                <td className="px-3 py-1.5 text-center tabular-nums">{d.cajas}</td>
                                <td className="px-3 py-1.5 text-center tabular-nums">{d.piezas_sueltas}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}

                {isExpanded && detalles && detalles.length === 0 && (
                  <tr key={`${item.id}-empty`} className="bg-muted/20">
                    <td></td>
                    <td colSpan={8} className="px-4 py-3 text-xs text-muted-foreground text-center">
                      Sin desglose por caja para este producto.
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

import React from 'react'
