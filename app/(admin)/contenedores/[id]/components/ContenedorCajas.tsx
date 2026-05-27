// app/(admin)/contenedores/[id]/components/ContenedorCajas.tsx
'use client'

import React, { useMemo } from 'react'
import { Package, Box, Ruler, DollarSign } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CajaCard } from '@/components/admin/cajas/CajaCard'
import { formatCurrency, cn } from '@/lib/utils'
import type { CajaEnContenedor } from '@/modules/contenedores/types'

export function ContenedorCajas({ cajas }: { cajas: CajaEnContenedor[] }) {
  // Group cajas by order
  const grouped = useMemo(() => {
    const map = new Map<string, { ordenFolio: string; items: CajaEnContenedor[] }>()
    for (const c of cajas) {
      const key = `order_${c.ordenId}`
      if (!map.has(key)) {
        map.set(key, { ordenFolio: c.ordenFolio ?? `Orden #${c.ordenId}`, items: [] })
      }
      map.get(key)!.items.push(c)
    }
    return Array.from(map.values())
  }, [cajas])

  // Summary metrics
  const metrics = useMemo(() => {
    let totalCajasFisicas = 0
    let totalPiezas = 0
    let totalCbm = 0
    for (const c of cajas) {
      totalCajasFisicas += c.cantidad_cajas ?? 0
      const pzPerBox = c.piezas_por_caja ?? 0
      const qty = c.cantidad_cajas ?? 0
      totalPiezas += pzPerBox * qty
      totalCbm += (c.cbm ?? 0) * qty
    }
    return { totalCajasFisicas, totalPiezas, totalCbm }
  }, [cajas])

  if (cajas.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-muted-foreground mt-4">
        <Package className="h-8 w-8" /><p className="text-sm mt-2">Sin cajas en este contenedor.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <Box className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cajas</p>
              <p className="text-xl font-black tabular-nums">{metrics.totalCajasFisicas}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Piezas</p>
              <p className="text-xl font-black tabular-nums">{metrics.totalPiezas.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
              <Ruler className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">CBM Total</p>
              <p className="text-xl font-black tabular-nums">{metrics.totalCbm.toFixed(3)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cajas grouped by order */}
      {grouped.map((group, idx) => (
        <div key={idx} className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-mono">
              {group.ordenFolio}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {group.items.length} caja{group.items.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid gap-4">
            {group.items.map((caja) => (
              <CajaCard
                key={caja.ordenCajaId}
                caja={caja}
                layout="horizontal"
                canEdit={false}
                canDelete={false}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
