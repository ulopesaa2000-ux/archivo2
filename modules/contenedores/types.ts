// modules/contenedores/types.ts

import type { SharedCajaData } from '@/modules/cajas/types'

export type ContenedorSortBy =
  | 'fecha_eta'
  | 'fecha_etd'
  | 'codigo_contenedor'
  | 'numero_contenedor'
  | 'total_ordenes'
  | 'cajas_totales'
  | 'estado'

export type FiltrosContenedores = {
  q?: string
  estado?: string
  anio?: number
  page?: number
  sort_by?: ContenedorSortBy
  order?: 'asc' | 'desc'
}

export type ContenedorResumen = {
  contenedor_id: number
  codigo_contenedor: string
  numero_contenedor: string | null
  numero_bl: string | null
  naviera: string | null
  buque: string | null
  puerto_origen: string | null
  puerto_destino: string | null
  fecha_etd: string | null
  fecha_eta: string | null
  estado: string
  cbm_total: number | null
  peso_total_kg: number | null
  total_ordenes: number
  total_proveedores: number
  cajas_totales: number
  piezas_totales: number
  cbm_ocupado: number | null
  pct_cbm_ocupado: number | null
  valor_total_usd: number | null
}

export type ContenedorPackingItem = {
  codigo_contenedor: string
  numero_contenedor: string | null
  estado_contenedor: string
  orden_id: number
  folio_proveedor: string | null
  estado_orden: string | null
  codigo_caja: string | null
  nombre_pack: string | null
  cantidad_cajas: number | null
  piezas_por_caja: number | null
  piezas_reales: number | null
  cajas_planeadas: number | null
  piezas_planeadas: number | null
  precio_unitario: number | null
  precio_yuan: number | null
  importe_total: number | null
  cbm_detalle: number | null
  producto_id: number | null
  sku_base: string | null
  producto_nombre: string | null
  producto_descripcion: string | null
}

export type OrdenEnContenedor = {
  id: number
  folio_proveedor: string | null
  estado: string | null
  moneda: string
  total_cajas: number | null
  total_piezas: number | null
  cbm_orden: number | null
  proveedor_nombre: string | null
  fecha_orden: string | null
  observaciones: string | null
  tipo_cambio: number | null
  cliente_nombre: string | null
  contenedor_codigo?: string | null
}

export type OrdenDisponible = {
  id: number
  folio_proveedor: string | null
  estado: string | null
  moneda: string
  proveedor_nombre: string | null
  total_cajas: number | null
  total_piezas: number | null
  fecha_orden: string | null
  contenedor_id: number | null
}

export type CajaEnContenedor = SharedCajaData & {
  ordenCajaId: number
  ordenId: number
  ordenFolio: string | null
}

export type ContenedorReporteItem = {
  proveedor_id: number
  proveedor_nombre: string
  anios: Record<number, {
    cantidad: number
    contenedores: {
      id: number
      codigo_contenedor: string
      numero_contenedor: string | null
      estado: string
      fecha_eta: string | null
    }[]
  }>
}

export type ResumenItemData = {
  id: string // Identificador único de fila (ej. `${orden_id}_${caja_id}_${producto_id}`)
  ordenId: number
  ordenDetalleId: number | null
  cajaId: number | null
  productoId: number
  control: number
  imagenUrl: string | null
  modelo: string // SKU Base + Pack (ej. NR-2507 o NR2509 PACK A)
  skuBase: string
  nombrePack: string | null
  descripcion: string
  composicion: string
  piezasTotales: number
  totalCajas: number
  piezasPorCaja: number
  precioUsd: number
  importeTotal: number
  cbm: number
}

export type ResumenContenedorData = {
  contenedorId: number
  codigoContenedor: string
  numeroContenedor: string
  fechaSalidaBl: string | null
  fechaLlegadaReal: string | null
  fechaEta: string | null
  naviera: string | null
  buque: string | null
  importador: string | null
  pagador: string | null
  puertoOrigen: string | null
  puertoDestino: string | null
  costoDesaduanamiento: number | null
  costoIsf: number | null
  costoFleteMaritimo: number | null
  resumenPrendasTitulo: string
  items: ResumenItemData[]
  balance: number
  demoras: string
  almacenajes: string
  fechaLlegadaAlmacen: string
}

export type SurtidoPreviewLinea = {
  productoId: number
  skuBase: string | null
  productoNombre: string | null
  productoDescripcion: string | null
  /** Cajas según líneas de orden (fuente de verdad del surtido) */
  cajasLinea: number
  /** Piezas según líneas de orden = stock que entrará a la bodega virtual */
  piezasLinea: number
  /** Cajas físicas vinculadas (orden_cajas) */
  cajasFisicas: number
  piezasFisicas: number
  /** Diferencia clave: cajasLinea - cajasFisicas */
  difCajas: number
  difPiezas: number
  precioUnitario: number | null
  importeTotal: number
  estado: 'OK' | 'ADVERTENCIA' | 'SIN_CAJAS'
  ordenIds: number[]
}

export type SurtidoPreview = {
  contenedorId: number
  totalProductos: number
  totalCajasLinea: number
  totalPiezasLinea: number
  totalCajasFisicas: number
  totalPiezasFisicas: number
  importeTotal: number
  conDiferencias: boolean
  lineas: SurtidoPreviewLinea[]
  /** Modo solo cajas vigente al generar el preview */
  modoSoloCajas: boolean
  /** Órdenes con líneas sin match (bloquean el surtido) */
  ordenesConDiferencias: {
    ordenId: number
    folio: string | null
    items: {
      productoId: number | null
      sku: string
      cajasLinea: number
      cajasFisicas: number
      dif: number
      estado: 'DIF' | 'SIN_CAJAS' | 'SIN_LINEA'
    }[]
  }[]
  /** Aviso de ingreso ya generado y pendiente de confirmación (solo avisa, no mueve stock) */
  avisoPendiente: {
    notaId: number
    numeroNota: string
    bodegaNombre: string | null
  } | null
}

export type ResumenEdicionPayload = {
  contenedorId: number
  numeroContenedor?: string
  fechaSalidaBl?: string | null
  naviera?: string | null
  buque?: string | null
  importador?: string | null
  pagador?: string | null
  puertoOrigen?: string | null
  puertoDestino?: string | null
  costoDesaduanamiento?: number | null
  costoIsf?: number | null
  costoFleteMaritimo?: number | null
  balance?: number | null
  demoras?: string | null
  almacenajes?: string | null
  fechaLlegadaAlmacen?: string | null
  items: {
    productoId: number
    ordenDetalleId: number | null
    composicion: string
    precioUsd: number
    piezasPorCaja: number
    totalCajas: number
    cbm: number
  }[]
}

