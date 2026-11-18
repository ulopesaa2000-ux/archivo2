// lib/utils/cotizacion-resolver.ts

export interface ItemCarritoResoluble {
  productoWebId: number
  varianteId: number | null
  esSurtido?: boolean
  nombre: string
  cantidad: number
  precioOfrecido?: number
}

export interface ProductoWebAutoritativo {
  id: number
  producto_id: number
  activo: boolean
  precio_publico: number
  precio_oferta: number | null
  en_oferta: boolean
  modo_override: string | null
  pz_en_caja: number | null
  sku_base: string
}

export interface ItemResuelto {
  varianteId: number | null
  productoWebId: number
  pzPorCaja: number | null
  precioUnitario: number
  subtotal: number
  esCatalogoSinPrecio: boolean
  esSurtido: boolean
  notaPropuesta: string | null
}

/**
 * Calcula el precio unitario autoritativo en servidor desde `productos_web`.
 * - En modo 'catalogo' (global o override del producto): retorna 0 (requiere cotización).
 * - Si en_oferta = true y precio_oferta > 0: usa precio_oferta.
 * - Fallback obligatorio a precio_publico (nunca 0 silencioso cuando precio_oferta es null/0).
 */
export function calcularPrecioAutoritativoWeb(
  web: Pick<ProductoWebAutoritativo, 'precio_publico' | 'precio_oferta' | 'en_oferta' | 'modo_override'>,
  modoGlobal: 'catalogo' | 'ecommerce' | 'hibrido'
): { precioUnitario: number; esCatalogo: boolean } {
  const modoEfectivo =
    web.modo_override && web.modo_override !== 'default'
      ? (web.modo_override as 'catalogo' | 'ecommerce' | 'hibrido')
      : modoGlobal

  if (modoEfectivo === 'catalogo') {
    return { precioUnitario: 0, esCatalogo: true }
  }

  const precioPublico = Number(web.precio_publico) > 0 ? Number(web.precio_publico) : 0
  const precioOferta = Number(web.precio_oferta ?? 0)
  if (web.en_oferta && Number.isFinite(precioOferta) && precioOferta > 0) {
    return { precioUnitario: precioOferta, esCatalogo: false }
  }

  return { precioUnitario: precioPublico, esCatalogo: false }
}

/**
 * Resuelve y valida estrictamente cada item del carrito contra las tablas de BD:
 * - Exige productoWebId existente y activo (publicado).
 * - Si varianteId !== null, exige que la variante exista, esté activa y pertenezca al mismo producto_id.
 * - Ignora precioUnitario del cliente; calcula precios reales en servidor.
 * - En modo 'hibrido', registra precioOfrecido solo como nota informativa (nunca como precio_unitario).
 */
export function resolverItemsCotizacion(
  items: ItemCarritoResoluble[],
  variantesReales: Map<number, { producto_id: number; activo: boolean }>,
  webs: Map<number, ProductoWebAutoritativo>,
  modoGlobal: 'catalogo' | 'ecommerce' | 'hibrido' = 'ecommerce'
): ItemResuelto[] {
  return items.map((item) => {
    const web = webs.get(item.productoWebId)
    if (!web || !web.activo) {
      throw new Error(`"${item.nombre}" ya no se encuentra disponible o publicado.`)
    }

    let varianteIdResuelta: number | null = null
    if (item.varianteId !== null && item.varianteId !== undefined) {
      const variante = variantesReales.get(item.varianteId)
      if (!variante || !variante.activo || variante.producto_id !== web.producto_id) {
        throw new Error(
          `La variante seleccionada para "${item.nombre}" no pertenece al producto o no está disponible.`
        )
      }
      varianteIdResuelta = item.varianteId
    }

    const { precioUnitario, esCatalogo } = calcularPrecioAutoritativoWeb(web, modoGlobal)
    const subtotal = precioUnitario * item.cantidad

    const notasPartes: string[] = []
    if (item.esSurtido) {
      notasPartes.push(`[SURTIDO ${web.sku_base}: ${item.cantidad} u. sin variante fija]`)
    }
    if (
      modoGlobal === 'hibrido' &&
      typeof item.precioOfrecido === 'number' &&
      Number.isFinite(item.precioOfrecido) &&
      item.precioOfrecido > 0
    ) {
      notasPartes.push(
        `[PROPUESTA HÍBRIDO ${web.sku_base}: propone $${item.precioOfrecido.toFixed(2)} / lista $${precioUnitario.toFixed(2)}]`
      )
    }

    return {
      varianteId: item.esSurtido ? null : varianteIdResuelta,
      productoWebId: web.id,
      pzPorCaja: web.pz_en_caja,
      precioUnitario,
      subtotal,
      esCatalogoSinPrecio: esCatalogo,
      esSurtido: Boolean(item.esSurtido),
      notaPropuesta: notasPartes.length > 0 ? notasPartes.join(' ') : null,
    }
  })
}
