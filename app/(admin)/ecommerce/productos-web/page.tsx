// app/(admin)/ecommerce/productos-web/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { fetchProductosWebAdmin, fetchProductosNoPublicados } from '@/modules/ecommerce/queries'
import { ProductosWebTable } from '@/components/admin/ecommerce/ProductosWebTable'
import { ProductosNoPublicados } from '@/components/admin/ecommerce/ProductosNoPublicados'

export const metadata: Metadata = { title: 'Catálogo Web' }

async function ProductosWebData() {
  const { productos, total } = await fetchProductosWebAdmin({ page: 1 })
  const noPublicados = await fetchProductosNoPublicados()

  return (
    <>
      {/* Productos no publicados */}
      {noPublicados.length > 0 && (
        <ProductosNoPublicados productos={noPublicados} />
      )}

      {/* Productos publicados */}
      <ProductosWebTable productos={productos} total={total} />
    </>
  )
}

export default async function ProductosWebPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catálogo Web</h1>
        <p className="text-muted-foreground">
          Productos publicados en la tienda online
        </p>
      </div>

      <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
        <ProductosWebData />
      </Suspense>
    </div>
  )
}
