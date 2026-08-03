// components/store/catalogo/ProductGrid.tsx
import Link from 'next/link'
import Image from 'next/image'
import { Pagination } from '@/components/admin/Pagination'
import type { ProductoWebPublico } from '@/modules/ecommerce/types'
import type { ConfigEcommerce } from '@/modules/ecommerce/types'
import { mostrarPrecio, formatearPrecio, getPrecioAMostrar } from '@/modules/ecommerce/utils'

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
  const showPrice = config ? mostrarPrecio(producto, config) : false
  const { precio, precioAnterior, esOferta } = config 
    ? getPrecioAMostrar(producto, config)
    : { precio: null, precioAnterior: null, esOferta: false }

  return (
    <Link href={`/shop/${producto.slug}`} className="block group">
      <div className="bg-[#FFFFFF] rounded-lg aspect-[3/4] flex items-center justify-center text-[#8C8C8C] text-[10px] tracking-[0.05em] uppercase relative overflow-hidden mb-3 border border-[#2D5A3D]/10 group-hover:border-[#2D5A3D]/30 transition-colors shadow-sm">
        <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(0,0,0,.015) 12px, rgba(0,0,0,.015) 13px)' }}></div>
        
        {producto.nuevo && (
          <span className="absolute top-2 left-2 bg-[#2D5A3D] text-white text-[10px] font-semibold py-[3px] px-[8px] rounded-[3px] tracking-[0.05em] z-10">Nuevo</span>
        )}
        {producto.en_oferta && !producto.nuevo && showPrice && (
          <span className="absolute top-2 left-2 bg-[#B35A3E] text-white text-[10px] font-semibold py-[3px] px-[8px] rounded-[3px] tracking-[0.05em] z-10">-Oferta</span>
        )}

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
        <div className="text-[11px] text-[#8C8C8C] tracking-[0.05em] uppercase mb-1.5 truncate">
          {producto.marca || 'Marca'}
        </div>
        <div className="text-[14px] text-[#1A1C1A] font-medium mb-2 truncate group-hover:text-[#2D5A3D] transition-colors">
          {producto.nombre}
        </div>
        
        <div className="flex items-center justify-between">
          {showPrice && precio ? (
            <div className="text-[15px] text-[#1A1C1A] font-semibold">
              {formatearPrecio(precio, config!)}
              {precioAnterior && (
                <span className="text-[12px] text-[#8C8C8C] line-through ml-2 font-normal">
                  {formatearPrecio(precioAnterior, config!)}
                </span>
              )}
            </div>
          ) : (
            <div className="text-[14px] text-[#8C8C8C] italic">
              Consultar precio
            </div>
          )}

          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-[12px] font-medium text-[#2D5A3D]">
            {config?.texto_boton_agregar || '+ Carrito'}
          </div>
        </div>
      </div>
    </Link>
  )
}
