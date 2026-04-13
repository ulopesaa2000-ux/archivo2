// app/(store)/cotizacion/solicitud/page.tsx
import type { Metadata } from 'next'
import { fetchConfigEcommerce } from '@/modules/ecommerce/queries'
import { QuoteContactForm } from '@/components/store/cotizacion/QuoteContactForm'

export const metadata: Metadata = {
  title: 'Solicitar Cotización',
}

export default async function SolicitudPage() {
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
