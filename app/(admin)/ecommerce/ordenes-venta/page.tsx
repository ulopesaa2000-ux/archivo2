// app/(admin)/ecommerce/ordenes-venta/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { fetchConfigEcommerce, fetchOrdenesVenta } from '@/modules/ecommerce/queries'
import { OrdenesVentaTable } from '@/components/admin/ecommerce/OrdenesVentaTable'
import { OrdenesVentaFilters } from '@/components/admin/ecommerce/OrdenesVentaFilters'
import { parseStoreConfig, getZonasAtencion } from '@/lib/utils/storeConfig'

export const metadata: Metadata = { title: 'Órdenes de Venta' }

async function OrdenesVentaContent({ zona, page }: { zona: string; page: number }) {
  const [config, { ordenes, total }] = await Promise.all([
    fetchConfigEcommerce(),
    fetchOrdenesVenta({ page, zona: zona || undefined }),
  ])
  const zonas = getZonasAtencion(parseStoreConfig(config?.mensaje_precio_variable))

  return (
    <div className="space-y-4">
      <OrdenesVentaFilters zonas={zonas} zonaActual={zona} />
      <OrdenesVentaTable ordenes={ordenes} total={total} />
    </div>
  )
}

export default async function OrdenesVentaPage({
  searchParams,
}: {
  searchParams: Promise<{ zona?: string; page?: string }>
}) {
  const params = await searchParams
  const zona = typeof params.zona === 'string' ? params.zona : ''
  const page = Math.max(1, Number(params.page) || 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Órdenes de Venta</h1>
        <p className="text-muted-foreground">
          Pedidos del ecommerce
        </p>
      </div>

      <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
        <OrdenesVentaContent zona={zona} page={page} />
      </Suspense>
    </div>
  )
}
