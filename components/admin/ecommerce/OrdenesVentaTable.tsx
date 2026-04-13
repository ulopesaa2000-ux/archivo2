// components/admin/ecommerce/OrdenesVentaTable.tsx
'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/admin/Pagination'
import { Fecha } from '@/components/shared/Fecha'
import type { OrdenVentaResumen } from '@/modules/ecommerce/types'

interface OrdenesVentaTableProps {
  ordenes: OrdenVentaResumen[]
  total: number
}

const estadoColors: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  procesando: 'bg-blue-100 text-blue-800',
  enviado: 'bg-purple-100 text-purple-800',
  entregado: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
  aprobada: 'bg-green-100 text-green-800',
  convertida: 'bg-gray-100 text-gray-800',
}

export function OrdenesVentaTable({ ordenes, total }: OrdenesVentaTableProps) {
  if (ordenes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay órdenes registradas
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Orden</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenes.map((orden) => (
              <TableRow key={orden.id}>
                <TableCell className="font-mono font-medium">
                  {orden.numero_orden}
                </TableCell>
                <TableCell>{orden.nombre_cliente}</TableCell>
                <TableCell className="text-sm">{orden.email_cliente}</TableCell>
                <TableCell>${orden.total}</TableCell>
                <TableCell>
                  <Badge className={estadoColors[orden.estado] || 'bg-gray-100'}>
                    {orden.estado}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Fecha valor={orden.fecha_orden} formato="fecha" />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/ecommerce/ordenes-venta/${orden.id}`}>
                      Ver detalle
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination total={total} />
    </div>
  )
}
