// modules/dashboard/types.ts

export type DashboardView = 'comercial' | 'inventario' | 'catalogo' | 'ecommerce' | 'general'
export type DashboardPeriod = 'semana' | 'mes' | 'todo'

export interface DateRangeUTC {
  inicio: string | null
  fin: string | null
  etiqueta: string
}

export interface InventarioKPIs {
  notasCreadasPeriodo: number
  notasConfirmadasPeriodo: number
  notasPendientes: number
  entradasPeriodo: number
  piezasIngresadasPeriodo: number
  piezasSalidasPeriodo: number
  totalProductosConStock: number
  totalCajasStock: number
  totalPiezasStock: number
}

export interface TopBodegaMovimiento {
  bodegaId: number
  nombre: string
  esVirtual: boolean
  totalNotas: number
  totalPiezas: number
}

export interface NotaRecienteDashboard {
  id: number
  folio: string
  tipo_movimiento_id: string
  estado_id: number
  fecha_movimiento: string
  total_piezas: number
  bodega_nombre: string
  created_at: string
}

export interface InventarioDashboardData {
  kpis: InventarioKPIs
  topBodegas: TopBodegaMovimiento[]
  notasRecientes: NotaRecienteDashboard[]
  entradasRecientes: NotaRecienteDashboard[]
  bodegaSeleccionadaId: number // 0 = Todas las bodegas
  bodegaNombre: string
}

export interface ProductoStockTopItem {
  id: number
  sku_base: string
  nombre: string | null
  descripcion: string | null
  genero: string
  tipo_prenda: string
  cajas: number
  piezas: number
  pz_en_caja: number
  imagen_url?: string | null
}

export interface TipoPrendaResumen {
  tipoPrendaId: number
  nombre: string
  genero: string
  totalSKUs: number
  totalSKUsConStock: number
  totalCajas: number
  totalPiezas: number
  topProductos: ProductoStockTopItem[]
}

export interface GeneroResumen {
  genero: string // 'Dama', 'Caballero', 'Infantil', 'Unisex/Otros'
  totalSKUs: number
  totalSKUsConStock: number // Con al menos 1 caja
  totalCajas: number
  totalPiezas: number
  tiposPrenda: TipoPrendaResumen[]
}

export interface CatalogoDashboardData {
  totalProductosActivos: number
  totalProductosConStock: number
  totalCajasStock: number
  totalPiezasStock: number
  resumenGeneros: GeneroResumen[]
  topChamarrasDama: ProductoStockTopItem[]
  topProductosGeneral: ProductoStockTopItem[]
  bodegaSeleccionadaId: number
  bodegaNombre: string
}

export interface EcommerceKPIs {
  totalProductosWeb: number
  productosPublicados: number
  productosEnOferta: number
  productosDestacados: number
  ordenesPeriodo: number
  ordenesPendientes: number
  montoVentasPeriodo: number
}

export interface OrdenVentaReciente {
  id: number
  numero_orden: string
  nombre_cliente: string
  email_cliente: string
  estado: string
  total: number
  fecha_orden: string | null
  created_at: string | null
}

export interface EcommerceDashboardData {
  kpis: EcommerceKPIs
  ordenesRecientes: OrdenVentaReciente[]
}

export interface ComercialKPIs {
  ordenesActivas: number
  contenedoresTransito: number
  cajasSolicitadas: number
  despachosActivos: number
}

export interface ComercialDashboardData {
  kpis: ComercialKPIs
  ultimasOrdenes: any[]
  proximosContenedores: any[]
}

export interface DashboardMetricsResult {
  vista: DashboardView
  periodo: DashboardPeriod
  bodegaId: number
  fechaActualizacion: string
  inventario?: InventarioDashboardData
  catalogo?: CatalogoDashboardData
  ecommerce?: EcommerceDashboardData
  comercial?: ComercialDashboardData
}
