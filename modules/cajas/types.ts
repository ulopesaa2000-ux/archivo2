// modules/cajas/types.ts

export type SharedCajaContenidoMap = {
  tallas: string[]
  colores: string[]
  matriz: Record<string, Record<string, number>>
  totalPiezas: number
}

export type SharedCajaData = {
  id: number
  codigo_caja: string
  nombre_pack: string | null
  producto_id?: number | null
  producto_sku?: string | null
  piezas_por_caja: number | null
  cbm: number | null
  peso_bruto_kg: number | null
  peso_neto?: number | null
  largo_cm?: number | null
  ancho_cm?: number | null
  alto_cm?: number | null
  costo_total_caja?: number | null
  tallas?: string | null            // Fallback texto
  colores?: string | null           // Fallback texto
  contenidoMap?: SharedCajaContenidoMap | null
  
  // Datos específicos para órdenes
  cantidad_cajas?: number | null

  // Caja principal para generar variantes
  es_principal?: boolean | null
}
