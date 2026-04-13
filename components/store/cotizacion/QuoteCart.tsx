// components/store/cotizacion/QuoteCart.tsx
'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Trash2, Minus, Plus, ArrowRight, ShoppingBag } from 'lucide-react'
import { useQuoteCart } from '@/hooks/useQuoteCart'
import { useConfigEcommerce } from '@/hooks/useConfigEcommerce'
import { formatearPrecio } from '@/modules/ecommerce/utils'
import type { ConfigEcommerce } from '@/modules/ecommerce/types'

interface QuoteCartProps {
  config: ConfigEcommerce | null
}

export function QuoteCart({ config: configServer }: QuoteCartProps) {
  const router = useRouter()
  const { config: configClient } = useConfigEcommerce()
  const config = configClient || configServer
  
  const {
    items,
    isHydrated,
    updateCantidad,
    removeItem,
    clearCart,
    totalItems,
    totalPiezas,
    subtotal,
  } = useQuoteCart()

  // Esperar hidratación
  if (!isHydrated) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  // Carrito vacío
  if (items.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-semibold">Tu cotización está vacía</h2>
        <p className="text-muted-foreground">
          Agrega productos para comenzar tu solicitud
        </p>
        <Link
          href="/catalogo"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Ver catálogo
        </Link>
      </div>
    )
  }

  const mostrarPrecios = config?.mostrar_precios ?? false

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Lista de items */}
      <div className="lg:col-span-2 space-y-4">
        {items.map((item) => (
          <Card key={item.varianteId}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Imagen */}
                <div className="relative w-24 h-24 flex-shrink-0 bg-muted rounded-md overflow-hidden">
                  {item.imagen ? (
                    <Image
                      src={item.imagen}
                      alt={item.nombre ?? 'Imagen del producto'}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                      Sin imagen
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">{item.marca}</p>
                      <Link
                        href={`/producto/${item.sku}`}
                        className="font-medium hover:text-primary transition-colors line-clamp-1"
                      >
                        {item.nombre}
                      </Link>
                      {item.talla && (
                        <p className="text-sm text-muted-foreground">
                          Talla: {item.talla}
                        </p>
                      )}
                      {item.color && (
                        <p className="text-sm text-muted-foreground">
                          Color: {item.color}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        SKU: {item.sku}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeItem(item.varianteId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Cantidad y precio */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateCantidad(item.varianteId, item.cantidad - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-12 text-center font-medium">
                        {item.cantidad}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateCantidad(item.varianteId, item.cantidad + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {mostrarPrecios && item.precioUnitario && (
                      <p className="font-medium">
                        {formatearPrecio(item.precioUnitario * item.cantidad, config!)}
                      </p>
                    )}
                  </div>

                  {/* Unidad */}
                  <p className="text-xs text-muted-foreground mt-2">
                    {item.unidad === 'caja' && item.piezasPorCaja
                      ? `${item.cantidad} cajas (${item.cantidad * item.piezasPorCaja} piezas)`
                      : `${item.cantidad} piezas`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Limpiar carrito */}
        <Button
          variant="ghost"
          className="text-destructive"
          onClick={clearCart}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Vaciar cotización
        </Button>
      </div>

      {/* Resumen */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">Resumen</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>
                <span>{totalItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total piezas</span>
                <span>{totalPiezas}</span>
              </div>
            </div>

            {mostrarPrecios && (
              <>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Subtotal</span>
                  <span>{formatearPrecio(subtotal, config!)}</span>
                </div>
              </>
            )}

            <Separator />

            <Button
              className="w-full"
              size="lg"
              onClick={() => router.push('/cotizacion/solicitud')}
            >
              {config?.texto_boton_finalizar || 'Solicitar cotización'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            <Link
              href="/catalogo"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Seguir agregando
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
