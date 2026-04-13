// app/(admin)/ecommerce/productos-web/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { fetchProductosWebAdmin, fetchProductosNoPublicados } from '@/modules/ecommerce/queries'
import { ProductosWebTable } from '@/components/admin/ecommerce/ProductosWebTable'
import { ProductosNoPublicados } from '@/components/admin/ecommerce/ProductosNoPublicados'

export const metadata: Metadata = { title: 'Catálogo Web' }

export default async function ProductosWebPage() {
  const { productos, total } = await fetchProductosWebAdmin({ page: 1 })
  const noPublicados = await fetchProductosNoPublicados()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catálogo Web</h1>
        <p className="text-muted-foreground">
          Productos publicados en la tienda online
        </p>
      </div>

      {/* Productos no publicados */}
      {noPublicados.length > 0 && (
        <ProductosNoPublicados productos={noPublicados} />
      )}

      {/* Productos publicados */}
      <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
        <ProductosWebTable productos={productos} total={total} />
      </Suspense>
    </div>
  )
}
