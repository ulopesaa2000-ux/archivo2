// app/(store)/cotizacion/gracias/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Suspense } from 'react'
import { connection } from 'next/server'

export const metadata: Metadata = {
  title: 'Gracias por tu solicitud',
}

interface GraciasPageProps {
  searchParams: Promise<{ orden?: string }>
}

export default async function GraciasPage({ searchParams }: GraciasPageProps) {
  await connection()
  const params = await searchParams
  const numeroOrden = params.orden

  return (
    <div className="container mx-auto px-4 py-16 max-w-xl text-center">
      <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-6" />

      <h1 className="text-3xl font-bold mb-4">
        ¡Gracias por tu solicitud!
      </h1>

      <p className="text-muted-foreground mb-6">
        Hemos recibido tu cotización correctamente. Nuestro equipo revisará tu solicitud y te contactará pronto.
      </p>

      {numeroOrden && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Número de solicitud</p>
            <p className="text-2xl font-mono font-bold">{numeroOrden}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button asChild>
          <Link href="/shop">Seguir comprando</Link>
        </Button>

        <Button variant="outline" asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  )
}