'use client'

import { DataTable, DataTableProvider, useDataTableContext } from '@/components/admin/DataTable'
import type { ColumnDef } from '@/components/admin/DataTable'
import { Badge } from '@/components/ui/badge'
import { Eye, Package } from 'lucide-react'
import { Fecha } from '@/components/shared/Fecha'
import { cn } from '@/lib/utils'
import type { CajaListItem } from '@/modules/ordenes-b2b/types'
import { DetalleCajaSheet } from './DetalleCajaSheet'
import { Button } from '@/components/ui/button'

type Props = {
  items: CajaListItem[]
  initialFeatures?: import('@/components/admin/DataTable/types').TableFeatures
}

function CajasTableInner({ items }: Props) {
  const ctx = useDataTableContext()

  const columns: ColumnDef<CajaListItem>[] = [
    {
      key: 'codigo_caja',
      header: 'Código',
      sortKey: 'codigo_caja',
      cell: (row: CajaListItem) => (
        <span className="font-mono text-xs font-medium">{row.codigo_caja}</span>
      ),
    },
    {
      key: 'producto',
      header: 'Producto',
      cell: (row: CajaListItem) => (
        <>
          <span className="font-mono">{row.producto_sku ?? '—'}</span>
          {row.producto_nombre && (
            <span className="text-muted-foreground ml-1">({row.producto_nombre})</span>
          )}
        </>
      ),
    },
    {
      key: 'proveedor',
      header: 'Proveedor',
      sortKey: 'proveedor_nombre',
      headerClassName: 'hidden md:table-cell',
      className: 'hidden md:table-cell',
      cell: (row: CajaListItem) => (
        <span className="text-xs text-muted-foreground">{row.proveedor_nombre ?? '—'}</span>
      ),
    },
    {
      key: 'piezas',
      header: 'Pz/Caja',
      sortKey: 'piezas_por_caja',
      headerClassName: 'text-center',
      className: 'text-center tabular-nums',
      cell: (row: CajaListItem) => (
        <span className="text-xs">{row.piezas_por_caja ?? '—'}</span>
      ),
    },
    {
      key: 'tallas',
      header: 'Tallas',
      sortKey: 'tallas',
      headerClassName: 'hidden lg:table-cell',
      className: 'hidden lg:table-cell',
      cell: (row: CajaListItem) => (
        <span className="text-xs text-muted-foreground">{row.tallas ?? '—'}</span>
      ),
    },
    {
      key: 'colores',
      header: 'Colores',
      sortKey: 'colores',
      headerClassName: 'hidden lg:table-cell',
      className: 'hidden lg:table-cell',
      cell: (row: CajaListItem) => (
        <span className="text-xs text-muted-foreground">{row.colores ?? '—'}</span>
      ),
    },
    {
      key: 'cbm',
      header: 'CBM',
      sortKey: 'cbm',
      headerClassName: 'text-right',
      className: 'text-right tabular-nums',
      cell: (row: CajaListItem) => (
        <span className="text-xs">{row.cbm ?? '—'}</span>
      ),
    },
    {
      key: 'acciones',
      header: '',
      headerClassName: 'w-[50px]',
      cell: (row: CajaListItem) => {
        const isExpanded = ctx.expandedIds.has(row.id)
        return (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 transition-colors",
              isExpanded && "text-primary bg-primary/10"
            )}
            onClick={(e) => {
              e.stopPropagation()
              ctx.onToggleExpand(row.id)
            }}
            title={isExpanded ? 'Cerrar detalle' : 'Ver detalle de caja'}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={items}
      rowKey={(row: CajaListItem) => row.id}
      defaultSortKey="codigo_caja"
      renderExpanded={(row) => <DetalleCajaSheet cajaId={row.id} />}
      emptyMessage="No se encontraron cajas."
      emptyIcon={<Package className="h-12 w-12" />}
    />
  )
}

// Fallback features base
const FALLBACK_FEATURES = {
  selectable: true,
  expandable: true,
  sortable: true,
} as const

export function CajasTable({ initialFeatures, ...props }: Props) {
  return (
    <DataTableProvider route="/ordenes-b2b/cajas" features={{ ...FALLBACK_FEATURES, ...initialFeatures }}>
      <CajasTableInner {...props} />
    </DataTableProvider>
  )
}