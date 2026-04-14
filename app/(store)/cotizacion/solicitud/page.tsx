// app/(store)/cotizacion/solicitud/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { fetchConfigEcommerce } from '@/modules/ecommerce/queries'
import { QuoteContactForm } from '@/components/store/cotizacion/QuoteContactForm'

export const metadata: Metadata = {
  title: 'Solicitar Cotización',
}

async function SolicitudContent() {
  const config = await fetchConfigEcommerce()

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">
        {config?.texto_boton_finalizar || 'Solicitar Cotización'}
      </h1>
      <p className="text-muted-foreground mb-8">
        Completa tus datos para enviar tu solicitud
      </p>

      <QuoteContactForm config={config} />
    </div>
  )
}

function SolicitudSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="h-10 w-64 bg-muted animate-pulse rounded mb-2" />
      <div className="h-5 w-80 bg-muted animate-pulse rounded mb-8" />
      <div className="h-96 bg-muted animate-pulse rounded" />
    </div>
  )
}

export default function SolicitudPage() {
  return (
    <Suspense fallback={<SolicitudSkeleton />}>
      <SolicitudContent />
    </Suspense>
  )
}
