// modules/despachos/types.ts

import type { DespachoRow, DespachoDetalleRow, BodegaRow } from '@/lib/types/tables'

// ── Tipos base ──────────────────────────────────────────────

export type DespachoConDetalle = DespachoRow & {
  detalles?: DespachoDetalleRow[]
}

// ── Para el listado ─────────────────────────────────────────

export type DespachoListaItem = {
  id: number
  estado: string | null
  fecha_programada: string | null
  fecha_real_salida: string | null
  fecha_recepcion: string | null
  chofer: string | null
  vehiculo_info: string | null
  bodega_origen: BodegaRow | null
  bodega_destino: BodegaRow | null
  total_cajas_solicitadas: number
  total_cajas_cargadas: number | null
  total_cajas_recibidas: number | null
  created_at: string | null
  nota_id: number | null
  nota_numero: string | null
  nota_estado_codigo: string | null
}

// ── Para el formulario de creación ──────────────────────────

export type DespachoFormData = {
  bodega_origen_id: number
  bodega_destino_id: number
  vehiculo_info?: string
  chofer?: string
  fecha_programada?: string
  observaciones?: string
  productos: DespachoFormProducto[]
}

export type DespachoFormProducto = {
  producto_id: number
  caja_id?: number | null
  cantidad_cajas: number
}

// ── Auditoría visible entra/sale (solo lectura, sin mover stock) ──

export type AuditoriaDespachoLinea = {
  producto_id: number
  sku: string | null
  nombre: string | null
  cajas_despacho: number
  cajas_nota: number
  stock_origen: number
  stock_destino: number
  /** PEND/PROC: alcanza el stock origen. CONF: informativo (ya movido). */
  estado: 'OK' | 'FALTA_ORIGEN' | 'DIFIERE_NOTA'
}

export type AuditoriaDespacho = {
  despacho_id: number
  nota_id: number | null
  nota_numero: string | null
  nota_estado: string | null
  lineas: AuditoriaDespachoLinea[]
} | null

// ── Filtros de búsqueda ─────────────────────────────────────

export type FiltrosDespacho = {
  q?: string
  estado?: string
  bodega_origen_id?: number
  bodega_destino_id?: number
  fecha_desde?: string
  fecha_hasta?: string
  page?: number
}

// ── Stock en bodega virtual (para el selector) ──────────────

export type StockVirtualItem = {
  producto_id: number
  sku_base: string | null
  producto_nombre: string | null
  producto_descripcion: string | null
  cajas_disponibles: number
  piezas_sueltas: number
  bodega_id: number
  bodega_nombre: string
}
