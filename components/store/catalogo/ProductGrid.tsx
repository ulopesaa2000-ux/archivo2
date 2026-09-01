// components/store/catalogo/ProductGrid.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Check } from 'lucide-react'
import { Pagination } from '@/components/admin/Pagination'
import { useQuoteCart } from '@/hooks/useQuoteCart'
import type { ProductoWebPublico, ConfigEcommerce } from '@/modules/ecommerce/types'
import { mostrarPrecio, formatearPrecio, getPrecioAMostrar } from '@/modules/ecommerce/utils'
import { ProductShareButtons } from '@/components/store/producto/ProductShareButtons'

interface ProductGridProps {
  productos: ProductoWebPublico[]
  config: ConfigEcommerce | null
  total: number
  currentPage: number
}

export function ProductGrid({ productos, config, total, currentPage }: ProductGridProps) {
  if (productos.length === 0) {
    return (
      <div className="text-center py-20 px-8 text-[#8C8C8C] text-[14px]">
        No se encontraron productos con estos filtros.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {productos.map((producto, index) => (
          <ProductCard 
            key={producto.id} 
            producto={producto} 
            config={config}
            priority={index < 8}
          />
        ))}
      </div>

      {total > 0 && (
        <Pagination total={total} />
      )}
    </div>
  )
}

interface ProductCardProps {
  producto: ProductoWebPublico
  config: ConfigEcommerce | null
  priority?: boolean
}

function ProductCard({ producto, config, priority = false }: ProductCardProps) {
  const { addItem } = useQuoteCart()
  const [added, setAdded] = useState(false)

  const showPrice = config ? mostrarPrecio(producto, config) : false
  const { precio, precioAnterior } = config 
    ? getPrecioAMostrar(producto, config)
    : { precio: null, precioAnterior: null }

  const isCatalogoMode = !showPrice

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    addItem({
      productoId: producto.producto_id,
      varianteId: producto.id,
      nombre: producto.nombre,
      marca: producto.marca || '',
      sku: producto.sku_base,
      slug: producto.slug,
      talla: '',
      color: '',
      cantidad: 1,
      precioUnitario: showPrice ? (precio || undefined) : undefined,
      piezasPorCaja: undefined,
      imagen: producto.imagen_principal || undefined,
    })

    setAdded(true)
    if (config?.modo_vista_carrito !== 'pagina') {
      window.dispatchEvent(new Event('inv_open_cart_drawer'))
    }
    setTimeout(() => {
      setAdded(false)
    }, 2000)
  }

  const defaultButtonLabel = isCatalogoMode ? '+ Interés' : (config?.texto_boton_agregar || '+ Carrito')

  return (
    <Link href={`/shop/${producto.slug}`} className="block group">
      <div className="bg-card dark:bg-zinc-900 rounded-lg aspect-[3/4] flex items-center justify-center text-muted-foreground dark:text-gray-400 text-[10px] tracking-[0.05em] uppercase relative overflow-hidden mb-3 border border-border dark:border-zinc-800 group-hover:border-[#2D5A3D]/40 transition-colors shadow-xs">
        <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(0,0,0,.015) 12px, rgba(0,0,0,.015) 13px)' }}></div>
        
        {producto.nuevo && (
          <span className="absolute top-2 left-2 bg-[#2D5A3D] text-white text-[10px] font-semibold py-[3px] px-[8px] rounded-[3px] tracking-[0.05em] z-10">Nuevo</span>
        )}
        {producto.en_oferta && !producto.nuevo && showPrice && (
          <span className="absolute top-2 left-2 bg-[#B35A3E] text-white text-[10px] font-semibold py-[3px] px-[8px] rounded-[3px] tracking-[0.05em] z-10">-Oferta</span>
        )}

        {/* Botones de Compartir (WhatsApp + Link) */}
        <div className="absolute top-2 right-2 z-10">
          <ProductShareButtons
            slug={producto.slug}
            nombre={producto.nombre}
            sku={producto.sku_base}
            variant="card"
          />
        </div>

        {producto.imagen_principal ? (
          <Image
            src={producto.imagen_principal}
            alt={producto.nombre || 'Imagen del producto'}
            fill
            className="object-contain p-1 z-0 transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
          />
        ) : (
          <span className="z-10">Imagen</span>
        )}
      </div>

      <div className="px-1">
        {/* Fila superior: Marca a la izquierda, Precio o 'Consultar precio' a la derecha */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[11px] text-muted-foreground dark:text-gray-400 tracking-[0.05em] uppercase truncate font-medium">
            {producto.marca || 'Marca'}
          </span>

          {showPrice && precio ? (
            <div className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
              {formatearPrecio(precio, config!)}
              {precioAnterior && (
                <span className="text-[11px] text-muted-foreground line-through ml-1.5 font-normal">
                  {formatearPrecio(precioAnterior, config!)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground dark:text-gray-400 italic shrink-0">
              Consultar precio
            </span>
          )}
        </div>

        {/* Fila central: Nombre / Descripción principal (h1 estilo de tarjeta) */}
        <div className="text-[14px] text-foreground dark:text-gray-100 font-semibold mb-2 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
          {producto.nombre}
        </div>
        
        {/* Fila inferior: SKU (h2 estilo subtítulo) a la izquierda, Botón de acción a la derecha */}
        <div className="flex items-center justify-between min-h-[26px]">
          {config?.mostrar_sku && producto.sku_base ? (
            <div className="text-[13px] font-mono font-medium text-muted-foreground dark:text-gray-300 truncate">
              {producto.sku_base}
            </div>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleQuickAdd}
            className={`opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 text-[12px] font-medium px-2 py-1 rounded border ${
              added 
                ? 'bg-emerald-600 text-white border-emerald-600 opacity-100' 
                : 'text-[#2D5A3D] border-[#2D5A3D]/30 hover:bg-[#2D5A3D] hover:text-white'
            }`}
            title="Agregar a la lista de cotización / interés"
          >
            {added ? (
              <>
                <Check className="h-3 w-3" />
                <span>Agregado</span>
              </>
            ) : (
              <span>{defaultButtonLabel}</span>
            )}
          </button>
        </div>
      </div>
    </Link>
  )
}
