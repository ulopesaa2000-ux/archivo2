// app/(admin)/contenedores/[id]/components/ContenedorOrdenes.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Fecha } from '@/components/shared/Fecha'
import { ADMIN_ROUTES, ESTADO_ORDEN_B2B_COLORS } from '@/lib/constants'
import { ShoppingCart, ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { OrdenEnContenedor } from '@/modules/contenedores/types'

import { OrdenRow } from '@/components/admin/ordenes/OrdenRow'

export function ContenedorOrdenes({ ordenes }: { ordenes: OrdenEnContenedor[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (ordenes.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-muted-foreground">
        <ShoppingCart className="h-8 w-8" /><p className="text-sm mt-2">Sin órdenes vinculadas.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden mt-4 bg-background">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b">
            <th className="px-2 py-2 w-[40px]"></th>
            <th className="px-4 py-2 text-left">ID</th>
            <th className="px-4 py-2 text-left">Folio Prov.</th>
            <th className="px-4 py-2 text-left">Proveedor</th>
            <th className="px-4 py-2 text-center">Cajas</th>
            <th className="px-4 py-2 text-center">Piezas</th>
            <th className="px-4 py-2 text-left">Fecha</th>
            <th className="px-4 py-2">Estado</th>
            <th className="px-4 py-2 w-[60px]"></th>
          </tr>
        </thead>
        <tbody>
          {ordenes.map((o) => (
            <OrdenRow
              key={o.id}
              item={o}
              isExpanded={expanded.has(o.id)}
              onToggle={toggle}
              showContenedor={false} // Redundante dentro de un contenedor
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
