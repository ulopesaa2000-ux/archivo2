// app/(admin)/inventario-virtual/[id]/DashboardVirtualContent.tsx
'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Fecha } from '@/components/shared/Fecha'
import { ADMIN_ROUTES } from '@/lib/constants'
import { ArrowLeft, Truck, Package, Warehouse } from 'lucide-react'
import type { BodegaRow } from '@/lib/types/tables'
import type { StockVirtualItem } from '@/modules/despachos/types'
import type { EstadoNotaCodigo } from '@/lib/types/tables'

export function DashboardVirtualContent({
  bodega, stock, notasPendientes,
}: {
  bodega: BodegaRow
  stock: StockVirtualItem[]
  notasPendientes: {
    id: number
    numero_nota: string
    observaciones: string | null
    created_at: string | null
    tipo_codigo: string | null
    tipo_nombre: string | null
    estado_codigo: string | null
  }[]
}) {
  const totalCajas = stock.reduce((a, i) => a + i.cajas_disponibles, 0)
  const totalProductos = stock.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={ADMIN_ROUTES.inventarioVirtual.lista}
            className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Bodegas Virtuales
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">{bodega.nombre}</span>
        </div>
        <Link href={`${ADMIN_ROUTES.despachos.nuevo}?origen=${bodega.id}`}>
          <Button size="sm"><Truck className="h-3.5 w-3.5 mr-1" /> Generar despacho</Button>
        </Link>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-black tabular-nums">{totalProductos}</p>
              <p className="text-xs text-muted-foreground">Productos en stock</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <Warehouse className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-black tabular-nums">{totalCajas}</p>
              <p className="text-xs text-muted-foreground">Cajas totales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <Truck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-black tabular-nums">{notasPendientes.length}</p>
              <p className="text-xs text-muted-foreground">Notas pendientes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notas pendientes */}
      {notasPendientes.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notas Pendientes por Aprobar</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nota</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Observaciones</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notasPendientes.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-mono text-xs">{n.numero_nota}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{n.tipo_nombre ?? n.tipo_codigo}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{n.observaciones ?? '—'}</TableCell>
                    <TableCell><Fecha valor={n.created_at} formato="fecha" /></TableCell>
                    <TableCell>
                      <Link href={ADMIN_ROUTES.inventario.notaDetalle(n.id)}>
                        <Button variant="link" size="sm">Ver</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Stock actual */}
      <Card>
        <CardHeader><CardTitle className="text-base">Stock Actual por Producto</CardTitle></CardHeader>
        <CardContent>
          {stock.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay stock en esta bodega virtual
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cajas</TableHead>
                  <TableHead className="text-right">Piezas sueltas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.map((s) => (
                  <TableRow key={s.producto_id}>
                    <TableCell className="font-mono text-xs">{s.sku_base ?? '—'}</TableCell>
                    <TableCell className="max-w-[250px] truncate">{s.producto_nombre ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{s.cajas_disponibles}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.piezas_sueltas}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
