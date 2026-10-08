// lib/utils/cotizacion-resolver.ts

export interface ItemCarritoResoluble {
  varianteId: number
  nombre: string
}

export interface ItemResuelto {
  /**
   * Variante real si el carrito ya traía una (PDP con talla/color).
   * Null cuando viene de tarjeta/publicación: la tabla variantes_producto
   * está vacía y la referencia verdadera es productoWebId.
   */
  varianteId: number | null
  /** id web original cuando el item viene de tarjeta/PDP sin variante */
  productoWebId: number | null
  /** factor del producto para nacer en modo cajas; null si no hay */
  pzPorCaja: number | null
}

/**
 * El carrito mezcla ids reales de variante (PDP con talla/color) e ids de
 * publicación web (tarjetas y botón de PDP). Resuelve cada item conservando
 * la referencia web verdadera; variante_id queda null si no hay variante real.
 * Lanza Error con el nombre del producto si el id no existe en ningún lado.
 */
export function resolverItemsCotizacion(
  items: ItemCarritoResoluble[],
  variantesReales: Map<number, number>,
  webs: Map<number, { producto_id: number; pz_en_caja: number | null }>
): ItemResuelto[] {
  return items.map((item) => {
    if (variantesReales.has(item.varianteId)) {
      return { varianteId: item.varianteId, productoWebId: null, pzPorCaja: null }
    }
    const web = webs.get(item.varianteId)
    if (!web) {
      throw new Error(`"${item.nombre}" no se pudo resolver a un producto válido.`)
    }
    return { varianteId: null, productoWebId: item.varianteId, pzPorCaja: web.pz_en_caja }
  })
}
