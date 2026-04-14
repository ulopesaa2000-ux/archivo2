// app/(store)/cotizacion/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { QuoteCart } from '@/components/store/cotizacion/QuoteCart'
import { fetchConfigEcommerce } from '@/modules/ecommerce/queries'

export const metadata: Metadata = {
  title: 'Tu Cotización',
}

async function CotizacionContent() {
  const config = await fetchConfigEcommerce()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        {config?.titulo_seccion_carrito || 'Tu Cotización'}
      </h1>
      
      <QuoteCart config={config} />
    </div>
  )
}

export default function CotizacionPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="h-10 w-64 animate-pulse bg-muted rounded mb-8" />
        <div className="h-96 animate-pulse bg-muted rounded" />
      </div>
    }>
      <CotizacionContent />
    </Suspense>
  )
}
