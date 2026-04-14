// app/(admin)/catalogo/CatalogoTable.tsx
'use client'

import Link from 'next/link'
import { DataTable } from '@/components/admin/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Pencil, Trash2, Star, Layers } from 'lucide-react'
import { formatCurrency, truncate } from '@/lib/utils'
import { ESTADO_PRODUCTO_COLORS, ADMIN_ROUTES } from '@/lib/constants'
import { Package } from 'lucide-react'
import type { ProductoListItem, CatalogosParaFiltros } from '@/modules/catalogo/types'

/**
 * Tabla de productos del catálogo.
 * 
 * Este es un CLIENT COMPONENT.
 * Recibe los datos ya filtrados y renderiza las filas completas.
 */
export function CatalogoTable({
  productos,
  catalogos,
}: {
  productos: ProductoListItem[]
  catalogos: CatalogosParaFiltros
}) {
  // Mapas para lookup rápido
  const marcasMap = new Map(catalogos.marcas.map((m) => [m.id, m.nombre]))

  const headers = [
    'SKU',
    'Descripción',
    'Familia',
    'Marca',
    'Pz/Caja',
    'Precio EC',
    'Estado',
    '',
    '',
  ]

  const rows = productos.map((row) => [
    <Link
      key="sku"
      href={ADMIN_ROUTES.catalogo.detalle(row.id)}
      className="font-mono text-sm font-medium text-primary hover:underline"
    >
      {row.sku_base}
    </Link>,
    <span key="desc" className="text-sm" title={row.descripcion ?? ''}>
      {truncate(row.descripcion ?? row.nombre, 40)}
    </span>,
    <span key="fam" className="text-sm text-muted-foreground">
      {row.familia ?? '—'}
    </span>,
    <span key="marca" className="text-sm">
      {row.marca_id ? marcasMap.get(row.marca_id) ?? '—' : '—'}
    </span>,
    <span key="pz" className="text-sm tabular-nums">
      {row.pz_en_caja ?? '—'}
    </span>,
    <span key="precio" className="text-sm font-medium tabular-nums">
      {row.precio_ec ? formatCurrency(row.precio_ec) : '—'}
    </span>,
    <Badge key="estado" variant="secondary" className={`text-xs ${ESTADO_PRODUCTO_COLORS[row.estado] ?? 'bg-gray-100 text-gray-800'}`}>
      {row.estado}
    </Badge>,
    <div key="flags" className="flex items-center gap-1">
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
    </div>,
    <DropdownMenu key="acciones">
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
  ])

  return (
    <DataTable
      headers={headers}
      rows={rows}
      rowKeys={productos.map(p => p.id)}
      emptyMessage="No se encontraron productos con los filtros aplicados."
      emptyIcon={<Package className="h-12 w-12" />}
    />
  )
}
