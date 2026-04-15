// app/(admin)/ordenes-b2b/OrdenesTable.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Eye, MoreHorizontal, Pencil, ShoppingCart, Trash2 } from 'lucide-react'
import { Fecha } from '@/components/shared/Fecha'
import { cn } from '@/lib/utils'
import { DataTable } from '@/components/admin/DataTable'
import type { ColumnDef } from '@/components/admin/DataTable'
import { OrdenFormDialog } from './OrdenFormDialog'
import { ADMIN_ROUTES, ESTADO_ORDEN_B2B_COLORS } from '@/lib/constants'
import type { OrdenB2BListItem, CatalogosB2B } from '@/modules/ordenes-b2b/types'

export function OrdenesTable({
  items,
  catalogos,
  sortKey,
  sortOrder,
}: {
  items: OrdenB2BListItem[]
  catalogos: CatalogosB2B
  sortKey?: string
  sortOrder?: 'asc' | 'desc'
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [editingId, setEditingId] = useState<number | null>(null)

  const toggle = (id: string | number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      const numId = Number(id)
      next.has(numId) ? next.delete(numId) : next.add(numId)
      return next
    })
  }

  const ordenEditando = editingId !== null
    ? items.find((i) => i.id === editingId) ?? null
    : null

  // ── Columnas ────────────────────────────────────────────────
  const columns: ColumnDef<OrdenB2BListItem>[] = [
    {
      key: 'id',
      header: 'ID',
      sortKey: 'id',
      headerClassName: 'w-[80px]',
      cell: (row) => (
        <Link
          href={ADMIN_ROUTES.ordenesB2B.detalle(row.id)}
          className="font-mono text-xs font-medium text-primary hover:underline"
        >
          #{row.id}
        </Link>
      ),
    },
    {
      key: 'folio',
      header: 'Folio Prov.',
      sortKey: 'folio_proveedor',
      cell: (row) => (
        <span className="font-mono text-xs">{row.folio_proveedor ?? '—'}</span>
      ),
    },
    {
      key: 'proveedor',
      header: 'Proveedor',
      sortKey: 'proveedor_nombre',
      headerClassName: 'hidden md:table-cell',
      className: 'hidden md:table-cell max-w-[180px]',
      cell: (row) => (
        <span className="text-xs font-medium truncate block" title={row.proveedor_nombre ?? ''}>
          {row.proveedor_nombre ?? '—'}
        </span>
      ),
    },
    {
      key: 'cajas',
      header: 'Cajas',
      sortKey: 'total_cajas',
      headerClassName: 'text-center hidden lg:table-cell',
      className: 'text-center hidden lg:table-cell',
      cell: (row) => (
        <span className="text-sm tabular-nums font-semibold">{row.total_cajas ?? 0}</span>
      ),
    },
    {
      key: 'piezas',
      header: 'Piezas',
      sortKey: 'total_piezas',
      headerClassName: 'text-center hidden lg:table-cell',
      className: 'text-center hidden lg:table-cell',
      cell: (row) => (
        <span className="text-sm tabular-nums font-semibold">{row.total_piezas ?? 0}</span>
      ),
    },
    {
      key: 'fecha',
      header: 'Fecha',
      sortKey: 'fecha_orden',
      headerClassName: 'hidden sm:table-cell',
      className: 'hidden sm:table-cell',
      cell: (row) => (
        <Fecha valor={row.fecha_orden} formato="fecha" className="text-xs text-muted-foreground" />
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      sortKey: 'estado',
      cell: (row) => {
        const estadoColor = ESTADO_ORDEN_B2B_COLORS[row.estado ?? ''] ?? ''
        return (
          <Badge variant="secondary" className={cn('text-[10px]', estadoColor)}>
            {row.estado ?? '—'}
          </Badge>
        )
      },
    },
    {
      key: 'acciones',
      header: '',
      headerClassName: 'w-[90px]',
      cell: (row) => (
        <div className="flex items-center gap-1 justify-end">
          {/* Ver detalle */}
          <Link
            href={ADMIN_ROUTES.ordenesB2B.detalle(row.id)}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-7 w-7 p-0')}
            title="Ver detalle"
          >
            <Eye className="h-3.5 w-3.5" />
          </Link>

          {/* Más acciones: Editar / Eliminar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                title="Más acciones"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() => setEditingId(row.id)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                onClick={() => {
                  if (confirm('¿Estás seguro de eliminar esta orden?')) {
                    // TODO: call delete action
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  // ── Vista expandida (panel de detalles) ─────────────────────
  const renderExpanded = (row: OrdenB2BListItem) => (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6 text-sm py-1">
      <div className="space-y-1">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
          Cliente B2B
        </span>
        <p className="font-semibold text-foreground truncate">
          {row.cliente_nombre ?? 'Interno / S.I.'}
        </p>
      </div>

      {row.contenedor_codigo && (
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
            Contenedor
          </span>
          <Link
            href={ADMIN_ROUTES.contenedores.detalle(row.contenedor_id!)}
            className="font-mono text-xs hover:underline text-primary flex items-center gap-1"
          >
            {row.contenedor_codigo}
          </Link>
        </div>
      )}

      {!row.contenedor_codigo && (
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
            Contenedor
          </span>
          <p className="text-xs text-muted-foreground">—</p>
        </div>
      )}

      <div className="space-y-1">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
          CBM Orden
        </span>
        <p className="font-medium tabular-nums">{row.cbm_orden ?? '—'}</p>
      </div>

      <div className="space-y-1">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
          Moneda / TC
        </span>
        <p className="font-semibold">
          {row.moneda}{row.tipo_cambio ? ` (TC: ${row.tipo_cambio})` : ''}
        </p>
      </div>

      <div className="sm:col-span-2 lg:col-span-2 space-y-1">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
          Observaciones
        </span>
        <p
          className="text-muted-foreground italic text-xs leading-relaxed line-clamp-2"
          title={row.observaciones ?? ''}
        >
          {row.observaciones ?? 'Sin anotaciones.'}
        </p>
      </div>
    </div>
  )

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

      <DataTable
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        currentSortKey={sortKey}
        currentOrder={sortOrder}
        defaultSortKey="id"
        expandedRows={expanded as unknown as Set<string | number>}
        onToggleRow={toggle}
        renderExpanded={renderExpanded}
        emptyMessage="No se encontraron órdenes."
        emptyIcon={<ShoppingCart className="h-12 w-12" />}
      />
    </>
  )
}
