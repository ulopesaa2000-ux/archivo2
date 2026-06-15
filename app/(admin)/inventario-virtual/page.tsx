// app/(admin)/inventario-virtual/page.tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchBodegasVirtuales, fetchStockVirtualResumenes } from '@/modules/despachos/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ADMIN_ROUTES } from '@/lib/constants'
import { Container, Package, Warehouse } from 'lucide-react'
import { ListPageSkeleton } from '@/components/admin/PageSkeleton'

export const metadata: Metadata = { title: 'Bodegas Virtuales — Inventario' }

export default async function InventarioVirtualPage() {
  const bodegas = await fetchBodegasVirtuales()
  const resumenes = await fetchStockVirtualResumenes(bodegas.map((bodega) => bodega.id))
  const stocks = bodegas.map((bodega) => {
    const resumen = resumenes.get(bodega.id)

    return {
      ...bodega,
      totalCajas: resumen?.totalCajas ?? 0,
      totalProductos: resumen?.totalProductos ?? 0,
    }
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Bodegas Virtuales</h1>
      <Suspense fallback={<ListPageSkeleton />}>
        {stocks.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            No hay bodegas virtuales registradas
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stocks.map((b) => (
              <Card key={b.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Container className="h-4 w-4 text-primary" />
                    {b.nombre}
                    <span className="text-xs text-muted-foreground font-mono">{b.codigo}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{b.totalProductos} productos</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{b.totalCajas} cajas</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={ADMIN_ROUTES.inventarioVirtual.detalle(b.id)} className="flex-1">
                      <Button size="sm" variant="default" className="w-full">Ver inventario</Button>
                    </Link>
                    <Link href={`${ADMIN_ROUTES.despachos.nuevo}?origen=${b.id}`}>
                      <Button size="sm" variant="outline">Despachar</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Suspense>
    </div>
  )
}
