'use client'

import { useState } from 'react'
import { DataTable, DataTableProvider, useDataTableContext } from '@/components/admin/DataTable'
import type { ColumnDef } from '@/components/admin/DataTable'
import { Badge } from '@/components/ui/badge'
import { Eye, Package } from 'lucide-react'
import { Fecha } from '@/components/shared/Fecha'
import { cn } from '@/lib/utils'
import type { CajaListItem } from '@/modules/ordenes-b2b/types'
import { DetalleCajaSheet } from './DetalleCajaSheet'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

type Props = {
  items: CajaListItem[]
  initialFeatures?: import('@/components/admin/DataTable/types').TableFeatures
  sortKey?: string
  sortOrder?: 'asc' | 'desc'
}

function CajasTableInner({ items, sortKey, sortOrder }: Props) {
  const ctx = useDataTableContext()
  const [selectedCajaId, setSelectedCajaId] = useState<number | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

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
      sortKey: 'producto_sku',
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
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 transition-colors hover:text-primary hover:bg-primary/10"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedCajaId(row.id)
              setIsSheetOpen(true)
            }}
            title="Ver detalle de caja"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )
      },
    },
  ]

  return (
    <div className="relative">
      <DataTable
        columns={columns}
        data={items}
        rowKey={(row: CajaListItem) => row.id}
        currentSortKey={sortKey}
        currentOrder={sortOrder}
        defaultSortKey="codigo_caja"
        emptyMessage="No se encontraron cajas."
        emptyIcon={<Package className="h-12 w-12" />}
      />

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="!w-[98vw] !max-w-[98vw] sm:!w-[90vw] sm:!max-w-[90vw] md:!w-[75vw] md:!max-w-[75vw] lg:!w-[55vw] lg:!max-w-[55vw] xl:!w-[45vw] xl:!max-w-[45vw] overflow-y-auto flex flex-col p-3 sm:p-6">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-xl">Detalle de Caja</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-2">
            {selectedCajaId && <DetalleCajaSheet cajaId={selectedCajaId} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
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