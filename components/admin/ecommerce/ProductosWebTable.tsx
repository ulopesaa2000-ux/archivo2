// components/admin/ecommerce/ProductosWebTable.tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/admin/Pagination'
import type { ProductoWebExtendido } from '@/modules/ecommerce/types'

interface ProductosWebTableProps {
  productos: ProductoWebExtendido[]
  total: number
}

export function ProductosWebTable({ productos, total }: ProductosWebTableProps) {
  const router = useRouter()

  if (productos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay productos publicados
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imagen</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Precios</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.map((producto) => (
              <TableRow key={producto.id}>
                <TableCell>
                  {producto.imagen_principal ? (
                    <div className="relative w-12 h-12">
                      <Image
                        src={producto.imagen_principal}
                        alt={producto.nombre}
                        fill
                        className="object-cover rounded"
                        sizes="48px"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded" />
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {producto.sku_base}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{producto.nombre}</p>
                    <p className="text-sm text-muted-foreground">{producto.marca_nombre}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p>${producto.precio_publico}</p>
                    {producto.precio_oferta && (
                      <p className="text-muted-foreground line-through">
                        ${producto.precio_oferta}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {producto.activo ? (
                      <Badge variant="default">Activo</Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                    {producto.en_oferta && (
                      <Badge variant="destructive">Oferta</Badge>
                    )}
                    {producto.destacado && (
                      <Badge variant="outline">Destacado</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/ecommerce/productos-web/${producto.id}`}>
                        Editar
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/shop/${producto.slug}`} target="_blank">
                        Ver
                      </Link>
                    </Button>
                  </div>
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
