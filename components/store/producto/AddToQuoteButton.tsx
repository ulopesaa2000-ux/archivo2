// components/store/producto/AddToQuoteButton.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus, Check, Send } from 'lucide-react'
import { useQuoteCart } from '@/hooks/useQuoteCart'
import { FavoriteButton } from '@/components/store/producto/FavoriteButton'
import { mostrarPrecio, getPrecioAMostrar } from '@/modules/ecommerce/utils'
import type { ProductoWebPublico, ConfigEcommerce, VariantePublica } from '@/modules/ecommerce/types'

interface AddToQuoteButtonProps {
  producto: ProductoWebPublico
  config: ConfigEcommerce | null
  selectedVariante?: VariantePublica | null
  requiresVariantSelection?: boolean
  esSurtido?: boolean
}

export function AddToQuoteButton({
  producto,
  config,
  selectedVariante = null,
  requiresVariantSelection = false,
  esSurtido = false,
}: AddToQuoteButtonProps) {
  const router = useRouter()
  const { addItem, count } = useQuoteCart()
  const minUnits = Math.max(1, config?.minimo_unidades || 1)
  const [cantidad, setCantidad] = useState(minUnits)
  const [isAdding, setIsAdding] = useState(false)
  const [addedSuccess, setAddedSuccess] = useState(false)

  // En modo catálogo (o cuando los precios están ocultos)
  const isCatalogoMode = config ? !mostrarPrecio(producto, config) : true
  const { precio: precioActual } = config ? getPrecioAMostrar(producto, config) : { precio: null }
  const varianteBloqueadaPorAgotada =
    Boolean(selectedVariante) &&
    config?.mostrar_variantes_agotadas === false &&
    selectedVariante?.activo === false
  const missingVariant = requiresVariantSelection && !selectedVariante && !esSurtido

  const handleAdd = (redirectToSolicitud = false) => {
    if (missingVariant || varianteBloqueadaPorAgotada) return
    setIsAdding(true)

    // Agregar al carrito de interés/cotización (nunca usar producto.id en varianteId)
    addItem({
      productoId: producto.producto_id,
      productoWebId: producto.id,
      varianteId: esSurtido ? null : (selectedVariante?.id ?? null),
      esSurtido,
      nombre: producto.nombre,
      marca: producto.marca || '',
      sku: selectedVariante?.sku_completo || producto.sku_base,
      slug: producto.slug,
      talla: esSurtido ? 'Surtido' : (selectedVariante?.talla_codigo || ''),
      color: esSurtido ? 'Surtido' : (selectedVariante?.color_nombre || ''),
      cantidad: Math.max(minUnits, cantidad),
      precioUnitario: isCatalogoMode ? undefined : (precioActual ?? undefined),
      piezasPorCaja: producto.pz_en_caja ?? undefined,
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
      } else if (config?.modo_vista_carrito !== 'pagina') {
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
            disabled={isAdding || missingVariant || varianteBloqueadaPorAgotada}
            className="flex-1 bg-[#2D5A3D] text-white h-[52px] rounded-lg text-[13px] uppercase tracking-[0.05em] font-semibold hover:bg-[#1e3a2f] transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed text-center px-4 flex items-center justify-center gap-2"
          >
            {isAdding ? (
              <span>Agregando...</span>
            ) : missingVariant ? (
              <span>Selecciona talla y color</span>
            ) : varianteBloqueadaPorAgotada ? (
              <span>Variante agotada</span>
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

      <FavoriteButton productoWebId={producto.id} variant="pdp" />
    </div>
  )
}
