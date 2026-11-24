// modules/inventario/conteo-fisico-types.ts
/**
 * Tipos de datos para el módulo de Escaneo y Digitalización de
 * Inventario Físico en hojas manuscritas de libreta cuadriculada.
 */

export interface CandidatoSkuSimple {
  producto_id: number
  sku: string
  nombre: string | null
  score: number
  metodo?: string
  familia?: string | null
  pz_en_caja?: number | null
  proveedor_nombre?: string | null
  razon?: string
  diff_indices?: number[]
}

export interface PrefijoSugeridoConteo {
  prefijo: string
  total: number
}

export interface RenglonConteoFisico {
  id: string
  numero_hoja: number
  columna: 1 | 2
  renglon: number
  estilo_raw: string
  sku_candidato: string
  cajas_raw: string
  cajas: number
  confianza: number
  producto_id?: number | null
  sku_match?: string | null
  descripcion?: string | null
  familia?: string | null
  match_score?: number
  metodo_match?: string | null
  es_propuesta?: boolean
  propuesta_producto_id?: number | null
  propuesta_sku?: string | null
  propuesta_descripcion?: string | null
  propuesta_familia?: string | null
  modificado_manualmente?: boolean
  posibles_variantes?: string[]
  candidatos?: CandidatoSkuSimple[]
  prefijos_sugeridos?: PrefijoSugeridoConteo[]
}

export interface ResumenColumna {
  renglones: number
  cajas: number
}

export interface HojaConteoFisico {
  id: string
  numero_hoja: number
  propuesta_db_id?: string
  comprobante_url?: string
  encabezado?: string
  fecha_detectada?: string
  creado_en?: string
  bodega_origen_id?: number | null
  preview_data_url?: string // preview local inmediata
  resumen: {
    columna_1: ResumenColumna
    columna_2: ResumenColumna
    total_hoja: ResumenColumna
  }
  renglones: RenglonConteoFisico[]
}

export interface EstadoConteoFisico {
  version: 'v1'
  fecha_actualizacion: string
  hojas: HojaConteoFisico[]
}

export const LOCAL_STORAGE_CONTEO_FISICO_KEY = 'inventario:conteo-fisico:v1'
