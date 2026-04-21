// app/(admin)/ordenes-b2b/cajas/CajasTable.tsx
'use client'

import Link from 'next/link'
import { DataTable, DataTableProvider } from '@/components/admin/DataTable'
import type { ColumnDef } from '@/components/admin/DataTable'
import { Badge } from '@/components/ui/badge'
import { Eye, Package } from 'lucide-react'
import { Fecha } from '@/components/shared/Fecha'
import { cn } from '@/lib/utils'
import type { CajaListItem } from '@/modules/ordenes-b2b/types'

type Props = {
  items: CajaListItem[]
}

function CajasTableInner({ items }: Props) {
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
      cell: (row: CajaListItem) => (
        <Link
          href={/* TODO: Add route for caja detalle */'#'}
          className="flex h-7 w-7 items-center justify-center"
          title={`Ver caja ${row.id}`}
        >
          <Eye className="h-3.5 w-3.5" />
        </Link>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={items}
      rowKey={(row: CajaListItem) => row.id}
      defaultSortKey="codigo_caja"
      emptyMessage="No se encontraron cajas."
      emptyIcon={<Package className="h-12 w-12" />}
    />
  )
}

export function CajasTable(props: Props) {
  return (
    <DataTableProvider route="/ordenes-b2b/cajas" features={{ selectable: true, expandable: false, sortable: true }}>
      <CajasTableInner {...props} />
    </DataTableProvider>
  )
}