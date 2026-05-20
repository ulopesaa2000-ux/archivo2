// app/(admin)/ordenes-b2b/OrdenesTable.tsx
'use client'

import { memo, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DataTable, DataTableProvider, useDataTableContext, useDataTableExpand } from '@/components/admin/DataTable'
import type { ColumnDef, TableFeatures } from '@/components/admin/DataTable'
import { Badge } from '@/components/ui/badge'
import { Eye, MoreHorizontal, Pencil, ShoppingCart, Trash2 } from 'lucide-react'
import { Fecha } from '@/components/shared/Fecha'
import { cn } from '@/lib/utils'
import { ADMIN_ROUTES, ESTADO_ORDEN_B2B_COLORS } from '@/lib/constants'
import type { OrdenB2BListItem, CatalogosB2B } from '@/modules/ordenes-b2b/types'
import { OrdenFormDialog } from './OrdenFormDialog'
import { eliminarOrdenB2BAction } from '@/modules/ordenes-b2b/actions'

type Props = {
  items: OrdenB2BListItem[]
  catalogos?: CatalogosB2B
  sortKey?: string
  sortOrder?: 'asc' | 'desc'
  initialFeatures?: TableFeatures
}

function OrdenesTableInner({
  items,
  catalogos,
  sortKey,
  sortOrder,
}: Props) {
  const router = useRouter()
  const ctx = useDataTableContext()
  const { expandedIds } = useDataTableExpand()
  const [editingOrden, setEditingOrden] = useState<OrdenB2BListItem | null>(null)
  const [isPending, startTransition] = useTransition()

  // Las features ahora vienen del provider (cargado desde BD o defaults)
  const features = ctx.features

  const columns: ColumnDef<OrdenB2BListItem>[] = [
    {
      key: 'id',
      header: 'ID',
      sortKey: 'id',
      headerClassName: 'w-[80px]',
      cell: (row: OrdenB2BListItem) => (
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
      cell: (row: OrdenB2BListItem) => (
        <span className="font-mono text-xs">{row.folio_proveedor ?? '—'}</span>
      ),
    },
    {
      key: 'proveedor',
      header: 'Proveedor',
      sortKey: 'proveedor_nombre',
      headerClassName: 'hidden md:table-cell',
      className: 'hidden md:table-cell max-w-[180px]',
      cell: (row: OrdenB2BListItem) => (
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
      cell: (row: OrdenB2BListItem) => (
        <span className="text-sm tabular-nums font-semibold">{row.total_cajas ?? 0}</span>
      ),
    },
    {
      key: 'piezas',
      header: 'Piezas',
      sortKey: 'total_piezas',
      headerClassName: 'text-center hidden lg:table-cell',
      className: 'text-center hidden lg:table-cell',
      cell: (row: OrdenB2BListItem) => (
        <span className="text-sm tabular-nums font-semibold">{row.total_piezas ?? 0}</span>
      ),
    },
    {
      key: 'fecha',
      header: 'Fecha',
      sortKey: 'fecha_orden',
      headerClassName: 'hidden sm:table-cell',
      className: 'hidden sm:table-cell',
      cell: (row: OrdenB2BListItem) => (
        <Fecha valor={row.fecha_orden} formato="fecha" className="text-xs text-muted-foreground" />
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      sortKey: 'estado',
      cell: (row: OrdenB2BListItem) => {
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
      cell: (row: OrdenB2BListItem) => (
        <div className="flex items-center gap-1 justify-end">
          {/* Ver detalle */}
          <Link
            href={ADMIN_ROUTES.ordenesB2B.detalle(row.id)}
            className={cn('h-7 w-7 p-0')}
            title="Ver detalle"
          >
            <Eye className="h-3.5 w-3.5" />
          </Link>

          {/* Editar */}
          <button
            title="Editar"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setEditingOrden(row)
            }}
            disabled={isPending}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          {/* Eliminar */}
          <button
            title="Eliminar"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`¿Estás seguro de eliminar la orden #${row.id}?`)) {
                startTransition(async () => {
                  const result = await eliminarOrdenB2BAction(row.id)
                  if (result.success) {
                    router.refresh()
                  } else {
                    alert(result.error ?? 'Error al eliminar la orden.')
                  }
                })
              }
            }}
            disabled={isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        rowKey={(row: OrdenB2BListItem) => row.id}
        currentSortKey={sortKey}
        currentOrder={sortOrder}
        defaultSortKey="id"
        emptyMessage="No se encontraron órdenes."
        emptyIcon={<ShoppingCart className="h-12 w-12" />}
        renderExpanded={(row) => {
          const isExpanded = expandedIds.has(row.id);
          if (!isExpanded) return null;
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6 text-sm py-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Cliente B2B</span>
                <p className="font-semibold truncate">{row.cliente_nombre ?? 'Interno / S.I.'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Contenedor</span>
                {row.contenedor_codigo ? (
                  <Link href={ADMIN_ROUTES.contenedores.detalle(row.contenedor_id!)} className="font-mono text-xs hover:underline text-primary">
                    {row.contenedor_codigo}
                  </Link>
                ) : (
                  <p className="text-xs text-muted-foreground">—</p>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">CBM Orden</span>
                <p className="font-medium tabular-nums">{row.cbm_orden ?? '—'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Moneda / TC</span>
                <p className="font-semibold">{row.moneda} {row.tipo_cambio ? `(TC: ${row.tipo_cambio})` : ''}</p>
              </div>
              <div className="sm:col-span-2 lg:col-span-2 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Observaciones</span>
                <p className="text-muted-foreground italic text-xs leading-relaxed line-clamp-2">
                  {row.observaciones ?? 'Sin anotaciones.'}
                </p>
              </div>
            </div>
          )
        }}
      />

      {editingOrden && catalogos && (
        <OrdenFormDialog
          mode="edit"
          catalogos={catalogos}
          orden={editingOrden}
          open={!!editingOrden}
          onOpenChange={(open) => {
            if (!open) setEditingOrden(null)
          }}
        />
      )}
    </>
  )
}

export function OrdenesTable({ initialFeatures, ...props }: Props) {
  // Merge: defaults + user config (si existe)
  const features = useMemo(() => ({
    selectable: true,
    expandable: true,
    sortable: true,
    ...initialFeatures,
  }), [initialFeatures])

  return (
    <DataTableProvider route="/ordenes-b2b" features={features}>
      <OrdenesTableInner {...props} />
    </DataTableProvider>
  )
}
