// modules/ecommerce/utils.ts
// Utilidades específicas del módulo ecommerce

import type { ConfigEcommerce, ProductoWebPublico } from './types'

/**
 * Determina el modo efectivo de un producto
 * Considera el modo_override del producto y la config global
 */
export function getModoProducto(
  producto: ProductoWebPublico,
  config: ConfigEcommerce
): 'catalogo' | 'ecommerce' | 'hibrido' {
  // Si el producto tiene override, usarlo
  if (producto.modo_override && producto.modo_override !== 'default') {
    return producto.modo_override
  }
  // De lo contrario, usar la config global
  return config.modo_operacion
}

/**
 * Determina si se debe mostrar el precio
 */
export function mostrarPrecio(
  producto: ProductoWebPublico,
  config: ConfigEcommerce
): boolean {
  const modo = getModoProducto(producto, config)
  
  // En modo catálogo, nunca mostrar precio
  if (modo === 'catalogo') return false
  
  // En modo ecommerce u híbrido, depende de config.mostrar_precios
  return config.mostrar_precios
}

/**
 * Obtiene el texto del botón de agregar según config
 */
export function getTextoBotonAgregar(config: ConfigEcommerce): string {
  return config.texto_boton_agregar || 'Agregar'
}

/**
 * Obtiene el texto del botón de finalizar según config
 */
export function getTextoBotonFinalizar(config: ConfigEcommerce): string {
  return config.texto_boton_finalizar || 'Continuar'
}

/**
 * Obtiene el título de la sección de carrito/cotización
 */
export function getTituloCarrito(config: ConfigEcommerce): string {
  return config.titulo_seccion_carrito || 'Carrito'
}

/**
 * Calcula el total de items considerando unidades (cajas/piezas)
 */
export function calcularTotalItems(
  cantidad: number,
  unidad: 'pieza' | 'caja',
  piezasPorCaja?: number
): { cantidadMostrada: string; piezasTotales: number } {
  if (unidad === 'caja' && piezasPorCaja) {
    const piezasTotales = cantidad * piezasPorCaja
    return {
      cantidadMostrada: `${cantidad} caja${cantidad > 1 ? 's' : ''} (${piezasTotales} pz)`,
      piezasTotales,
    }
  }
  
  return {
    cantidadMostrada: `${cantidad} pieza${cantidad > 1 ? 's' : ''}`,
    piezasTotales: cantidad,
  }
}

/**
 * Formatea el precio según la config
 */
export function formatearPrecio(
  precio: number | null | undefined,
  config: ConfigEcommerce
): string | null {
  if (precio == null) return null
  
  // Formato MXN
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(precio)
}

/**
 * Obtiene el precio a mostrar según tipo_precio_visible
 */
export function getPrecioAMostrar(
  producto: ProductoWebPublico,
  config: ConfigEcommerce
): {
  precio: number | null
  precioAnterior: number | null
  esOferta: boolean
} {
  const tipo = config.tipo_precio_visible
  
  switch (tipo) {
    case 'oferta':
      return {
        precio: producto.precio_oferta,
        precioAnterior: null,
        esOferta: true,
      }
    case 'ambos':
      return {
        precio: producto.precio_oferta || producto.precio_publico,
        precioAnterior: producto.precio_oferta ? producto.precio_publico : null,
        esOferta: !!producto.precio_oferta,
      }
    case 'publico':
    default:
      return {
        precio: producto.precio_publico,
        precioAnterior: null,
        esOferta: false,
      }
  }
}

/**
 * Valida si una cantidad es válida según la config
 */
export function validarCantidad(
  cantidad: number,
  unidad: 'pieza' | 'caja',
  config: ConfigEcommerce,
  piezasPorCaja?: number
): { valido: boolean; mensaje?: string } {
  // Validar mínimo
  if (config.minimo_unidades && cantidad < config.minimo_unidades) {
    return {
      valido: false,
      mensaje: `Cantidad mínima: ${config.minimo_unidades}`,
    }
  }
  
  // Validar múltiplo de caja
  if (
    unidad === 'caja' &&
    config.multiplo_cajas &&
    piezasPorCaja &&
    cantidad % piezasPorCaja !== 0
  ) {
    return {
      valido: false,
      mensaje: `Debe ser múltiplo de ${piezasPorCaja} piezas`,
    }
  }
  
  return { valido: true }
}

/**
 * Determina la unidad de venta efectiva para un producto
 */
export function getUnidadVentaEfectiva(
  producto: ProductoWebPublico,
  config: ConfigEcommerce | null
): 'piezas' | 'cajas' | 'ambos' {
  if (producto.unidad_venta) {
    if (producto.unidad_venta === 'caja') return 'cajas'
    if (producto.unidad_venta === 'pieza') return 'piezas'
    if (producto.unidad_venta === 'ambas') return 'ambos'
  }
  return (config?.tipo_venta as any) || 'cajas'
}

/**
 * Formatea el stock disponible considerando la unidad de venta (cajas, piezas o ambos)
 */
export function formatearStockDisponible(
  producto: ProductoWebPublico,
  config: ConfigEcommerce | null
): {
  texto: string
  textoCorto: string
  disponible: boolean
  cajas: number
  piezas: number
} {
  const unidad = getUnidadVentaEfectiva(producto, config)
  const cajas = producto.stock_cajas ?? 0
  const piezas = producto.piezas_estimadas || (producto.stock_piezas ?? 0)
  const disponible = cajas > 0 || piezas > 0

  if (!disponible) {
    return {
      texto: unidad === 'cajas' ? 'Sin cajas en stock actualmente' : 'Sin existencias disponibles',
      textoCorto: unidad === 'cajas' ? '0 cajas' : '0 pz',
      disponible: false,
      cajas: 0,
      piezas: 0,
    }
  }

  if (unidad === 'cajas') {
    return {
      texto: `Stock disponible: ${cajas} ${cajas === 1 ? 'caja' : 'cajas'}`,
      textoCorto: `📦 ${cajas} ${cajas === 1 ? 'caja' : 'cajas'}`,
      disponible: true,
      cajas,
      piezas,
    }
  }

  if (unidad === 'piezas') {
    return {
      texto: `Stock disponible: ${piezas.toLocaleString('es-MX')} ${piezas === 1 ? 'pieza' : 'piezas'}`,
      textoCorto: `📦 ${piezas.toLocaleString('es-MX')} pz`,
      disponible: true,
      cajas,
      piezas,
    }
  }

  // 'ambos'
  return {
    texto: `Stock disponible: ${cajas} ${cajas === 1 ? 'caja' : 'cajas'}${piezas > 0 ? ` (aprox. ${piezas.toLocaleString('es-MX')} pzas)` : ''}`,
    textoCorto: `📦 ${cajas} ${cajas === 1 ? 'caja' : 'cajas'}${piezas > 0 ? ` (${piezas} pz)` : ''}`,
    disponible: true,
    cajas,
    piezas,
  }
}
