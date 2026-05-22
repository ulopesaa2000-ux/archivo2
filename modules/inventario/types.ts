// modules/inventario/types.ts

import type {
  NotaInventarioRow,
  NotaDetalleProductoRow,
  InventarioStockRow,
  HistorialEstadoNotaRow,
  BodegaRow,
  TipoMovimientoRow,
  EstadoNotaRow,
  UsuarioBodegaRow,
  CajaProductoRow,
} from '@/lib/types/tables'

// ── Filtros del listado de notas ────────────────────────────
export type FiltrosNotas = {
  q?: string                 // numero_nota ILIKE
  tipo_movimiento_id?: number
  estado_codigo?: string     // PEND | CONF | CANC | PROC
  bodega_origen_id?: number
  fecha_desde?: string
  fecha_hasta?: string
  page?: number
  limit_bodega_ids?: number[]
  limit_usuario_id?: number
}

// ── Nota en el listado ──────────────────────────────────────
export type NotaListItem = {
  id: number
  numero_nota: string
  fecha_nota: string | null
  fecha_confirmacion: string | null
  total_cajas: number | null
  nota_referencia: string | null
  observaciones: string | null
  tipo_codigo: string
  tipo_nombre: string
  afecta_inventario: number
  estado_codigo: string
  estado_nombre: string
  estado_color: string | null
  bodega_origen_nombre: string
  bodega_origen_codigo: string
  bodega_destino_nombre: string | null
  bodega_destino_codigo: string | null
  usuario_nombre: string
}

// ── Resultado del listado ───────────────────────────────────
export type ResultadoListadoNotas = {
  notas: NotaListItem[]
  total: number
}

// ── Nota completa (detalle) ─────────────────────────────────
export type NotaCompleta = {
  cabecera: NotaListItem
  detalles: NotaDetalleResuelto[]
  historial: HistorialEstadoResuelto[]
}

// ── Detalle de producto resuelto ────────────────────────────
export type NotaDetalleResuelto = {
  id: number
  nota_id: number
  producto_id: number | null
  variante_id: number | null
  cajas: number
  piezas_sueltas: number
  caja_id: number | null
  producto_sku: string | null
  producto_nombre: string | null
  producto_pz_en_caja: number | null
  caja_codigo: string | null
  caja_nombre_pack: string | null
  variante_sku: string | null
  talla_codigo: string | null
  color_nombre: string | null
}

// ── Historial de estados resuelto ───────────────────────────
export type HistorialEstadoResuelto = {
  id: number
  nota_id: number
  estado_anterior_nombre: string | null
  estado_anterior_codigo: string | null
  estado_nuevo_nombre: string
  estado_nuevo_codigo: string
  usuario_nombre: string
  fecha_cambio: string | null
  comentario: string | null
}

// ── Stock en listado ────────────────────────────────────────
export type FiltrosStock = {
  q?: string
  marca_id?: number
  con_stock_cero?: boolean
  page?: number
}

export type StockListItem = {
  id: number
  bodega_id: number
  producto_id: number
  cajas: number
  piezas_sueltas: number
  ubicacion_pasillo: string | null
  updated_at: string | null
  caja_id: number | null
  producto_sku: string
  producto_nombre: string | null
  producto_descripcion: string | null
  producto_familia: string | null
  producto_pz_en_caja: number | null
  marca_nombre: string | null
  caja_codigo: string | null
  caja_nombre_pack: string | null
}

export type StockDetalleCaja = {
  id: number
  cajas: number
  piezas_sueltas: number
  caja_id: number
  caja_codigo: string | null
  caja_nombre_pack: string | null
  caja_piezas_por_caja: number | null
}

export type FiltrosStockMatrix = {
  q?: string
  marca_id?: number
  con_stock_cero?: boolean
  ciudades?: string[]
  bodegas?: number[]
  page?: number
}

export type StockMatrixItem = {
  producto_id: number
  producto_sku: string
  producto_nombre: string | null
  producto_descripcion: string | null
  producto_familia: string | null
  pz_en_caja: number | null
  total_general: number
  stock_por_bodega: Record<number, { cajas: number; piezas_sueltas: number; total: number }>
}

// ── Catálogos para formularios ──────────────────────────────
export type CatalogosInventario = {
  tiposMovimiento: TipoMovimientoRow[]
  estadosNota: EstadoNotaRow[]
  bodegas: BodegaRow[]
}

// ── Draft local (para crear/editar nota) ────────────────────
export type DraftProducto = {
  tempId: string              // ID temporal para key en React
  producto_id: number
  producto_sku: string
  producto_nombre: string | null
  producto_pz_en_caja: number | null
  cajas: number
  piezas_sueltas: number
  caja_id: number | null
  caja_codigo: string | null
  caja_nombre_pack: string | null
}

export type DraftNota = {
  tipo_movimiento_id: number | null
  bodega_origen_id: number | null
  bodega_destino_id: number | null
  nota_referencia: string
  observaciones: string
  productos: DraftProducto[]
}

// ── Resultado de búsqueda de productos ──────────────────────
export type ProductoBusqueda = {
  id: number
  sku_base: string
  nombre: string | null
  descripcion: string | null
  pz_en_caja: number | null
  marca_nombre: string | null
  imagen_url: string | null
}

// ── Caja para selector ──────────────────────────────────────
export type CajaParaSelector = {
  id: number
  codigo_caja: string
  nombre_pack: string | null
  piezas_por_caja: number | null
}
