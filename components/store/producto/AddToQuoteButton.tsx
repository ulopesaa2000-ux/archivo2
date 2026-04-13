// components/store/producto/AddToQuoteButton.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus, Heart } from 'lucide-react'
import { useQuoteCart } from '@/hooks/useQuoteCart'
import type { ProductoWebPublico } from '@/modules/ecommerce/types'
import type { ConfigEcommerce } from '@/modules/ecommerce/types'

interface AddToQuoteButtonProps {
  producto: ProductoWebPublico
  config: ConfigEcommerce | null
}

export function AddToQuoteButton({ producto, config }: AddToQuoteButtonProps) {
  const router = useRouter()
  const { addItem } = useQuoteCart()
  const [cantidad, setCantidad] = useState(config?.minimo_unidades || 1)
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = () => {
    setIsAdding(true)

    // Agregar al carrito
    addItem({
      productoId: producto.producto_id,
      varianteId: producto.id, // Usar id del producto web como variante
      nombre: producto.nombre,
      marca: producto.marca || '',
      sku: producto.sku_base,
      talla: '',
      color: '',
      cantidad,
      precioUnitario: producto.precio_publico || undefined,
      piezasPorCaja: undefined,
      imagen: producto.imagen_principal || undefined,
    })

    // Mostrar feedback
    setTimeout(() => {
      setIsAdding(false)
      router.push('/cotizacion')
    }, 500)
  }

  const incrementar = () => setCantidad(c => c + 1)
  const decrementar = () => setCantidad(c => Math.max(1, c - 1))

  const buttonText = config?.texto_boton_agregar || 'Agregar al carrito'

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center mb-6">
        {/* Input number simplificado tipo e-commerce */}
        <div className="flex items-center border border-store-border rounded-[4px] h-[52px] bg-store-surface text-store-ink">
          <button 
            type="button" 
            onClick={decrementar}
            disabled={cantidad <= 1}
            className="px-4 text-store-ink3 hover:text-store-ink disabled:opacity-50"
          >
            <Minus className="h-4 w-4" />
          </button>
          
          <input 
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-12 text-center text-[15px] font-medium bg-transparent border-none focus:outline-none appearance-none"
            style={{ MozAppearance: 'textfield' }} // Disable native spinners
          />
          
          <button 
            type="button" 
            onClick={incrementar}
            className="px-4 text-store-ink3 hover:text-store-ink"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Botón CTA Fino */}
        <button
          onClick={handleAdd}
          disabled={isAdding}
          className="flex-1 bg-green-600 text-white h-[52px] rounded-[4px] text-[13px] uppercase tracking-[0.05em] font-medium hover:bg-green-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed text-center"
        >
          {isAdding ? 'Agregando...' : buttonText}
        </button>
      </div>

      <button className="flex items-center gap-2 text-[13px] text-store-ink2 hover:text-store-ink underline tracking-[0.02em] font-medium p-0 bg-transparent border-none">
        <Heart className="h-4 w-4" />
        Guardar en favoritos
      </button>
    </div>
  )
}
