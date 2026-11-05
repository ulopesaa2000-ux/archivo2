// modules/inventario/conteo-fisico-types.ts
/**
 * Tipos de datos para el módulo de Escaneo y Digitalización de
 * Inventario Físico en hojas manuscritas de libreta cuadriculada.
 */

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
  modificado_manualmente?: boolean
}

export interface ResumenColumna {
  renglones: number
  cajas: number
}

export interface HojaConteoFisico {
  id: string
  numero_hoja: number
  comprobante_url?: string
  encabezado?: string
  fecha_detectada?: string
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

