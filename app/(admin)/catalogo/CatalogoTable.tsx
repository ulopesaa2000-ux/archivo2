// app/(admin)/catalogo/CatalogoTable.tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { DataTable } from '@/components/admin/DataTable'
import type { ColumnDef } from '@/components/admin/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Pencil, Trash2, Star, Layers, Package } from 'lucide-react'
import { formatCurrency, truncate } from '@/lib/utils'
import { ESTADO_PRODUCTO_COLORS, ADMIN_ROUTES } from '@/lib/constants'
import type { ProductoListItem, CatalogosParaFiltros, CatalogoSortBy } from '@/modules/catalogo/types'
import { QuickEditPopover } from './components/QuickEditPopover'
import { bulkUpdateProductsAction, bulkDeactivateProductsAction } from '@/modules/catalogo/actions'
import { BulkActionBar } from './components/BulkActionBar'
import { toast } from 'sonner'

/**
 * Tabla de productos del catálogo.
 * Usa DataTable<T> genérico — cualquier cambio en ese componente
 * se refleja aquí automáticamente.
 */
export function CatalogoTable({
  productos,
  catalogos,
  sortBy,
  order,
}: {
  productos: ProductoListItem[]
  catalogos: CatalogosParaFiltros
  sortBy: CatalogoSortBy
  order: 'asc' | 'desc'
}) {
  const marcasMap = new Map(catalogos.marcas.map((m) => [m.id, m.nombre]))
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())

  const handleQuickEditSave = async (ids: number[], payload: any) => {
    const res = await bulkUpdateProductsAction(ids, payload)
    if (res.success) {
      toast.success(`Se actualizaron ${ids.length} productos correctamente.`)
      // Opcional: limpiar selección
      setSelectedIds(new Set())
    } else {
      toast.error('Error al actualizar', { description: res.error })
    }
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds).map(Number)
    const res = await bulkDeactivateProductsAction(ids)
    if (res.success) {
      toast.success(`Se desactivaron ${ids.length} productos correctamente.`)
      setSelectedIds(new Set())
    } else {
      toast.error('Error al desactivar', { description: res.error })
    }
  }

  const columns: ColumnDef<ProductoListItem>[] = [
    {
      key: 'sku',
      header: 'SKU',
      sortKey: 'sku_base',
      cell: (row) => (
        <Link
          href={ADMIN_ROUTES.catalogo.detalle(row.id)}
          className="font-mono text-sm font-medium text-primary hover:underline"
        >
          {row.sku_base}
        </Link>
      ),
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      cell: (row) => (
        <QuickEditPopover
          config={{ field: 'descripcion', type: 'text', label: 'Descripción' }}
          value={row.descripcion ?? row.nombre}
          rowId={row.id}
          selectedIds={selectedIds}
          onSave={handleQuickEditSave}
        >
          <span className="text-sm" title={row.descripcion ?? ''}>
            {truncate(row.descripcion ?? row.nombre, 40)}
          </span>
        </QuickEditPopover>
      ),
    },
    {
      key: 'familia',
      header: 'Familia',
      sortKey: 'familia',
      cell: (row) => (
        <QuickEditPopover
          config={{ field: 'familia', type: 'text', label: 'Familia' }}
          value={row.familia}
          rowId={row.id}
          selectedIds={selectedIds}
          onSave={handleQuickEditSave}
        >
          <span className="text-sm text-muted-foreground">{row.familia ?? '—'}</span>
        </QuickEditPopover>
      ),
    },
    {
      key: 'marca',
      header: 'Marca',
      sortKey: 'marca_id',
      cell: (row) => (
        <QuickEditPopover
          config={{ field: 'marca_id', type: 'marca', label: 'Marca' }}
          value={row.marca_id}
          rowId={row.id}
          selectedIds={selectedIds}
          options={catalogos.marcas.map(m => ({ id: m.id, nombre: m.nombre }))}
          onSave={handleQuickEditSave}
        >
          <span className="text-sm">
            {row.marca_id ? marcasMap.get(row.marca_id) ?? '—' : '—'}
          </span>
        </QuickEditPopover>
      ),
    },
    {
      key: 'pz_en_caja',
      header: 'Pz/Caja',
      sortKey: 'pz_en_caja',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <span className="text-sm tabular-nums">{row.pz_en_caja ?? '—'}</span>
      ),
    },
    {
      key: 'precio_ec',
      header: 'Precio EC',
      sortKey: 'precio_ec',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <QuickEditPopover
          config={{ field: 'precio_ec', type: 'number', label: 'Precio EC' }}
          value={row.precio_ec}
          rowId={row.id}
          selectedIds={selectedIds}
          onSave={handleQuickEditSave}
        >
          <span className="text-sm font-medium tabular-nums ml-auto">
            {row.precio_ec ? formatCurrency(row.precio_ec) : '—'}
          </span>
        </QuickEditPopover>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      sortKey: 'estado',
      cell: (row) => (
        <QuickEditPopover
          config={{ field: 'estado', type: 'estado', label: 'Estado' }}
          value={row.estado}
          rowId={row.id}
          selectedIds={selectedIds}
          onSave={handleQuickEditSave}
        >
          <Badge
            variant="secondary"
            className={`text-xs ${ESTADO_PRODUCTO_COLORS[row.estado] ?? 'bg-gray-100 text-gray-800'}`}
          >
            {row.estado}
          </Badge>
        </QuickEditPopover>
      ),
    },
    {
      key: 'flags',
      header: '',
      headerClassName: 'w-[60px]',
      cell: (row) => (
        <div className="flex items-center gap-1">
          {row.destacado && (
            <span title="Destacado">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            </span>
          )}
          {row.es_conjunto && (
            <span title="Conjunto">
              <Layers className="h-3.5 w-3.5 text-blue-500" />
            </span>
          )}
          {!row.activo && (
            <Badge variant="outline" className="text-[10px] px-1 text-red-500 border-red-200">
              Inactivo
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'acciones',
      header: '',
      headerClassName: 'w-[50px]',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
              <span suppressHydrationWarning>
                <MoreHorizontal className="h-4 w-4" />
              </span>
              <span className="sr-only">Acciones</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={ADMIN_ROUTES.catalogo.detalle(row.id)}>
                <Eye className="mr-2 h-3.5 w-3.5" />
                Ver detalle
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/catalogo?modal=edit&edit_id=${row.id}`}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Editar rápido
              </Link>
            </DropdownMenuItem>
            {row.activo && (
              <DropdownMenuItem asChild>
                <Link
                  href={`/catalogo?modal=delete&delete_id=${row.id}`}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Desactivar
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <>
    <DataTable
      columns={columns}
      data={productos}
      rowKey={(row) => row.id}
      currentSortKey={sortBy}
      currentOrder={order}
      defaultSortKey="id"
      selectedIds={selectedIds}
      onSelectionChange={setSelectedIds}
      emptyMessage="No se encontraron productos con los filtros aplicados."
      emptyIcon={<Package className="h-12 w-12" />}
    />

    <BulkActionBar 
      selectedCount={selectedIds.size}
      onClear={() => setSelectedIds(new Set())}
      onBulkDelete={handleBulkDelete}
    />
    </>
  )
}
