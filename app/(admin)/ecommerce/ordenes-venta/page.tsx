// app/(admin)/ecommerce/ordenes-venta/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { fetchOrdenesVenta } from '@/modules/ecommerce/queries'
import { OrdenesVentaTable } from '@/components/admin/ecommerce/OrdenesVentaTable'

export const metadata: Metadata = { title: 'Órdenes de Venta' }

export default async function OrdenesVentaPage() {
  const { ordenes, total } = await fetchOrdenesVenta({ page: 1 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Órdenes de Venta</h1>
        <p className="text-muted-foreground">
          Pedidos del ecommerce
        </p>
      </div>

      <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
        <OrdenesVentaTable ordenes={ordenes} total={total} />
      </Suspense>
    </div>
  )
}
