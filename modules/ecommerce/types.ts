// modules/ecommerce/types.ts
// Tipos específicos del módulo ecommerce

import type { Database } from '@/lib/types/database.types'

type Schema = Database['inv-tienda']
type Tables = Schema['Tables']

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN ECOMMERCE
// ═══════════════════════════════════════════════════════════════

export type ConfigEcommerceRow = Tables['config_ecommerce']['Row']
export type ConfigEcommerceInsert = Tables['config_ecommerce']['Insert']
export type ConfigEcommerceUpdate = Tables['config_ecommerce']['Update']

export type ModoOperacion = 'catalogo' | 'ecommerce' | 'hibrido'
export type TipoPrecioVisible = 'publico' | 'oferta' | 'ambos'
export type TipoVenta = 'piezas' | 'cajas' | 'ambos'
export type TipoOrdenGenerada = 'cotizacion' | 'orden_b2b' | 'orden_venta'
export type UnidadVenta = 'pieza' | 'caja' | 'ambas'
export type ModoVistaCarrito = 'drawer' | 'pagina' | 'ambos'

// Config con tipos fuertes
export interface ConfigEcommerce extends ConfigEcommerceRow {
  modo_operacion: ModoOperacion
  tipo_precio_visible: TipoPrecioVisible
  tipo_venta: TipoVenta
  tipo_orden_generada: TipoOrdenGenerada
  modo_vista_carrito?: ModoVistaCarrito
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTOS WEB
// ═══════════════════════════════════════════════════════════════

export type ProductoWebRow = Tables['productos_web']['Row']
export type ProductoWebInsert = Tables['productos_web']['Insert']
export type ProductoWebUpdate = Tables['productos_web']['Update']

export interface ProductoWebExtendido {
  id: number // producto_id
  producto_id: number
  producto_web_id: number | null
  esta_publicado: boolean
  sku_base: string
  nombre: string
  descripcion: string | null
  slug: string | null
  marca_id: number | null
  genero_id: number | null
  tipo_prenda_id: number | null
  pz_en_caja: number
  composicion: string | null
  marca_nombre: string | null
  tipo_prenda_nombre: string | null
  genero_nombre: string | null
  imagen_principal: string | null
  tiene_foto: boolean
  precio_publico: number | null
  precio_oferta: number | null
  en_oferta: boolean
  destacado: boolean
  nuevo: boolean
  activo: boolean // estado en productos_web (o falso si no publicado)
  created_at: string
}

export interface ProductoWebPublico {
  id: number
  slug: string
  producto_id: number
  sku_base: string
  nombre: string
  descripcion: string | null
  composicion: string | null
  titulo_seo: string | null
  descripcion_seo: string | null
  precio_publico: number | null
  precio_oferta: number | null
  en_oferta: boolean | null
  destacado: boolean | null
  nuevo: boolean | null
  marca: string | null
  tipo_prenda: string | null
  genero: string | null
  tela_exterior: string | null
  tela_forro: string | null
  keywords: string | null
  imagen_principal: string | null
  url_og: string | null
  // Modo override
  modo_override: 'default' | 'catalogo' | 'ecommerce' | null
  unidad_venta: 'pieza' | 'caja' | 'ambas' | null
  activo: boolean
  visitas?: number | null
}

// ═══════════════════════════════════════════════════════════════
// FILTROS
// ═══════════════════════════════════════════════════════════════

export interface FiltrosProductoWeb {
  q?: string
  activo?: boolean
  en_oferta?: boolean
  destacado?: boolean
  nuevo?: boolean
  marca_id?: number
  tipo_prenda_id?: number
  genero_id?: number
  genero?: string
  tipo?: string
  estado_web?: 'todos' | 'publicados' | 'no_publicados' | 'pausados'
  tiene_foto?: 'todos' | 'con_foto' | 'sin_foto'
  ordenar_por?: 'recientes_con_foto' | 'recientes' | 'antiguos' | 'sku_asc' | 'precio_desc' | 'precio_asc'
  page?: number
}

export interface FiltrosOrdenesVenta {
  estado?: string
  fecha_desde?: string
  fecha_hasta?: string
  q?: string
  page?: number
}

// ═══════════════════════════════════════════════════════════════
// ÓRDENES / COTIZACIONES
// ═══════════════════════════════════════════════════════════════

export type OrdenVentaRow = Tables['ordenes_venta']['Row']
export type OrdenVentaUpdate = Tables['ordenes_venta']['Update']
export type OrdenItemRow = Tables['orden_items']['Row']

export interface OrdenVentaResumen extends OrdenVentaRow {
  items_count: number
}

export interface OrdenItemExtendido extends OrdenItemRow {
  sku_completo: string
  producto_nombre: string
  talla: string | null
  color: string | null
  imagen: string | null
}

export interface OrdenVentaDetalle extends OrdenVentaRow {
  items: OrdenItemExtendido[]
}

// ═══════════════════════════════════════════════════════════════
// CARRITO / COTIZACIÓN (Frontend)
// ═══════════════════════════════════════════════════════════════

export interface QuoteItem {
  productoId: number
  varianteId: number
  nombre: string
  marca: string
  sku: string
  slug?: string
  talla: string
  color: string
  cantidad: number
  precioOfrecido?: number      // Para modo híbrido
  precioUnitario?: number      // Para modo ecommerce
  unidad: 'pieza' | 'caja'
  piezasPorCaja?: number
  imagen?: string
}

export interface QuoteCart {
  items: QuoteItem[]
  updatedAt: string
}

// ═══════════════════════════════════════════════════════════════
// VARIANTES (para PDP)
// ═══════════════════════════════════════════════════════════════

export interface VariantePublica {
  id: number
  sku_completo: string
  talla_id: number | null
  talla_codigo: string | null
  talla_orden: number | null
  color_id: number | null
  color_nombre: string | null
  color_hex: string | null
  activo: boolean
  // Stock (desde inventario_stock)
  stock_cajas?: number
  stock_piezas?: number
}

// ═══════════════════════════════════════════════════════════════
// CHECKOUT / SOLICITUD
// ═══════════════════════════════════════════════════════════════

export interface DatosContacto {
  nombre: string
  email: string
  telefono: string
  empresa?: string
  ciudad?: string
  estado?: string
  direccion?: string
  notas?: string
}

export interface SolicitudCotizacion {
  config: ConfigEcommerce
  items: QuoteItem[]
  datosContacto: DatosContacto
  precioPropuesto?: number  // Solo en modo híbrido
}
