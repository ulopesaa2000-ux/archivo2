// components/store/producto/ProductInfo.tsx
import type { ProductoWebPublico } from '@/modules/ecommerce/types'
import type { ConfigEcommerce } from '@/modules/ecommerce/types'
import { mostrarPrecio, formatearPrecio, getPrecioAMostrar } from '@/modules/ecommerce/utils'

interface ProductInfoProps {
  producto: ProductoWebPublico
  config: ConfigEcommerce | null
}

export function ProductInfo({ producto, config }: ProductInfoProps) {
  const showPrice = config ? mostrarPrecio(producto, config) : false
  const { precio, precioAnterior, esOferta } = config
    ? getPrecioAMostrar(producto, config)
    : { precio: null, precioAnterior: null, esOferta: false }

  const descuento = esOferta && precio && precioAnterior
    ? Math.round((1 - precio / precioAnterior) * 100)
    : null

  return (
    <div>
      {/* Marca — mediano, uppercase, tracking wide */}
      {producto.marca && (
        <div className="text-[13px] tracking-[0.1em] uppercase text-store-ink3 font-medium mb-3 font-sans">
          {producto.marca}
        </div>
      )}

      {/* Nombre — serif, grande */}
      <h1 className="font-serif text-[28px] sm:text-[34px] leading-[1.15] text-store-ink mb-3">
        {producto.nombre}
      </h1>

      {/* SKU destacado debajo de marca y nombre */}
      {producto.sku_base && (
        <div className="text-[14px] font-bold text-store-ink mb-4 font-sans tracking-wide">
          SKU: <span className="font-semibold">{producto.sku_base}</span>
        </div>
      )}

      {/* Precio */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {showPrice && precio ? (
          <>
            <span className="text-[26px] font-semibold text-store-ink font-sans">
              {formatearPrecio(precio, config!)}
            </span>
            {precioAnterior && (
              <span className="text-[16px] text-store-ink3 line-through font-sans">
                {formatearPrecio(precioAnterior, config!)}
              </span>
            )}
            {descuento && (
              <span className="bg-[#B35A3E] text-white text-[12px] font-bold py-[3px] px-[10px] rounded-sm tracking-[0.04em]">
                -{descuento}%
              </span>
            )}
            {producto.nuevo && !esOferta && (
              <span className="bg-[#2D5A3D] text-white text-[11px] font-semibold py-[3px] px-[10px] rounded-sm tracking-[0.04em]">
                Nuevo
              </span>
            )}
          </>
        ) : (
          <span className="text-[17px] text-store-ink3 italic font-sans">
            Consultar precio
          </span>
        )}
      </div>
    </div>
  )
}
