// app/(admin)/catalogo/catalogos/components/CatalogosReadOnlyTable.tsx
'use client'
/* eslint-disable react-hooks/static-components */

import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, Layers, Eye, Package, ArrowUpDown } from 'lucide-react'
import { DestacadoStarButton } from '../../components/DestacadoStarButton'
import { formatCurrency, truncate } from '@/lib/utils'
import { ESTADO_PRODUCTO_COLORS, ADMIN_ROUTES } from '@/lib/constants'
import type { ProductoListItem, CatalogosParaFiltros, CatalogoSortBy } from '@/modules/catalogo/types'
import { useRouter, useSearchParams } from 'next/navigation'

type Props = {
  productos: ProductoListItem[]
  catalogos: CatalogosParaFiltros
  sortBy: CatalogoSortBy
  order: 'asc' | 'desc'
}

export function CatalogosReadOnlyTable({
  productos,
  catalogos,
  sortBy,
  order,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const marcasMap = new Map(catalogos.marcas.map((m) => [m.id, m.nombre]))

  const handleSort = (field: CatalogoSortBy) => {
    const params = new URLSearchParams(searchParams.toString())
    if (sortBy === field) {
      params.set('order', order === 'asc' ? 'desc' : 'asc')
    } else {
      params.set('sort_by', field)
      params.set('order', 'asc')
    }
    router.push(`/catalogo/catalogos?${params.toString()}`, { scroll: false })
  }

  const SortableHeader = ({ field, children }: { field: CatalogoSortBy; children: React.ReactNode }) => {
    const active = sortBy === field
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="group inline-flex items-center gap-1 hover:text-foreground font-semibold"
      >
        {children}
        <ArrowUpDown className={`ml-1 h-3.5 w-3.5 transition-opacity ${active ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-50'}`} />
      </button>
    )
  }

  if (productos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-xl text-muted-foreground gap-3">
        <div className="rounded-full bg-muted p-4">
          <Package className="h-8 w-8 opacity-40" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">No se encontraron productos</p>
          <p className="text-xs opacity-70 mt-1">Ajusta los filtros de búsqueda</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[120px] font-semibold text-foreground">
              <SortableHeader field="sku_base">SKU</SortableHeader>
            </TableHead>
            <TableHead className="font-semibold text-foreground">Descripción</TableHead>
            <TableHead className="font-semibold text-foreground">
              <SortableHeader field="familia">Familia</SortableHeader>
            </TableHead>
            <TableHead className="font-semibold text-foreground">
              <SortableHeader field="marca_id">Marca</SortableHeader>
            </TableHead>
            <TableHead className="w-[100px] text-right font-semibold text-foreground">
              <SortableHeader field="pz_en_caja">Pz/Caja</SortableHeader>
            </TableHead>
            <TableHead className="w-[120px] text-right font-semibold text-foreground">
              <SortableHeader field="precio_ec">Precio EC</SortableHeader>
            </TableHead>
            <TableHead className="w-[140px] font-semibold text-foreground">
              <SortableHeader field="estado">Estado</SortableHeader>
            </TableHead>
            <TableHead className="w-[100px]"></TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos.map((row) => {
            const estadoColor = ESTADO_PRODUCTO_COLORS[row.estado] ?? 'bg-gray-100 text-gray-800'
            const brandName = row.marca_id ? marcasMap.get(row.marca_id) ?? '—' : '—'

            return (
              <TableRow key={row.id} className="transition-colors hover:bg-muted/30">
                <TableCell className="font-mono text-xs font-semibold py-3">
                  <Link
                    href={ADMIN_ROUTES.catalogo.detalle(row.id)}
                    className="text-primary hover:underline"
                  >
                    {row.sku_base}
                  </Link>
                </TableCell>
                <TableCell className="py-3">
                  <span className="text-sm text-foreground line-clamp-1" title={row.descripcion ?? row.nombre ?? ''}>
                    {truncate(row.descripcion ?? row.nombre ?? '', 50)}
                  </span>
                </TableCell>
                <TableCell className="py-3 text-sm text-muted-foreground">
                  {row.familia ?? '—'}
                </TableCell>
                <TableCell className="py-3 text-sm text-foreground">
                  {brandName}
                </TableCell>
                <TableCell className="text-right py-3 text-sm tabular-nums">
                  {row.pz_en_caja ?? '—'}
                </TableCell>
                <TableCell className="text-right py-3 text-sm font-medium tabular-nums">
                  {row.precio_ec != null ? formatCurrency(row.precio_ec) : '—'}
                </TableCell>
                <TableCell className="py-3">
                  <Badge
                    variant="secondary"
                    className={`text-xs px-2 py-0.5 font-medium rounded-full ${estadoColor}`}
                  >
                    {row.estado}
                  </Badge>
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-1.5 justify-end">
                    <DestacadoStarButton
                      id={row.id}
                      initialDestacado={row.destacado ?? false}
                      variant="table"
                    />
                    {row.es_conjunto && (
                      <span title="Conjunto">
                        <Layers className="h-3.5 w-3.5 text-blue-500" />
                      </span>
                    )}
                    {!row.activo && (
                      <Badge variant="outline" className="text-[10px] px-1 text-red-500 border-red-200 bg-red-50">
                        Inactivo
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <Link href={ADMIN_ROUTES.catalogo.detalle(row.id)}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">Ver detalle</span>
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
