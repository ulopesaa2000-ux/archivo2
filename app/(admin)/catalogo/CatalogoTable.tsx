'use client'

// app/(admin)/catalogo/CatalogoTable.tsx

import Link from 'next/link'
import { DataTable, DataTableProvider, useDataTableContext, BulkActionBar, QuickEditPopover } from '@/components/admin/DataTable'
import type { ColumnDef, TableFeatures, QuickEditField, BulkAction } from '@/components/admin/DataTable'
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
import { toast } from 'sonner'

type Props = {
  productos: ProductoListItem[]
  catalogos: CatalogosParaFiltros
  sortBy: CatalogoSortBy
  order: 'asc' | 'desc'
  initialFeatures: TableFeatures
}

// ── Acciones masivas (definidas por la página, no acopladas) ─────────────────
const bulkActions: BulkAction[] = [
  {
    id: 'deactivate',
    label: 'Desactivar',
    icon: Trash2,
    variant: 'destructive' as const,
    async onClick(ids: number[]) {
      const { bulkDeactivateProductsAction } = await import('@/modules/catalogo/actions')
      const result = await bulkDeactivateProductsAction(ids)
      return result.success
    },
  },
]

// Opciones para estado
const ESTADO_OPTIONS = [
  { id: 'borrador', label: 'Borrador' },
  { id: 'pendiente', label: 'Pendiente' },
  { id: 'publicado', label: 'Publicado' },
  { id: 'pausado', label: 'Pausado' },
  { id: 'descontinuado', label: 'Descontinuado' },
] as const

// Features base de respaldo en caso de que initialFeatures falle
const FALLBACK_FEATURES: TableFeatures = {
  selectable: true,
  sortable: true,
  quickEdit: [
    { key: 'descripcion', label: 'Descripción', type: 'text' as const },
    { key: 'familia', label: 'Familia', type: 'text' as const },
    { key: 'marca_id', label: 'Marca', type: 'select' as const, options: [] as {id: string | number; label: string}[] },
    { key: 'precio_ec', label: 'Precio EC', type: 'currency' as const },
    { key: 'estado', label: 'Estado', type: 'select' as const, options: [...ESTADO_OPTIONS] as {id: string; label: string}[] },
  ] as QuickEditField[],
  bulkActions,
  columnSelector: false,
}

// ── QuickEdit save handler (global para todas las celdas) ────────────────────
async function handleQuickEditSave(
  ids: number[],
  field: string,
  value: unknown
) {
  const { bulkUpdateProductsAction } = await import('@/modules/catalogo/actions')
  const res = await bulkUpdateProductsAction(ids, { [field]: value })
  if (res.success) {
    toast.success(`Actualizado ${ids.length} producto${ids.length > 1 ? 's' : ''}`)
  } else {
    toast.error('Error al actualizar', { description: res.error })
  }
}

// ── Componente interno (usa el context) ──────────────────────────────────────
function CatalogoTableInner({
  productos,
  catalogos,
  sortBy,
  order,
}: Props) {
  const ctx = useDataTableContext()
  const marcasMap = new Map(catalogos.marcas.map((m) => [m.id, m.nombre]))

  const handleBulkDeactivate = async (ids: number[]) => {
    const { bulkDeactivateProductsAction } = await import('@/modules/catalogo/actions')
    return bulkDeactivateProductsAction(ids)
  }

  // Construir opciones de marca para el campo select
  const marcaOptions = catalogos.marcas.map(m => ({ id: m.id, label: m.nombre }))

  // Enrich quickEdit fields con opciones
  const quickEditFields = (ctx.features.quickEdit as QuickEditField[] | null)?.map((f) => {
    if (f.key === 'marca_id') return { ...f, options: marcaOptions }
    if (f.key === 'estado') return { ...f, options: [...ESTADO_OPTIONS] as {id: string; label: string}[] }
    return f
  }) ?? null

  const columns: ColumnDef<ProductoListItem>[] = [
    {
      key: 'sku',
      header: 'SKU',
      sortKey: 'sku_base',
      cell: (row: ProductoListItem) => (
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
      cell: (row: ProductoListItem) => (
        <QuickEditPopover
          field={(quickEditFields ?? []).find(f => f.key === 'descripcion')!}
          value={row.descripcion ?? row.nombre}
          rowId={row.id}
          onSaveGlobal={handleQuickEditSave}
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
      cell: (row: ProductoListItem) => (
        <QuickEditPopover
          field={(quickEditFields ?? []).find(f => f.key === 'familia')!}
          value={row.familia}
          rowId={row.id}
          onSaveGlobal={handleQuickEditSave}
        >
          <span className="text-sm text-muted-foreground">{row.familia ?? '—'}</span>
        </QuickEditPopover>
      ),
    },
    {
      key: 'marca',
      header: 'Marca',
      sortKey: 'marca_id',
      cell: (row: ProductoListItem) => (
        <QuickEditPopover
          field={(quickEditFields ?? []).find(f => f.key === 'marca_id')!}
          value={row.marca_id}
          rowId={row.id}
          onSaveGlobal={handleQuickEditSave}
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
      cell: (row: ProductoListItem) => (
        <span className="text-sm tabular-nums">{row.pz_en_caja ?? '—'}</span>
      ),
    },
    {
      key: 'precio_ec',
      header: 'Precio EC',
      sortKey: 'precio_ec',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row: ProductoListItem) => (
        <QuickEditPopover
          field={(quickEditFields ?? []).find(f => f.key === 'precio_ec')!}
          value={row.precio_ec}
          rowId={row.id}
          onSaveGlobal={handleQuickEditSave}
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
      cell: (row: ProductoListItem) => (
        <QuickEditPopover
          field={(quickEditFields ?? []).find(f => f.key === 'estado')!}
          value={row.estado}
          rowId={row.id}
          onSaveGlobal={handleQuickEditSave}
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
      cell: (row: ProductoListItem) => (
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
      cell: (row: ProductoListItem) => (
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
        rowKey={(row: ProductoListItem) => row.id}
        currentSortKey={sortBy}
        currentOrder={order}
        defaultSortKey="id"
        emptyMessage="No se encontraron productos con los filtros aplicados."
        emptyIcon={<Package className="h-12 w-12" />}
      />

      <BulkActionBar
        actions={bulkActions.map(a => ({
          ...a,
          onClick: async (ids: number[]) => {
            const res = await a.onClick(ids)
            if (res !== false) {
              ctx.clearSelection()
            }
          },
        }))}
        label="productos"
      />
    </>
  )
}

export function CatalogoTable({ initialFeatures, ...props }: Props) {
  return (
    <DataTableProvider route="/catalogo" features={{ ...FALLBACK_FEATURES, ...initialFeatures, bulkActions }}>
      <CatalogoTableInner {...props} sortBy={props.sortBy} order={props.order} initialFeatures={initialFeatures} />
    </DataTableProvider>
  )
}