// components/admin/ecommerce/ProductosNoPublicados.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { publicarProductoWeb } from '@/modules/ecommerce/actions'

interface ProductoNoPublicado {
  id: number
  sku_base: string
  nombre: string
  marca: string | null
}

interface ProductosNoPublicadosProps {
  productos: ProductoNoPublicado[]
}

export function ProductosNoPublicados({ productos }: ProductosNoPublicadosProps) {
  const router = useRouter()
  const [publicando, setPublicando] = useState<number | null>(null)

  async function handlePublicar(productoId: number) {
    setPublicando(productoId)
    try {
      await publicarProductoWeb({
        producto_id: productoId,
        activo: true,
        precio_publico: 0,
        orden_display: 0,
        slug: ''
      })
      router.refresh()
    } catch (error) {
      console.error('Error publicando:', error)
    } finally {
      setPublicando(null)
    }
  }

  if (productos.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Productos disponibles para publicar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {productos.slice(0, 5).map((producto) => (
            <div
              key={producto.id}
              className="flex items-center justify-between p-3 bg-muted rounded-lg"
            >
              <div>
                <p className="font-medium">{producto.nombre}</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {producto.sku_base} {producto.marca && `• ${producto.marca}`}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handlePublicar(producto.id)}
                disabled={publicando === producto.id}
              >
                {publicando === producto.id ? 'Publicando...' : 'Publicar'}
              </Button>
            </div>
          ))}
          {productos.length > 5 && (
            <p className="text-sm text-muted-foreground text-center">
              Y {productos.length - 5} productos más...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
