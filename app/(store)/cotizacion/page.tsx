// app/(store)/cotizacion/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { QuoteCart } from '@/components/store/cotizacion/QuoteCart'
import { fetchConfigEcommerce } from '@/modules/ecommerce/queries'

export const metadata: Metadata = {
  title: 'Tu Cotización',
}

export default async function CotizacionPage() {
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
