// app/(admin)/catalogo/CatalogoTable.tsx
'use client'

import Link from 'next/link'
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
        <span className="text-sm" title={row.descripcion ?? ''}>
          {truncate(row.descripcion ?? row.nombre, 40)}
        </span>
      ),
    },
    {
      key: 'familia',
      header: 'Familia',
      sortKey: 'familia',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.familia ?? '—'}</span>
      ),
    },
    {
      key: 'marca',
      header: 'Marca',
      sortKey: 'marca_id',
      cell: (row) => (
        <span className="text-sm">
          {row.marca_id ? marcasMap.get(row.marca_id) ?? '—' : '—'}
        </span>
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
        <span className="text-sm font-medium tabular-nums">
          {row.precio_ec ? formatCurrency(row.precio_ec) : '—'}
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      sortKey: 'estado',
      cell: (row) => (
        <Badge
          variant="secondary"
          className={`text-xs ${ESTADO_PRODUCTO_COLORS[row.estado] ?? 'bg-gray-100 text-gray-800'}`}
        >
          {row.estado}
        </Badge>
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
    <DataTable
      columns={columns}
      data={productos}
      rowKey={(row) => row.id}
      currentSortKey={sortBy}
      currentOrder={order}
      defaultSortKey="id"
      emptyMessage="No se encontraron productos con los filtros aplicados."
      emptyIcon={<Package className="h-12 w-12" />}
    />
  )
}
