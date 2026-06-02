// modules/ordenes-b2b/types.ts
import type {
  OrdenDetalleComentario,
  OrdenDetalleEvento,
  PersonaRow,
} from '@/lib/types/tables'

// ── Filtros ─────────────────────────────────────────────────
export type FiltrosOrdenesB2B = {
  q?: string
  estado?: string
  proveedor_id?: number
  año?: number
  page?: number
  sort_by?: string
  order?: 'asc' | 'desc'
}

export type FiltrosCajas = {
  q?: string
  proveedor_id?: number
  año?: number
  contenedor_id?: number
  page?: number
  sort_by?: string
  order?: 'asc' | 'desc'
}

// ── Orden en listado ────────────────────────────────────────
export type OrdenB2BListItem = {
  id: number
  proveedor_id?: number | null
  cliente_b2b_id?: number | null
  folio_proveedor: string | null
  estado: string | null
  moneda: string
  tipo_cambio: number | null
  total_cajas: number | null
  total_piezas: number | null
  cbm_orden: number | null
  observaciones: string | null
  fecha_orden: string | null
  contenedor_id: number | null
  contenedor_codigo: string | null
  proveedor_nombre: string | null
  cliente_nombre: string | null
}

// ── Detalle de producto en orden ────────────────────────────
export type OrdenDetalleResuelto = {
  id: number
  orden_id: number
  producto_id: number | null
  producto_sku: string | null
  producto_nombre: string | null
  producto_descripcion: string | null
  producto_precio_ec: number | null
  cantidad_solicitada: number
  cantidad_aprobada: number | null
  precio_acordado: number | null
  precio_unitario: number | null
  precio_yuan: number | null
  importe_total: number | null
  piezas_pedidas: number | null
  cajas_pedidas: number | null
  cbm_detalle: number | null
  peso_bruto_kg: number | null
  estado_producto: string | null
  comentarios?: OrdenDetalleComentario[]
  eventos?: OrdenDetalleEvento[]
}

// ── Caja vinculada a orden ──────────────────────────────────
export type OrdenCajaResuelta = {
  id: number
  orden_id: number
  caja_id: number
  cantidad_cajas: number
  caja_codigo: string
  caja_nombre_pack: string | null
  caja_piezas_por_caja: number | null
  caja_cbm: number | null
  caja_peso_bruto_kg: number | null
  caja_peso_neto?: number | null
  caja_largo_cm: number | null
  caja_ancho_cm: number | null
  caja_alto_cm: number | null
  caja_costo_total_caja: number | null
  producto_sku: string | null
  producto_precio_ec: number | null
  caja_tallas: string | null
  caja_colores: string | null
  caja_contenidoMap?: {
    tallas: string[]
    colores: string[]
    matriz: Record<string, Record<string, number>>
    totalPiezas: number
  } | null
}

// ── Caja para listado /ordenes-b2b/cajas ────────────────────
export type CajaListItem = {
  id: number
  codigo_caja: string
  nombre_pack: string | null
  producto_id: number | null
  producto_sku: string | null
  producto_nombre: string | null
  proveedor_nombre: string | null
  piezas_por_caja: number | null
  tallas: string | null
  colores: string | null
  cbm: number | null
  peso_bruto_kg: number | null
  peso_neto?: number | null
  costo_total_caja: number | null
  total_ordenes: number
  contenedores: string | null
}

// ── Detalle de caja (para Sheet) ────────────────────────────
export type CajaDetalle = {
  id: number
  codigo_caja: string
  nombre_pack: string | null
  producto_id: number | null
  producto_sku: string | null
  producto_nombre: string | null
  proveedor_nombre: string | null
  piezas_por_caja: number | null
  tallas: string | null
  colores: string | null
  cbm: number | null
  peso_bruto_kg: number | null
  peso_neto?: number | null
  largo_cm: number | null
  ancho_cm: number | null
  alto_cm: number | null
  costo_total_caja: number | null
  detalles_talla_color: CajaDetalleTC[]
  ordenes_vinculadas: { orden_id: number; contenedor_codigo: string | null }[]
}

export type CajaDetalleTC = {
  id: number
  talla_codigo: string | null
  talla_nombre: string | null
  color_nombre: string | null
  color_hex: string | null
  cantidad: number
}

// ── Catálogos para formularios ──────────────────────────────
export type CatalogosB2B = {
  proveedores: Pick<PersonaRow, 'id' | 'nombre_completo'>[]
  clientesB2B: Pick<PersonaRow, 'id' | 'nombre_completo'>[]
}
