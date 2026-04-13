// app/(admin)/ordenes-b2b/OrdenesTable.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, ChevronRight, ShoppingCart, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Fecha } from '@/components/shared/Fecha'
import { cn } from '@/lib/utils'
import { OrdenRow } from '@/components/admin/ordenes/OrdenRow'
import { OrdenFormDialog } from './OrdenFormDialog'
import type { OrdenB2BListItem, CatalogosB2B } from '@/modules/ordenes-b2b/types'

export function OrdenesTable({
  items,
  catalogos,
}: {
  items: OrdenB2BListItem[]
  catalogos: CatalogosB2B
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  // Estado para el dialog de edición: null = cerrado, número = ID de la orden editando
  const [editingId, setEditingId] = useState<number | null>(null)

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground rounded-lg border">
        <ShoppingCart className="h-12 w-12" />
        <p className="text-sm mt-4">No se encontraron órdenes.</p>
      </div>
    )
  }

  const ordenEditando = editingId !== null ? items.find(i => i.id === editingId) ?? null : null

  return (
    <>
      {/* Dialog de edición — montado fuera de la tabla */}
      {ordenEditando && (
        <OrdenFormDialog
          mode="edit"
          catalogos={catalogos}
          orden={ordenEditando}
          open={editingId !== null}
          onOpenChange={(v) => { if (!v) setEditingId(null) }}
        />
      )}

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-xs font-semibold text-muted-foreground">
              <th className="px-2 py-2 w-[40px]"></th>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Folio Prov.</th>
              <th className="px-4 py-2 text-left hidden md:table-cell">Proveedor</th>
              <th className="px-4 py-2 text-center hidden lg:table-cell">Cajas</th>
              <th className="px-4 py-2 text-center hidden lg:table-cell">Piezas</th>
              <th className="px-4 py-2 text-left hidden sm:table-cell">Fecha</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2 w-[90px]"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <OrdenRow
                key={item.id}
                item={item}
                isExpanded={expanded.has(item.id)}
                onToggle={toggle}
                onEdit={(id) => setEditingId(id)}
                onDelete={(id) => {
                  if (confirm('¿Estás seguro de eliminar esta orden?')) {
                    // TODO: call delete action
                  }
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

