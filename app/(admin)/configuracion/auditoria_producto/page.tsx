// app/(admin)/configuracion/auditoria_producto/page.tsx
import { Metadata } from 'next'
import { Suspense } from 'react'
import { AuditoriaProductosClient } from './AuditoriaProductosClient'
import { fetchAuditoriaGeneral } from '@/modules/catalogo/queries'

export const metadata: Metadata = {
  title: 'Auditoría de Productos',
  description: 'Historial de cambios en productos del catálogo',
}

async function AuditoriaData() {
  const auditoria = await fetchAuditoriaGeneral(200)
  return <AuditoriaProductosClient initialData={auditoria} />
}

export default function AuditoriaProductosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Auditoría de Productos</h1>
          <p className="text-muted-foreground mt-1">
            Historial de cambios (creaciones, modificaciones y eliminaciones) en el catálogo de productos.
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="rounded-lg border p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          </div>
        }
      >
        <AuditoriaData />
      </Suspense>
    </div>
  )
}
