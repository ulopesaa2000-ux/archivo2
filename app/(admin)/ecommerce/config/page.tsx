import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ConfigForm } from '@/components/admin/ecommerce/ConfigForm'
import { fetchConfigEcommerce } from '@/modules/ecommerce/queries'

export const metadata: Metadata = {
  title: 'Configuración Ecommerce',
}

async function ConfigFormSection() {
  const config = await fetchConfigEcommerce()

  return <ConfigForm config={config || undefined} />
}

function ConfigFormSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-lg border p-6 space-y-4">
          <div className="h-5 w-48 rounded bg-muted animate-pulse" />
          <div className="h-4 w-72 rounded bg-muted animate-pulse" />
          <div className="space-y-3 pt-2">
            <div className="h-10 rounded bg-muted animate-pulse" />
            <div className="h-10 rounded bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function EcommerceConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración Ecommerce</h1>
        <p className="text-muted-foreground">
          Configura el comportamiento de la tienda online
        </p>
      </div>

      <Suspense fallback={<ConfigFormSkeleton />}>
        <ConfigFormSection />
      </Suspense>
    </div>
  )
}
