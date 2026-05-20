// modules/contenedores/types.ts

import type { ContenedorRow } from '@/lib/types/tables'
import type { SharedCajaData } from '@/modules/cajas/types'

// ── Filtros ─────────────────────────────────────────────────
export type FiltrosContenedores = {
  q?: string
  estado?: string
  año?: number
  page?: number
}

// ── Contenedor resumen (desde v_contenedor_resumen) ─────────
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

// ── Packing list (desde v_contenedor_packing, una fila por caja) ──
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

// ── Orden vinculada a contenedor ────────────────────────────
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

// ── Orden disponible para vincular ───────────────────────────
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

// ── Caja dentro de contenedor (compatible con CajaCard) ────
export type CajaEnContenedor = SharedCajaData & {
  ordenCajaId: number
  ordenId: number
  ordenFolio: string | null
}

