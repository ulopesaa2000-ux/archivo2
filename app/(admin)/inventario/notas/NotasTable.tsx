// app/(admin)/inventario/notas/NotasTable.tsx
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
import { MoreHorizontal, Eye, FileText } from 'lucide-react'
import { Fecha } from '@/components/shared/Fecha'
import {
  ADMIN_ROUTES, ESTADO_NOTA_COLORS,
  TIPO_MOVIMIENTO_ICONS, TIPO_MOVIMIENTO_COLORS,
} from '@/lib/constants'
import type { NotaListItem } from '@/modules/inventario/types'

export function NotasTable({
  notas,
  sortKey,
  sortOrder,
}: {
  notas: NotaListItem[]
  sortKey?: string
  sortOrder?: 'asc' | 'desc'
}) {
  const columns: ColumnDef<NotaListItem>[] = [
    {
      key: 'numero_nota',
      header: 'N° Nota',
      sortKey: 'numero_nota',
      headerClassName: 'w-[160px]',
      cell: (row) => (
        <Link
          href={ADMIN_ROUTES.inventario.notaDetalle(row.id)}
          className="font-mono text-sm font-medium text-primary hover:underline"
        >
          {row.numero_nota}
        </Link>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      sortKey: 'tipo_codigo',
      cell: (row) => {
        const icon = TIPO_MOVIMIENTO_ICONS[row.tipo_codigo] ?? ''
        const color = TIPO_MOVIMIENTO_COLORS[row.tipo_codigo] ?? 'bg-gray-100 text-gray-800'
        return (
          <Badge variant="secondary" className={`text-xs ${color}`}>
            <span className="mr-1">{icon}</span>
            {row.tipo_nombre}
          </Badge>
        )
      },
    },
    {
      key: 'origen',
      header: 'Origen',
      sortKey: 'bodega_origen_nombre',
      cell: (row) => (
        <span className="text-sm">{row.bodega_origen_nombre}</span>
      ),
    },
    {
      key: 'destino',
      header: 'Destino',
      headerClassName: 'hidden lg:table-cell',
      className: 'hidden lg:table-cell',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.bodega_destino_nombre ?? '—'}
        </span>
      ),
    },
    {
      key: 'total_cajas',
      header: 'Cajas',
      sortKey: 'total_cajas',
      headerClassName: 'text-center w-[70px]',
      className: 'text-center',
      cell: (row) => (
        <span className="text-sm tabular-nums font-medium">
          {row.total_cajas ?? 0}
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      sortKey: 'estado_codigo',
      headerClassName: 'w-[120px]',
      cell: (row) => {
        const colorClasses = ESTADO_NOTA_COLORS[row.estado_codigo] ?? 'bg-gray-100 text-gray-800'
        return (
          <Badge variant="secondary" className={`text-xs ${colorClasses}`}>
            {row.estado_nombre}
          </Badge>
        )
      },
    },
    {
      key: 'fecha_nota',
      header: 'Fecha',
      sortKey: 'fecha_nota',
      cell: (row) => <Fecha valor={row.fecha_nota} formato="fecha-hora" />,
    },
    {
      key: 'usuario',
      header: 'Usuario',
      headerClassName: 'hidden xl:table-cell',
      className: 'hidden xl:table-cell',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.usuario_nombre}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: '',
      headerClassName: 'w-[50px]',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={ADMIN_ROUTES.inventario.notaDetalle(row.id)}>
                <Eye className="mr-2 h-3.5 w-3.5" />
                Ver detalle
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={notas}
      rowKey={(row) => row.id}
      currentSortKey={sortKey}
      currentOrder={sortOrder}
      defaultSortKey="fecha_nota"
      emptyMessage="No se encontraron notas con los filtros aplicados."
      emptyIcon={<FileText className="h-12 w-12" />}
    />
  )
}
