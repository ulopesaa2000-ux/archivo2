// components/store/producto/AddToQuoteButton.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus, Heart, Check, Send } from 'lucide-react'
import { useQuoteCart } from '@/hooks/useQuoteCart'
import { mostrarPrecio } from '@/modules/ecommerce/utils'
import type { ProductoWebPublico } from '@/modules/ecommerce/types'
import type { ConfigEcommerce } from '@/modules/ecommerce/types'

interface AddToQuoteButtonProps {
  producto: ProductoWebPublico
  config: ConfigEcommerce | null
}

export function AddToQuoteButton({ producto, config }: AddToQuoteButtonProps) {
  const router = useRouter()
  const { addItem, count } = useQuoteCart()
  const [cantidad, setCantidad] = useState(config?.minimo_unidades || 1)
  const [isAdding, setIsAdding] = useState(false)
  const [addedSuccess, setAddedSuccess] = useState(false)

  // En modo catálogo (o cuando los precios están ocultos)
  const isCatalogoMode = config ? !mostrarPrecio(producto, config) : true

  const handleAdd = (redirectToSolicitud = false) => {
    setIsAdding(true)

    // Agregar al carrito de interés/cotización
    addItem({
      productoId: producto.producto_id,
      varianteId: producto.id, // Usar id del producto web como variante
      nombre: producto.nombre,
      marca: producto.marca || '',
      sku: producto.sku_base,
      slug: producto.slug,
      talla: '',
      color: '',
      cantidad: Math.max(1, cantidad),
      precioUnitario: isCatalogoMode ? undefined : (producto.precio_publico || undefined),
      piezasPorCaja: undefined,
      imagen: producto.imagen_principal || undefined,
    })

    setAddedSuccess(true)
    setTimeout(() => {
      setAddedSuccess(false)
    }, 3000)

    // Redirección o apertura de Drawer lateral
    setTimeout(() => {
      setIsAdding(false)
      if (redirectToSolicitud) {
        router.push('/cotizacion/solicitud')
      } else {
        // Abrir panel lateral del carrito permaneciendo en la página del producto
        window.dispatchEvent(new Event('inv_open_cart_drawer'))
      }
    }, 300)
  }

  const incrementar = () => setCantidad(c => c + 1)
  const decrementar = () => setCantidad(c => Math.max(1, c - 1))

  const primaryButtonText = isCatalogoMode
    ? 'Agregar a productos de interés'
    : (config?.texto_boton_agregar || 'Agregar al carrito')

  return (
    <div className="space-y-4">
      {addedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center justify-between animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>¡Producto agregado a tu lista de interés!</span>
          </div>
          <button 
            type="button"
            onClick={() => router.push('/cotizacion')}
            className="underline hover:text-emerald-950 font-semibold"
          >
            Ver cotización ({count})
          </button>
        </div>
      )}

      {/* Selector de cantidad y botones principales */}
      <div className="space-y-3">
        <div className="flex gap-3 items-center">
          {/* Selector de cantidad (Disponible en modo catálogo y e-commerce) */}
          <div className="flex items-center border border-store-border rounded-lg h-[52px] bg-store-surface text-store-ink flex-shrink-0">
            <button 
              type="button" 
              onClick={decrementar}
              disabled={cantidad <= 1}
              className="px-3 text-store-ink3 hover:text-store-ink disabled:opacity-50 transition-colors"
              title="Disminuir cantidad"
            >
              <Minus className="h-4 w-4" />
            </button>
            
            <input 
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 text-center text-[15px] font-medium bg-transparent border-none focus:outline-none appearance-none"
              style={{ MozAppearance: 'textfield' }}
            />
            
            <button 
              type="button" 
              onClick={incrementar}
              className="px-3 text-store-ink3 hover:text-store-ink transition-colors"
              title="Aumentar cantidad"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Botón Principal CTA */}
          <button
            type="button"
            onClick={() => handleAdd(false)}
            disabled={isAdding}
            className="flex-1 bg-[#2D5A3D] text-white h-[52px] rounded-lg text-[13px] uppercase tracking-[0.05em] font-semibold hover:bg-[#1e3a2f] transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed text-center px-4 flex items-center justify-center gap-2"
          >
            {isAdding ? (
              <span>Agregando...</span>
            ) : (
              <span>{primaryButtonText}</span>
            )}
          </button>
        </div>

        {/* Botón Secundario de Cotización Directa (ideal para modo catálogo) */}
        {isCatalogoMode && (
          <button
            type="button"
            onClick={() => handleAdd(true)}
            disabled={isAdding}
            className="w-full bg-store-surface border border-[#2D5A3D]/40 text-[#2D5A3D] h-[46px] rounded-lg text-[12px] uppercase tracking-[0.05em] font-semibold hover:bg-[#2D5A3D]/10 transition-all flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            <span>Enviar solicitud de cotización directa</span>
          </button>
        )}
      </div>

      <button className="flex items-center gap-2 text-[13px] text-store-ink2 hover:text-store-ink underline tracking-[0.02em] font-medium p-0 bg-transparent border-none">
        <Heart className="h-4 w-4" />
        Guardar en favoritos
      </button>
    </div>
  )
}
