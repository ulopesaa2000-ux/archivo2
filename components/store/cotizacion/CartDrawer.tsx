// components/store/cotizacion/CartDrawer.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter 
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, X } from 'lucide-react'
import { useQuoteCart } from '@/hooks/useQuoteCart'
import { useConfigEcommerce } from '@/hooks/useConfigEcommerce'
import { formatearPrecio } from '@/modules/ecommerce/utils'
import { slugify } from '@/lib/utils'

export const OPEN_CART_EVENT = 'inv_open_cart_drawer'

export function CartDrawer() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const { config } = useConfigEcommerce()
  const {
    items,
    updateCantidad,
    removeItem,
    clearCart,
    count,
    totalItems,
    totalPiezas,
    subtotal,
  } = useQuoteCart()

  // Escuchar evento para abrir el drawer desde cualquier componente
  useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    window.addEventListener(OPEN_CART_EVENT, handleOpen)
    return () => window.removeEventListener(OPEN_CART_EVENT, handleOpen)
  }, [])

  const mostrarPrecios = config?.mostrar_precios ?? false

  const handleProceedToCheckout = () => {
    setIsOpen(false)
    router.push('/cotizacion')
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md flex flex-col p-0 bg-background text-foreground border-l border-border dark:bg-zinc-950 dark:text-gray-100"
      >
        {/* Encabezado */}
        <SheetHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
          <div>
            <SheetTitle className="text-lg font-semibold text-foreground dark:text-gray-100 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span>{config?.titulo_seccion_carrito || 'Tu Cotización'}</span>
              {count > 0 && (
                <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground dark:text-gray-400">
              Productos de interés agregados a tu lista
            </SheetDescription>
          </div>
        </SheetHeader>

        {/* Contenido principal de ítems */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/60 dark:text-gray-500" />
              <p className="text-sm text-muted-foreground dark:text-gray-400">
                Tu lista de productos está vacía
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsOpen(false)
                  router.push('/shop')
                }}
                className="mt-2 text-xs"
              >
                Explorar catálogo
              </Button>
            </div>
          ) : (
            items.map((item) => {
              const productUrl = item.slug
                ? `/shop/${item.slug}`
                : item.sku
                  ? `/shop/${slugify(item.sku)}`
                  : '/shop'

              return (
                <div
                  key={item.varianteId}
                  className="flex gap-3 p-3 rounded-lg border border-border bg-card dark:bg-zinc-900 text-card-foreground shadow-xs transition-colors"
                >
                  {/* Miniatura */}
                  <Link
                    href={productUrl}
                    onClick={() => setIsOpen(false)}
                    className="relative w-16 h-16 flex-shrink-0 bg-muted dark:bg-zinc-800 rounded-md overflow-hidden border border-border group block"
                  >
                    {item.imagen ? (
                      <Image
                        src={item.imagen}
                        alt={item.nombre ?? 'Producto'}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground">
                        Sin foto
                      </div>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <Link
                          href={productUrl}
                          onClick={() => setIsOpen(false)}
                          className="font-medium text-xs text-foreground dark:text-gray-100 hover:text-emerald-600 dark:hover:text-emerald-400 line-clamp-1 transition-colors"
                          title={item.nombre}
                        >
                          {item.nombre}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(item.varianteId)}
                          className="text-muted-foreground hover:text-destructive dark:hover:text-red-400 p-1 transition-colors"
                          title="Eliminar producto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground dark:text-gray-400 font-mono">
                        SKU: {item.sku}
                      </p>
                    </div>

                    {/* Selector de cantidad y precio */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 rounded text-foreground dark:text-gray-200 border-border"
                          onClick={() => updateCantidad(item.varianteId, item.cantidad - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-xs font-semibold text-foreground dark:text-gray-100">
                          {item.cantidad}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 rounded text-foreground dark:text-gray-200 border-border"
                          onClick={() => updateCantidad(item.varianteId, item.cantidad + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {mostrarPrecios && item.precioUnitario && (
                        <span className="text-xs font-bold text-foreground dark:text-gray-100">
                          {formatearPrecio(item.precioUnitario * item.cantidad, config!)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pie de página con resumen y botones */}
        {items.length > 0 && (
          <SheetFooter className="p-4 border-t border-border bg-card dark:bg-zinc-900 flex-col gap-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground dark:text-gray-400">
                <span>Total de piezas:</span>
                <span className="font-semibold text-foreground dark:text-gray-200">{totalPiezas}</span>
              </div>
              {mostrarPrecios && (
                <div className="flex justify-between text-sm font-bold text-foreground dark:text-gray-100 pt-1">
                  <span>Subtotal estimado:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {formatearPrecio(subtotal, config!)}
                  </span>
                </div>
              )}
            </div>

            <Button
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-sm flex items-center justify-center gap-2"
              onClick={handleProceedToCheckout}
            >
              <span>{config?.texto_boton_finalizar || 'Continuar cotización'}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="w-full text-xs text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-gray-200"
            >
              Seguir viendo productos
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
